import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Mic, Keyboard, MessageSquare, Lightbulb, Square, ArrowRight, ShieldCheck } from 'lucide-react';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';

interface Message {
    id: number;
    type: 'user' | 'agent' | 'system';
    text: string;
}

export default function InterviewPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [audioMode, setAudioMode] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);
    
    const navigate = useNavigate();

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(0);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    const playCtxRef = useRef<AudioContext | null>(null);
    const nextPlayTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    const pingIntervalRef = useRef<number | null>(null);

    function addMsg(type: Message['type'], text: string) {
        setMessages(prev => [...prev, { id: idRef.current++, type, text }]);
    }

    async function connect(enableAudio: boolean = false) {
        setAudioMode(enableAudio);
        setSessionEnded(false);
        try {
            const res = await client.post('/interview/start', {});
            const newSessionId = res.data.session_id;

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/interview/ws/${newSessionId}`;
            const ws = new WebSocket(wsUrl);
            ws.binaryType = "arraybuffer";

            ws.onopen = async () => {
                setConnected(true);
                playCtxRef.current = new AudioContext({ sampleRate: 24000 });
                nextPlayTimeRef.current = 0;

                if (enableAudio) {
                    await startAudioCapture(ws);
                }

                pingIntervalRef.current = window.setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                }, 30000);
            };

            ws.onmessage = async (ev) => {
                if (ev.data instanceof ArrayBuffer) {
                    playAudioChunk(ev.data);
                } else {
                    try {
                        const data = JSON.parse(ev.data);
                        if (data.type === 'system') {
                            addMsg('system', data.message);
                        } else if (data.type === 'agent_transcript') {
                            addMsg('agent', data.text);
                        } else if (data.type === 'agent_turn_complete') {
                            console.log("Agent turn complete signal received");
                        }
                    } catch { /* ignore */ }
                }
            };

            ws.onclose = () => {
                setConnected(false);
                setSessionEnded(true);
                addMsg('system', 'Session ended. Your results are being scored.');
                cleanupAudio();
                if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
                wsRef.current = null;
            };

            wsRef.current = ws;
        } catch (e) {
            console.error("Failed to start interview session", e);
            addMsg('system', 'Failed to connect to the interview server.');
        }
    }

    async function startAudioCapture(ws: WebSocket) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const volume = inputData.reduce((a, b) => a + Math.abs(b), 0) / inputData.length;
                if (volume > 0.01) {
                    stopAllPlayback();
                }
                const int16Array = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                ws.send(int16Array.buffer);
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
        } catch (err) {
            console.error("Microphone access failed", err);
            addMsg('system', "Microphone access failed. Text mode only.");
            setAudioMode(false);
        }
    }

    function playAudioChunk(arrayBuffer: ArrayBuffer) {
        if (!playCtxRef.current) return;
        const ctx = playCtxRef.current;
        const int16Data = new Int16Array(arrayBuffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 32768.0;
        }
        const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        activeSourcesRef.current.push(source);
        source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        };
        const currentTime = ctx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime;
        }
        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
    }

    function stopAllPlayback() {
        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch { /* ignore */ }
        });
        activeSourcesRef.current = [];
        nextPlayTimeRef.current = 0;
    }

    function cleanupAudio() {
        if (processorRef.current && audioCtxRef.current) processorRef.current.disconnect();
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (playCtxRef.current) { playCtxRef.current.close(); playCtxRef.current = null; }
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
    }

    function disconnect() { wsRef.current?.close(); }

    function sendMessage() {
        const text = input.trim();
        if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        addMsg('user', text);
        wsRef.current.send(JSON.stringify({ type: "candidate_transcript", text }));
        setInput('');
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { return () => { cleanupAudio(); if (pingIntervalRef.current) clearInterval(pingIntervalRef.current); wsRef.current?.close(); }; }, []);

    return (
        <div className="flex min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />
            
            <main className="flex-1 flex flex-col bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                {/* Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ SIMULATION ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Behavioral Interview Lab</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        {connected && (
                            <div className="flex items-center gap-3 rounded-lg border border-[#E0E0E0] px-4 py-2">
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D0D0D]">Live Capture Active</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-[#4A4A4A]">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified Environment</span>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden p-12 gap-12 h-[calc(100vh-80px)]">
                    {/* Left: Simulation Control & Visuals */}
                    <div className="flex-[3] flex flex-col gap-10 min-w-0">
                        {/* Interactive Orb Panel */}
                        <div className="relative flex-1 bg-[#F9F9F9] rounded-xl border border-[#E0E0E0] overflow-hidden flex items-center justify-center">
                            {/* Institutional Grid Background */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0D0D0D 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                            {connected ? (
                                <div className="relative flex flex-col items-center">
                                    {audioMode ? (
                                        <div className="relative">
                                            <div className="w-48 h-48 bg-[#0D0D0D] rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(91,192,235,0.2)] animate-pulse">
                                                <div className="w-44 h-44 border border-white/10 rounded-full" />
                                            </div>
                                            <div className="absolute -inset-4 border border-[#5BC0EB]/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                                        </div>
                                    ) : (
                                        <div className="w-48 h-48 bg-white border border-[#E0E0E0] rounded-full flex items-center justify-center shadow-xl">
                                            <Keyboard className="h-12 w-12 text-[#0D0D0D]" />
                                        </div>
                                    )}
                                    <div className="mt-12 text-center">
                                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">ADVIEST CO-PILOT</h3>
                                        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">Processing Neural Inputs...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-24 h-24 border border-dashed border-[#E0E0E0] rounded-full flex items-center justify-center mx-auto mb-8">
                                        <Mic className="h-8 w-8 text-[#E0E0E0]" />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0D0D0D] opacity-40">Awaiting Signal</h3>
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">Initialize session to begin</p>
                                </div>
                            )}

                            {/* Control Bar */}
                            <div className="absolute bottom-10 flex items-center gap-4">
                                {!connected ? (
                                    <>
                                        <button 
                                            className="h-12 px-8 flex items-center gap-3 rounded-lg bg-[#0D0D0D] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#5BC0EB] transition-all" 
                                            onClick={() => connect(true)}
                                        >
                                            <Mic className="h-4 w-4" /> Initialize Voice
                                        </button>
                                        <button 
                                            className="h-12 px-8 flex items-center gap-3 rounded-lg bg-white border border-[#E0E0E0] text-[#0D0D0D] text-[11px] font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-all" 
                                            onClick={() => connect(false)}
                                        >
                                            <Keyboard className="h-4 w-4" /> Text Interface
                                        </button>
                                        {sessionEnded && (
                                            <button 
                                                className="h-12 px-8 flex items-center gap-3 rounded-lg bg-[#5BC0EB] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#0D0D0D] transition-all" 
                                                onClick={() => navigate('/interview/report')}
                                            >
                                                Analytical Report <ArrowRight className="h-4 w-4" />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button 
                                        className="h-12 px-8 flex items-center gap-3 rounded-lg bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/10" 
                                        onClick={disconnect}
                                    >
                                        <Square className="h-3 w-3 fill-current" /> Terminate Session
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Dialogue Feed */}
                        <div className="h-72 bg-white rounded-xl border border-[#E0E0E0] p-10 overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#F0F0F0]">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-4 w-4 text-[#5BC0EB]" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">Session Transcript</h3>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">Secure Feed</span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">Ready for Input</p>
                                    </div>
                                )}
                                {messages.map(msg => (
                                    <div key={msg.id} className="flex gap-8 group">
                                        <div className={`w-16 pt-1 shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] ${
                                            msg.type === 'user' ? 'text-[#5BC0EB]' : 
                                            msg.type === 'system' ? 'text-amber-500' : 'text-[#0D0D0D]'
                                        }`}>
                                            {msg.type === 'user' ? 'CANDIDATE' : msg.type === 'system' ? 'KERNEL' : 'ADVIEST'}
                                        </div>
                                        <p className={`text-[13px] leading-relaxed font-medium ${
                                            msg.type === 'user' ? 'text-[#0D0D0D] font-bold' : 
                                            msg.type === 'system' ? 'text-amber-600 italic' : 'text-[#4A4A4A]'
                                        }`}>
                                            {msg.text}
                                        </p>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {connected && (
                                <div className="mt-8 pt-8 border-t border-[#F0F0F0] flex gap-4">
                                    <input
                                        className="flex-1 bg-[#F9F9F9] border border-[#E0E0E0] rounded-lg px-6 py-4 text-[13px] font-bold placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#0D0D0D] transition-all"
                                        placeholder={audioMode ? 'Secondary Context Input...' : 'Enter your professional response...'}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <button
                                        className="px-8 bg-[#0D0D0D] text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-[#5BC0EB] transition-all disabled:opacity-20"
                                        onClick={sendMessage}
                                        disabled={!input.trim()}
                                    >
                                        Execute
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Insights Panel */}
                    <aside className="flex-1 min-w-[360px] max-w-sm flex flex-col gap-10">
                        <div className="bg-[#0D0D0D] rounded-xl p-10 text-white shadow-2xl">
                            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#5BC0EB] block mb-4">PROTOCOL 4.2</span>
                            <h2 className="text-2xl font-bold tracking-tight mb-2">Performance Monitor</h2>
                            <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest">Active Analysis: Behavioral Response</p>
                            
                            <div className="mt-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Voice Clarity</span>
                                    <span className="text-[11px] font-bold text-[#5BC0EB]">{connected && audioMode ? 'Optimal' : '--'}</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full bg-[#5BC0EB] transition-all duration-1000 ${connected && audioMode ? 'w-3/4' : 'w-0'}`} />
                                </div>
                                
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Logic Consistency</span>
                                    <span className="text-[11px] font-bold text-[#5BC0EB]">{messages.length > 2 ? 'Analyzing' : '--'}</span>
                                </div>
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full bg-[#5BC0EB] transition-all duration-1000 ${messages.length > 2 ? 'w-1/2' : 'w-0'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-[#E0E0E0] p-10 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-10">
                                <Lightbulb className="h-5 w-5 text-[#5BC0EB]" />
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">Tactical Insights</h3>
                            </div>

                            <div className="space-y-8 flex-1">
                                <section>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40 block mb-6">Execution Strategy</span>
                                    <div className="space-y-4">
                                        {[
                                            { title: 'The STAR Framework', desc: 'Structure responses: Situation, Task, Action, Result.' },
                                            { title: 'Temporal Control', desc: 'Maintain response duration between 60-90 seconds.' }
                                        ].map((item, i) => (
                                            <div key={i} className="p-5 rounded-lg border border-[#F0F0F0] bg-[#F9F9F9] group hover:border-[#5BC0EB] transition-all">
                                                <p className="text-[11px] font-bold text-[#0D0D0D] mb-1 uppercase tracking-tight">{item.title}</p>
                                                <p className="text-[11px] font-medium text-[#4A4A4A] opacity-60 leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="mt-auto pt-10 border-t border-[#F0F0F0]">
                                    <div className="p-6 rounded-lg bg-[#5BC0EB]/5 border border-[#5BC0EB]/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-[#5BC0EB]" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#5BC0EB]">Live Observer</span>
                                        </div>
                                        <p className="text-[11px] font-medium text-[#0D0D0D] leading-relaxed">
                                            {connected ? 'The agent is parsing your vocal tone and semantic structure. Maintain a neutral, professional frequency.' : 'Initialize the simulation to activate the real-time feedback kernel.'}
                                        </p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
