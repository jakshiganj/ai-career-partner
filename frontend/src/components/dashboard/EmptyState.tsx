import { FileText, Sparkles } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white p-12 text-center shadow-sm">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#F1F5F9]">
                <FileText className="h-10 w-10 text-[#94A3B8]" />
                <Sparkles className="absolute -right-1 -top-1 h-6 w-6 text-[#3B82F6]" />
            </div>
            <h2 className="text-xl font-bold text-[#0F172A]">No analysis yet</h2>
            <p className="mt-2 max-w-md text-sm text-[#64748B]">
                Upload your CV and a job description to run your first pipeline analysis, or trigger
                individual features below.
            </p>
            {onRunPipeline && (
                <button
                    type="button"
                    onClick={onRunPipeline}
                    className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"
                >
                    New Pipeline Run
                </button>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
                {FEATURES.map((name) => (
                    <button
                        key={name}
                        type="button"
                        onClick={() => onTriggerFeature?.(name)}
                        className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"
                    >
                        {name}
                    </button>
                ))}
            </div>
        </div>
    );
}
