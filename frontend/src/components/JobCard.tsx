import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import SalaryBenchmark from './SalaryBenchmark';

interface JobData {
    id: string;
    title: string;
    company: string;
    match_score: number;
    tier: "Realistic" | "Stretch" | "Reach";
    missing_skills: string[];
    salary_min?: number;
    salary_max?: number;
    salary_median?: number;
    url?: string;
    market_status?: string;
    source_skill?: string;
}

interface Props {
    job: JobData;
    userExpectedSalary?: number;
}

export default function JobCard({ job, userExpectedSalary }: Props) {
    const [showDetails, setShowDetails] = useState(false);

    const tierStyle =
        job.tier === 'Realistic'
            ? { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }
            : job.tier === 'Stretch'
                ? { background: '#fef9c3', color: '#b45309', border: '1px solid #fde68a' }
                : { background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' };

    // Convert 0–1 float OR 0–100 int gracefully
    const scorePercent = job.match_score <= 1
        ? Math.round(job.match_score * 100)
        : Math.round(job.match_score);

    return (
        <Card style={{ display: 'flex', flexDirection: 'column' }}>
            <CardContent className="pt-5 pb-5" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* ── Title row ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.title}
                        </h4>
                        <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            {job.company}
                        </p>
                        {job.market_status && (
                            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', fontWeight: 600, color: job.market_status.toLowerCase().includes('active') ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                                🟢 {job.market_status}{job.source_skill ? ` · ${job.source_skill}` : ''}
                            </p>
                        )}
                    </div>
                    <span style={{ ...tierStyle, borderRadius: 9999, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {job.tier} Match
                    </span>
                </div>

                {/* ── Match score bar ── */}
                <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Match: {scorePercent}%
                        </span>
                        <Button
                            variant="link"
                            size="sm"
                            className="px-0 h-auto"
                            style={{ fontSize: '0.8rem' }}
                            onClick={() => setShowDetails(v => !v)}
                        >
                            {showDetails ? '▲ Hide Details' : '▼ View Details'}
                        </Button>
                    </div>
                    <div style={{ height: 6, borderRadius: 9999, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${scorePercent}%`,
                            borderRadius: 9999,
                            background: scorePercent >= 75 ? '#22c55e' : scorePercent >= 50 ? '#f59e0b' : '#ef4444',
                            transition: 'width 0.6s ease',
                        }} />
                    </div>
                </div>

                {/* ── Expandable details ── */}
                {showDetails && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>

                        {/* Skill Gaps */}
                        <div style={{ marginBottom: 16 }}>
                            <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                                Skill Gaps to Bridge
                            </p>
                            {job.missing_skills?.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {job.missing_skills.map(s => (
                                        <span key={s} style={{
                                            background: '#fef3c7',
                                            color: '#92400e',
                                            border: '1px solid #fde68a',
                                            borderRadius: 6,
                                            padding: '3px 9px',
                                            fontSize: '0.72rem',
                                            fontWeight: 500,
                                            // Prevent individual tags from ever overflowing the card
                                            maxWidth: '100%',
                                            wordBreak: 'break-word',
                                        }}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#16a34a', fontWeight: 500 }}>
                                    ✓ You have all the core skills!
                                </p>
                            )}
                        </div>

                        {/* Salary Benchmark */}
                        {(job.salary_min || job.salary_median || job.salary_max) && (
                            <div style={{ marginBottom: 8 }}>
                                <p style={{ margin: '0 0 10px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                                    Salary Benchmark
                                </p>
                                <SalaryBenchmark
                                    min={job.salary_min || 0}
                                    max={job.salary_max || 0}
                                    median={job.salary_median || 0}
                                    userExpected={userExpectedSalary}
                                />
                            </div>
                        )}

                        {/* Apply button */}
                        {job.url && (
                            <Button variant="default" className="w-full mt-4" asChild>
                                <a href={job.url} target="_blank" rel="noreferrer">
                                    View Application
                                </a>
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card >
    );
}