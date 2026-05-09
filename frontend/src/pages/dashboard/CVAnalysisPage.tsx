import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../../components/dashboard/Sidebar';
import ATSScoreCard from '../../components/dashboard/ATSScoreCard';
import CVOptimisationCard from '../../components/dashboard/CVOptimisationCard';
import { Clock } from 'lucide-react';

export default function CVAnalysisPage() {
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

    return (
        <div className="min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                {/* Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ ANALYSIS ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">CV Performance</h2>
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
                    <div className="space-y-12">
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
                </div>
            </main>
        </div>
    );
}
