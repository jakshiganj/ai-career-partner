import { useState } from 'react';
import { Mail, ChevronDown, ChevronUp, Copy, RefreshCcw } from 'lucide-react';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';
type Tone = 'Formal' | 'Conversational' | 'Creative';

interface CoverLetterCardProps {
    preview: string | null;
    tone?: Tone | string | null;
    wordCount?: number | null;
    status?: CardStatus;
    onCopy?: () => void;
    onRegenerate?: (tone: string) => void;
}

const PREVIEW_LINES = 3;

export default function CoverLetterCard({
    preview,
    tone = 'Formal',
    wordCount,
    status = 'Not Run',
    onCopy,
    onRegenerate,
}: CoverLetterCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const hasContent = preview != null && preview.length > 0;

    const handleCopyClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onCopy) {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Show full text if expanded, otherwise truncated
    const displayedText = hasContent
        ? (isExpanded ? preview : preview.split('\n').slice(0, PREVIEW_LINES).join('\n'))
        : '';

    const toneColor =
        tone === 'Formal'
            ? 'bg-[#0D0D0D] text-white'
            : tone === 'Conversational'
                ? 'bg-[#5BC0EB] text-white'
                : 'bg-[#F4D35E] text-[#0D0D0D]';

    if (!hasContent) {
        return (
            <div className="rounded-xl border border-[#E0E0E0] bg-white p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-[#0D0D0D]" />
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Cover Letter Generator</h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">
                        [ PENDING ANALYSIS ]
                    </span>
                </div>
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#E0E0E0] bg-[#F9F9F9] text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">
                    Draft will be generated post-analysis.
                </div>
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl border border-[#E0E0E0] bg-white p-8 transition-all duration-300 hover:border-[#0D0D0D] cursor-pointer ${isExpanded ? 'ring-1 ring-[#0D0D0D]' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Mail className={`h-4 w-4 ${isExpanded ? 'text-[#5BC0EB]' : 'text-[#0D0D0D]'}`} />
                    <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">Strategic Outreach Draft</h4>
                </div>
                <div className="flex items-center gap-4">
                    <span className="rounded-full bg-[#0D0D0D] px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                        {status}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#0D0D0D]" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-[#0D0D0D]" />
                    )}
                </div>
            </div>

            <p className={`whitespace-pre-wrap text-[13px] leading-relaxed text-[#4A4A4A] ${!isExpanded ? 'line-clamp-3 italic opacity-60' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                {displayedText}
                {!isExpanded && hasContent && preview.split('\n').length > PREVIEW_LINES && (
                    <span className="text-[#5BC0EB] block mt-4 font-bold text-[10px] uppercase tracking-widest">Click to expand document</span>
                )}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#F0F0F0] pt-6">
                <div className="flex items-center gap-4">
                    {tone && (
                        <span className={`rounded-lg px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${toneColor}`}>
                            {tone} Tone
                        </span>
                    )}
                    {wordCount != null && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">{wordCount} Words</span>
                    )}
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {onCopy && (
                        <button
                            type="button"
                            onClick={handleCopyClick}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${copied ? 'bg-[#16A34A] text-white' : 'bg-white border border-[#0D0D0D] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white'}`}
                        >
                            <Copy className="h-3 w-3" />
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    )}
                    {onRegenerate && (
                        <div className="flex items-center gap-2">
                            <select
                                className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#0D0D0D] focus:outline-none focus:border-[#0D0D0D]"
                                onChange={(e) => onRegenerate(e.target.value)}
                                defaultValue={tone || 'Formal'}
                            >
                                <option value="formal">Formal</option>
                                <option value="conversational">Conversational</option>
                                <option value="creative">Creative</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => onRegenerate(tone?.toLowerCase() || 'formal')}
                                className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#0D0D0D] text-white hover:bg-[#5BC0EB] transition-all"
                            >
                                <RefreshCcw className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
