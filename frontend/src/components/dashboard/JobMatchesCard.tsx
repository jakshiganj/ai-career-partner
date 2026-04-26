import { useState } from 'react';
import { Briefcase, ArrowUpRight } from 'lucide-react';

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
    if (min == null && max == null) return 'NEGOTIABLE';
    if (min != null && max != null) return `LKR ${(min / 1000).toFixed(0)}K – ${(max / 1000).toFixed(0)}K`;
    if (min != null) return `LKR ${(min / 1000).toFixed(0)}K+`;
    return `UP TO LKR ${((max ?? 0) / 1000).toFixed(0)}K`;
}

function TierBadge({ tier }: { tier: string }) {
    const realistic = tier === 'Realistic';
    const stretch = tier === 'Stretch';
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${realistic ? 'bg-[#16A34A] text-white' : stretch ? 'bg-[#F4D35E] text-[#0D0D0D]' : 'bg-[#EE6C4D] text-white'}`}
        >
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
            <div className="rounded-xl border border-[#E0E0E0] bg-white p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-[#0D0D0D]" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Market Opportunities</h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">
                        [ NO DATA ]
                    </span>
                </div>
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#E0E0E0] bg-[#F9F9F9] text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">
                    Market scanning will begin post-analysis.
                </div>
            </div>
        );
    }

    const matchPct = (job: JobMatchItem) =>
        job.match_score <= 1 ? Math.round(job.match_score * 100) : Math.round(job.match_score);

    return (
        <div className="rounded-xl border border-[#E0E0E0] bg-white p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-[#0D0D0D]" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Strategic Job Matches</h3>
                </div>
                <span className="rounded-full bg-[#0D0D0D] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                    {status}
                </span>
            </div>

            <ul className="space-y-4">
                {topJobs.map((job) => {
                    const id = job.id ?? `${job.title}-${job.company}`;
                    const isExpanded = expandedId === id;
                    return (
                        <li
                            key={id}
                            className="rounded-xl border border-[#E0E0E0] bg-[#F9F9F9] p-5 transition-all hover:border-[#0D0D0D] group"
                            onMouseEnter={() => setExpandedId(id)}
                            onMouseLeave={() => setExpandedId(null)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-[#0D0D0D] truncate group-hover:text-[#5BC0EB] transition-colors">{job.title}</p>
                                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">{job.company}</p>
                                </div>
                                <TierBadge tier={job.tier} />
                            </div>
                            
                            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-6">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">MATCH INDEX</p>
                                        <p className="mt-1 text-sm font-bold text-[#5BC0EB]">{matchPct(job)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">SALARY EST.</p>
                                        <p className="mt-1 text-sm font-bold text-[#0D0D0D]">{formatSalary(job.salary_min, job.salary_max)}</p>
                                    </div>
                                </div>
                                {job.url && (
                                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-8 w-8 rounded-full border border-[#E0E0E0] bg-white text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all">
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </a>
                                )}
                            </div>

                            {isExpanded && job.missing_skills && job.missing_skills.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-[#E0E0E0]">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#EE6C4D] mb-3">CRITICAL SKILL GAPS</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {job.missing_skills.map((s) => (
                                            <span
                                                key={s}
                                                className="rounded bg-white border border-[#E0E0E0] px-2 py-1 text-[10px] font-bold text-[#0D0D0D]"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
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
                    className="mt-8 w-full rounded-lg border border-[#0D0D0D] bg-white py-3 text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all shadow-lg shadow-black/5"
                >
                    Expand Market View
                </button>
            )}
        </div>
    );
}
