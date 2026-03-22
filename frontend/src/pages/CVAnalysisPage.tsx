import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import ATSScoreCard from '../components/dashboard/ATSScoreCard';
import CVOptimisationCard from '../components/dashboard/CVOptimisationCard';

export default function CVAnalysisPage() {
    const { runResult, dashboardSummary, loading } = useDashboardData();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
            </div>
        );
    }

    const data = runResult ?? null;

    return (
        <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#F1F5F9] bg-white/80 px-8 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">CV Analysis</h2>
                        <p className="text-sm text-[#64748B]">Deep dive into your CV performance and optimization.</p>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                    <ATSScoreCard
                        score={data?.ats_score ?? null}
                        breakdown={data?.ats_breakdown ?? undefined}
                        status={data?.ats_score != null ? 'Complete' : 'Not Run'}
                    />
                    <CVOptimisationCard
                        originalText={data?.cv_raw ?? null}
                        optimisedText={
                            typeof data?.optimised_cv === 'string'
                                ? data.optimised_cv
                                : (data?.optimised_cv as unknown as { cv_markdown?: string })?.cv_markdown ?? null
                        }
                        critique={data?.critique ?? null}
                        versionNumber={dashboardSummary?.cv_health?.version}
                        matchScoreImprovement={null}
                        status={data?.optimised_cv ? 'Complete' : 'Not Run'}
                    />
                </div>
            </main>
        </div>
    );
}
