import { Loader2 } from 'lucide-react';

const STAGE_LABELS: Record<number, string> = {
    1: 'Ingesting your CV…',
    2: 'Analysing ATS, skills and market…',
    3: 'Optimising your CV and generating cover letter…',
    4: 'Classifying job tiers…',
    5: 'Building your skill roadmap…',
    6: 'Preparing interview questions…',
    7: 'Finalising…',
};

function formatRelative(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const h = Math.floor(diffMins / 60);
    return `${h} hour${h !== 1 ? 's' : ''} ago`;
}

interface PipelineRunningBannerProps {
    currentStage: number;
    totalStages?: number;
    startedAt?: string | null;
}

export default function PipelineRunningBanner({
    currentStage,
    totalStages = 7,
    startedAt,
}: PipelineRunningBannerProps) {
    const label = STAGE_LABELS[currentStage] ?? `Stage ${currentStage}…`;

    return (
        <div className="w-full rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
            <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#3B82F6]" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1E40AF]">
                        Stage {currentStage} of {totalStages} — {label}
                    </p>
                    {startedAt && (
                        <p className="mt-0.5 text-xs text-[#3B82F6]">
                            Running since: {formatRelative(startedAt)}
                        </p>
                    )}
                </div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#BFDBFE]">
                <div
                    className="h-full animate-pulse rounded-full bg-[#3B82F6]"
                    style={{ width: '40%' }}
                />
            </div>
        </div>
    );
}
