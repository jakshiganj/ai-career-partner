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
        <div className="flex flex-col gap-3 min-w-[240px]">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#0D0D0D] uppercase tracking-[0.15em]">
                    {currentName}
                </span>
                <span className="text-[10px] font-bold text-[#4A4A4A] opacity-60 tabular-nums">
                    {status === 'completed' ? totalStages : Math.max(0, currentStage - 1)} / {totalStages}
                </span>
            </div>
            
            {/* Slim Institutional Progress Bar */}
            <div className="relative h-1 w-full rounded-full bg-[#E0E0E0] overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className={`h-full ${status === 'completed' ? 'bg-[#0D0D0D]' : 'bg-[#5BC0EB]'}`}
                />
            </div>

            {/* Stage Markers (Subtle dots) */}
            <div className="flex justify-between px-0.5 mt-1">
                {STAGES.map((s) => {
                    const isPassed = s.num < currentStage || status === 'completed';
                    const isCurrent = s.num === currentStage && isRunning;
                    
                    return (
                        <div 
                            key={s.num}
                            className={`h-1 w-1 rounded-full transition-all duration-300 ${
                                isPassed ? 'bg-[#0D0D0D]' : 
                                isCurrent ? 'bg-[#5BC0EB] scale-150 shadow-[0_0_8px_rgba(91,192,235,0.6)]' : 
                                'bg-[#E0E0E0]'
                            }`}
                        />
                    );
                })}
            </div>
        </div>
    );
}

