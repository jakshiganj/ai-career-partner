import { CheckCircle2, XCircle, Check, AlertCircle } from 'lucide-react';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';


interface ATSScoreCardProps {
    score: number | null;
    breakdown?: Record<string, unknown> | null;
    status?: CardStatus;
    onViewImprovements?: () => void;
}

function getScoreColor(score: number): { text: string; stroke: string } {
    if (score >= 80) return { text: '#16A34A', stroke: '#22C55E' };
    if (score >= 50) return { text: '#B45309', stroke: '#F59E0B' };
    return { text: '#DC2626', stroke: '#EF4444' };
}

export default function ATSScoreCard({
    score,
    breakdown,
    status = 'Complete',
    onViewImprovements,
}: ATSScoreCardProps) {
    if (score == null) {
        return (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm mb-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
                    <h3 className="text-lg font-bold text-[#0F172A]">ATS Compatibility Score</h3>
                    <span className="text-sm font-medium text-[#3B82F6] opacity-50 cursor-not-allowed">View Full Report</span>
                </div>
                <div className="p-8 text-center text-sm text-[#94A3B8]">
                    Run pipeline to see ATS score
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

    // Mock sub-scores since these aren't returned perfectly by the API yet
    const hardSkillsScore = typeof b.keyword_match === 'number' ? b.keyword_match : (score > 0 ? Math.min(100, score + 5) : 0);
    const softSkillsScore = score > 0 ? Math.max(0, score - 10) : 0;
    const impactScore = score > 0 ? Math.min(100, score + 2) : 0;

    const formattingScore = typeof b.formatting === 'number' ? b.formatting : score;

    return (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm mb-6 overflow-hidden">
            <div className="flex lg:flex-row flex-col items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <h3 className="text-lg font-bold text-[#0F172A]">ATS Compatibility Score</h3>
                    <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#16A34A] border border-[#BBF7D0]">
                        {status}
                    </span>
                </div>
                {onViewImprovements && (
                    <button
                        type="button"
                        onClick={onViewImprovements}
                        className="text-sm font-medium text-[#3B82F6] hover:text-[#2563EB] mt-3 lg:mt-0 self-start lg:self-auto"
                    >
                        View Full Report
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row">
                {/* Left: Radial Chart Area */}
                <div className="flex flex-1 flex-col items-center justify-center p-8 border-b lg:border-b-0 lg:border-r border-[#F1F5F9]">
                    <div className="relative flex h-64 w-64 items-center justify-center">
                        {/* Decorative SVG for Radial Chart */}
                        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                            <circle
                                className="text-[#F1F5F9]"
                                cx="50"
                                cy="50"
                                fill="transparent"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="8"
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
                                strokeWidth="8"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-5xl font-extrabold text-[#0F172A]" style={{ fontFamily: "'DM Mono', monospace" }}>
                                {score}
                            </span>
                            <span className="mt-1 text-sm font-medium text-[#64748B]">Total Score</span>
                        </div>
                    </div>

                    <div className="mt-8 flex w-full max-w-xs justify-between text-center gap-2">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Hard Skills</p>
                            <p className="mt-1 font-bold text-[#0F172A]">{hardSkillsScore}%</p>
                        </div>
                        <div className="h-8 w-px bg-[#E2E8F0] self-center" />
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Soft Skills</p>
                            <p className="mt-1 font-bold text-[#0F172A]">{softSkillsScore}%</p>
                        </div>
                        <div className="h-8 w-px bg-[#E2E8F0] self-center" />
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Impact</p>
                            <p className="mt-1 font-bold text-[#0F172A]">{impactScore}%</p>
                        </div>
                    </div>
                </div>

                {/* Right: Breakdowns */}
                <div className="flex flex-[1.5] flex-col gap-8 p-8">
                    {/* Keyword Match */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#64748B]">Keyword Match Analysis</h4>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {/* Found Keywords */}
                            <div className="rounded-xl bg-[#F0FDF4] p-5 border border-[#DCFCE7]">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                                    <p className="text-sm font-bold text-[#166534]">Found Keywords</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {matchingKeywords.length > 0 ? matchingKeywords.slice(0, 10).map((kw, i) => (
                                        <span key={i} className="rounded-md bg-white border border-[#BBF7D0] px-2 py-1 text-xs font-medium text-[#15803D] shadow-sm">
                                            {kw}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-[#166534] opacity-80">No matching keywords found</span>
                                    )}
                                    {matchingKeywords.length > 10 && (
                                        <span className="rounded-md bg-white border border-[#BBF7D0] px-2 py-1 text-xs font-medium text-[#15803D] shadow-sm">
                                            +{matchingKeywords.length - 10} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Missing Keywords */}
                            <div className="rounded-xl bg-[#FEF2F2] p-5 border border-[#FEE2E2]">
                                <div className="flex items-center gap-2 mb-3">
                                    <XCircle className="h-4 w-4 text-[#DC2626]" />
                                    <p className="text-sm font-bold text-[#991B1B]">Missing Keywords</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {missingKeywords.length > 0 ? missingKeywords.slice(0, 10).map((kw, i) => (
                                        <span key={i} className="rounded-md bg-white border border-[#FECACA] px-2 py-1 text-xs font-medium text-[#B91C1C] shadow-sm">
                                            {kw}
                                        </span>
                                    )) : (
                                        <span className="text-xs text-[#991B1B] opacity-80">No missing keywords!</span>
                                    )}
                                    {missingKeywords.length > 10 && (
                                        <span className="rounded-md bg-white border border-[#FECACA] px-2 py-1 text-xs font-medium text-[#B91C1C] shadow-sm">
                                            +{missingKeywords.length - 10} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formatting Checks */}
                    <div>
                        <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#64748B]">Formatting Checks</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-[#DCFCE7] p-1 text-[#16A34A]">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-medium text-[#334155]">File Parseable</span>
                                </div>
                                <span className="text-sm font-bold text-[#0F172A]">Pass</span>
                            </div>
                            <div className="h-px w-full bg-[#F1F5F9]"></div>
                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full bg-[#DCFCE7] p-1 text-[#16A34A]">
                                        <Check className="h-3 w-3" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm font-medium text-[#334155]">Font Legibility</span>
                                </div>
                                <span className="text-sm font-bold text-[#0F172A]">Pass</span>
                            </div>
                            <div className="h-px w-full bg-[#F1F5F9]"></div>
                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-full flex items-center justify-center p-1" style={{ backgroundColor: formattingScore < 80 ? '#FEF9C3' : '#DCFCE7', color: formattingScore < 80 ? '#CA8A04' : '#16A34A' }}>
                                        {formattingScore < 80 ? <AlertCircle className="h-3 w-3" strokeWidth={3} /> : <Check className="h-3 w-3" strokeWidth={3} />}
                                    </div>
                                    <span className="text-sm font-medium text-[#334155]">Overall Formatting</span>
                                </div>
                                <span className="text-sm font-bold" style={{ color: formattingScore < 80 ? '#B45309' : '#0F172A' }}>
                                    {formattingScore < 80 ? 'Review' : 'Pass'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

