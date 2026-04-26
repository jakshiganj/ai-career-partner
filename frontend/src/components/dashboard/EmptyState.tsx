import { FileText, Sparkles, ArrowUpRight } from 'lucide-react';

interface EmptyStateProps {
    onRunPipeline?: () => void;
    onTriggerFeature?: (feature: string) => void;
}

const FEATURES = [
    'ATS Score',
    'Optimise CV',
    'Cover Letter',
    'Job Matches',
    'Skill Roadmap',
    'Interview',
] as const;

export default function EmptyState({ onRunPipeline, onTriggerFeature }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#E0E0E0] bg-[#F9F9F9] p-16 text-center">
            <div className="relative mb-8 flex h-28 w-28 items-center justify-center rounded-lg bg-white border border-[#E0E0E0]">
                <FileText className="h-12 w-12 text-[#A0A0A0]" />
                <div className="absolute -right-2 -top-2 h-10 w-10 flex items-center justify-center rounded-full bg-[#5BC0EB] text-white shadow-lg">
                    <Sparkles className="h-5 w-5" />
                </div>
            </div>
            
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-2">[ INITIAL STATE ]</span>
            <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">No Analysis Results</h2>
            <p className="mt-4 max-w-sm text-sm text-[#4A4A4A] leading-relaxed">
                Your career pipeline is currently idle. Initialize a new analysis run to generate data-driven insights and job matches.
            </p>
            
            {onRunPipeline && (
                <button
                    type="button"
                    onClick={onRunPipeline}
                    className="mt-10 lp-btn-pill"
                >
                    Start Analysis Run
                    <span className="lp-btn-icon"><ArrowUpRight className="h-4 w-4" /></span>
                </button>
            )}
            
            <div className="mt-12 flex flex-wrap justify-center gap-2">
                {FEATURES.map((name) => (
                    <button
                        key={name}
                        type="button"
                        onClick={() => onTriggerFeature?.(name)}
                        className="rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#4A4A4A] hover:bg-[#0D0D0D] hover:text-white hover:border-[#0D0D0D] transition-all"
                    >
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
}
