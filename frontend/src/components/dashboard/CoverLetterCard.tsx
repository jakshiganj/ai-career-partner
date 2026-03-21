import { useState } from 'react';
import { Mail, ChevronDown, ChevronUp } from 'lucide-react';

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
            ? 'bg-[#E0F2FE] text-[#0369A1]'
            : tone === 'Conversational'
                ? 'bg-[#FEF3C7] text-[#B45309]'
                : 'bg-[#F3E8FF] text-[#6B21A8]';

    if (!hasContent) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-[#94A3B8]" />
                        <h3 className="font-semibold text-[#0F172A]">Cover Letter</h3>
                    </div>
                    <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-medium text-[#64748B]">
                        Not Run
                    </span>
                </div>
                <div className="mt-4 flex h-28 items-center justify-center rounded-lg bg-[#F8FAFC] text-sm text-[#94A3B8]">
                    Cover letter will appear after pipeline run
                </div>
            </div>
        );
    }

    return (
        <div
            className={`rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${isExpanded ? 'ring-1 ring-[#3B82F6]' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Mail className={`h-5 w-5 ${isExpanded ? 'text-[#3B82F6]' : 'text-[#3B82F6]'}`} />
                    <h3 className="font-semibold text-[#0F172A]">Cover Letter</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-medium text-[#16A34A]">
                        {status}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[#64748B]" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-[#64748B]" />
                    )}
                </div>
            </div>

            <p className={`mt-4 whitespace-pre-wrap leading-relaxed text-[#475569] ${!isExpanded ? 'line-clamp-4 italic' : ''}`}>
                {displayedText}
                {!isExpanded && hasContent && preview.split('\n').length > PREVIEW_LINES && (
                    <span className="text-[#3B82F6] block mt-1 font-medium text-xs">Click to read more...</span>
                )}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {tone && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${toneColor}`}>
                        {tone}
                    </span>
                )}
                {wordCount != null && (
                    <span className="text-xs text-[#64748B]">{wordCount} words</span>
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {onCopy && (
                    <button
                        type="button"
                        onClick={handleCopyClick}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${copied ? 'border-green-500 bg-green-50 text-green-600' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9]'}`}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                )}
                {onRegenerate && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onRegenerate('formal')}
                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]"
                        >
                            Regenerate
                        </button>
                        <select
                            className="rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm text-[#475569]"
                            onChange={(e) => onRegenerate(e.target.value)}
                            defaultValue={tone || 'Formal'}
                        >
                            <option value="formal">Formal</option>
                            <option value="conversational">Conversational</option>
                            <option value="creative">Creative</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
