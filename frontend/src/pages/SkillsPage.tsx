import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import InteractiveRoadmap from '../components/InteractiveRoadmap';
import { Clock } from 'lucide-react';

export default function SkillsPage() {
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const { runResult, runs, loading } = useDashboardData(runId);

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
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ GROWTH ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Skill Roadmap</h2>
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
                    <InteractiveRoadmap
                        implicitSkills={data?.implicit_skills ?? undefined}
                        pipelineId={runId ?? undefined}
                    />
                </div>
            </main>
        </div>
    );
}
