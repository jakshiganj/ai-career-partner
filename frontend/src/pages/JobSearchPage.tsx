import { useSearchParams } from 'react-router-dom';
import { type PipelineResultState } from '../api/pipeline';
import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import JobMatchesCard, { type JobMatchItem } from '../components/dashboard/JobMatchesCard';
import CoverLetterCard from '../components/dashboard/CoverLetterCard';
import SalaryInsightsCard from '../components/dashboard/SalaryInsightsCard';
import { Clock } from 'lucide-react';

function buildJobMatchesFromState(state: PipelineResultState): JobMatchItem[] {
    const market = state.market_analysis?.market_analysis;
    if (!market || typeof market !== 'object') return [];
    const jobs: JobMatchItem[] = [];
    const seen = new Set<string>();
    for (const [, info] of Object.entries(market)) {
        if (!info || typeof info !== 'object') continue;
        const snippets = (info as { snippets?: string[] }).snippets ?? [];
        for (const snippet of snippets) {
            const parts = snippet.split(' at ');
            const title = parts[0]?.trim() ?? snippet.trim();
            const company = parts[1]?.trim() ?? 'Unknown';
            const key = `${title.toLowerCase()}|${company}`;
            if (seen.has(key)) continue;
            seen.add(key);
            let match = 0.5;
            if (state.skill_match_score != null) match = state.skill_match_score;
            const tier = match >= 0.8 ? 'Realistic' : match >= 0.5 ? 'Stretch' : 'Reach';
            jobs.push({
                id: key.slice(0, 10),
                title,
                company,
                match_score: match,
                tier,
                missing_skills: state.missing_skills ?? [],
            });
        }
    }
    return jobs.slice(0, 10);
}

export default function JobSearchPage() {
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const { runResult, runs, dashboardSummary, loading } = useDashboardData(runId);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F9F9F9]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#5BC0EB]" />
            </div>
        );
    }

    const data = runResult ?? null;
    const selectedRun = runs.find((r) => r.id === runId);
    const jobMatches: JobMatchItem[] = data
        ? runResult
            ? buildJobMatchesFromState(runResult)
            : (dashboardSummary?.job_matches ?? []).map((j: {
                id: string;
                title: string;
                company: string;
                match_score: number;
                tier: 'Realistic' | 'Stretch' | 'Reach';
                missing_skills: string[];
                salary_min?: number;
                salary_max?: number;
                url?: string;
            }) => ({
                id: j.id,
                title: j.title,
                company: j.company,
                match_score: j.match_score,
                tier: j.tier,
                missing_skills: j.missing_skills,
                salary_min: j.salary_min,
                salary_max: j.salary_max,
                url: j.url,
            }))
        : [];

    return (
        <div className="min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                {/* Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ OPPORTUNITIES ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Market Matches</h2>
                    </div>
                </header>

                <div className="p-12 max-w-7xl mx-auto w-full space-y-10">
                    {selectedRun && (
                        <div className="flex items-center gap-4 rounded-lg border border-[#E0E0E0] bg-[#F9F9F9] px-6 py-4">
                            <Clock className="h-4 w-4 text-[#A0A0A0]" />
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-[#4A4A4A] uppercase tracking-wider opacity-60">SELECTED RUN:</span>
                                <span className="text-sm font-bold text-[#0D0D0D]">
                                    {selectedRun.label || 'Career Analysis'}
                                </span>
                            </div>
                            <span className="text-[11px] font-bold text-[#4A4A4A] ml-auto uppercase tracking-wider opacity-60">
                                {selectedRun.created_at ? new Date(selectedRun.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                        <JobMatchesCard
                            jobs={jobMatches}
                            status={jobMatches.length ? 'Complete' : 'Not Run'}
                        />
                         <SalaryInsightsCard
                            benchmarks={data?.salary_benchmarks}
                            status={data?.salary_benchmarks && Object.keys(data.salary_benchmarks).length > 0 ? 'Complete' : 'Not Run'}
                        />
                    </div>
                    
                    <CoverLetterCard
                        preview={data?.cover_letter ?? null}
                        tone="Formal"
                        wordCount={data?.cover_letter ? data.cover_letter.split(/\s+/).length : null}
                        status={data?.cover_letter ? 'Complete' : 'Not Run'}
                        onCopy={() => {
                            if (data?.cover_letter) {
                                navigator.clipboard.writeText(data.cover_letter);
                            }
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
