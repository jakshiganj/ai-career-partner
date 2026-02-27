import { useState, useEffect } from 'react';
import axios from 'axios';
import CVUpload from '../components/CVUpload';
import AgentStatusCard from '../components/AgentStatusCard';
import LinkedInURLInput from '../components/LinkedInURLInput';
import ATSScoreCard from '../components/ATSScoreCard';
import JobCard from '../components/JobCard';
import SkillRoadmap from '../components/SkillRoadmap';
import InterviewReport from '../components/InterviewReport';
import EmailPreferences from '../components/EmailPreferences';
import { useAgentPipeline } from '../hooks/useAgentPipeline';
import { runPipeline } from '../api/pipeline';

export default function DashboardPage() {
    const userId = localStorage.getItem('user_id') || '1'; // Mock '1' for now if missing

    // Feature 9 Dashboard aggregated state
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingData, setLoadingData] = useState(true);

    const { connected, status, lastEvent } = useAgentPipeline({ userId });

    const [cvText, setCvText] = useState('');
    const [goal, setGoal] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [running, setRunning] = useState(false);
    const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);

    // Initial load of Feature 9 dashboard summary
    useEffect(() => {
        fetchDashboardData();
    }, [userId]);

    async function fetchDashboardData() {
        setLoadingData(true);
        try {
            const res = await axios.get(`http://localhost:8000/api/dashboard`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setDashboardData(res.data);
            if (res.data?.cv_health?.ats_score) {
                setCvText("Existing CV loaded..."); // Mocking loaded CV state
            }
        } catch (e) {
            console.error("Dashboard data fetch failed", e);
        } finally {
            setLoadingData(false);
        }
    }

    function handleCVResult(_id: number, _fb: any, preview: string) {
        setCvText(preview);
        // Refresh dashboard stats after a new upload finishes analyzing
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
            setPipelineMsg(`Pipeline started! ID: ${res.pipeline_id}. Watch status card for live updates.`);
        } catch (e: any) {
            setPipelineMsg(e?.response?.data?.detail ?? 'Pipeline failed to start.');
            setRunning(false);
        }
    }

    // Refresh dashboard automatically when the Orchestrator pipeline finishes
    useEffect(() => {
        // useAgentPipeline status returns PipelineStatus which is 'Idle', 'Working', 'Success', 'Failed'
        if (status === 'Success' && running) {
            setRunning(false);
            fetchDashboardData(); // Refetch Feature 5,7,8 outputs
        } else if (status === 'Failed') {
            setRunning(false);
            setPipelineMsg("Pipeline execution failed.");
        }
    }, [status, running]);

    if (loadingData) return <div className="page flex justify-center items-center"><div className="spinner"></div></div>;

    const pipelineState = dashboardData?.job_matches ? dashboardData : null; // Use raw db dashboard data 

    return (
        <div className="page pb-20">
            <div className="container max-w-7xl mx-auto px-4 mt-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Candidate Dashboard</h1>
                        <p className="text-secondary mt-2">Manage your AI Career Partner progression.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN: Inputs & AI Status */}
                    <div className="space-y-6 lg:col-span-1">

                        {/* Profile Input */}
                        <div className="card shadow-sm border border-subtle">
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">1. Professional Profile</h3>

                            <LinkedInURLInput onScrapeComplete={handleImportComplete} />

                            <div className="relative flex py-2 items-center mb-6 mt-4">
                                <div className="flex-grow border-t border-subtle"></div>
                                <span className="flex-shrink-0 mx-4 text-muted text-xs">OR UPLOAD</span>
                                <div className="flex-grow border-t border-subtle"></div>
                            </div>

                            <CVUpload onResult={handleCVResult} />
                        </div>

                        {/* Agent Config & Execution */}
                        <div className="card shadow-sm border border-subtle">
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">2. AI Objectives</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-secondary block mb-1">Target Role</label>
                                    <input
                                        className="form-input text-sm w-full"
                                        placeholder="e.g. Senior Frontend Developer"
                                        value={goal}
                                        onChange={e => setGoal(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-secondary block mb-1">Key Skills</label>
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
                                                <span key={s} className="tag text-xs bg-elevated border-subtle cursor-pointer hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors" onClick={() => setSkills(skills.filter(x => x !== s))}>
                                                    {s} &times;
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {pipelineMsg && <p className={`text-xs ${pipelineMsg.includes('failed') ? 'text-error' : 'text-accent'}`}>{pipelineMsg}</p>}

                                <button
                                    className="btn btn-primary w-full mt-2"
                                    onClick={handleRunPipeline}
                                    disabled={running}
                                >
                                    {running ? <span className="spinner mr-2" /> : "⚡ "}
                                    {running ? 'Running Agents...' : 'Run Analysis Pipeline'}
                                </button>
                            </div>
                        </div>

                        {/* Live Orchestrator Status View */}
                        <AgentStatusCard connected={connected} status={status} lastEvent={lastEvent} />

                    </div>

                    {/* RIGHT COLUMN: AI Agent Outputs (Features 3-8) */}
                    <div className="space-y-6 lg:col-span-2">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Feature 3: ATS Predictor */}
                            {dashboardData?.cv_health?.ats_score ? (
                                <ATSScoreCard
                                    score={dashboardData.cv_health.ats_score}
                                    breakdown={typeof dashboardData.cv_health.feedback === 'object' ? dashboardData.cv_health.feedback : null}
                                />
                            ) : (
                                <div className="card flex items-center justify-center p-8 border-dashed bg-transparent text-muted text-sm text-center">
                                    Run the pipeline to generate your ATS Score Prediction
                                </div>
                            )}

                            {/* Feature 7: Interview Report Mockup Summary */}
                            {dashboardData?.interview_readiness?.last_score ? (
                                <InterviewReport report={{
                                    overall_score: dashboardData.interview_readiness.last_score,
                                    communication: 7, technical_depth: 8, star_method: 9, // Mocks based on DB
                                    feedback: "Great session! You structured answers well but dive deeper technically next time."
                                }} />
                            ) : (
                                <div className="card flex items-center justify-center p-8 border-dashed bg-transparent text-muted text-sm text-center">
                                    Complete a Mock Interview to see your AI Graded Report
                                </div>
                            )}
                        </div>

                        {/* Feature 4: AI CV Critique & Cover Letter */}
                        {(dashboardData?.cv_health?.critique || dashboardData?.cv_health?.cover_letter) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {dashboardData.cv_health.critique && (
                                    <div className="card border border-subtle">
                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                            <span>📝</span> AI Resume Critique
                                        </h3>
                                        <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                            {dashboardData.cv_health.critique}
                                        </div>
                                    </div>
                                )}
                                {dashboardData.cv_health.cover_letter && (
                                    <div className="card border border-subtle">
                                        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                            <span>✉️</span> Tailored Cover Letter
                                        </h3>
                                        <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                            {dashboardData.cv_health.cover_letter}
                                        </div>
                                        <button
                                            className="btn btn-secondary w-full mt-4 text-xs"
                                            onClick={() => navigator.clipboard.writeText(dashboardData.cv_health.cover_letter)}
                                        >
                                            Copy to Clipboard
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Feature 8: Skill Roadmap */}
                        {dashboardData?.skill_progress?.roadmap_exists && dashboardData?.skill_roadmap ? (
                            <SkillRoadmap roadmap={dashboardData.skill_roadmap} />
                        ) : null}

                        {/* Feature 5 & 6: Job Matches & Salary */}
                        {pipelineState?.job_matches?.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 mt-8 flex items-center gap-2">
                                    <span>💼</span> Market Opportunities
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {pipelineState.job_matches.map((match: any, idx: number) => (
                                        <JobCard key={idx} job={match} userExpectedSalary={120000} /> // Mock expected
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Feature 10: Email Digest Settings */}
                        <EmailPreferences />

                    </div>
                </div>
            </div>
        </div>
    );
}
