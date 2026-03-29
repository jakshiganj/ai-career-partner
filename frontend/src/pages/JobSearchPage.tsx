import { type PipelineResultState } from '../api/pipeline';
import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import JobMatchesCard, { type JobMatchItem } from '../components/dashboard/JobMatchesCard';
import CoverLetterCard from '../components/dashboard/CoverLetterCard';
import SalaryInsightsCard from '../components/dashboard/SalaryInsightsCard';

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
    const { runResult, dashboardSummary, loading } = useDashboardData();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
            </div>
        );
    }

    const data = runResult ?? null;
    const jobMatches: JobMatchItem[] = data
        ? runResult
            ? buildJobMatchesFromState(runResult)
            : (dashboardSummary?.job_matches ?? []).map((j: { id: string; title: string; company: string; match_score: number; tier: string; missing_skills?: string[]; salary_min?: number; salary_max?: number; url?: string; }) => ({
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
        <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#F1F5F9] bg-white/80 px-8 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">Job Search</h2>
                        <p className="text-sm text-[#64748B]">Explore tailored job matches and generated assets.</p>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
