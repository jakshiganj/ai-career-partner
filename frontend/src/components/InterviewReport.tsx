interface Props {
    report: {
        overall_score: number;
        communication: number;
        technical_depth: number;
        star_method: number;
        feedback: string;
        transcript?: string;
    } | null;
}

export default function InterviewReport({ report }: Props) {
    if (!report) return null;

    // Helper to color code scores
    const getColor = (s: number) => {
        if (s >= 8) return 'text-success border-success/30 bg-success/10';
        if (s >= 6) return 'text-warning border-warning/30 bg-warning/10';
        return 'text-error border-error/30 bg-error/10';
    };

    return (
        <div className="card">
            <h3 className="mb-4 flex items-center gap-2">
                <span>🎙️</span> AI Interview Report
            </h3>

            {/* Radar/Bar Chart Approximation (Feature 7 req: 3 dimensions) */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="col-span-1 flex flex-col items-center justify-center border-r border-subtle">
                    <div className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Overall</div>
                    <div className={`text-4xl font-bold p-4 rounded-full border-4 ${getColor(report.overall_score)}`}>
                        {report.overall_score}
                    </div>
                    <div className="text-xs text-muted mt-2">out of 10</div>
                </div>

                <div className="col-span-3 flex flex-col justify-center gap-4">
                    {[
                        { label: 'Communication clarity', val: report.communication },
                        { label: 'Technical depth', val: report.technical_depth },
                        { label: 'STAR method formatting', val: report.star_method }
                    ].map(dim => (
                        <div key={dim.label} className="flex items-center gap-3">
                            <div className="w-40 text-sm font-medium text-secondary truncate" title={dim.label}>
                                {dim.label}
                            </div>
                            <div className="flex-1 bg-elevated h-3 rounded-full overflow-hidden border border-subtle relative">
                                <div
                                    className={`absolute top-0 left-0 h-full transition-all ${getColor(dim.val).split(' ')[2]}`}
                                    style={{ width: `${(dim.val / 10) * 100}%` }}
                                />
                            </div>
                            <div className="w-8 text-right font-bold text-sm">{dim.val}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Feedback */}
            <div className="p-4 bg-elevated rounded-lg border border-subtle">
                <h4 className="text-sm font-bold mb-2">Coach's Feedback</h4>
                <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                    {report.feedback}
                </p>
            </div>

            {report.transcript && (
                <details className="mt-4">
                    <summary className="text-sm text-accent cursor-pointer font-medium hover:underline">
                        View Session Transcript
                    </summary>
                    <div className="mt-2 p-3 bg-subtle rounded border border-subtle max-h-48 overflow-y-auto text-xs whitespace-pre-wrap font-mono leading-relaxed opacity-80">
                        {report.transcript}
                    </div>
                </details>
            )}
        </div>
    );
}
