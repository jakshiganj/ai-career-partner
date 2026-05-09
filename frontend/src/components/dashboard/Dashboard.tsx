import { useNavigate } from 'react-router-dom';
import { 
    ArrowRight, 
    Target, 
    Zap, 
    Briefcase,
    Activity,
    ArrowUpRight
} from 'lucide-react';
import Sidebar from './Sidebar';
import PipelineTracker from './PipelineTracker';
import { useDashboardData } from '../../hooks/useDashboardData';
import EmptyState from './EmptyState';
import { useState } from 'react';
import PricingModal from '../ui/PricingModal';
import QuickMetricCard from './QuickMetricCard';
import RecentActivityList from './RecentActivityList';
import NewRunModal from './NewRunModal';
import { mapDashboardToResult } from './dashboardUtils';

export default function Dashboard() {
    const navigate = useNavigate();
    const { 
        runs, 
        selectedRunId, 
        setSelectedRunId, 
        runResult, 
        dashboardSummary, 
        loading, 
        runStatus, 
        refresh
    } = useDashboardData();

    const [showNewRunModal, setShowNewRunModal] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F9F9F9]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#5BC0EB]" />
            </div>
        );
    }

    const selectedRun = runs.find((r) => r.id === selectedRunId);
    const isRunning = runStatus?.status === 'running' || runStatus?.status === 'waiting_for_input';
    const currentStage = runStatus?.current_stage ?? runResult?.current_stage ?? 0;
    const status = runStatus?.status ?? runResult?.status ?? '';
    const data = runResult ?? (dashboardSummary ? mapDashboardToResult(dashboardSummary) : null);

    return (
        <div className="min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white ml-[280px]">
                {/* Clean Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ OVERVIEW ]</span>
                            <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Account Dashboard</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowNewRunModal(true)}
                            className="lp-btn-pill"
                        >
                            New Analysis
                            <span className="lp-btn-icon"><ArrowUpRight className="h-4 w-4" /></span>
                        </button>
                    </div>
                </header>

                <div className="p-12 max-w-6xl mx-auto space-y-12">
                    {runs.length === 0 ? (
                        <EmptyState
                            onRunPipeline={() => setShowNewRunModal(true)}
                            onTriggerFeature={() => setShowNewRunModal(true)}
                        />
                    ) : (
                        <>
                            {/* Pipeline Status Section */}
                            {(isRunning || status === 'completed') && (
                                <section className="relative overflow-hidden rounded-xl border border-[#E0E0E0] bg-[#F9F9F9] p-8 transition-all hover:border-[#5BC0EB]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${isRunning ? 'bg-[#5BC0EB] text-white animate-pulse' : 'bg-[#0D0D0D] text-white'}`}>
                                                <Activity className="h-7 w-7" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-1">
                                                    [ {status.toUpperCase()} ]
                                                </span>
                                                <h3 className="text-xl font-bold text-[#0D0D0D]">
                                                    {selectedRun?.label || 'Career Analysis Pipeline'}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-10">
                                             <PipelineTracker
                                                currentStage={Math.max(1, currentStage)}
                                                status={(status as 'running' | 'completed' | 'failed' | 'partial' | 'waiting_for_input') || 'completed'}
                                                totalStages={7}
                                            />
                                            <div className="h-10 w-[1px] bg-[#E0E0E0]" />
                                            <button 
                                                onClick={() => navigate(`/dashboard/cv-analysis?runId=${selectedRunId}`)}
                                                className="group flex items-center gap-2 text-sm font-bold text-[#0D0D0D] hover:text-[#5BC0EB] transition-colors"
                                            >
                                                View Analysis
                                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Bento Grid Metrics */}
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-6">[ QUICK METRICS ]</span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <QuickMetricCard 
                                        title="CV SCORE" 
                                        icon={Target}
                                        onClick={() => navigate(`/dashboard/cv-analysis${selectedRunId ? `?runId=${selectedRunId}` : ''}`)}
                                        value={data?.ats_score?.toString() ?? '--'}
                                        subText="ATS Match Performance"
                                    />
                                    <QuickMetricCard 
                                        title="JOB MATCHES" 
                                        icon={Briefcase}
                                        onClick={() => navigate(`/dashboard/job-search${selectedRunId ? `?runId=${selectedRunId}` : ''}`)}
                                        value={(() => {
                                            const marketData = (data as { market_analysis?: { market_analysis?: Record<string, { snippets?: unknown[] }> } })?.market_analysis?.market_analysis || {};
                                            let count = 0;
                                            Object.values(marketData).forEach((info) => {
                                                if (info?.snippets) count += info.snippets.length;
                                            });
                                            return count > 0 ? count.toString() : "0";
                                        })()}
                                        subText="Curated opportunities"
                                    />
                                    <QuickMetricCard 
                                        title="ROADMAP" 
                                        icon={Zap}
                                        onClick={() => navigate(`/dashboard/skills${selectedRunId ? `?runId=${selectedRunId}` : ''}`)}
                                        value={(() => {
                                            const phases = data?.skill_roadmap || [];
                                            let completed = 0;
                                            let total = 0;
                                            (phases as Array<{ action_items?: Array<{ completed: boolean }>; milestones?: Array<{ completed: boolean }> }>).forEach((p) => {
                                                const items = p.action_items || p.milestones || [];
                                                total += items.length;
                                                completed += items.filter((i) => i.completed).length;
                                            });
                                            return total > 0 ? `${completed}/${total}` : "--";
                                        })()}
                                        subText="Action items completed"
                                    />
                                </div>
                            </div>

                            {/* Recent Activity List */}
                            <RecentActivityList
                                runs={runs}
                                selectedRunId={selectedRunId}
                                onSelect={(id) => {
                                    setSelectedRunId(id);
                                    navigate(`/dashboard?runId=${id}`);
                                }}
                                onViewAll={() => navigate('/dashboard/pipeline-runs')}
                            />
                        </>
                    )}
                </div>
            </main>

            {showNewRunModal && (
                <NewRunModal
                    onClose={() => setShowNewRunModal(false)}
                    onSuccess={(pipelineId) => {
                        setShowNewRunModal(false);
                        refresh();
                        navigate(`/dashboard?runId=${pipelineId}`);
                    }}
                    onUpgradeRequired={() => {
                        setShowNewRunModal(false);
                        setShowPricingModal(true);
                    }}
                />
            )}
            
            {showPricingModal && (
                <PricingModal onClose={() => setShowPricingModal(false)} />
            )}
        </div>
    );
}
