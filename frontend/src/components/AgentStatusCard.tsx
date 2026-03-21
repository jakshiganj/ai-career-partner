import type { PipelineStatus, PipelineEvent } from '../hooks/useAgentPipeline';

const AGENTS = [
    { id: 'cv_critic', label: 'CV Critic', icon: '📄' },
    { id: 'market_analyst', label: 'Market Analyst', icon: '📈' },
    { id: 'graph_rag', label: 'Skill Graph RAG', icon: '🕸️' },
];

const STATUS_BADGE: Record<PipelineStatus, { cls: string; label: string }> = {
    Idle: { cls: 'badge-idle', label: 'Idle' },
    Working: { cls: 'badge-working', label: 'Working' },
    Paused: { cls: 'badge-paused', label: 'Paused — Input Required' },
    Success: { cls: 'badge-success', label: 'Complete' },
    Failed: { cls: 'badge-failed', label: 'Failed' },
    waiting_for_input: { cls: 'badge-paused', label: 'Waiting for Input' },
};

interface Props {
    connected: boolean;
    status: PipelineStatus;
    lastEvent: PipelineEvent | null;
}

function stepState(agentId: string, currentAgent: string | undefined, globalStatus: PipelineStatus) {
    if (globalStatus === 'Success') return 'done';
    if (currentAgent === agentId) return globalStatus === 'Paused' ? 'paused' : 'active';
    const order = AGENTS.map(a => a.id);
    const cur = order.indexOf(currentAgent ?? '');
    const me = order.indexOf(agentId);
    if (cur > me) return 'done';
    return 'idle';
}

export default function AgentStatusCard({ connected, status, lastEvent }: Props) {
    const { cls, label } = STATUS_BADGE[status] ?? STATUS_BADGE.Idle;
    const currentAgent = lastEvent?.current_agent ?? undefined;

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-2">
                <h3>🤖 Pipeline Status</h3>
                <span className={`badge ${cls}`}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                    {label}
                </span>
            </div>

            {!connected && (
                <p className="text-xs text-muted mb-2" style={{ marginBottom: '1rem' }}>
                    WebSocket disconnected — trigger a pipeline run to connect
                </p>
            )}

            <div className="flex flex-col gap-1" style={{ gap: '0.6rem' }}>
                {AGENTS.map(agent => {
                    const state = stepState(agent.id, currentAgent, status);
                    return (
                        <div key={agent.id} className={`pipeline-step${state === 'active' ? ' active' : ''}${state === 'done' ? ' done' : ''}`}>
                            <div className={`step-dot ${state === 'paused' ? 'paused' : state}`} />
                            <span style={{ fontSize: '1.1rem' }}>{agent.icon}</span>
                            <div>
                                <div className="font-medium" style={{ fontSize: '0.88rem' }}>{agent.label}</div>
                                <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{state}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {(status === 'Paused' || status === 'waiting_for_input') && lastEvent?.missing_fields && (
                <div className="alert alert-warn mt-2" style={{ marginTop: '1rem' }}>
                    ⚠️ Missing info detected: <strong>{Array.isArray(lastEvent.missing_fields) ? lastEvent.missing_fields.join(', ') : lastEvent.missing_fields}</strong>
                </div>
            )}

            {status === 'Success' && (
                <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                    ✅ All agents completed successfully!
                </div>
            )}
        </div>
    );
}
