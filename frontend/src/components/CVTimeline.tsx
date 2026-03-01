import { useState, useEffect } from 'react';
import axios from 'axios';
import CVDiff from './CVDiff';

interface CVVersion {
    id: string;
    version_number: number;
    cv_text: string;
    ats_score: number | null;
    match_score: number | null;
    created_at: string;
}

interface Props {
    userId: string;
}

export default function CVTimeline({ userId }: Props) {
    const [versions, setVersions] = useState<CVVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<CVVersion | null>(null);
    const [compareVersion, setCompareVersion] = useState<CVVersion | null>(null);

    useEffect(() => {
        fetchVersions();
    }, [userId]);

    async function fetchVersions() {
        try {
            // In a real app we'd call the API. Here we mock for now until the route is ready.
            const response = await axios.get(`http://localhost:8000/api/cv-versions/${userId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setVersions(response.data || []);
        } catch (e) {
            console.error("Failed to fetch CV versions", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleRestore(versionId: string) {
        if (!confirm("Are you sure you want to restore this version? This will retrigger the pipeline.")) return;
        // Trigger API restore endpoint here
        alert(`Restored version ${versionId}`);
    }

    if (loading) return <div className="spinner" />;
    if (versions.length === 0) return <p className="text-muted">No CV versions history yet. Upload a CV to get started.</p>;

    return (
        <div className="cv-timeline">
            <div className="flex gap-4">
                {/* Timeline Sidebar */}
                <div style={{ width: '250px', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                    <h4>Version History</h4>
                    <div className="flex flex-col gap-2 mt-4">
                        {versions.map((v, i) => (
                            <div
                                key={v.id}
                                className={`card p-3 cursor-pointer ${selectedVersion?.id === v.id ? 'border-blue-500 bg-blue-50/5' : ''}`}
                                onClick={() => setSelectedVersion(v)}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">v{v.version_number}</span>
                                    <span className="text-xs text-muted">{new Date(v.created_at).toLocaleDateString()}</span>
                                </div>
                                {v.ats_score && <div className="text-xs mt-1">ATS Score: {v.ats_score}/100</div>}
                                {i === 0 && <span className="tag text-xs" style={{ background: 'var(--accent-green)', color: '#fff', padding: '2px 6px' }}>Latest</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* View / Diff Area */}
                <div style={{ flex: 1, paddingLeft: '1rem' }}>
                    {selectedVersion ? (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3>Version {selectedVersion.version_number} Content</h3>
                                <div className="flex gap-2">
                                    <button className="btn btn-outline btn-sm" onClick={() => handleRestore(selectedVersion.id)}>
                                        Restore Version
                                    </button>
                                    {versions.length > 1 && (
                                        <select
                                            className="form-input"
                                            style={{ padding: '0.2rem 0.5rem', width: 'auto' }}
                                            onChange={(e) => {
                                                const v = versions.find(x => x.id === e.target.value);
                                                setCompareVersion(v || null);
                                            }}
                                        >
                                            <option value="">Compare with...</option>
                                            {versions.filter(v => v.id !== selectedVersion.id).map(v => (
                                                <option key={v.id} value={v.id}>v{v.version_number}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            <div className="card card-full" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                {compareVersion ? (
                                    <CVDiff oldText={compareVersion.cv_text} newText={selectedVersion.cv_text} />
                                ) : (
                                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                        {selectedVersion.cv_text}
                                    </pre>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted">
                            Select a version from the timeline to view.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
