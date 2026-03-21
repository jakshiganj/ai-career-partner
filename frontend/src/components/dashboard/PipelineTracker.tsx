import { motion } from 'framer-motion';

const STAGES = [
    { num: 1, name: 'Ingest' },
    { num: 2, name: 'Analyse' },
    { num: 3, name: 'Optimise' },
    { num: 4, name: 'Classify' },
    { num: 5, name: 'Roadmap' },
    { num: 6, name: 'Interview Prep' },
    { num: 7, name: 'Complete' },
] as const;

interface PipelineTrackerProps {
    currentStage: number;
    status: 'running' | 'completed' | 'failed' | 'partial' | 'waiting_for_input';
    /** Total stages (7) */
    totalStages?: number;
}

export default function PipelineTracker({
    currentStage,
    status,
    totalStages = 7,
}: PipelineTrackerProps) {
    const isRunning = status === 'running' || status === 'waiting_for_input';
    const completedCount = status === 'completed' ? totalStages : Math.max(0, currentStage - 1);
    const failedStage = status === 'failed' ? currentStage : null;

    return (
        <div className="w-full rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-center gap-0">
                    {STAGES.map((stage, idx) => {
                        const stepNum = stage.num;
                        const isComplete = stepNum < currentStage || status === 'completed';
                        const isCurrent = stepNum === currentStage && isRunning;
                        const isFailed = stepNum === failedStage;
                        const isPending = !isComplete && !isCurrent && !isFailed;

                        return (
                            <div key={stage.num} className="flex flex-1 items-center">
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold"
                                        style={{
                                            fontFamily: "'DM Mono', monospace",
                                            ...(isComplete && {
                                                backgroundColor: '#3B82F6',
                                                borderColor: '#3B82F6',
                                                color: '#fff',
                                            }),
                                            ...(isCurrent && {
                                                borderColor: '#3B82F6',
                                                color: '#3B82F6',
                                                backgroundColor: '#fff',
                                            }),
                                            ...(isFailed && {
                                                borderColor: '#DC2626',
                                                color: '#DC2626',
                                                backgroundColor: '#FEE2E2',
                                            }),
                                            ...(isPending && {
                                                borderColor: '#E2E8F0',
                                                color: '#94A3B8',
                                                backgroundColor: '#F8FAFC',
                                            }),
                                        }}
                                        animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                                        transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
                                    >
                                        {isComplete ? '✓' : stepNum}
                                    </motion.div>
                                    <span
                                        className="mt-1.5 max-w-[72px] text-center text-xs font-medium leading-tight"
                                        style={{
                                            color: isComplete || isCurrent ? '#0F172A' : '#94A3B8',
                                        }}
                                    >
                                        {stage.name}
                                    </span>
                                </div>
                                {idx < STAGES.length - 1 && (
                                    <div
                                        className="mx-1 h-0.5 flex-1 min-w-[8px] rounded"
                                        style={{
                                            backgroundColor: isComplete ? '#3B82F6' : '#E2E8F0',
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div
                    className="shrink-0 text-right text-sm font-medium tabular-nums text-[#64748B]"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                >
                    {completedCount} / {totalStages} stages complete
                </div>
            </div>
        </div>
    );
}
