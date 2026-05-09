import { ArrowRight, ArrowUpRight } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';

const PREVIEW_LINES = 10;

interface CVComparisonViewProps {
    originalText: string;
    editedText: string;
    matchScoreImprovement?: number | null;
    versionNumber?: number;
    status: CardStatus;
}

export default function CVComparisonView({
    originalText, editedText, matchScoreImprovement, versionNumber, status,
}: CVComparisonViewProps) {
    const leftPreview = (originalText || '').split('\\n').filter(l => l.trim().length > 0).slice(0, PREVIEW_LINES).join('\\n\\n');

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E0E0E0]">
            {/* Original Column */}
            <div className="flex flex-col bg-white">
                <div className="px-8 py-4 bg-[#F9F9F9] border-b border-[#E0E0E0]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">ORIGINAL DOCUMENT</span>
                </div>
                <div className="p-10 relative h-[550px] overflow-y-auto">
                    <div className="absolute right-0 top-1/2 -mt-4 -mr-4 bg-white rounded-full p-2 border border-[#E0E0E0] shadow-xl z-10 hidden md:block">
                        <ArrowRight className="h-4 w-4 text-[#0D0D0D]" />
                    </div>
                    <div className="rounded-lg border border-dashed border-[#E0E0E0] p-8">
                        <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#4A4A4A] opacity-70" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {leftPreview}
                            {originalText && originalText.split('\\n').filter(l => l.trim().length > 0).length > PREVIEW_LINES && '\\n\\n...'}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Optimised Column */}
            <div className="flex flex-col bg-[#F9F9F9]">
                <div className="px-8 py-4 bg-[#F9F9F9] border-b border-[#E0E0E0] flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5BC0EB]">OPTIMISED VERSION</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white bg-[#5BC0EB] px-2.5 py-1 rounded-md">LIVE PREVIEW</span>
                </div>
                <div className="p-10 h-[550px] overflow-y-auto" data-color-mode="light">
                    <div className="rounded-xl border border-[#E0E0E0] bg-white p-10 shadow-xl overflow-hidden prose prose-sm max-w-none">
                        <MDEditor.Markdown source={editedText} style={{ whiteSpace: 'pre-wrap', backgroundColor: 'transparent', color: '#0D0D0D', fontFamily: "'Inter', sans-serif" }} />
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-widest px-2">
                        {matchScoreImprovement != null && (
                            <span className="text-[#16A34A] flex items-center gap-2">
                                <ArrowUpRight className="h-3 w-3" /> {matchScoreImprovement}% COMPATIBILITY GAIN
                            </span>
                        )}
                        {versionNumber != null && (
                            <span className="text-[#4A4A4A] opacity-60">REVISION {versionNumber}</span>
                        )}
                        <span className="text-[#4A4A4A] opacity-60 ml-auto flex items-center gap-2">
                            STATUS: <span className="text-[#16A34A]">{status}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
