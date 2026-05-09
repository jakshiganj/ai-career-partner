interface Props {
    min: number;
    max: number;
    median: number;
    userExpected?: number;
}

export default function SalaryBenchmark({ min, max, median, userExpected }: Props) {
    const range = max - min;
    if (range <= 0) return <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D]">Fixed Valuation: LKR {min.toLocaleString()}</div>;

    const medianPercent = ((median - min) / range) * 100;

    let userPercent = -1;
    const isExpectedInRange = userExpected && userExpected >= min && userExpected <= max;

    if (isExpectedInRange) {
        userPercent = ((userExpected! - min) / range) * 100;
    }

    return (
        <div className="salary-benchmark-container" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex justify-between text-[11px] font-bold tracking-widest text-[#0D0D0D] mb-4">
                <span className="opacity-40">LKR {(min / 1000).toFixed(0)}K</span>
                <span className="text-[#5BC0EB]">LKR {(median / 1000).toFixed(0)}K</span>
                <span className="opacity-40">LKR {(max / 1000).toFixed(0)}K</span>
            </div>

            <div className="relative w-full h-4 bg-white rounded-lg border border-[#E0E0E0] overflow-visible">
                {/* Visual Distribution Gradient */}
                <div className="absolute inset-y-0 left-0 w-full rounded-lg" style={{
                    background: 'linear-gradient(90deg, rgba(91,192,235,0.05) 0%, rgba(91,192,235,0.2) 50%, rgba(91,192,235,0.05) 100%)'
                }}></div>

                {/* Median Marker */}
                <div className="absolute top-[-4px] bottom-[-4px] w-[3px] bg-[#5BC0EB] z-10 shadow-[0_0_10px_rgba(91,192,235,0.5)]" style={{ left: `${medianPercent}%` }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#5BC0EB] whitespace-nowrap tracking-widest">MARKET MEDIAN</div>
                </div>

                {/* User Expectation Marker */}
                {userPercent >= 0 && (
                    <div
                        className="absolute top-[-8px] bottom-[-8px] w-[5px] bg-[#0D0D0D] z-20 shadow-xl"
                        style={{ left: `${userPercent}%` }}
                    >
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#0D0D0D] whitespace-nowrap tracking-widest">YOUR INDEX</div>
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-8 text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40">
                <span>Entry Level</span>
                <span>Market Average</span>
                <span>Executive</span>
            </div>

            {userExpected && (
                <div className="mt-10 pt-6 border-t border-[#E0E0E0] text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">TARGET REQUISITION:</span>
                    <span className="ml-3 text-[12px] font-bold text-[#0D0D0D]">LKR {userExpected.toLocaleString()}</span>
                    {userExpected > max && <span className="ml-3 rounded bg-[#EE6C4D] px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-widest">Premium Threshold</span>}
                    {userExpected < min && <span className="ml-3 rounded bg-[#F4D35E] px-2 py-0.5 text-[8px] font-bold text-[#0D0D0D] uppercase tracking-widest">Low Requisition</span>}
                </div>
            )}
        </div>
    );
}
