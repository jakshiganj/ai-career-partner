import { useState } from 'react';
import { Briefcase } from 'lucide-react';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';
type Tier = 'Realistic' | 'Stretch' | 'Reach';

export interface JobMatchItem {
    id?: string;
    title: string;
    company: string;
    match_score: number;
    tier: Tier | string;
    missing_skills?: string[];
    salary_min?: number;
    salary_max?: number;
    url?: string;
}

interface JobMatchesCardProps {
    jobs: JobMatchItem[];
    status?: CardStatus;
    onViewAll?: () => void;
}

function formatSalary(min?: number, max?: number): string {
    if (min == null && max == null) return '—';
    if (min != null && max != null) return `LKR ${(min / 1000).toFixed(0)}k – ${(max / 1000).toFixed(0)}k`;
    if (min != null) return `LKR ${(min / 1000).toFixed(0)}k+`;
    return `Up to LKR ${((max ?? 0) / 1000).toFixed(0)}k`;
}

function TierBadge({ tier }: { tier: string }) {
    const green = tier === 'Realistic';
    const yellow = tier === 'Stretch';
    const red = tier === 'Reach';
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
                backgroundColor: green ? '#DCFCE7' : yellow ? '#FEF9C3' : '#FEE2E2',
                color: green ? '#16A34A' : yellow ? '#B45309' : '#DC2626',
            }}
        >
            {green && '🟢'}
            {yellow && '🟡'}
            {red && '🔴'}
            {tier}
        </span>
    );
}

export default function JobMatchesCard({
    jobs,
    status = 'Not Run',
    onViewAll,
}: JobMatchesCardProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const topJobs = jobs.slice(0, 3);
    const hasJobs = topJobs.length > 0;

    if (!hasJobs) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-[#94A3B8]" />
                        <h3 className="font-semibold text-[#0F172A]">Job Matches</h3>
                    </div>
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
                        Not Run
                    </span>
                </div>
                <div className="mt-4 flex h-28 items-center justify-center rounded-lg bg-[#F8FAFC] text-sm text-[#94A3B8]">
                    Job matches will appear after pipeline run
                </div>
            </div>
        );
    }

    const matchPct = (job: JobMatchItem) =>
        job.match_score <= 1 ? Math.round(job.match_score * 100) : Math.round(job.match_score);

    return (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-[#3B82F6]" />
                    <h3 className="font-semibold text-[#0F172A]">Job Matches</h3>
                </div>
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-medium text-[#16A34A]">
                    {status}
                </span>
            </div>

            <ul className="mt-4 space-y-3">
                {topJobs.map((job) => {
                    const id = job.id ?? `${job.title}-${job.company}`;
                    const isExpanded = expandedId === id;
                    return (
                        <li
                            key={id}
                            className="rounded-lg border border-[#E2E8F0] p-3 transition-colors hover:border-[#CBD5E1]"
                            onMouseEnter={() => setExpandedId(id)}
                            onMouseLeave={() => setExpandedId(null)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-[#0F172A] truncate">{job.title}</p>
                                    <p className="text-sm text-[#64748B]">{job.company}</p>
                                </div>
                                <TierBadge tier={job.tier} />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-[#3B82F6]" style={{ fontFamily: "'DM Mono', monospace" }}>
                                    {matchPct(job)}% match
                                </span>
                                <span className="text-[#94A3B8]">
                                    {formatSalary(job.salary_min, job.salary_max)}
                                </span>
                            </div>
                            {(isExpanded || expandedId === id) && job.missing_skills && job.missing_skills.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {job.missing_skills.map((s) => (
                                        <span
                                            key={s}
                                            className="rounded bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#64748B]"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {onViewAll && jobs.length > 3 && (
                <button
                    type="button"
                    onClick={onViewAll}
                    className="mt-4 w-full rounded-lg border border-[#E2E8F0] bg-white py-2 text-sm font-medium text-[#3B82F6] hover:bg-[#EFF6FF]"
                >
                    View All Matches
                </button>
            )}
        </div>
    );
}
