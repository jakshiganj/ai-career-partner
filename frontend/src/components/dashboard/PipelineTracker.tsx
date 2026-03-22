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
    totalStages?: number;
    /** If true, shows a more compact, low-clutter version */
    compact?: boolean;
}

export default function PipelineTracker({
    currentStage,
    status,
    totalStages = 7,
}: PipelineTrackerProps) {
    const isRunning = status === 'running' || status === 'waiting_for_input';
    const currentName = STAGES.find(s => s.num === currentStage)?.name || (status === 'completed' ? 'Analysis Complete' : 'Initializing...');
    const progressPercent = status === 'completed' ? 100 : ((currentStage - 1) / totalStages) * 100;

    return (
        <div className="flex flex-col gap-2 min-w-[240px]">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A] uppercase tracking-widest">
                    {currentName}
                </span>
                <span className="text-[10px] font-bold text-[#64748B] tabular-nums">
                    {status === 'completed' ? totalStages : Math.max(0, currentStage - 1)} / {totalStages}
                </span>
            </div>
            
            {/* Slim Progress Bar */}
            <div className="relative h-1.5 w-full rounded-full bg-[#F1F5F9] overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className={`h-full ${status === 'completed' ? 'bg-[#16A34A]' : 'bg-[#3B82F6]'}`}
                />
            </div>

            {/* Stage Markers (Optional, very small dots) */}
            <div className="flex justify-between px-0.5 mt-0.5">
                {STAGES.map((s) => {
                    const isPassed = s.num < currentStage || status === 'completed';
                    const isCurrent = s.num === currentStage && isRunning;
                    
                    return (
                        <div 
                            key={s.num}
                            className={`h-1 w-1 rounded-full transition-colors ${
                                isPassed ? 'bg-[#3B82F6]' : 
                                isCurrent ? 'bg-blue-400' : 
                                'bg-[#E2E8F0]'
                            }`}
                        />
                    );
                })}
            </div>
        </div>
    );
}

