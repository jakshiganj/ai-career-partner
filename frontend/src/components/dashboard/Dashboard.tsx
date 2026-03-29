import { useNavigate } from 'react-router-dom';
import { 
    Play, 
    ArrowRight, 
    LayoutDashboard, 
    Target, 
    Zap, 
    Clock, 
    Briefcase,
    Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import PipelineTracker from './PipelineTracker';
import { useDashboardData } from '../../hooks/useDashboardData';
import EmptyState from './EmptyState';
import { runPipeline } from '../../api/pipeline';
import CVUpload from '../CVUpload';
import { useState } from 'react';

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
    const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
    const [newRunCv, setNewRunCv] = useState('');
    const [newRunJob, setNewRunJob] = useState('');
    const [startError, setStartError] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
            </div>
        );
    }

    const selectedRun = runs.find((r) => r.id === selectedRunId);
    const isRunning = runStatus?.status === 'running' || runStatus?.status === 'waiting_for_input';
    const currentStage = runStatus?.current_stage ?? runResult?.current_stage ?? 0;
    const status = runStatus?.status ?? runResult?.status ?? '';
    const data = runResult ?? (dashboardSummary ? mapDashboardToResult(dashboardSummary) : null);

    async function handleNewPipelineRun() {
        if (!newRunCv.trim() || !newRunJob.trim()) {
            setStartError('Please enter both CV text and job description.');
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
            setStartError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to start pipeline');
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white ml-[280px]">
                {/* Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#F1F5F9] bg-white/80 px-8 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#0F172A]">Overview</h2>
                            <p className="text-xs text-[#64748B]">Your career status at a glance.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowNewRunModal(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/10 hover:bg-[#2563EB] transition-all"
                        >
                            <Play className="h-4 w-4 fill-current" />
                            New Analysis
                        </button>
                    </div>
                </header>

                <div className="p-8 max-w-6xl mx-auto space-y-10">
                    {runs.length === 0 ? (
                        <EmptyState
                            onRunPipeline={() => setShowNewRunModal(true)}
                            onTriggerFeature={() => setShowNewRunModal(true)}
                        />
                    ) : (
                        <>
                            {/* Compact Pipeline Status */}
                            {(isRunning || status === 'completed') && (
                                <section className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isRunning ? 'bg-blue-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
                                            <Activity className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-0.5">{status}</p>
                                            <h3 className="text-lg font-bold text-[#1E3A8A]">
                                                {selectedRun?.label || 'Active Analysis'}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                         <PipelineTracker
                                            currentStage={Math.max(1, currentStage)}
                                            status={(status as 'running' | 'completed' | 'failed' | 'partial' | 'waiting_for_input') || 'completed'}
                                            totalStages={7}
                                        />
                                        <div className="h-10 w-[1px] bg-blue-200" />
                                        <button 
                                            onClick={() => navigate('/dashboard/cv-analysis')}
                                            className="text-sm font-bold text-blue-600 hover:underline"
                                        >
                                            See Details
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Streamlined Quick Links */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <QuickMetricCard 
                                    title="CV Score" 
                                    icon={Target}
                                    color="blue"
                                    onClick={() => navigate('/dashboard/cv-analysis')}
                                    value={data?.ats_score?.toString() ?? '--'}
                                    subText="ATS Match Score"
                                />
                                <QuickMetricCard 
                                    title="Job Matches" 
                                    icon={Briefcase}
                                    color="purple"
                                    onClick={() => navigate('/dashboard/job-search')}
                                    value="12"
                                    subText="Tailored for you"
                                />
                                <QuickMetricCard 
                                    title="Roadmap" 
                                    icon={Zap}
                                    color="orange"
                                    onClick={() => navigate('/dashboard/skills')}
                                    value="4/10"
                                    subText="Steps complete"
                                />
                            </div>

                            {/* Recent Runs - Simplified */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold text-[#0F172A]">Recent Activity</h4>
                                    <button onClick={() => navigate('/dashboard/pipeline-runs')} className="text-sm font-bold text-[#64748B] hover:text-blue-600 transition-colors">View Timeline</button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {runs.slice(0, 3).map((run) => (
                                        <button 
                                            key={run.id}
                                            onClick={() => setSelectedRunId(run.id)}
                                            className={`flex items-center justify-between w-full p-4 rounded-2xl transition-all border ${run.id === selectedRunId ? 'bg-white border-blue-200 shadow-lg shadow-blue-500/5' : 'bg-transparent border-transparent hover:bg-[#F8FAFC]'}`}
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${run.id === selectedRunId ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-400'}`}>
                                                    <Clock className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#0F172A]">{run.label || 'Career Analysis'}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{run.created_at ? new Date(run.created_at).toLocaleDateString() : 'RECENT'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {run.ats_score && (
                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">{run.ats_score}%</span>
                                                )}
                                                <ArrowRight className={`h-4 w-4 transition-transform ${run.id === selectedRunId ? 'text-blue-600' : 'text-gray-300'}`} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>

            {/* Reuse Modal logic */}
            {showNewRunModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full max-w-xl rounded-[32px] border border-[#E2E8F0] bg-white p-10 shadow-2xl"
                    >
                        <h3 className="text-2xl font-bold text-[#0F172A] mb-2">New Analysis</h3>
                        <p className="text-sm text-[#64748B] mb-8">Launch our AI to optimize your application.</p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-3">CV Data</label>
                                {uploadMode === 'file' ? (
                                    <div className="rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-6 hover:border-[#3B82F6] transition-all">
                                        <CVUpload onResult={(_id, _fb, redactedText) => setNewRunCv(redactedText)} />
                                    </div>
                                ) : (
                                    <textarea
                                        value={newRunCv}
                                        onChange={(e) => setNewRunCv(e.target.value)}
                                        placeholder="Paste your CV content..."
                                        className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#0F172A] focus:border-[#3B82F6] transition-all outline-none"
                                        rows={4}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-3">Target Role</label>
                                <textarea
                                    value={newRunJob}
                                    onChange={(e) => setNewRunJob(e.target.value)}
                                    placeholder="e.g. Frontend Developer at Vercel"
                                    className="w-full rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#0F172A] focus:border-[#3B82F6] transition-all outline-none"
                                    rows={3}
                                />
                            </div>
                        </div>
                        {startError && <p className="mt-4 text-sm font-bold text-red-500">{startError}</p>}
                        <div className="mt-10 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowNewRunModal(false)}
                                className="flex-1 rounded-2xl border border-[#E2E8F0] py-4 text-sm font-bold text-[#475569] hover:bg-[#F8FAFC]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleNewPipelineRun}
                                className="flex-[2] rounded-2xl bg-[#0F172A] py-4 text-sm font-extrabold text-white hover:shadow-xl transition-all"
                            >
                                Start AI Agent
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

interface QuickMetricCardProps {
    title: string;
    icon: React.ElementType;
    color: 'blue' | 'purple' | 'orange';
    onClick: () => void;
    value: string;
    subText: string;
}

function QuickMetricCard({ title, icon: Icon, color, onClick, value, subText }: QuickMetricCardProps) {
    const colorMap: Record<'blue' | 'purple' | 'orange', string> = {
        blue: 'text-blue-600 bg-blue-50',
        purple: 'text-purple-600 bg-purple-50',
        orange: 'text-orange-600 bg-orange-50',
    };
    
    return (
        <button 
            onClick={onClick}
            className="group flex items-center gap-5 rounded-2xl border border-[#F1F5F9] bg-white p-5 text-left transition-all hover:shadow-xl hover:shadow-blue-500/5"
        >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all group-hover:scale-110 ${colorMap[color]}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-0.5">{title}</h4>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-[#0F172A]">{value}</span>
                    <span className="text-[10px] font-bold text-[#64748B]">{subText}</span>
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
