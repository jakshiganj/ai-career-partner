import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

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

    // Heartbeat State
    const pingIntervalRef = useRef<number | null>(null);

    function addMsg(type: Message['type'], text: string) {
        setMessages(prev => [...prev, { id: idRef.current++, type, text }]);
    }

    async function connect(enableAudio: boolean = false) {
        setAudioMode(enableAudio);
        try {
            const res = await axios.post('http://localhost:8000/api/interview/start', {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const newSessionId = res.data.session_id;

            const wsUrl = `ws://${import.meta.env.VITE_WS_HOST ?? 'localhost:8000'}/ws/interview/${newSessionId}`;
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
                        }
                    } catch { /* ignore */ }
                }
            };

            ws.onclose = () => {
                setConnected(false);
                addMsg('system', 'Session ended. Click Connect to start a new session. Your results are being scored and will appear in the dashboard.');
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

        const currentTime = ctx.currentTime;
        if (nextPlayTimeRef.current < currentTime) {
            nextPlayTimeRef.current = currentTime; // Buffer underrun, catch up
        }

        source.start(nextPlayTimeRef.current);
        nextPlayTimeRef.current += audioBuffer.duration;
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
        <div className="page" style={{ paddingBottom: '4rem' }}>
            <div className="container max-w-5xl mx-auto px-4 mt-8">
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <h1 className="text-3xl font-bold gradient-text pb-2">🎤 Live Voice Interview</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Practice speaking with the Gemini 2.0 Live Audio Agent
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chat Panel */}
                    <div className="card lg:col-span-2 flex flex-col pt-0 px-0" style={{ height: '600px' }}>
                        {/* Header bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}>
                            <div className="flex items-center gap-2">
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: connected ? 'var(--accent-green)' : 'var(--text-muted)',
                                    boxShadow: connected ? '0 0 8px var(--accent-green)' : 'none',
                                    transition: 'all 0.3s',
                                }} />
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {connected ? `Agent Connected (${audioMode ? 'Voice' : 'Text'})` : 'Offline'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {!connected ? (
                                    <>
                                        <button className="btn btn-primary" onClick={() => connect(true)}>
                                            🎙️ Start Voice Call
                                        </button>
                                        <button className="btn" style={{ background: 'var(--bg-elevated)' }} onClick={() => connect(false)}>
                                            ⌨️ Text Only
                                        </button>
                                    </>
                                ) : (
                                    <button className="btn btn-danger" onClick={disconnect}>
                                        End Interview
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="overflow-y-auto p-4 flex-1 space-y-4" style={{ background: 'var(--bg-site)' }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
                                    <p className="text-sm">Click <strong>Start Voice Call</strong> to begin speaking with the agent.</p>
                                </div>
                            )}
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : msg.type === 'system' ? 'justify-center' : 'justify-start'}`}>
                                    <div style={{
                                        maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: '1rem',
                                        background: msg.type === 'user' ? 'var(--accent-blue)' : msg.type === 'system' ? 'transparent' : 'var(--bg-elevated)',
                                        color: msg.type === 'user' ? 'white' : msg.type === 'system' ? 'var(--text-muted)' : 'var(--text-primary)',
                                        fontSize: msg.type === 'system' ? '0.8rem' : '0.95rem',
                                        border: msg.type === 'agent' ? '1px solid var(--border-subtle)' : 'none'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                            <div className="flex gap-2">
                                <input
                                    className="form-input flex-1"
                                    placeholder={connected ? (audioMode ? 'Speak, or type supplementary text...' : 'Type your answer...') : 'Connect first to start chatting'}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={!connected}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={sendMessage}
                                    disabled={!connected || !input.trim()}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="space-y-6">
                        <div className="card">
                            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>💡 Interview Guidance</h3>
                            <div className="space-y-3">
                                {[
                                    { icon: '🎯', tip: 'Use STAR method', desc: 'Situation, Task, Action, Result' },
                                    { icon: '🎙️', tip: 'Voice Modality', desc: 'Interrupt the agent anytime by simply speaking.' },
                                    { icon: '⏱️', tip: 'Keep answers concise', desc: 'Aim for 90–120 seconds maximum per answer.' }
                                ].map(({ icon, tip, desc }) => (
                                    <div key={tip} className="p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span>{icon}</span>
                                            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{tip}</span>
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
