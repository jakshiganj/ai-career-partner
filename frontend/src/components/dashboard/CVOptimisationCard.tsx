import { useState, useEffect } from 'react';
import { Sparkles, Edit3, FileText, Download, Check } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { type TemplateName } from './cvTemplates';
import { formatCVForEditing, downloadPDF, downloadDOCX } from './cvExportUtils';
import CVCritiquePanel from './CVCritiquePanel';
import CVComparisonView from './CVComparisonView';

type CardStatus = 'Complete' | 'In Progress' | 'Not Run' | 'Failed';

interface CVCritique {
    summary?: string;
    matching_skills?: string[];
    transferable_skills?: string[];
    missing_critical_skills?: string[];
}

interface CVOptimisationCardProps {
    originalText: string | null;
    optimisedText: string | null;
    critique?: CVCritique | null;
    versionNumber?: number;
    matchScoreImprovement?: number | null;
    status?: CardStatus;
    onViewFull?: () => void;
    onDownload?: () => void;
    onRestorePrevious?: () => void;
}

export default function CVOptimisationCard({
    originalText,
    optimisedText,
    critique,
    versionNumber,
    matchScoreImprovement,
    status = 'Not Run',
    onRestorePrevious,
}: CVOptimisationCardProps) {
    const hasContent = originalText != null && optimisedText != null && optimisedText.length > 0;
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(optimisedText || '');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateName>('modern');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (optimisedText && !isEditing) {
            setEditedText(optimisedText);
        }
    }, [optimisedText, isEditing]);

    const handleEditClick = () => {
        setEditedText(formatCVForEditing(editedText));
        setIsEditing(true);
    };

    const handleDownloadPDF = async () => {
        setIsExporting(true);
        try { await downloadPDF(editedText, selectedTemplate); }
        catch (error) { console.error('PDF Export failed', error); }
        finally { setIsExporting(false); }
    };

    const handleDownloadDOCX = async () => {
        setIsExporting(true);
        try { await downloadDOCX(editedText, selectedTemplate); }
        catch (error) { console.error('DOCX Export failed', error); }
        finally { setIsExporting(false); }
    };

    if (!hasContent) {
        return (
            <div className="rounded-xl border border-[#E0E0E0] bg-white mb-8 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#E0E0E0] px-8 py-5 bg-[#F9F9F9]">
                    <div className="flex items-center gap-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">CV Optimisation</h3>
                        <span className="rounded-full bg-[#0D0D0D] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                            AI GENERATION
                        </span>
                    </div>
                </div>
                <div className="p-16 text-center text-sm font-medium text-[#4A4A4A] opacity-60">
                    Optimised version will be available after successful pipeline execution.
                </div>
            </div>
        );
    }

    return (
        <section className="rounded-xl border border-[#E0E0E0] bg-white mb-10 overflow-hidden">
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E0E0E0] px-8 py-5 bg-[#F9F9F9] gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">CV Optimisation</h3>
                    <span className="rounded-full bg-[#5BC0EB] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2">
                        <Sparkles className="h-3 w-3" /> ADVIEST AI
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {isEditing ? (
                        <>
                            <div className="flex items-center gap-3 mr-4 border-r border-[#E0E0E0] pr-4">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">TEMPLATE:</span>
                                <select 
                                    className="text-xs font-bold border border-[#E0E0E0] rounded-lg px-3 py-1.5 text-[#0D0D0D] bg-white focus:outline-none focus:border-[#0D0D0D]"
                                    value={selectedTemplate}
                                    onChange={(e) => setSelectedTemplate(e.target.value as TemplateName)}
                                >
                                    <option value="modern">Modern</option>
                                    <option value="classic">Classic</option>
                                    <option value="minimalist">Minimalist</option>
                                </select>
                            </div>
                            <button onClick={handleDownloadPDF} disabled={isExporting} className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all disabled:opacity-50">
                                <FileText className="h-3.5 w-3.5" /> PDF
                            </button>
                            <button onClick={handleDownloadDOCX} disabled={isExporting} className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all disabled:opacity-50">
                                <Download className="h-3.5 w-3.5" /> DOCX
                            </button>
                            <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 rounded-lg border border-[#0D0D0D] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all ml-2">
                                <Check className="h-3.5 w-3.5" /> DONE
                            </button>
                        </>
                    ) : (
                        <>
                            {onRestorePrevious && (
                                <button type="button" onClick={onRestorePrevious} className="text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60 hover:opacity-100 transition-opacity">
                                    Discard All
                                </button>
                            )}
                            <button onClick={handleEditClick} className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all shadow-lg shadow-black/10">
                                <Edit3 className="h-3.5 w-3.5" /> Edit & Export
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Critique panel */}
            {critique && !isEditing && <CVCritiquePanel critique={critique} />}

            {/* Editor or comparison view */}
            {isEditing ? (
                <div className="flex flex-col h-[650px] bg-white">
                    <div className="px-8 py-4 bg-[#F9F9F9] border-b border-[#E0E0E0] flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">RAW SOURCE EDITOR</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#A0A0A0]">MARKDOWN ENABLED</span>
                    </div>
                    <div className="flex-1 overflow-hidden" data-color-mode="light">
                        <MDEditor
                            value={editedText}
                            onChange={(val) => setEditedText(val || '')}
                            height="100%"
                            preview="live"
                            className="border-0 shadow-none !rounded-none"
                            style={{ height: '100%', border: 'none' }}
                        />
                    </div>
                </div>
            ) : (
                <CVComparisonView
                    originalText={originalText || ''}
                    editedText={editedText}
                    matchScoreImprovement={matchScoreImprovement}
                    versionNumber={versionNumber}
                    status={status}
                />
            )}
        </section>
    );
}
