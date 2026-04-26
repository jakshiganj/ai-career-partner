import { useNavigate } from 'react-router-dom';
import { 
    ArrowRight, 
    Target, 
    Zap, 
    Clock, 
    Briefcase,
    Activity,
    ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import PipelineTracker from './PipelineTracker';
import { useDashboardData } from '../../hooks/useDashboardData';
import EmptyState from './EmptyState';
import { runPipeline } from '../../api/pipeline';
import CVUpload from '../CVUpload';
import { useState, useCallback } from 'react';
import PricingModal from '../ui/PricingModal';

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
    const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
    const [newRunCv, setNewRunCv] = useState('');
    const [newRunJob, setNewRunJob] = useState('');
    const [startError, setStartError] = useState<string | null>(null);
    const [isCvLoading, setIsCvLoading] = useState(false);

    const handleCvLoading = useCallback((loadingVal: boolean) => {
        setIsCvLoading(loadingVal);
    }, []);

    const handleCvResult = useCallback((_id: number, _fb: unknown, redactedText: string) => {
        setNewRunCv(redactedText);
    }, []);

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

    async function handleNewPipelineRun() {
        if (!newRunCv.trim()) {
            setStartError('Please provide your CV (upload PDF or paste text).');
            return;
        }
        if (!newRunJob.trim()) {
            setStartError('Please enter the target role or job description.');
            return;
        }
        setStartError(null);
        try {
            const { pipeline_id } = await runPipeline({
                goal: newRunJob,
                cv_text: newRunCv,
                skills: [],
            });
            setShowNewRunModal(false);
            setUploadMode('file');
            setNewRunCv('');
            setNewRunJob('');
            refresh();
            navigate(`/dashboard?runId=${pipeline_id}`);
        } catch (e: unknown) {
            const error = e as { response?: { data?: { detail?: string | { code?: string } } } };
            const detail = error.response?.data?.detail;
            if (detail && typeof detail !== 'string' && detail.code === "UPGRADE_REQUIRED") {
                setShowNewRunModal(false);
                setShowPricingModal(true);
            } else {
                setStartError(typeof detail === 'string' ? detail : 'Failed to start pipeline');
            }
        }
    }

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
                                            phases.forEach((p: any) => {
                                                const items = p.action_items || p.milestones || [];
                                                total += items.length;
                                                completed += items.filter((i: any) => i.completed).length;
                                            });
                                            return total > 0 ? `${completed}/${total}` : "--";
                                        })()}
                                        subText="Action items completed"
                                    />
                                </div>
                            </div>

                            {/* Recent Activity List */}
                            <section className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block">[ RECENT ACTIVITY ]</span>
                                    <button onClick={() => navigate('/dashboard/pipeline-runs')} className="text-xs font-bold text-[#4A4A4A] hover:text-[#0D0D0D] transition-colors border-b border-[#E0E0E0] pb-0.5">View All Runs</button>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {runs.slice(0, 3).map((run) => (
                                        <button 
                                            key={run.id}
                                            onClick={() => {
                                                setSelectedRunId(run.id);
                                                navigate(`/dashboard?runId=${run.id}`);
                                            }}
                                            className={`flex items-center justify-between w-full p-6 rounded-xl transition-all border ${run.id === selectedRunId ? 'bg-[#F9F9F9] border-[#0D0D0D]' : 'bg-white border-[#E0E0E0] hover:border-[#0D0D0D]'}`}
                                        >
                                            <div className="flex items-center gap-6 text-left">
                                                <div className={`h-12 w-12 flex items-center justify-center rounded-lg transition-all ${run.id === selectedRunId ? 'bg-[#0D0D0D] text-white' : 'bg-[#F9F9F9] text-[#A0A0A0]'}`}>
                                                    <Clock className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-[#0D0D0D] tracking-tight">{run.label || 'Career Analysis'}</p>
                                                    <p className="text-[10px] text-[#4A4A4A] font-bold uppercase tracking-[0.15em] opacity-60">{run.created_at ? new Date(run.created_at).toLocaleDateString() : 'RECENT'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                {run.ats_score && (
                                                    <div className="text-right">
                                                        <span className="block text-[10px] font-bold uppercase text-[#4A4A4A] opacity-60 mb-0.5">SCORE</span>
                                                        <span className="text-sm font-bold text-[#0D0D0D] bg-[#F9F9F9] border border-[#E0E0E0] px-3 py-1 rounded-full">{run.ats_score}%</span>
                                                    </div>
                                                )}
                                                <div className={`h-8 w-8 flex items-center justify-center rounded-full border transition-all ${run.id === selectedRunId ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-[#A0A0A0] border-[#E0E0E0]'}`}>
                                                    <ArrowRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>

            {/* Redesigned Modal matching institutional style */}
            {showNewRunModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D0D0D]/60 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-xl rounded-lg border border-[#E0E0E0] bg-white p-10 shadow-2xl"
                    >
                        <div className="mb-10">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-2">[ NEW PIPELINE ]</span>
                            <h3 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Launch Analysis</h3>
                            <p className="text-sm text-[#4A4A4A] mt-2">Initialize our multi-agent pipeline to optimize your career path.</p>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">RESUME INPUT</label>
                                    <div className="flex gap-2 p-1 bg-[#F9F9F9] border border-[#E0E0E0] rounded-lg">
                                        <button 
                                            onClick={() => setUploadMode('file')}
                                            className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${uploadMode === 'file' ? 'bg-white text-[#0D0D0D] shadow-sm' : 'text-[#4A4A4A] hover:text-[#0D0D0D]'}`}
                                        >
                                            PDF
                                        </button>
                                        <button 
                                            onClick={() => setUploadMode('text')}
                                            className={`px-4 py-1.5 text-[11px] font-bold rounded-md transition-all ${uploadMode === 'text' ? 'bg-white text-[#0D0D0D] shadow-sm' : 'text-[#4A4A4A] hover:text-[#0D0D0D]'}`}
                                        >
                                            TEXT
                                        </button>
                                    </div>
                                </div>
                                
                                {uploadMode === 'file' ? (
                                    <div className="rounded-lg border-2 border-dashed border-[#E0E0E0] bg-[#F9F9F9] p-8 hover:border-[#5BC0EB] transition-all">
                                        <CVUpload 
                                            onResult={handleCvResult} 
                                            onLoading={handleCvLoading}
                                        />
                                    </div>
                                ) : (
                                    <textarea
                                        value={newRunCv}
                                        onChange={(e) => setNewRunCv(e.target.value)}
                                        placeholder="Paste content here..."
                                        className="w-full rounded-lg border border-[#E0E0E0] bg-white p-5 text-sm text-[#0D0D0D] focus:border-[#5BC0EB] transition-all outline-none min-h-[160px] font-medium"
                                        rows={4}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0D0D0D] block mb-4">TARGET POSITION</label>
                                <textarea
                                    value={newRunJob}
                                    onChange={(e) => setNewRunJob(e.target.value)}
                                    placeholder="e.g. Senior Software Engineer at Apple"
                                    className="w-full rounded-lg border border-[#E0E0E0] bg-white p-5 text-sm text-[#0D0D0D] focus:border-[#5BC0EB] transition-all outline-none font-medium"
                                    rows={3}
                                />
                            </div>
                        </div>
                        
                        {startError && (
                            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">{startError}</p>
                            </div>
                        )}
                        
                        <div className="mt-12 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowNewRunModal(false)}
                                className="flex-1 rounded-lg border border-[#E0E0E0] py-4 text-xs font-bold text-[#4A4A4A] uppercase tracking-widest hover:bg-[#F9F9F9] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isCvLoading}
                                onClick={handleNewPipelineRun}
                                className={`flex-[2] rounded-lg py-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition-all ${isCvLoading ? 'bg-[#A0A0A0] cursor-not-allowed' : 'bg-[#0D0D0D] hover:bg-[#5BC0EB]'}`}
                            >
                                {isCvLoading ? 'PROCESSING...' : 'INITIALIZE AGENT'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            
            {showPricingModal && (
                <PricingModal onClose={() => setShowPricingModal(false)} />
            )}
        </div>
    );
}

interface QuickMetricCardProps {
    title: string;
    icon: React.ElementType;
    onClick: () => void;
    value: string;
    subText: string;
}

function QuickMetricCard({ title, icon: Icon, onClick, value, subText }: QuickMetricCardProps) {
    return (
        <button 
            onClick={onClick}
            className="group flex flex-col gap-6 rounded-xl border border-[#E0E0E0] bg-white p-8 text-left transition-all hover:border-[#5BC0EB] hover:bg-[#F9F9F9]"
        >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0D0D0D] text-white transition-all group-hover:bg-[#5BC0EB]">
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-2">{title}</span>
                <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-[#0D0D0D] tracking-tight">{value}</span>
                    <span className="text-[11px] font-bold text-[#4A4A4A] opacity-60">{subText}</span>
                </div>
            </div>
        </button>
    );
}

import { type PipelineResultState } from '../../api/pipeline';

function mapDashboardToResult(d: unknown): PipelineResultState | null {
    if (!d) return null;
    interface DResult {
        cv_health?: { ats_score?: number; feedback?: unknown; cover_letter?: string };
        cv_raw?: string;
        goal?: string;
        skill_roadmap?: unknown;
        interview_readiness?: { question_bank?: unknown };
        pipeline_status?: { current_stage?: number; is_running?: boolean };
    }
    const val = d as DResult;
    return {
        ats_score: val.cv_health?.ats_score ?? undefined,
        ats_breakdown: val.cv_health?.feedback as Record<string, unknown> | null | undefined,
        cv_raw: val.cv_raw,
        job_description: val.goal,
        cover_letter: val.cv_health?.cover_letter ?? undefined,
        optimised_cv: undefined,
        skill_roadmap: Array.isArray(val.skill_roadmap) ? (val.skill_roadmap as PipelineResultState['skill_roadmap']) : undefined,
        interview_question_bank: val.interview_readiness?.question_bank as string[] | null | undefined,
        current_stage: val.pipeline_status?.current_stage ?? 0,
        status: val.pipeline_status?.is_running ? 'running' : 'completed',
    };
}
