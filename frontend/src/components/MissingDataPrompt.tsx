import { useState } from 'react';
import axios from 'axios';

interface Props {
    pipelineId: string;
    missingFields: string[];
    onResumed: () => void;
}

export default function MissingDataPrompt({ pipelineId, missingFields, onResumed }: Props) {
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [jobDescription, setJobDescription] = useState('');
    const [cvRaw, setCvRaw] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState<string[]>([]);

    const [error, setError] = useState<string | null>(null);

    const isMissing = (field: string) => missingFields.includes(field);

    function addSkill(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const s = skillInput.trim();
            if (s && !skills.includes(s)) setSkills(prev => [...prev, s]);
            setSkillInput('');
        }
    }

    async function handleSubmit() {
        setSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const data: any = {};
            if (isMissing('job_description')) data.job_description = jobDescription;
            if (isMissing('cv_raw')) data.cv_raw = cvRaw;
            if (isMissing('skills') || skills.length > 0) data.skills = skills;

            await axios.patch(`http://localhost:8000/api/pipeline/${pipelineId}/input`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onResumed();
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Failed to submit data');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="card border-warning border-2 bg-warning/5 animate-fade-in my-6">
            <h3 className="mb-2 text-lg font-bold flex items-center gap-2 text-warning">
                <span>⚠️</span> Pipeline Paused: Missing Information
            </h3>
            <p className="text-secondary text-sm mb-6">
                The agent pipeline needs more information to proceed with the analysis. Please provide the fields below.
            </p>

            <div className="space-y-6">
                {isMissing('job_description') && (
                    <div>
                        <label className="text-sm font-semibold block mb-2">Target Job Description</label>
                        <p className="text-xs text-muted mb-2">Paste the full job description of the role you are targeting.</p>
                        <textarea
                            className="form-input w-full h-32 text-sm"
                            placeholder="We are looking for a Senior Software Engineer..."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                    </div>
                )}

                {isMissing('cv_raw') && (
                    <div>
                        <label className="text-sm font-semibold block mb-2">Resume Text</label>
                        <p className="text-xs text-muted mb-2">We couldn't extract enough text from your uploaded file. Please paste your resume text manually.</p>
                        <textarea
                            className="form-input w-full h-32 text-sm"
                            placeholder="Experience:..."
                            value={cvRaw}
                            onChange={(e) => setCvRaw(e.target.value)}
                        />
                    </div>
                )}

                {isMissing('skills') && (
                    <div>
                        <label className="text-sm font-semibold block mb-2">Manual Skills Entry</label>
                        <p className="text-xs text-muted mb-2">Provide a few key skills to guide the analysis.</p>
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
                                    <span key={s} className="tag text-xs bg-elevated border-subtle cursor-pointer" onClick={() => setSkills(skills.filter(x => x !== s))}>
                                        {s} &times;
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {error && <p className="text-error text-sm">{error}</p>}

                <button
                    className="btn btn-primary w-full"
                    onClick={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? <span className="spinner mr-2" /> : "▶️ "}
                    Submit & Resume Pipeline
                </button>
            </div>
        </div>
    );
}
