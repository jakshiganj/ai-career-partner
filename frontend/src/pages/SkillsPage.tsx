import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import InteractiveRoadmap from '../components/InteractiveRoadmap';

export default function SkillsPage() {
    const { runResult, loading } = useDashboardData();

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
                        <h2 className="text-2xl font-bold text-[#0F172A]">Skills & Learning</h2>
                        <p className="text-sm text-[#64748B]">Personalized career roadmap and skill gap analysis.</p>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                    <InteractiveRoadmap
                        implicitSkills={data?.implicit_skills ?? undefined}
                    />
                </div>
            </main>
        </div>
    );
}
