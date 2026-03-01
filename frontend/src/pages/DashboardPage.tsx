import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { AnimatedGrid } from '../components/ui/animated-grid';
import CVUpload from '../components/CVUpload';
import AgentStatusCard from '../components/AgentStatusCard';
import LinkedInURLInput from '../components/LinkedInURLInput';
import ATSScoreCard from '../components/ATSScoreCard';
import JobCard from '../components/JobCard';
import SkillRoadmap from '../components/SkillRoadmap';
import InterviewReport from '../components/InterviewReport';
import InterviewTrend from '../components/InterviewTrend';
import EmailPreferences from '../components/EmailPreferences';
import MissingDataPrompt from '../components/MissingDataPrompt';
import CVTimeline from '../components/CVTimeline';
import CVDiff from '../components/CVDiff';
import CoverLetterEditor from '../components/CoverLetterEditor';
import { useAgentPipeline } from '../hooks/useAgentPipeline';
import { runPipeline } from '../api/pipeline';

const TABS = [
    { key: 'setup', full: '⚙️  Setup & Ingest', short: '⚙️  Setup' },
    { key: 'analysis', full: '📊 Analysis & Market', short: '📊 Analysis' },
    { key: 'documents', full: '📄 Application Docs', short: '📄 Docs' },
    { key: 'prep', full: '🗺️  Roadmap & Prep', short: '🗺️  Prep' },
] as const;

type TabKey = (typeof TABS)[number]['key'];
type DocTab = 'critique' | 'coverletter' | 'diff';

export default function DashboardPage() {
    const userId = localStorage.getItem('user_id') || '1';

    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);

    const { connected, status, lastEvent } = useAgentPipeline({ userId });

    const [cvText, setCvText] = useState('');
    const [goal, setGoal] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [running, setRunning] = useState(false);
    const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);
    const [pipelineId, setPipelineId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<TabKey>('setup');
    const [docTab, setDocTab] = useState<DocTab>('critique');

    useEffect(() => {
        fetchDashboardData();
    }, [userId]);

    useEffect(() => {
        if (status === 'Success' && running) {
            setRunning(false);
            fetchDashboardData();
            setActiveTab('documents');
        } else if (status === 'Failed') {
            setRunning(false);
            setPipelineMsg("Pipeline execution failed.");
        } else if (status === 'Working' || status === 'waiting_for_input') {
            setActiveTab('analysis');
        }
    }, [status, running]);

    async function fetchDashboardData() {
        setLoadingData(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/dashboard`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setDashboardData(res.data);

            if (res.data?.cv_raw) setCvText(res.data.cv_raw);
            if (res.data?.goal) setGoal(res.data.goal);
            if (res.data?.pipeline_status?.pipeline_id) setPipelineId(res.data.pipeline_status.pipeline_id);

            if (res.data?.cv_health?.ats_score != null) {
                if (status !== 'Working' && status !== 'waiting_for_input') setActiveTab('analysis');
            }
        } catch (e) {
            console.error("Dashboard data fetch failed", e);
        } finally {
            setLoadingData(false);
        }
    }

    function handleCVResult(_id: number, _fb: any, preview: string) {
        setCvText(preview);
        fetchDashboardData();
    }

    function handleImportComplete(profile: any) {
        setPipelineMsg(`Imported LinkedIn profile for ${profile.headline || 'User'}`);
        if (profile.skills) setSkills(profile.skills.slice(0, 5));
        if (profile.summary) setCvText(profile.summary);
    }

    function addSkill(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const s = skillInput.trim();
            if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
            setSkillInput('');
        }
    }

    async function handleRunPipeline() {
        if (!cvText) { setPipelineMsg('Upload a CV or LinkedIn profile first.'); return; }
        if (!goal) { setPipelineMsg('Enter a career goal.'); return; }
        setRunning(true);
        setPipelineMsg(null);
        try {
            const res = await runPipeline({ goal, cv_text: cvText, skills });
            setPipelineId(res.pipeline_id);
            setPipelineMsg(`Pipeline started! ID: ${res.pipeline_id}. Watch status card for live updates.`);
            setActiveTab('analysis');
        } catch (e: any) {
            setPipelineMsg(e?.response?.data?.detail ?? 'Pipeline failed to start.');
            setRunning(false);
        }
    }

    if (loadingData) return (
        <div className="page flex justify-center items-center">
            <div className="spinner" style={{ borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563eb' }} />
        </div>
    );

    const pipelineState = dashboardData?.job_matches ? dashboardData : null;

    return (
        <div className="relative min-h-screen pb-20 font-sans" style={{ color: 'var(--text-primary)' }}>
            <AnimatedGrid />
            <div className="container max-w-7xl mx-auto px-4 relative z-10 pt-10">

                {/* ─── Header ─── */}
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold gradient-text inline-block">Candidate Dashboard</h1>
                    <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Manage your AI Career Partner progression
                    </p>
                </div>

                {/* ─── Tab Navigation ─── */}
                <div className="mb-8 overflow-x-auto pb-1">
                    <div className="tab-bar">
                        {TABS.map(({ key, full, short }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`tab-btn ${activeTab === key ? 'tab-btn-active' : ''}`}
                            >
                                <span className="hidden sm:inline">{full}</span>
                                <span className="sm:hidden">{short}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── HITL Prompt (global) ─── */}
                {status === 'waiting_for_input' && pipelineId && (
                    <MissingDataPrompt
                        pipelineId={pipelineId}
                        missingFields={lastEvent?.missing_fields || []}
                        onResumed={() => setPipelineMsg("Resumed pipeline successfully.")}
                    />
                )}

                {/* ▸▸▸ TAB 1: SETUP & INGEST ▸▸▸ */}
                {activeTab === 'setup' && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                    >
                        {/* Left: Professional Profile */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Professional Profile</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <LinkedInURLInput onScrapeComplete={handleImportComplete} />
                                <div className="divider-text">
                                    <span>or upload</span>
                                </div>
                                <CVUpload onResult={handleCVResult} />

                                {cvText && (
                                    <div className="mt-4 animate-fade-in space-y-2">
                                        <label className="section-label block">Extracted Background Text</label>
                                        <textarea
                                            className="form-input text-sm w-full font-mono bg-slate-50 border-slate-200"
                                            style={{ height: '220px', resize: 'vertical' }}
                                            value={cvText}
                                            onChange={e => setCvText(e.target.value)}
                                            placeholder="Your extracted resume or LinkedIn text will appear here..."
                                        />
                                        <p className="text-xs text-muted leading-tight">
                                            This is the exact text the AI will analyze. Feel free to manually edit it before running the pipeline.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Right: AI Objectives + Email Prefs */}
                        <div className="space-y-5">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">AI Objectives</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="section-label block">Target Role / Job Description</label>
                                        <textarea
                                            className="form-input text-sm w-full"
                                            style={{ height: '120px', resize: 'vertical' }}
                                            placeholder="Paste a job description or Target Role title..."
                                            value={goal}
                                            onChange={e => setGoal(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="section-label block">Key Skills</label>
                                        <input
                                            className="form-input text-sm w-full"
                                            placeholder="Press Enter to add..."
                                            value={skillInput}
                                            onChange={e => setSkillInput(e.target.value)}
                                            onKeyDown={addSkill}
                                        />
                                        {skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {skills.map(s => (
                                                    <span
                                                        key={s}
                                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                        onClick={() => setSkills(skills.filter(x => x !== s))}
                                                    >
                                                        {s} ×
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {pipelineMsg && (
                                        <p className={`text-xs ${pipelineMsg.includes('failed') ? 'text-red font-semibold' : 'text-blue font-medium'}`}>
                                            {pipelineMsg}
                                        </p>
                                    )}

                                    <Button
                                        variant="shiny"
                                        size="lg"
                                        className="w-full mt-2 text-md"
                                        onClick={handleRunPipeline}
                                        disabled={running}
                                    >
                                        {running ? <span className="spinner mr-2" /> : "⚡ "}
                                        {running ? 'Running Agents...' : 'Run Analysis Pipeline'}
                                    </Button>
                                </CardContent>
                            </Card>

                            <EmailPreferences />
                        </div>
                    </motion.div>
                )}

                {/* ▸▸▸ TAB 2: ANALYSIS & MARKET ▸▸▸ */}
                {activeTab === 'analysis' && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-8"
                    >
                        {/* Top row: Pipeline status + ATS score */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <AgentStatusCard connected={connected} status={status} lastEvent={lastEvent} />
                            </div>

                            <div className="lg:col-span-2">
                                {dashboardData?.cv_health?.ats_score != null ? (
                                    <ATSScoreCard
                                        score={dashboardData.cv_health.ats_score}
                                        breakdown={typeof dashboardData.cv_health.feedback === 'object' ? dashboardData.cv_health.feedback : null}
                                    />
                                ) : (
                                    <Card className="border-dashed">
                                        <div className="empty-state">
                                            <div className="empty-state-icon">⚙️</div>
                                            <p className="empty-state-text">Pipeline running to generate ATS prediction…</p>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {/* Full-width: Market Opportunities */}
                        {pipelineState?.job_matches?.length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <span className="text-2xl">💼</span> Market Opportunities
                                </h3>
                                <div className="grid grid-cols-1 gap-5">
                                    {pipelineState.job_matches.map((match: any, idx: number) => (
                                        <JobCard key={idx} job={match} userExpectedSalary={120000} />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ▸▸▸ TAB 3: APPLICATION DOCS ▸▸▸ */}
                {activeTab === 'documents' && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        {/* Left: CV Timeline */}
                        <Card className="lg:col-span-1 p-6">
                            <CVTimeline userId={userId} />
                        </Card>

                        {/* Right: Document panes with React-state sub-tabs */}
                        <Card className="lg:col-span-2 p-0 overflow-hidden">
                            <div className="doc-tab-bar">
                                {([
                                    { key: 'critique' as DocTab, label: '📝 AI Critique' },
                                    { key: 'coverletter' as DocTab, label: '✍️ Cover Letter' },
                                    { key: 'diff' as DocTab, label: '🔍 Version Diff' },
                                ]).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setDocTab(key)}
                                        className={`doc-tab-btn ${docTab === key ? 'doc-tab-btn-active' : ''}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <CardContent className="p-6">
                                {/* AI Critique */}
                                {docTab === 'critique' && (
                                    <div className="animate-fade-in">
                                        {dashboardData?.cv_health?.critique ? (
                                            <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                                {dashboardData.cv_health.critique}
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-state-icon">📝</div>
                                                <p className="empty-state-text">No CV Critique available yet. Run the analysis pipeline to generate one.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Cover Letter */}
                                {docTab === 'coverletter' && (
                                    <div className="animate-fade-in">
                                        {dashboardData?.cv_health?.cover_letter ? (
                                            <CoverLetterEditor
                                                initialContent={dashboardData.cv_health.cover_letter}
                                                onRegenerate={async (tone) => {
                                                    alert(`Mock request to regenerate cover letter using ${tone} tone.`);
                                                    return dashboardData.cv_health.cover_letter;
                                                }}
                                            />
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-state-icon">✍️</div>
                                                <p className="empty-state-text">No cover letter generated yet. Complete the analysis pipeline first.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CV Diff */}
                                {docTab === 'diff' && (
                                    <div className="animate-fade-in">
                                        <CVDiff oldText="Upload a CV and wait for the pipeline to generate versions." newText="" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* ▸▸▸ TAB 4: ROADMAP & PREP ▸▸▸ */}
                {activeTab === 'prep' && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div className="space-y-5">
                            {dashboardData?.skill_roadmap && dashboardData?.skill_progress?.roadmap_exists ? (
                                <Card>
                                    <CardContent className="pt-6">
                                        <SkillRoadmap roadmap={dashboardData.skill_roadmap} />
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border-dashed">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">🗺️</div>
                                        <p className="empty-state-text">Run the pipeline to generate a personalized skill roadmap</p>
                                    </div>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-5">
                            {dashboardData?.interview_readiness?.trend?.length > 0 && (
                                <div className="h-64 mb-4">
                                    <InterviewTrend data={dashboardData.interview_readiness.trend} />
                                </div>
                            )}

                            {dashboardData?.interview_readiness?.report != null ? (
                                <InterviewReport report={dashboardData.interview_readiness.report} />
                            ) : (
                                <Card className="border-dashed">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">🎙️</div>
                                        <p className="empty-state-text">Complete a Mock Interview to see your AI Graded Report</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
