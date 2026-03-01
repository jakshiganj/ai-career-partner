import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from './ui/card';

interface Preferences {
    email_digest_enabled: boolean;
    receive_job_alerts: boolean;
}

export default function EmailPreferences() {
    const [prefs, setPrefs] = useState<Preferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

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
            setPrefs(prefs);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="spinner inline-block" style={{ borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563eb' }} />;
    if (!prefs) return null;

    const toggleItems = [
        {
            key: 'email_digest_enabled' as keyof Preferences,
            title: 'Weekly Progress Digest',
            desc: 'Get a summary of your career progression every Monday.',
        },
        {
            key: 'receive_job_alerts' as keyof Preferences,
            title: 'Live Job Alerts',
            desc: 'Instant emails when a "Realistic Match" is found.',
        },
    ];

    return (
        <Card className="overflow-hidden">
            {/* Accordion Header */}
            <div
                className="accordion-header"
                onClick={() => setExpanded(!expanded)}
            >
                <h3 className="section-label" style={{ marginBottom: 0 }}>📧 Email Preferences</h3>
                <span className={`accordion-chevron ${expanded ? 'open' : ''}`}>▼</span>
            </div>

            {/* Accordion Body */}
            <div className={`accordion-body ${expanded ? 'open' : ''}`}>
                <div className="space-y-3">
                    {toggleItems.map(({ key, title, desc }) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                        }}>
                            <div>
                                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', maxWidth: 220 }}>{desc}</p>
                            </div>
                            <button
                                className="relative flex-shrink-0"
                                style={{
                                    width: 44,
                                    height: 24,
                                    borderRadius: 9999,
                                    border: 'none',
                                    cursor: saving ? 'default' : 'pointer',
                                    transition: 'background 0.2s',
                                    background: prefs[key] ? 'var(--accent-blue)' : 'rgba(148,163,184,0.3)',
                                }}
                                onClick={() => handleToggle(key)}
                                disabled={saving}
                            >
                                <div style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                    position: 'absolute',
                                    top: 3,
                                    transition: 'left 0.2s ease',
                                    left: prefs[key] ? 23 : 3,
                                }} />
                            </button>
                        </div>
                    ))}
                </div>

                {msg && <p className="text-xs mt-2" style={{ color: 'var(--accent-green)' }}>{msg}</p>}
            </div>
        </Card>
    );
}
