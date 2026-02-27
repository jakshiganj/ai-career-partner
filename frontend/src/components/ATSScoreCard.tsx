interface Props {
    score: number | null;
    breakdown: any;
}

export default function ATSScoreCard({ score, breakdown }: Props) {
    if (score === null) return null;

    // Determine color based on score
    let colorClass = "text-error";
    let bgClass = "bg-error/10";
    if (score >= 80) { colorClass = "text-success"; bgClass = "bg-success/10"; }
    else if (score >= 50) { colorClass = "text-warning"; bgClass = "bg-warning/10"; }

    return (
        <div className="card">
            <h3 className="mb-4">⚙️ ATS Compatibility</h3>

            <div className="flex items-center gap-6 mb-6">
                {/* Radial Progress Placeholder (can use an SVG circle here) */}
                <div className={`flex flex-col items-center justify-center rounded-full w-24 h-24 border-4 border-current ${colorClass} ${bgClass}`}>
                    <span className="text-3xl font-bold">{score}</span>
                    <span className="text-xs uppercase font-semibold tracking-wider">/ 100</span>
                </div>

                <div className="flex-1">
                    <p className="text-sm text-secondary leading-relaxed">
                        {breakdown?.summary || "Your CV has been analyzed against common Application Tracking Systems."}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
                {/* Detail blocks */}
                <div className="p-3 bg-elevated rounded border">
                    <h4 className="text-sm font-semibold mb-2">✅ Matching Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                        {breakdown?.matching_keywords?.length ?
                            breakdown.matching_keywords.map((k: string) => <span key={k} className="tag tag-success text-xs">{k}</span>) :
                            <span className="text-xs text-muted">None found</span>
                        }
                    </div>
                </div>

                <div className="p-3 bg-elevated rounded border">
                    <h4 className="text-sm font-semibold mb-2">⚠️ Missing Critical</h4>
                    <div className="flex flex-wrap gap-1">
                        {breakdown?.missing_keywords?.length ?
                            breakdown.missing_keywords.map((k: string) => <span key={k} className="tag tag-error text-xs">{k}</span>) :
                            <span className="text-xs text-muted">None missing</span>
                        }
                    </div>
                </div>

                <div className="p-3 bg-elevated rounded border col-span-2 mt-2">
                    <h4 className="text-sm font-semibold mb-2 text-warning">Formatting Issues</h4>
                    <ul className="text-sm text-secondary list-disc pl-4 space-y-1">
                        {breakdown?.formatting_issues?.length ?
                            breakdown.formatting_issues.map((iss: string, i: number) => <li key={i}>{iss}</li>) :
                            <li>No major ATS formatting issues detected.</li>
                        }
                    </ul>
                </div>
            </div>
        </div>
    );
}
