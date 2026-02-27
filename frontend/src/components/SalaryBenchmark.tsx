interface Props {
    min: number;
    max: number;
    median: number;
    userExpected?: number;
}

export default function SalaryBenchmark({ min, max, median, userExpected }: Props) {
    // Normalize values for the visual bar (0 to 100%)
    const range = max - min;
    // Handle edge cases where min == max or missing data
    if (range <= 0) return <div className="text-sm text-muted mb-2">Fixed Salary: ${min.toLocaleString()}</div>;

    const medianPercent = ((median - min) / range) * 100;

    let userPercent = -1;
    const isExpectedInRange = userExpected && userExpected >= min && userExpected <= max;

    if (isExpectedInRange) {
        userPercent = ((userExpected! - min) / range) * 100;
    }

    return (
        <div className="salary-benchmark-container px-2">
            <div className="flex justify-between text-xs text-secondary mb-1">
                <span>${min.toLocaleString()}</span>
                <span className="font-semibold text-text">${median.toLocaleString()}</span>
                <span>${max.toLocaleString()}</span>
            </div>

            <div className="relative w-full h-3 bg-elevated rounded-full overflow-hidden border border-subtle">
                {/* Gradient representing standard distribution */}
                <div className="absolute inset-y-0 left-0 w-full" style={{
                    background: 'linear-gradient(90deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.6) 50%, rgba(34,197,94,0.2) 100%)'
                }}></div>

                {/* Median Marker */}
                <div className="absolute top-0 h-full w-[2px] bg-success z-10" style={{ left: `${medianPercent}%` }}></div>

                {/* User Expectation Marker (Feature 6 req) */}
                {userPercent >= 0 && (
                    <div
                        className="absolute top-0 h-full w-[4px] bg-accent z-20 shadow-sm"
                        style={{ left: `${userPercent}%` }}
                        title={`Your Expected: $${userExpected?.toLocaleString()}`}
                    >
                        {/* Tooltip triangle */}
                        <div className="absolute -top-4 -translate-x-1/2 left-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-accent"></div>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-2 text-[10px] text-muted uppercase">
                <span>Entry</span>
                <span>Market Average</span>
                <span>Senior</span>
            </div>

            {userExpected && (
                <div className="mt-2 text-xs text-center">
                    Your Requirement: <span className="font-bold text-accent">${userExpected.toLocaleString()}</span>
                    {userExpected > max && <span className="text-warning ml-2">(Above Market)</span>}
                    {userExpected < min && <span className="text-error ml-2">(Below Market)</span>}
                </div>
            )}
        </div>
    );
}
