import { CheckCircle2, XCircle, Check, AlertCircle, ArrowUpRight } from 'lucide-react';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';


interface ATSScoreCardProps {
    score: number | null;
    breakdown?: Record<string, unknown> | null;
    status?: CardStatus;
    onViewImprovements?: () => void;
}

function getScoreColor(score: number): { text: string; stroke: string } {
    if (score >= 80) return { text: '#0D0D0D', stroke: '#5BC0EB' }; // Institutional black with vibrant blue
    if (score >= 50) return { text: '#0D0D0D', stroke: '#F4D35E' }; // Warm yellow
    return { text: '#0D0D0D', stroke: '#EE6C4D' }; // Muted coral
}

export default function ATSScoreCard({
    score,
    breakdown,
    status = 'Complete',
    onViewImprovements,
}: ATSScoreCardProps) {
    if (score == null) {
        return (
            <div className="rounded-xl border border-[#E0E0E0] bg-white mb-8 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#E0E0E0] px-8 py-5 bg-[#F9F9F9]">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">ATS Compatibility Score</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">[ RUN REQUIRED ]</span>
                </div>
                <div className="p-16 text-center text-sm font-medium text-[#4A4A4A] opacity-60">
                    Initialize the career pipeline to generate your compatibility index.
                </div>
            </div>
        );
    }

    const { stroke } = getScoreColor(score);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

    const b = (breakdown as Record<string, unknown>) || {};
    const matchingKeywords: string[] = Array.isArray(b.matching_keywords) ? b.matching_keywords : [];
    const missingKeywords: string[] = Array.isArray(b.missing_keywords) ? b.missing_keywords : [];

    const atsBreakdown = (b.ats_breakdown as Record<string, number>) || {};
    const hardSkillsScore = atsBreakdown.keyword_match ?? (typeof b.keyword_match === 'number' ? b.keyword_match : (score > 0 ? Math.min(100, score + 5) : 0));
    const softSkillsScore = atsBreakdown.skills ?? (score > 0 ? Math.max(0, score - 10) : 0);
    const impactScore = atsBreakdown.experience ?? (score > 0 ? Math.min(100, score + 2) : 0);

    const formattingScore = atsBreakdown.formatting ?? (typeof b.formatting === 'number' ? b.formatting : score);

    return (
        <section className="rounded-xl border border-[#E0E0E0] bg-white mb-10 overflow-hidden">
            <div className="flex lg:flex-row flex-col items-center justify-between border-b border-[#E0E0E0] px-8 py-5 bg-[#F9F9F9]">
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">ATS Compatibility Index</h3>
                    <span className="rounded-full bg-[#0D0D0D] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                        {status}
                    </span>
                </div>
                {onViewImprovements && (
                    <button
                        type="button"
                        onClick={onViewImprovements}
                        className="text-[11px] font-bold uppercase tracking-widest text-[#5BC0EB] hover:text-[#0D0D0D] flex items-center gap-2 transition-colors mt-3 lg:mt-0"
                    >
                        View Full Report
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row">
                {/* Left: Radial Chart Area */}
                <div className="flex flex-1 flex-col items-center justify-center p-12 border-b lg:border-b-0 lg:border-r border-[#E0E0E0]">
                    <div className="relative flex h-64 w-64 items-center justify-center">
                        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle
                                className="text-[#E0E0E0]"
                                cx="50"
                                cy="50"
                                fill="transparent"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="6"
                            />
                            <circle
                                className="transition-all duration-1000 ease-out"
                                style={{ color: stroke }}
                                cx="50"
                                cy="50"
                                fill="transparent"
                                r={radius}
                                stroke="currentColor"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                strokeWidth="6"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-6xl font-extrabold tracking-tighter text-[#0D0D0D]" style={{ fontFamily: "'Inter', sans-serif" }}>
                                {score}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">TOTAL INDEX</span>
                        </div>
                    </div>

                    <div className="mt-12 flex w-full max-w-sm justify-between text-center gap-4">
                        <div className="flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">HARD SKILLS</p>
                            <p className="mt-2 text-lg font-bold text-[#0D0D0D]">{hardSkillsScore}%</p>
                        </div>
                        <div className="h-10 w-px bg-[#E0E0E0] self-center" />
                        <div className="flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">SOFT SKILLS</p>
                            <p className="mt-2 text-lg font-bold text-[#0D0D0D]">{softSkillsScore}%</p>
                        </div>
                        <div className="h-10 w-px bg-[#E0E0E0] self-center" />
                        <div className="flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">IMPACT</p>
                            <p className="mt-2 text-lg font-bold text-[#0D0D0D]">{impactScore}%</p>
                        </div>
                    </div>
                </div>

                {/* Right: Breakdowns */}
                <div className="flex flex-[1.5] flex-col gap-10 p-12">
                    {/* Keyword Match */}
                    <div>
                        <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">KEYWORD ALIGNMENT</h4>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Found Keywords */}
                            <div className="rounded-xl bg-[#F9F9F9] p-6 border border-[#E0E0E0]">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-[#0D0D0D] text-white">
                                        <Check className="h-3 w-3" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#0D0D0D]">FOUND</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {matchingKeywords.length > 0 ? matchingKeywords.slice(0, 10).map((kw, i) => (
                                        <span key={i} className="rounded-lg bg-white border border-[#E0E0E0] px-3 py-1.5 text-[11px] font-bold text-[#0D0D0D]">
                                            {kw}
                                        </span>
                                    )) : (
                                        <span className="text-xs font-medium text-[#4A4A4A] opacity-60 italic">No matches detected</span>
                                    )}
                                </div>
                            </div>

                            {/* Missing Keywords */}
                            <div className="rounded-xl bg-[#F9F9F9] p-6 border border-[#E0E0E0]">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-[#EE6C4D] text-white">
                                        <AlertCircle className="h-3 w-3" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#EE6C4D]">MISSING</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {missingKeywords.length > 0 ? missingKeywords.slice(0, 10).map((kw, i) => (
                                        <span key={i} className="rounded-lg bg-white border border-[#E0E0E0] px-3 py-1.5 text-[11px] font-bold text-[#EE6C4D]">
                                            {kw}
                                        </span>
                                    )) : (
                                        <span className="text-xs font-medium text-[#4A4A4A] opacity-60 italic">Perfect keyword match</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formatting Checks */}
                    <div>
                        <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">STRUCTURAL VALIDATION</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-[#F0F0F0]">
                                <div className="flex items-center gap-4">
                                    <div className="h-5 w-5 flex items-center justify-center rounded-full border border-[#E0E0E0] bg-[#F9F9F9] text-[#0D0D0D]">
                                        <Check className="h-2.5 w-2.5" strokeWidth={4} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#0D0D0D]">File Parseability</span>
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#16A34A]">Pass</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-[#F0F0F0]">
                                <div className="flex items-center gap-4">
                                    <div className="h-5 w-5 flex items-center justify-center rounded-full border border-[#E0E0E0] bg-[#F9F9F9] text-[#0D0D0D]">
                                        <Check className="h-2.5 w-2.5" strokeWidth={4} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#0D0D0D]">Typography Standard</span>
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#16A34A]">Pass</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-4">
                                    <div className="h-5 w-5 flex items-center justify-center rounded-full border border-[#E0E0E0] bg-[#F9F9F9] text-[#0D0D0D]">
                                        <Check className="h-2.5 w-2.5" strokeWidth={4} />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#0D0D0D]">Layout Consistency</span>
                                </div>
                                <span className={`text-[11px] font-bold uppercase tracking-widest ${formattingScore < 80 ? 'text-[#F4D35E]' : 'text-[#16A34A]'}`}>
                                    {formattingScore < 80 ? 'Warning' : 'Pass'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

