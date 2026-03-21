import { Sparkles, ArrowRight } from 'lucide-react';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';

interface CVOptimisationCardProps {
    originalText: string | null;
    optimisedText: string | null;
    versionNumber?: number;
    matchScoreImprovement?: number | null;
    status?: CardStatus;
    onViewFull?: () => void;
    onDownload?: () => void;
    onRestorePrevious?: () => void;
}

const PREVIEW_LINES = 10; // Show a bit more text

export default function CVOptimisationCard({
    originalText,
    optimisedText,
    versionNumber,
    matchScoreImprovement,
    status = 'Not Run',
    onViewFull,
    onDownload,
    onRestorePrevious,
}: CVOptimisationCardProps) {
    const hasContent = originalText != null && optimisedText != null && optimisedText.length > 0;

    if (!hasContent) {
        return (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm mb-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-[#0F172A]">CV Optimisation</h3>
                        <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#3B82F6] border border-[#BFDBFE]">
                            AI Suggestions
                        </span>
                    </div>
                </div>
                <div className="p-8 text-center text-sm text-[#94A3B8]">
                    Optimised CV will appear after pipeline run
                </div>
            </div>
        );
    }

    const leftPreview = (originalText || '').split('\n').filter(l => l.trim().length > 0).slice(0, PREVIEW_LINES).join('\n\n');
    const rightPreview = (optimisedText || '').split('\n').filter(l => l.trim().length > 0).slice(0, PREVIEW_LINES).join('\n\n');

    return (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm mb-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-6 py-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h3 className="text-lg font-bold text-[#0F172A]">CV Optimisation</h3>
                    <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#3B82F6] border border-[#BFDBFE] flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> AI Suggestions
                    </span>
                </div>
                <div className="flex gap-2">
                    {onRestorePrevious && (
                        <button
                            type="button"
                            onClick={onRestorePrevious}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
                        >
                            Discard All
                        </button>
                    )}
                    {onDownload && (
                        <button
                            type="button"
                            onClick={onDownload}
                            className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors shadow-sm"
                        >
                            Download DOCX
                        </button>
                    )}
                    {onViewFull && !onDownload && (
                        <button
                            type="button"
                            onClick={onViewFull}
                            className="rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors shadow-sm"
                        >
                            View Full CV
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9] border-t border-[#F1F5F9]">
                {/* Original Column */}
                <div className="flex flex-col">
                    <div className="bg-[#F8FAFC] px-6 py-3 border-b border-[#F1F5F9]">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Original Content</span>
                    </div>
                    <div className="p-6 relative">
                        <div className="absolute right-0 top-1/2 -mt-4 -mr-4 bg-white rounded-full p-2 border border-[#E2E8F0] shadow-sm z-10 hidden md:block">
                            <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                        </div>
                        <div className="group relative rounded-xl border border-transparent p-4 hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                            <pre className="whitespace-pre-wrap font-display text-sm leading-relaxed text-[#475569] opacity-80" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {leftPreview}
                                {originalText && originalText.split('\n').filter(l => l.trim().length > 0).length > PREVIEW_LINES && '\n\n...'}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Optimised Column */}
                <div className="flex flex-col bg-[#F8FAFC]/30">
                    <div className="bg-[#EFF6FF]/50 px-6 py-3 border-b border-[#E0E7FF]">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">Optimised Content</span>
                    </div>
                    <div className="p-6">
                        <div className="group relative rounded-xl border border-[#D1FAE5] bg-[#ECFDF5]/50 p-4 shadow-sm">
                            <pre className="whitespace-pre-wrap font-display text-sm leading-relaxed text-[#0F172A]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {rightPreview}
                                {optimisedText && optimisedText.split('\n').filter(l => l.trim().length > 0).length > PREVIEW_LINES && '\n\n...'}
                            </pre>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs px-2">
                            {matchScoreImprovement != null && (
                                <span className="font-bold text-[#16A34A] flex items-center gap-1">
                                    ↑ {matchScoreImprovement}% Match Increase
                                </span>
                            )}
                            {versionNumber != null && (
                                <span className="text-[#64748B] font-medium">Version {versionNumber}</span>
                            )}
                            <span className="text-[#64748B] font-medium ml-auto">
                                Status: <span className="text-[#16A34A]">{status}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

