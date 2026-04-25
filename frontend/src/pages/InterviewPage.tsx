import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Mic, Keyboard, MessageSquare, Lightbulb } from 'lucide-react';
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
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />
            
            <main className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: SIDEBAR_WIDTH }}>
                <div className="flex-1 flex overflow-hidden p-6 gap-6" style={{ height: '100vh' }}>
                    {/* Left: Orb & Live Feedback */}
                    <div className="flex-[2] flex flex-col gap-6 min-w-0">
                        {/* Visualizer Container */}
                        <div className="relative flex-1 bg-white rounded-3xl border border-[#F1F5F9] overflow-hidden shadow-sm flex items-center justify-center">
                            {/* Orb */}
                            <div className="relative flex items-center justify-center w-full h-full bg-slate-50/30">
                                {connected ? (
                                    audioMode ? (
                                        <div className="w-32 h-32 bg-blue-500 rounded-full animate-pulse shadow-[0_0_60px_rgba(59,130,246,0.3)]"></div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/20">
                                                <Keyboard className="h-10 w-10 text-blue-600" />
                                            </div>
                                            <p className="text-slate-600 font-bold">Text Mode Active</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-300">
                                            <Mic className="h-10 w-10 text-gray-400 opacity-50" />
                                        </div>
                                        <p className="text-gray-500 font-bold tracking-tight">Agent Offline</p>
                                    </div>
                                )}

                                {connected && (
                                    <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-black text-white tracking-widest uppercase">Live Session</span>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Controls */}
                            <div className="absolute bottom-6 right-6 flex items-center gap-3">
                                {!connected ? (
                                    <>
                                        <button className="px-6 h-12 flex items-center gap-2 justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/10 hover:bg-blue-700 transition-all font-bold text-sm" onClick={() => connect(true)}>
                                            <Mic className="h-4 w-4" /> Start Voice
                                        </button>
                                        <button className="px-6 h-12 flex items-center gap-2 justify-center rounded-2xl bg-white text-slate-700 border border-[#F1F5F9] hover:bg-slate-50 transition-all font-bold text-sm" onClick={() => connect(false)}>
                                            <Keyboard className="h-4 w-4" /> Text Only
                                        </button>
                                        {sessionEnded && (
                                            <button className="px-6 h-12 flex items-center gap-2 justify-center rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-500/10 hover:bg-emerald-700 transition-all font-bold text-sm ml-4" onClick={() => navigate('/interview/report')}>
                                                View Report
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button className="px-6 h-12 flex items-center justify-center rounded-2xl bg-red-600 text-white shadow-xl shadow-red-500/10 hover:bg-red-700 transition-all font-bold text-sm" onClick={disconnect}>
                                        End Session
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Live Transcription */}
                        <div className="h-64 bg-white rounded-3xl border border-[#F1F5F9] p-6 overflow-hidden flex flex-col shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">Live Transcript</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {messages.length === 0 && (
                                    <div className="text-center text-[#94A3B8] text-sm mt-8 italic font-medium opacity-50 uppercase tracking-widest">Awaiting interaction...</div>
                                )}
                                {messages.map(msg => (
                                    <div key={msg.id} className="flex gap-4">
                                        <span className={`text-[10px] font-black w-10 pt-1.5 shrink-0 uppercase tracking-wider ${msg.type === 'user' ? 'text-blue-600' : msg.type === 'system' ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {msg.type === 'user' ? 'YOU' : msg.type === 'system' ? 'SYS' : 'AI'}
                                        </span>
                                        <p className={`text-sm leading-relaxed ${msg.type === 'user' ? 'text-[#0F172A] font-bold' : msg.type === 'system' ? 'text-amber-600 italic' : 'text-[#475569]'}`}>
                                            {msg.text}
                                        </p>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {connected && (
                                <div className="mt-4 flex gap-3 pt-4 border-t border-[#F1F5F9]">
                                    <input
                                        className="flex-1 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all"
                                        placeholder={audioMode ? 'Supplementary message...' : 'Enter your response...'}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <button
                                        className="px-6 py-3 bg-[#0F172A] text-white rounded-xl text-sm font-black hover:bg-black transition-all shadow-xl shadow-black/5 disabled:opacity-50"
                                        onClick={sendMessage}
                                        disabled={!input.trim()}
                                    >
                                        Send
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar: Context */}
                    <aside className="flex-1 min-w-[320px] max-w-sm flex flex-col gap-6 overflow-y-auto">
                        <div className="bg-white rounded-3xl border border-[#F1F5F9] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-wider border border-blue-100">Live Agent</span>
                            </div>
                            <h2 className="text-xl font-bold text-[#0F172A] mb-1">Interview Prep</h2>
                            <p className="text-sm font-medium text-[#64748B]">Professional Mode Active</p>
                        </div>

                        <div className="bg-white rounded-3xl border border-[#F1F5F9] p-6 shadow-sm flex-1">
                            <div className="flex items-center gap-2 mb-6">
                                <Lightbulb className="h-5 w-5 text-amber-500" />
                                <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider">Coach Insights</h3>
                            </div>

                            <div className="space-y-6">
                                <section className="space-y-3">
                                    <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-4">Talking Points</p>
                                    {[
                                        { title: 'STAR Method', desc: 'Situation, Task, Action, Result.' },
                                        { title: 'Concise answers', desc: 'Aim for 60-90s per response.' }
                                    ].map((item, i) => (
                                        <div key={i} className="p-4 rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] hover:border-blue-200 transition-all cursor-default">
                                            <p className="text-sm font-bold text-[#0F172A] mb-1">{item.title}</p>
                                            <p className="text-xs font-medium text-[#64748B]">{item.desc}</p>
                                        </div>
                                    ))}
                                </section>

                                <section className="space-y-3">
                                    <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-4">Real-time Feed</p>
                                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                                        <p className="text-xs font-black text-blue-600 uppercase tracking-tight mb-1">{connected ? 'Listening' : 'Ready'}</p>
                                        <p className="text-xs font-medium text-blue-800/80 leading-relaxed">
                                            {connected ? 'The agent is listening for your voice. Speak naturally and clearly.' : 'Connect to start receiving real-time coaching insights.'}
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
