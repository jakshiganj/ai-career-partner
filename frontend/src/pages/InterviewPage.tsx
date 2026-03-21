import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Mic, Keyboard, MessageSquare, Lightbulb, Zap, Timer, Info, MicOff, MoreHorizontal } from 'lucide-react';

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

    // Audio Capture State
    const audioCtxRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    // Audio Playback State
    const playCtxRef = useRef<AudioContext | null>(null);
    const nextPlayTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    // Heartbeat State
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
                playCtxRef.current = new AudioContext({ sampleRate: 24000 }); // Gemini Live returns 24kHz
                nextPlayTimeRef.current = 0;

                if (enableAudio) {
                    await startAudioCapture(ws);
                }

                // 30s Heartbeat Ping
                pingIntervalRef.current = window.setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                }, 30000);
            };

            ws.onmessage = async (ev) => {
                if (ev.data instanceof ArrayBuffer) {
                    // Binary audio chunk from backend
                    playAudioChunk(ev.data);
                } else {
                    try {
                        const data = JSON.parse(ev.data);
                        if (data.type === 'system') {
                            addMsg('system', data.message);
                        } else if (data.type === 'agent_transcript') {
                            addMsg('agent', data.text);
                        } else if (data.type === 'agent_turn_complete') {
                            // Turn complete can be used to update UI states (e.g., stop a specific animation)
                            console.log("Agent turn complete signal received");
                        }
                    } catch { /* ignore */ }
                }
            };

            ws.onclose = () => {
                setConnected(false);
                setSessionEnded(true);
                addMsg('system', 'Session ended. Your results are being scored. Please head back to the Dashboard to review your performance.');
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

                // Get Float32 PCM
                const inputData = e.inputBuffer.getChannelData(0);

                // Barge-in logic: Check volume to interrupt AI
                const volume = inputData.reduce((a, b) => a + Math.abs(b), 0) / inputData.length;
                if (volume > 0.01) { // Simple VAD threshold
                    stopAllPlayback();
                }

                // Convert to Int16 PCM
                const int16Array = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Send Binary ArrayBuffer chunk directly
                ws.send(int16Array.buffer);
            };

            source.connect(processor);
            processor.connect(audioCtx.destination); // Required for script processor to run
        } catch (err) {
            console.error("Microphone access denied or failed", err);
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

        // Track source for interruption
        activeSourcesRef.current.push(source);
        source.onended = () => {
            activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        };

        const currentTime = ctx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime; // Buffer underrun, catch up
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
    }

    function stopAllPlayback() {
        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch (e) { /* ignore */ }
        });
        activeSourcesRef.current = [];
        nextPlayTimeRef.current = 0;
    }

    function cleanupAudio() {
        if (processorRef.current && audioCtxRef.current) {
            processorRef.current.disconnect();
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        if (playCtxRef.current) {
            playCtxRef.current.close();
            playCtxRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
    }

    function disconnect() {
        wsRef.current?.close();
    }

    function sendMessage() {
        const text = input.trim();
        if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        addMsg('user', text);
        // Send as JSON text command to backend so backend adds to transcript and forwards to gemini
        wsRef.current.send(JSON.stringify({ type: "candidate_transcript", text }));
        setInput('');
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        return () => {
            cleanupAudio();
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            wsRef.current?.close();
        };
    }, []);

    return (
        <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-[#F1F5F9]" style={{ height: 'calc(100vh - 64px)' }}>
            {/* Left: Orb & Live Feedback */}
            <div className="flex-[2] flex flex-col gap-4 min-w-0">
                {/* Visualizer Container */}
                <div className="relative flex-1 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm flex items-center justify-center">
                    {/* Orb */}
                    <div className="relative flex items-center justify-center w-full h-full bg-slate-50">
                        {connected ? (
                            audioMode ? (
                                <div className="w-32 h-32 bg-blue-500 rounded-full animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.5)]"></div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-500">
                                        <Keyboard className="h-10 w-10 text-blue-600" />
                                    </div>
                                    <p className="text-slate-600 font-medium">Text Mode Active</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center">
                                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-dashed border-slate-400">
                                    <Mic className="h-10 w-10 text-slate-400 opacity-50" />
                                </div>
                                <p className="text-slate-500 font-medium tracking-tight">Agent Offline</p>
                            </div>
                        )}

                        {/* Live Status Indicator */}
                        {connected && (
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-bold text-white tracking-widest uppercase">Live Session</span>
                            </div>
                        )}

                        {/* Speech Pace Placeholder Overlays */}
                        {connected && (
                            <div className="absolute top-4 right-4 flex flex-col gap-3 w-48">
                                <div className="bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-xl shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Sentiment</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-900">Professional</span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 rounded uppercase">Optimizing</span>
                                    </div>
                                    <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-3/4"></div>
                                    </div>
                                </div>
                                <div className="bg-white/90 backdrop-blur border border-slate-200 p-3 rounded-xl shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Session Mode</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-slate-900">{audioMode ? 'Voice / Audio' : 'Text Only'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Controls */}
                    <div className="absolute bottom-6 right-6 flex items-center gap-3">
                        {!connected ? (
                            <>
                                <button className="px-6 h-11 flex items-center gap-2 justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all font-bold text-sm" onClick={() => connect(true)}>
                                    <Mic className="h-4 w-4" /> Start Voice Call
                                </button>
                                <button className="px-6 h-11 flex items-center gap-2 justify-center rounded-xl bg-white text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 transition-all font-bold text-sm" onClick={() => connect(false)}>
                                    <Keyboard className="h-4 w-4" /> Text Only
                                </button>
                                {sessionEnded && (
                                    <button className="px-6 h-11 flex items-center gap-2 justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all font-bold text-sm ml-4" onClick={() => navigate('/dashboard')}>
                                        View Results on Dashboard
                                    </button>
                                )}
                            </>
                        ) : (
                            <button className="px-6 h-11 flex items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all font-bold text-sm" onClick={disconnect}>
                                End Session
                            </button>
                        )}
                    </div>
                </div>

                {/* Live Transcription Details */}
                <div className="h-48 bg-white rounded-2xl border border-slate-200 p-5 overflow-hidden flex flex-col shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Transcription</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 text-sm mt-4 italic">Conversation transcripts will appear here...</div>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className="flex gap-4">
                                <span className={`text-[10px] font-bold w-12 pt-1.5 shrink-0 ${msg.type === 'user' ? 'text-blue-600' : msg.type === 'system' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {msg.type === 'user' ? 'YOU' : msg.type === 'system' ? 'SYS' : 'AGENT'}
                                </span>
                                <p className={`text-sm leading-relaxed ${msg.type === 'user' ? 'text-slate-900 font-medium' : msg.type === 'system' ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                                    {msg.text}
                                </p>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {connected && (
                        <div className="mt-3 flex gap-2 pt-3 border-t border-slate-100">
                            <input
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={audioMode ? 'Type a supplementary message...' : 'Type your answer...'}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <button
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                onClick={sendMessage}
                                disabled={!input.trim()}
                            >
                                Send
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Insights */}
            <aside className="flex-1 min-w-[320px] max-w-md flex flex-col gap-4 overflow-y-auto">
                {/* Interview Context Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">Active Mode</span>
                        <MoreHorizontal className="h-5 w-5 text-slate-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Interview Prep Session</h2>
                    <p className="text-sm text-slate-500">Gemini 2.0 Live Voice Agent</p>
                </div>

                {/* AI Coach Recommendations Placeholder */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
                    <div className="flex items-center gap-2 mb-5">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        <h3 className="text-sm font-bold text-slate-900">Coach Insights</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Talking Points</p>

                            <div className="group cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all">
                                <div className="flex items-start justify-between">
                                    <p className="text-sm font-semibold text-slate-800">The STAR Method</p>
                                    <Zap className="h-4 w-4 text-blue-500" />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Structure answers focusing on Situation, Task, Action, and Result.</p>
                            </div>

                            <div className="group cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all">
                                <div className="flex items-start justify-between">
                                    <p className="text-sm font-semibold text-slate-800">Keep it concise</p>
                                    <Timer className="h-4 w-4 text-blue-500" />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Aim for 90-120 seconds maximum per answer to keep the agent engaged.</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Feedback</p>

                            {connected ? (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                                    <Info className="h-5 w-5 text-blue-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-blue-800 uppercase tracking-tight">Listening Mode</p>
                                        <p className="text-xs text-blue-700/80 mt-1">The agent will automatically process your voice. Speak naturally.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <MicOff className="h-5 w-5 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">Offline</p>
                                        <p className="text-xs text-slate-500 mt-1">Connect to the session to stream real-time insights.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}
