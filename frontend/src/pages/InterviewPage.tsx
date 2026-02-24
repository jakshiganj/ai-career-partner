import { useState, useRef, useEffect } from 'react';

interface Message {
    id: number;
    type: 'user' | 'agent' | 'system';
    text: string;
}

export default function InterviewPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [sessionId] = useState(() => crypto.randomUUID().slice(0, 8));
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(0);

    function addMsg(type: Message['type'], text: string) {
        setMessages(prev => [...prev, { id: idRef.current++, type, text }]);
    }

    function connect() {
        const wsUrl = `ws://${import.meta.env.VITE_WS_HOST ?? 'localhost:8000'}/ws/interview/${sessionId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onmessage = (ev) => {
            try {
                const data = JSON.parse(ev.data);
                if (data.type === 'system') {
                    addMsg('system', data.message);
                } else if (data.type === 'agent_response') {
                    addMsg('agent', data.text);
                }
            } catch { /* ignore */ }
        };

        ws.onclose = () => {
            setConnected(false);
            addMsg('system', 'Session ended. Click Connect to start a new session.');
            wsRef.current = null;
        };

        wsRef.current = ws;
    }

    function disconnect() {
        wsRef.current?.close();
    }

    function sendMessage() {
        const text = input.trim();
        if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        addMsg('user', text);
        wsRef.current.send(text);
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

    useEffect(() => () => { wsRef.current?.close(); }, []);

    return (
        <div className="page">
            <div className="container">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1>🎤 Interview Coach</h1>
                    <p style={{ marginTop: '0.4rem' }}>
                        Practice your interview answers in real-time with an AI coach.
                    </p>
                </div>

                <div className="dashboard-grid">
                    {/* Chat Panel */}
                    <div className="card" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
                        {/* Header bar */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}>
                            <div className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: connected ? 'var(--accent-green)' : 'var(--text-muted)',
                                    boxShadow: connected ? '0 0 8px var(--accent-green)' : 'none',
                                    transition: 'all 0.3s',
                                }} />
                                <span className="font-semibold">
                                    {connected ? `Session #${sessionId}` : 'Not connected'}
                                </span>
                                {connected && (
                                    <span className="badge badge-working" style={{ fontSize: '0.72rem' }}>Live</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!connected ? (
                                    <button id="connect-ws-btn" className="btn btn-primary" onClick={connect}>
                                        🔌 Connect
                                    </button>
                                ) : (
                                    <button id="disconnect-ws-btn" className="btn btn-danger" onClick={disconnect}>
                                        Disconnect
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chat-messages" style={{ minHeight: 380 }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎤</div>
                                    <p className="text-sm">Click <strong>Connect</strong> to start your mock interview session.</p>
                                </div>
                            )}
                            {messages.map(msg => (
                                <div key={msg.id} className={`chat-bubble ${msg.type}`}>
                                    {msg.text}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="chat-input-row">
                            <input
                                id="interview-message-input"
                                className="form-input"
                                style={{ flex: 1 }}
                                placeholder={connected ? 'Type your answer and press Enter…' : 'Connect first to start chatting'}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={!connected}
                            />
                            <button
                                id="interview-send-btn"
                                className="btn btn-primary"
                                onClick={sendMessage}
                                disabled={!connected || !input.trim()}
                            >
                                Send
                            </button>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="card card-full">
                        <h3 style={{ marginBottom: '1rem' }}>💡 Interview Tips</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                            {[
                                { icon: '🎯', tip: 'Use STAR method', desc: 'Situation, Task, Action, Result' },
                                { icon: '⏱️', tip: 'Keep answers concise', desc: 'Aim for 90–120 seconds' },
                                { icon: '🔍', tip: 'Research the company', desc: 'Show domain knowledge' },
                                { icon: '💬', tip: 'Ask great questions', desc: 'Prepare 2–3 insightful ones' },
                            ].map(({ icon, tip, desc }) => (
                                <div key={tip} style={{
                                    padding: '1rem',
                                    background: 'var(--bg-elevated)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                }}>
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{icon}</div>
                                    <div className="font-semibold text-sm">{tip}</div>
                                    <div className="text-xs text-muted mt-1">{desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
