import { DollarSign } from 'lucide-react';
import SalaryBenchmark from '../SalaryBenchmark';

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
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden flex flex-col h-full">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-[#0F172A]">Salary Insights</h3>
                    </div>
                </div>
                <div className="flex-1 p-8 flex items-center justify-center text-sm text-[#94A3B8]">
                    No salary data available
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h3 className="text-lg font-bold text-[#0F172A]">Salary Insights</h3>
                    <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#3B82F6] border border-[#BFDBFE] flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Market Data
                    </span>
                </div>
                <div className="flex gap-2 text-xs">
                    <span className="text-[#64748B] font-medium hidden sm:inline">
                        Status: <span className="text-[#16A34A]">{status}</span>
                    </span>
                </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
                <div>
                    <h4 className="text-sm font-semibold text-[#0F172A] mb-4">Estimated Market Range ({benchmarks.currency || 'USD'})</h4>
                    <SalaryBenchmark 
                        min={benchmarks.salary_min}
                        max={benchmarks.salary_max!}
                        median={benchmarks.salary_median!}
                    />
                </div>
                
                {benchmarks.source_summary && (
                    <div className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#475569] leading-relaxed border border-[#F1F5F9]">
                        <p><span className="font-semibold text-[#0F172A]">Analysis:</span> {benchmarks.source_summary}</p>
                        {benchmarks.confidence && (
                            <p className="mt-2 text-xs text-[#64748B]">Confidence: <span className="font-medium text-[#0F172A]">{benchmarks.confidence}</span></p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
