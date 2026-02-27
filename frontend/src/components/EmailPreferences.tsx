import { useState, useEffect } from 'react';
import axios from 'axios';

interface Preferences {
    email_digest_enabled: boolean;
    receive_job_alerts: boolean;
}

export default function EmailPreferences() {
    const [prefs, setPrefs] = useState<Preferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        fetchPrefs();
    }, []);

    async function fetchPrefs() {
        try {
            const res = await axios.get('http://localhost:8000/api/preferences', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setPrefs({
                email_digest_enabled: res.data.email_digest_enabled,
                receive_job_alerts: res.data.receive_job_alerts
            });
        } catch (e) {
            console.error("Failed to load preferences", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleToggle(key: keyof Preferences) {
        if (!prefs) return;
        const newPrefs = { ...prefs, [key]: !prefs[key] };
        setPrefs(newPrefs);

        // Auto-save
        setSaving(true);
        setMsg(null);
        try {
            await axios.put('http://localhost:8000/api/preferences', newPrefs, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMsg('Preferences updated.');
            setTimeout(() => setMsg(null), 3000);
        } catch (e) {
            setMsg('Failed to update.');
            // Revert on fail
            setPrefs(prefs);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="spinner inline-block"></div>;
    if (!prefs) return null;

    return (
        <div className="card shadow-sm border border-subtle mt-6 lg:col-span-1 border-t-4 border-t-accent">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Email Preferences</h3>

            <div className="space-y-4">
                {/* Feature 10 Toggle */}
                <div className="flex items-center justify-between p-3 bg-elevated rounded border">
                    <div>
                        <h4 className="text-sm font-semibold">Weekly Progress Digest</h4>
                        <p className="text-xs text-secondary mt-1 max-w-[200px]">Get a summary of your career progression every Monday.</p>
                    </div>
                    <button
                        className={`w-12 h-6 rounded-full transition-colors relative ${prefs.email_digest_enabled ? 'bg-accent' : 'bg-subtle'}`}
                        onClick={() => handleToggle('email_digest_enabled')}
                        disabled={saving}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${prefs.email_digest_enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-elevated rounded border opacity-70">
                    <div>
                        <h4 className="text-sm font-semibold">Live Job Alerts</h4>
                        <p className="text-xs text-secondary mt-1 max-w-[200px]">Instant emails when a "Realistic Match" is found.</p>
                    </div>
                    <button
                        className={`w-12 h-6 rounded-full transition-colors relative ${prefs.receive_job_alerts ? 'bg-accent' : 'bg-subtle'}`}
                        onClick={() => handleToggle('receive_job_alerts')}
                        disabled={saving}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${prefs.receive_job_alerts ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            {msg && <p className="text-xs text-success mt-3">{msg}</p>}
        </div>
    );
}
