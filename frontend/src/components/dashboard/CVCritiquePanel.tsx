import { Sparkles } from 'lucide-react';

interface CVCritique {
    summary?: string;
    matching_skills?: string[];
    transferable_skills?: string[];
    missing_critical_skills?: string[];
}

interface CVCritiquePanelProps {
    critique: CVCritique;
}

export default function CVCritiquePanel({ critique }: CVCritiquePanelProps) {
    return (
        <div className="bg-[#F9F9F9] border-b border-[#E0E0E0] p-10 text-sm text-[#4A4A4A]">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#5BC0EB] text-white">
                    <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Strategic Feedback</h4>
            </div>
            <p className="mb-10 leading-relaxed max-w-4xl text-[15px]">{critique.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {critique.matching_skills && critique.matching_skills.length > 0 && (
                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60 mb-4">MATCHING ASSETS</h5>
                        <div className="flex flex-wrap gap-2">
                            {critique.matching_skills.map(s => <span key={s} className="bg-white border border-[#E0E0E0] text-[#0D0D0D] px-3 py-1.5 rounded-lg text-[11px] font-bold">{s}</span>)}
                        </div>
                    </div>
                )}
                {critique.transferable_skills && critique.transferable_skills.length > 0 && (
                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60 mb-4">TRANSFERABLE VALUE</h5>
                        <div className="flex flex-wrap gap-2">
                            {critique.transferable_skills.map(s => <span key={s} className="bg-white border border-[#E0E0E0] text-[#5BC0EB] px-3 py-1.5 rounded-lg text-[11px] font-bold">{s}</span>)}
                        </div>
                    </div>
                )}
                {critique.missing_critical_skills && critique.missing_critical_skills.length > 0 && (
                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#EE6C4D] mb-4">CRITICAL GAPS</h5>
                        <div className="flex flex-wrap gap-2">
                            {critique.missing_critical_skills.map(s => <span key={s} className="bg-white border border-[#EE6C4D] text-[#EE6C4D] px-3 py-1.5 rounded-lg text-[11px] font-bold">{s}</span>)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
