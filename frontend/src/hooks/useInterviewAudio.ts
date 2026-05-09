import { useState, useRef, useEffect, useCallback } from 'react';
import client from '../api/client';

export interface Message {
    id: number;
    type: 'user' | 'agent' | 'system';
    text: string;
}

export function useInterviewAudio() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [audioMode, setAudioMode] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(0);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    const playCtxRef = useRef<AudioContext | null>(null);
    const nextPlayTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    const pingIntervalRef = useRef<number | null>(null);

    const addMsg = useCallback((type: Message['type'], text: string) => {
        setMessages(prev => [...prev, { id: idRef.current++, type, text }]);
    }, []);

    function stopAllPlayback() {
        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch { /* ignore */ }
        });
        activeSourcesRef.current = [];
        nextPlayTimeRef.current = 0;
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

    async function startAudioCapture(ws: WebSocket) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = audioCtx;

            await audioCtx.audioWorklet.addModule('/audio-processor.js');
            const workletNode = new AudioWorkletNode(audioCtx, 'pcm-processor');
            workletNodeRef.current = workletNode;

            let frameCount = 0;
            let sumVolume = 0;
            let pcmChunks: Int16Array[] = [];
            let pcmLength = 0;

            workletNode.port.onmessage = (e) => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const { buffer, volume } = e.data;
                const incomingInt16 = new Int16Array(buffer);
                
                sumVolume += volume;
                frameCount++;
                
                pcmChunks.push(incomingInt16);
                pcmLength += incomingInt16.length;

                // Transmit over WebSocket only when we accumulate >= 4096 samples (~250ms).
                // This drastically reduces network overhead (from 125 msgs/sec to ~4 msgs/sec)
                // and perfectly matches the chunk size the backend VAD expects.
                if (pcmLength >= 4096) {
                    const avgVolume = sumVolume / frameCount;
                    
                    // Slightly raised threshold to 0.03 to avoid breathing/fan noise interruptions
                    if (avgVolume > 0.03) {
                        stopAllPlayback();
                    }
                    
                    // Flatten chunks into a single ArrayBuffer
                    const outBuffer = new Int16Array(pcmLength);
                    let offset = 0;
                    for (const chunk of pcmChunks) {
                        outBuffer.set(chunk, offset);
                        offset += chunk.length;
                    }
                    
                    ws.send(outBuffer.buffer);
                    
                    // Reset accumulators
                    pcmChunks = [];
                    pcmLength = 0;
                    sumVolume = 0;
                    frameCount = 0;
                }
            };

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(workletNode);
            workletNode.connect(audioCtx.destination);
        } catch (err) {
            console.error("Microphone access failed", err);
            addMsg('system', "Microphone access failed. Text mode only.");
            setAudioMode(false);
        }
    }

    function cleanupAudio() {
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (playCtxRef.current) { playCtxRef.current.close(); playCtxRef.current = null; }
        if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
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

    return {
        messages,
        input,
        setInput,
        connected,
        audioMode,
        sessionEnded,
        messagesEndRef,
        connect,
        disconnect,
        sendMessage,
        handleKeyDown,
    };
}
