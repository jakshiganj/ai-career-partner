import { DollarSign } from 'lucide-react';
import SalaryBenchmark from '../career/SalaryBenchmark';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';

interface SalaryBenchmarks {
    currency?: string;
    salary_min?: number;
    salary_max?: number;
    salary_median?: number;
    source_summary?: string;
    confidence?: string;
}

interface SalaryInsightsCardProps {
    benchmarks?: SalaryBenchmarks | null;
    status?: CardStatus;
}

export default function SalaryInsightsCard({ benchmarks, status = 'Not Run' }: SalaryInsightsCardProps) {
    if (!benchmarks || typeof benchmarks.salary_min !== 'number') {
        return (
            <div className="rounded-xl border border-[#E0E0E0] bg-white h-full overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-[#E0E0E0] px-8 py-5 bg-[#F9F9F9]">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Market Valuation</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">[ NO DATA ]</span>
                </div>
                <div className="flex-1 p-16 flex items-center justify-center text-sm font-medium text-[#4A4A4A] opacity-60">
                    Valuation data will be computed after market analysis.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-[#E0E0E0] bg-white h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] px-8 py-5 bg-[#F9F9F9]">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Market Valuation</h3>
                    <span className="rounded-full bg-[#5BC0EB] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> ADVIEST INDEX
                    </span>
                </div>
                <span className="rounded-full bg-[#0D0D0D] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                    {status}
                </span>
            </div>

            <div className="p-8 flex flex-col gap-10">
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 mb-6">COMPENSATION BENCHMARK ({benchmarks.currency || 'USD'})</h4>
                    <div className="rounded-xl border border-[#E0E0E0] bg-[#F9F9F9] p-8">
                        <SalaryBenchmark 
                            min={benchmarks.salary_min}
                            max={benchmarks.salary_max!}
                            median={benchmarks.salary_median!}
                        />
                    </div>
                </div>
                
                {benchmarks.source_summary && (
                    <div className="rounded-xl bg-[#0D0D0D] p-8 text-white">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5BC0EB] mb-4">ECONOMIC ANALYSIS</p>
                        <p className="text-[14px] leading-relaxed font-medium opacity-90">{benchmarks.source_summary}</p>
                        {benchmarks.confidence && (
                            <div className="mt-6 flex items-center gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Confidence Level:</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5BC0EB]">{benchmarks.confidence}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
