import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import PipelineTracker from './PipelineTracker';
import PipelineRunningBanner from './PipelineRunningBanner';
import ATSScoreCard from './ATSScoreCard';
import CVOptimisationCard from './CVOptimisationCard';
import CoverLetterCard from './CoverLetterCard';
import JobMatchesCard, { type JobMatchItem } from './JobMatchesCard';
import SkillRoadmapCard, { type RoadmapStep } from './SkillRoadmapCard';
import InterviewReadinessCard from './InterviewReadinessCard';
import EmptyState from './EmptyState';
import OverviewStats from './OverviewStats';
import CVUpload from '../CVUpload';
import {
    getPipelineRuns,
    getPipelineResult,
    getPipelineStatus,
    runPipeline,
    type PipelineRunSummary,
    type PipelineResultState,
} from '../../api/pipeline';
import { getDashboardSummary, type DashboardSummary } from '../../api/dashboard';

const POLL_INTERVAL_MS = 2000;

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
            const company = parts[1]?.trim() ?? 'Sri Lanka';
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

function buildRoadmapSteps(state: PipelineResultState): RoadmapStep[] {
    const raw = state.skill_roadmap;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
        if (typeof item === 'string') return { skill: item, weeks: 0, completed: false };
        const r = item as Record<string, unknown>;
        return {
            skill: r.skill as string | undefined,
            focus: r.focus as string | undefined,
            weeks: (r.weeks as number) ?? (r.duration_weeks as number),
            completed: r.completed as boolean | undefined,
        };
    });
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [runs, setRuns] = useState<PipelineRunSummary[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [runResult, setRunResult] = useState<PipelineResultState | null>(null);
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningPipelineId, setRunningPipelineId] = useState<string | null>(null);
    const [runStatus, setRunStatus] = useState<{ current_stage: number; status: string } | null>(null);
    const [showNewRunModal, setShowNewRunModal] = useState(false);
    const [uploadMode, setUploadMode] = useState<'text' | 'file'>('file');
    const [newRunCv, setNewRunCv] = useState('');
    const [newRunJob, setNewRunJob] = useState('');
    const [startError, setStartError] = useState<string | null>(null);

    const fetchRuns = useCallback(async () => {
        try {
            const { runs: list } = await getPipelineRuns(12);
            setRuns(list);
            if (list.length > 0 && !selectedRunId) {
                setSelectedRunId(list[0].id);
                setRunResult(null);
                setRunStatus(null);
            }
        } catch (e) {
            console.error('Failed to fetch runs', e);
        }
    }, [selectedRunId]);

    const fetchDashboard = useCallback(async () => {
        try {
            const data = await getDashboardSummary();
            setDashboardSummary(data);
            if (data.pipeline_status?.is_running && data.pipeline_status?.pipeline_id) {
                setRunningPipelineId(data.pipeline_status.pipeline_id);
                if (!selectedRunId) {
                    setSelectedRunId(data.pipeline_status.pipeline_id);
                    setRunResult(null);
                    setRunStatus(null);
                }
            }
        } catch (e) {
            console.error('Failed to fetch dashboard', e);
        }
    }, [selectedRunId]);

    const fetchResult = useCallback(async (id: string) => {
        try {
            const result = await getPipelineResult(id);
            setRunResult(result);
        } catch (e) {
            console.error('Failed to fetch run result', e);
            setRunResult(null);
        }
    }, []);

    const fetchStatus = useCallback(async (id: string) => {
        try {
            const status = await getPipelineStatus(id);
            setRunStatus({ current_stage: status.current_stage, status: status.status });
            if (status.status === 'completed' || status.status === 'failed') {
                setRunningPipelineId((prev) => (prev === id ? null : prev));
                await fetchResult(id);
                await fetchRuns();
            }
        } catch {
            setRunStatus(null);
        }
    }, [fetchResult, fetchRuns]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchRuns(), fetchDashboard()]);
            setLoading(false);
        })();
    }, [fetchRuns, fetchDashboard]);

    useEffect(() => {
        if (!selectedRunId) {
            return;
        }
        const load = async () => {
            await fetchResult(selectedRunId);
            await fetchStatus(selectedRunId);
        };
        load();
    }, [selectedRunId, fetchResult, fetchStatus]);

    useEffect(() => {
        if (!runningPipelineId) return;
        const t = setInterval(() => fetchStatus(runningPipelineId), POLL_INTERVAL_MS);
        return () => clearInterval(t);
    }, [runningPipelineId, fetchStatus]);

    const selectedRun = runs.find((r) => r.id === selectedRunId);
    const runLabel = selectedRun?.label ?? 'Dashboard';
    const isRunning = runStatus?.status === 'running' || runStatus?.status === 'waiting_for_input';
    const currentStage = runStatus?.current_stage ?? runResult?.current_stage ?? 0;
    const status = runStatus?.status ?? runResult?.status ?? '';

    const data = runResult ?? (dashboardSummary ? mapDashboardToResult(dashboardSummary) : null);
    const jobMatches: JobMatchItem[] = data
        ? runResult
            ? buildJobMatchesFromState(runResult)
            : ((dashboardSummary?.job_matches ?? []) as Array<{ id: string; title: string; company: string; match_score: number; tier: string; missing_skills?: string[]; salary_min?: number; salary_max?: number; url?: string }>).map((j) => ({
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
    const roadmapSteps = data ? buildRoadmapSteps(runResult ?? mapDashboardToResult(dashboardSummary!) ?? {}) : [];

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
            setRunningPipelineId(pipeline_id);
            setSelectedRunId(pipeline_id);
            await fetchRuns();
            await fetchStatus(pipeline_id);
        } catch (e: unknown) {
            setStartError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to start pipeline');
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sidebar
                runs={runs}
                selectedRunId={selectedRunId}
                onSelectRun={setSelectedRunId}
                hasMoreRuns={runs.length >= 8}
            />

            <main
                className="min-h-screen flex-1 bg-white"
                style={{ marginLeft: SIDEBAR_WIDTH }}
            >
                {/* Top nav */}
                <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white/80 px-6 backdrop-blur">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-[#0F172A]">Pipeline Analysis</h2>
                        <span className="text-[#E2E8F0]">|</span>
                        <div className="relative">
                            <select className="appearance-none rounded-lg border border-[#E2E8F0] bg-transparent py-1.5 pl-3 pr-8 text-sm font-medium text-[#475569] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]">
                                <option>{runLabel}</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowNewRunModal(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                        >
                            <Play className="h-4 w-4" />
                            New Run
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#2563EB]"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Export Report
                        </button>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E2E8F0] text-[#64748B]">
                            <User className="h-4 w-4" />
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    {runs.length === 0 ? (
                        <EmptyState
                            onRunPipeline={() => setShowNewRunModal(true)}
                            onTriggerFeature={() => setShowNewRunModal(true)}
                        />
                    ) : (
                        <>
                            <PipelineTracker
                                currentStage={Math.max(1, currentStage)}
                                status={(status as 'running' | 'completed' | 'failed' | 'partial') || 'completed'}
                                totalStages={7}
                            />

                            {isRunning && (
                                <div className="mt-4">
                                    <PipelineRunningBanner
                                        currentStage={Math.max(1, currentStage)}
                                        totalStages={7}
                                        startedAt={selectedRun?.created_at ?? null}
                                    />
                                </div>
                            )}

                            <div className="mt-8 space-y-6 max-w-7xl mx-auto w-full">
                                <OverviewStats data={data} dashboardSummary={dashboardSummary} />

                                <ATSScoreCard
                                    score={data?.ats_score ?? null}
                                    breakdown={data?.ats_breakdown ?? undefined}
                                    status={data?.ats_score != null ? 'Complete' : 'Not Run'}
                                />
                                <CVOptimisationCard
                                    originalText={data?.cv_raw ?? null}
                                    optimisedText={data?.optimised_cv ?? null}
                                    versionNumber={dashboardSummary?.cv_health?.version}
                                    matchScoreImprovement={null}
                                    status={data?.optimised_cv ? 'Complete' : 'Not Run'}
                                />

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                                    <JobMatchesCard
                                        jobs={jobMatches as JobMatchItem[]}
                                        status={jobMatches.length ? 'Complete' : 'Not Run'}
                                    />
                                    <SkillRoadmapCard
                                        steps={roadmapSteps}
                                        completedCount={roadmapSteps.filter((s) => s.completed).length}
                                        totalCount={roadmapSteps.length}
                                        status={roadmapSteps.length ? 'Complete' : 'Not Run'}
                                    />
                                    <InterviewReadinessCard
                                        scores={
                                            dashboardSummary?.interview_readiness?.report
                                                ? {
                                                    overall: dashboardSummary.interview_readiness.report.overall_score,
                                                    relevance: dashboardSummary.interview_readiness.report.relevance,
                                                    clarity: dashboardSummary.interview_readiness.report.clarity,
                                                    depth: dashboardSummary.interview_readiness.report.depth,
                                                    star_compliance: dashboardSummary.interview_readiness.report.star_compliance,
                                                }
                                                : null
                                        }
                                        tips={dashboardSummary?.interview_readiness?.report?.tips}
                                        questionCount={dashboardSummary?.interview_readiness?.question_bank?.length ?? data?.interview_question_bank?.length ?? 0}
                                        status={dashboardSummary?.interview_readiness?.last_score != null ? 'Complete' : 'Not Run'}
                                        onStartInterview={dashboardSummary?.interview_readiness?.last_score == null ? () => navigate('/interview') : undefined}
                                        onRetake={dashboardSummary?.interview_readiness?.last_score != null ? () => navigate('/interview') : undefined}
                                        onViewReport={dashboardSummary?.interview_readiness?.last_score != null ? () => navigate('/interview/report') : undefined}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {showNewRunModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-lg"
                    >
                        <h3 className="text-lg font-semibold text-[#0F172A]">New Pipeline Run</h3>
                        <p className="mt-1 text-sm text-[#64748B]">Provide your CV and target job description.</p>

                        {/* Input Mode Toggle */}
                        <div className="mt-4 flex rounded-lg border border-[#E2E8F0] p-1 bg-[#F8FAFC]">
                            <button
                                type="button"
                                onClick={() => setUploadMode('file')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${uploadMode === 'file' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                            >
                                Upload PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => setUploadMode('text')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${uploadMode === 'text' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                            >
                                Paste Text
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">1. Your CV</label>
                                {uploadMode === 'file' ? (
                                    <div className="rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 transition-colors hover:border-[#3B82F6] hover:bg-blue-50/50">
                                        <CVUpload onResult={(_id, _fb, redactedText) => setNewRunCv(redactedText)} />
                                    </div>
                                ) : (
                                    <textarea
                                        value={newRunCv}
                                        onChange={(e) => setNewRunCv(e.target.value)}
                                        placeholder="Paste or type your CV content..."
                                        className="w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                                        rows={5}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">2. Target Job Role</label>
                                <textarea
                                    value={newRunJob}
                                    onChange={(e) => setNewRunJob(e.target.value)}
                                    placeholder="Paste the job description or target role..."
                                    className="w-full rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                                    rows={4}
                                />
                            </div>
                        </div>
                        {startError && <p className="mt-2 text-sm text-red-600">{startError}</p>}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => { setShowNewRunModal(false); setStartError(null); }}
                                className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleNewPipelineRun}
                                className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
                            >
                                Start pipeline
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function mapDashboardToResult(d: DashboardSummary): PipelineResultState | null {
    if (!d) return null;
    return {
        ats_score: d.cv_health?.ats_score ?? undefined,
        ats_breakdown: d.cv_health?.feedback ?? undefined,
        cv_raw: d.cv_raw,
        job_description: d.goal,
        cover_letter: d.cv_health?.cover_letter ?? undefined,
        optimised_cv: undefined,
        skill_roadmap: Array.isArray(d.skill_roadmap) ? d.skill_roadmap as PipelineResultState['skill_roadmap'] : undefined,
        interview_question_bank: d.interview_readiness?.question_bank,
        current_stage: d.pipeline_status?.current_stage ?? 0,
        status: d.pipeline_status?.is_running ? 'running' : 'completed',
    };
}
