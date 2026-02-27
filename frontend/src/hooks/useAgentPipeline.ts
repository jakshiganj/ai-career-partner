import { useEffect, useRef, useState, useCallback } from 'react';

export type PipelineStatus = 'Idle' | 'Working' | 'Paused' | 'Success' | 'Failed';

export interface PipelineEvent {
    type: 'CONNECTED' | 'STATE_UPDATE' | 'PAUSED';
    status?: PipelineStatus;
    current_agent?: string;
    task_state_id?: number;
    missing_fields?: string;
    message?: string;
}

interface UsePipelineOptions {
    userId: string | null;
    onEvent?: (event: PipelineEvent) => void;
}

export function useAgentPipeline({ userId, onEvent }: UsePipelineOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<PipelineEvent | null>(null);
    const [status, setStatus] = useState<PipelineStatus>('Idle');

    const connect = useCallback(() => {
        if (!userId || wsRef.current) return;
        const wsUrl = `ws://${import.meta.env.VITE_WS_HOST ?? 'localhost:8000'}/api/pipeline/ws/${userId}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onmessage = (ev) => {
            try {
                const event: PipelineEvent = JSON.parse(ev.data);
                setLastEvent(event);
                if (event.status) setStatus(event.status);
                onEvent?.(event);
            } catch { /* ignore malformed */ }
        };

        ws.onclose = () => {
            setConnected(false);
            wsRef.current = null;
        };

        wsRef.current = ws;
    }, [userId, onEvent]);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        setConnected(false);
    }, []);

    useEffect(() => {
        if (userId) connect();
        return () => disconnect();
    }, [userId, connect, disconnect]);

    return { connected, status, lastEvent, connect, disconnect };
}
