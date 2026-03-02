import { CheckCircle2, Circle } from 'lucide-react';
import { Map } from 'lucide-react';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';

export interface RoadmapStep {
    skill?: string;
    focus?: string;
    weeks?: number;
    duration_weeks?: number;
    completed?: boolean;
    milestones?: string[];
}

interface SkillRoadmapCardProps {
    steps: RoadmapStep[];
    completedCount?: number;
    totalCount?: number;
    status?: CardStatus;
    onViewFull?: () => void;
}

function normalizeSteps(steps: RoadmapStep[]): Array<{ label: string; weeks: number; completed: boolean }> {
    return steps.slice(0, 7).map((s) => ({
        label: s.skill ?? s.focus ?? 'Step',
        weeks: s.weeks ?? s.duration_weeks ?? 0,
        completed: s.completed ?? false,
    }));
}

export default function SkillRoadmapCard({
    steps,
    completedCount,
    totalCount,
    status = 'Not Run',
    onViewFull,
}: SkillRoadmapCardProps) {
    const normalized = normalizeSteps(steps);
    const total = totalCount ?? normalized.length;
    const completed = completedCount ?? normalized.filter((s) => s.completed).length;
    const hasSteps = normalized.length > 0;

    if (!hasSteps) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Map className="h-5 w-5 text-[#94A3B8]" />
                        <h3 className="font-semibold text-[#0F172A]">Skill Roadmap</h3>
                    </div>
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
                        Not Run
                    </span>
                </div>
                <div className="mt-4 flex h-28 items-center justify-center rounded-lg bg-[#F8FAFC] text-sm text-[#94A3B8]">
                    Roadmap will appear after pipeline run
                </div>
            </div>
        );
    }

    const displaySteps = normalized.slice(0, 3);

    return (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-[#3B82F6]" />
                    <h3 className="font-semibold text-[#0F172A]">Skill Roadmap</h3>
                </div>
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-medium text-[#16A34A]">
                    {status}
                </span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
                {displaySteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        {step.completed ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22C55E]" />
                        ) : (
                            <Circle className="h-5 w-5 shrink-0 text-[#3B82F6]" />
                        )}
                        <span className="text-sm font-medium text-[#0F172A]">{step.label}</span>
                        <span className="text-xs text-[#94A3B8]" style={{ fontFamily: "'DM Mono', monospace" }}>
                            · {step.weeks} week{step.weeks !== 1 ? 's' : ''}
                        </span>
                    </div>
                ))}
            </div>

            <p className="mt-3 text-xs text-[#64748B]">
                {completed} of {total} skills completed
            </p>

            {onViewFull && (
                <button
                    type="button"
                    onClick={onViewFull}
                    className="mt-4 w-full rounded-lg border border-[#E2E8F0] bg-white py-2 text-sm font-medium text-[#3B82F6] hover:bg-[#EFF6FF]"
                >
                    View Full Roadmap
                </button>
            )}
        </div>
    );
}
