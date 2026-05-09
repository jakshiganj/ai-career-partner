import { ArrowRight, Clock } from 'lucide-react';

import { type PipelineRunSummary as APIPipelineRunSummary } from '../../api/pipeline';

type PipelineRunSummary = APIPipelineRunSummary;

interface RecentActivityListProps {
    runs: PipelineRunSummary[];
    selectedRunId: string | null;
    onSelect: (id: string) => void;
    onViewAll: () => void;
}

export default function RecentActivityList({ runs, selectedRunId, onSelect, onViewAll }: RecentActivityListProps) {
    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block">[ RECENT ACTIVITY ]</span>
                <button onClick={onViewAll} className="text-xs font-bold text-[#4A4A4A] hover:text-[#0D0D0D] transition-colors border-b border-[#E0E0E0] pb-0.5">View All Runs</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {runs.slice(0, 3).map((run) => (
                    <button 
                        key={run.id}
                        onClick={() => onSelect(run.id)}
                        className={`flex items-center justify-between w-full p-6 rounded-xl transition-all border ${run.id === selectedRunId ? 'bg-[#F9F9F9] border-[#0D0D0D]' : 'bg-white border-[#E0E0E0] hover:border-[#0D0D0D]'}`}
                    >
                        <div className="flex items-center gap-6 text-left">
                            <div className={`h-12 w-12 flex items-center justify-center rounded-lg transition-all ${run.id === selectedRunId ? 'bg-[#0D0D0D] text-white' : 'bg-[#F9F9F9] text-[#A0A0A0]'}`}>
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-[#0D0D0D] tracking-tight">{run.label || 'Career Analysis'}</p>
                                <p className="text-[10px] text-[#4A4A4A] font-bold uppercase tracking-[0.15em] opacity-60">{run.created_at ? new Date(run.created_at).toLocaleDateString() : 'RECENT'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            {run.ats_score && (
                                <div className="text-right">
                                    <span className="block text-[10px] font-bold uppercase text-[#4A4A4A] opacity-60 mb-0.5">SCORE</span>
                                    <span className="text-sm font-bold text-[#0D0D0D] bg-[#F9F9F9] border border-[#E0E0E0] px-3 py-1 rounded-full">{run.ats_score}%</span>
                                </div>
                            )}
                            <div className={`h-8 w-8 flex items-center justify-center rounded-full border transition-all ${run.id === selectedRunId ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-[#A0A0A0] border-[#E0E0E0]'}`}>
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
