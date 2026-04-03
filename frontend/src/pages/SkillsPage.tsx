import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import InteractiveRoadmap from '../components/InteractiveRoadmap';
import { Clock } from 'lucide-react';
import type { RoadmapPhase } from '../api/roadmap';

export default function SkillsPage() {
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const { runResult, runs, loading } = useDashboardData(runId);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
            </div>
        );
    }

    const data = runResult ?? null;
    const selectedRun = runs.find((r) => r.id === runId);

    // Pass the per-run roadmap phases from state_json
    const pipelineRoadmap = Array.isArray(data?.skill_roadmap) ? (data.skill_roadmap as unknown as RoadmapPhase[]) : undefined;

    return (
        <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#F1F5F9] bg-white/80 px-8 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">Skills & Learning</h2>
                        <p className="text-sm text-[#64748B]">Personalized career roadmap and skill gap analysis.</p>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                    {selectedRun && (
                        <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-3">
                            <Clock className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold text-blue-800">
                                Viewing: <span className="font-bold">{selectedRun.label || 'Career Analysis'}</span>
                            </span>
                            <span className="text-xs text-blue-500 ml-auto">
                                {selectedRun.created_at ? new Date(selectedRun.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                            </span>
                        </div>
                    )}
                    <InteractiveRoadmap
                        implicitSkills={data?.implicit_skills ?? undefined}
                        pipelineRoadmap={pipelineRoadmap}
                    />
                </div>
            </main>
        </div>
    );
}
