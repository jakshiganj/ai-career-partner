import { BarChart2, Key, Layout, Type, Star } from 'lucide-react';
import type { PipelineResultState } from '../../api/pipeline';
import type { DashboardSummary } from '../../api/dashboard';

interface OverviewStatsProps {
    data: PipelineResultState | null;
    dashboardSummary: DashboardSummary | null;
}

export default function OverviewStats({ data, dashboardSummary }: OverviewStatsProps) {
    const atsScore = data?.ats_score ?? dashboardSummary?.cv_health?.ats_score ?? 0;

    interface BreakdownData {
        matching_keywords?: string[];
        missing_keywords?: string[];
        formatting?: number;
    }

    // Calculate keyword hits (mock logic as actual data structure might vary)
    let keywordHits = 0;
    let keywordTarget = 0;
    const breakdown = (data?.ats_breakdown ?? dashboardSummary?.cv_health?.feedback) as BreakdownData | undefined;
    if (breakdown && typeof breakdown === 'object') {
        const matching = Array.isArray(breakdown.matching_keywords) ? breakdown.matching_keywords.length : 0;
        const missing = Array.isArray(breakdown.missing_keywords) ? breakdown.missing_keywords.length : 0;
        keywordHits = matching;
        keywordTarget = matching + missing;
    }

    // Formatting score
    const formattingScore = breakdown && typeof breakdown.formatting === 'number'
        ? breakdown.formatting
        : (atsScore > 0 ? Math.min(100, atsScore + 10) : 0);

    // Word count
    const wordCount = data?.cv_raw ? data.cv_raw.split(/\s+/).length : 0;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#64748B]">Match Potential</p>
                    <BarChart2 className="h-5 w-5 text-[#3B82F6]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0F172A] leading-none tracking-tight">{atsScore}%</span>
                    {atsScore > 0 && <span className="text-sm font-medium text-[#16A34A]">+5%</span>}
                </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#64748B]">Keyword Hits</p>
                    <Key className="h-5 w-5 text-[#A855F7]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0F172A] leading-none tracking-tight">{keywordHits}</span>
                    <span className="text-sm font-medium text-[#64748B]">/ {keywordTarget || '--'} Target</span>
                </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#64748B]">Formatting</p>
                    <Layout className="h-5 w-5 text-[#F97316]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0F172A] leading-none tracking-tight">{formattingScore}%</span>
                    <span className="text-sm font-medium text-[#16A34A]">
                        {formattingScore >= 90 ? 'Excellent' : formattingScore >= 70 ? 'Good' : 'Needs Work'}
                    </span>
                </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#64748B]">Word Count</p>
                    <Type className="h-5 w-5 text-[#38BDF8]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0F172A] leading-none tracking-tight">{wordCount}</span>
                    <span className="text-sm font-medium text-[#64748B]">
                        {wordCount > 400 && wordCount < 800 ? 'Optimal' : wordCount > 0 ? 'Review' : '--'}
                    </span>
                </div>
            </div>
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#64748B]">Candidate Tier</p>
                    <Star className="h-5 w-5 text-[#EAB308]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#0F172A] leading-none tracking-tight">{data?.job_tier || '--'}</span>
                    {data?.job_tier && <span className="text-sm font-medium text-[#EAB308]">GraphRAG</span>}
                </div>
            </div>
        </div>
    );
}
