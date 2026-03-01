interface Props {
    score: number | null;
    breakdown: any;
}

export default function ATSScoreCard({ score, breakdown }: Props) {
    if (score === null) return null;

    let colorClass = "text-error";
    let bgClass = "bg-error/10";
    let strokeColor = "#ef4444";
    if (score >= 80) { colorClass = "text-success"; bgClass = "bg-success/10"; strokeColor = "#22c55e"; }
    else if (score >= 50) { colorClass = "text-warning"; bgClass = "bg-warning/10"; strokeColor = "#f59e0b"; }

    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

    return (
        <div className="card">
            <h3 className="mb-4">⚙️ ATS Compatibility</h3>

            {/* Score + summary row */}
            <div className="flex items-center gap-6 mb-6">
                <div className="relative shrink-0 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                    <svg width="96" height="96" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
                        <circle
                            cx="48" cy="48" r={radius}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                    </svg>
                    <div className={`flex flex-col items-center leading-none ${colorClass}`}>
                        <span className="text-2xl font-bold">{score}</span>
                        <span className="text-xs font-semibold tracking-wider opacity-70">/ 100</span>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm text-secondary leading-relaxed">
                        {breakdown?.summary || "Your CV has been analyzed against common Application Tracking Systems."}
                    </p>
                </div>
            </div>

            {/* Detail blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Matching Keywords */}
                <div className="p-3 bg-elevated rounded border" style={{ alignSelf: 'start' }}>
                    <h4 className="text-sm font-semibold mb-2">✅ Matching Keywords</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {breakdown?.matching_keywords?.length
                            ? breakdown.matching_keywords.map((k: string) => (
                                <span key={k} className="tag tag-success text-xs">{k}</span>
                            ))
                            : <span className="text-xs text-muted">None found</span>
                        }
                    </div>
                </div>

                {/* Missing Critical */}
                <div className="p-3 bg-elevated rounded border" style={{ alignSelf: 'start' }}>
                    <h4 className="text-sm font-semibold mb-2">⚠️ Missing Critical</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {breakdown?.missing_keywords?.length
                            ? breakdown.missing_keywords.map((k: string) => (
                                <span key={k} className="tag tag-error text-xs">{k}</span>
                            ))
                            : <span className="text-xs text-muted">None missing</span>
                        }
                    </div>
                </div>

                {/* Formatting Issues — full width, auto-expands with content */}
                <div className="p-3 bg-elevated rounded border sm:col-span-2" style={{ alignSelf: 'start' }}>
                    <h4 className="text-sm font-semibold mb-2 text-warning">Formatting Issues</h4>
                    <ul className="text-sm text-secondary list-disc pl-4 space-y-1">
                        {breakdown?.formatting_issues?.length
                            ? breakdown.formatting_issues.map((iss: string, i: number) => (
                                <li key={i}>{iss}</li>
                            ))
                            : <li>No major ATS formatting issues detected.</li>
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
}