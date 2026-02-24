import { useState } from 'react';
import CVUpload from '../components/CVUpload';
import AgentStatusCard from '../components/AgentStatusCard';
import { useAgentPipeline } from '../hooks/useAgentPipeline';
import { runPipeline } from '../api/pipeline';

export default function DashboardPage() {
    const userId = Number(localStorage.getItem('user_id') ?? 0);

    const { connected, status, lastEvent } = useAgentPipeline({ userId: userId || null });

    const [feedback, setFeedback] = useState<string | null>(null);

    const [cvText, setCvText] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [goal, setGoal] = useState('');
    const [running, setRunning] = useState(false);
    const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);

    function handleCVResult(_id: number, fb: any, preview: string) {
        setCvText(preview);

        let feedbackString = fb;
        if (typeof fb === 'object' && fb !== null) {
            if (fb.error) {
                feedbackString = `Error: ${fb.error}\nDetails: ${fb.details}`;
            } else if (fb.score !== undefined) {
                feedbackString = `Score: ${fb.score}/100\n\nSummary: ${fb.summary}\n\nStrong Points:\n${fb.strong_points?.map((p: string) => `- ${p}`).join('\n') || 'None'}\n\nWeaknesses:\n${fb.weaknesses?.map((w: any) => `- ${w.point}: ${w.suggestion}`).join('\n') || 'None'}\n\nMissing Keywords:\n${fb.missing_keywords?.join(', ') || 'None'}`;
            } else {
                feedbackString = JSON.stringify(fb, null, 2);
            }
        }
        setFeedback(feedbackString);
    }

    function addSkill(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const s = skillInput.trim();
            if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
            setSkillInput('');
        }
    }

    function removeSkill(s: string) {
        setSkills(prev => prev.filter(x => x !== s));
    }

    async function handleRunPipeline() {
        if (!cvText) { setPipelineMsg('Upload a CV first.'); return; }
        if (!goal) { setPipelineMsg('Enter a career goal.'); return; }
        setRunning(true);
        setPipelineMsg(null);
        try {
            const res = await runPipeline({ goal, cv_text: cvText, skills });
            setPipelineMsg(`Pipeline started! Task ID: ${res.task_state_id}. Watch status card for live updates.`);
        } catch (e: any) {
            setPipelineMsg(e?.response?.data?.detail ?? 'Pipeline failed to start.');
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1>Dashboard</h1>
                    <p style={{ marginTop: '0.4rem' }}>Upload your CV and run the AI pipeline to get personalized career insights.</p>
                </div>

                <div className="dashboard-grid">
                    {/* CV Upload */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1.25rem' }}>📄 Upload CV</h3>
                        <CVUpload onResult={handleCVResult} />
                    </div>

                    {/* Pipeline Status */}
                    <AgentStatusCard connected={connected} status={status} lastEvent={lastEvent} />

                    {/* AI Feedback */}
                    {feedback && (
                        <div className="card card-full">
                            <h3 style={{ marginBottom: '1rem' }}>🤖 AI Feedback</h3>
                            <div style={{
                                background: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                fontSize: '0.9rem',
                                lineHeight: 1.7,
                                color: 'var(--text-secondary)',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 340,
                                overflowY: 'auto',
                            }}>
                                {feedback}
                            </div>
                        </div>
                    )}

                    {/* Run Pipeline */}
                    <div className="card card-full">
                        <h3 style={{ marginBottom: '1.25rem' }}>🚀 Run Full Pipeline</h3>
                        <div className="flex flex-col gap-3" style={{ gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Career Goal</label>
                                <input
                                    id="career-goal-input"
                                    className="form-input"
                                    placeholder="e.g. Become a Senior Backend Engineer at a FinTech company"
                                    value={goal}
                                    onChange={e => setGoal(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Skills (press Enter to add)</label>
                                <input
                                    id="skills-input"
                                    className="form-input"
                                    placeholder="e.g. Python, React, AWS…"
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyDown={addSkill}
                                />
                                {skills.length > 0 && (
                                    <div className="tags-wrap" style={{ marginTop: '0.6rem' }}>
                                        {skills.map(s => (
                                            <span key={s} className="tag" style={{ cursor: 'pointer' }} onClick={() => removeSkill(s)}>
                                                {s} ✕
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {pipelineMsg && (
                                <div className={`alert ${pipelineMsg.startsWith('Pipeline started') ? 'alert-success' : 'alert-warn'}`}>
                                    {pipelineMsg}
                                </div>
                            )}

                            <button
                                id="run-pipeline-btn"
                                className="btn btn-primary btn-lg"
                                onClick={handleRunPipeline}
                                disabled={running}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {running ? <><span className="spinner" /> Starting…</> : '▶ Run AI Pipeline'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
