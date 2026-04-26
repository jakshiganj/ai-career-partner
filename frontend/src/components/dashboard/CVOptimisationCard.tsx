import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Edit3, Download, FileText, Check, ArrowUpRight } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

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

const PREVIEW_LINES = 10;

const TEMPLATES = {
    modern: `
        <style>
            .pdf-container { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #334155; line-height: 1.6; font-size: 13px; padding: 0; margin: 0; background: #fff; }
            h1 { background-color: #0F172A; color: #ffffff; padding: 40px 20px; margin: 0 0 30px 0; text-align: center; font-size: 28px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; width: 100%; display: block; }
            h2, h3, p, ul { margin-left: 40px; margin-right: 40px; }
            h2 { color: #0EA5E9; font-size: 16px; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-top: 32px; margin-bottom: 16px; font-weight: 600; width: calc(100% - 80px); display: block; }
            h3 { color: #0F172A; font-size: 14px; margin-bottom: 6px; font-weight: 600; }
            p { margin-bottom: 10px; }
            ul { padding-left: 20px; margin-bottom: 16px; }
            li { margin-bottom: 6px; }
            h1, h2, h3, p, li { page-break-inside: avoid; }
            strong { color: #0F172A; }
        </style>
    `,
    classic: `
        <style>
            .pdf-container { font-family: 'Georgia', 'Times New Roman', serif; color: #1e293b; line-height: 1.5; font-size: 13px; padding: 40px; }
            h1 { text-align: center; font-size: 26px; font-weight: normal; margin-bottom: 8px; color: #000; letter-spacing: 1px; width: 100%; display: block; }
            h2 { font-size: 15px; text-transform: uppercase; border-bottom: 1px solid #000; margin-top: 28px; margin-bottom: 16px; font-weight: bold; color: #000; letter-spacing: 1px; padding-bottom: 8px; line-height: 1.2; width: 100%; display: block; }
            h3 { font-size: 14px; font-weight: bold; color: #334155; margin-bottom: 6px; }
            h3 em { font-weight: normal; color: #64748b; font-style: italic; }
            p { margin-bottom: 10px; }
            ul { padding-left: 22px; margin-bottom: 16px; }
            li { margin-bottom: 5px; }
            h1, h2, h3, p, li { page-break-inside: avoid; }
            hr { border: none; border-top: 1px solid #cbd5e1; margin: 20px 0; }
        </style>
    `,
    minimalist: `
        <style>
            .pdf-container { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #475569; line-height: 1.7; font-size: 13px; padding: 40px; }
            h1 { font-size: 32px; font-weight: 300; letter-spacing: 3px; color: #0f172a; margin-bottom: 30px; border-left: 4px solid #10b981; padding-left: 24px; line-height: 1.2; width: 100%; display: block; }
            h2 { font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2.5px; margin-top: 40px; margin-bottom: 20px; width: 100%; display: block; }
            h3 { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 6px; }
            p { margin-bottom: 12px; }
            ul { list-style-type: none; padding-left: 0; margin-bottom: 24px; }
            li { margin-bottom: 10px; padding-left: 18px; position: relative; }
            li:before { content: "•"; color: #10b981; font-weight: bold; position: absolute; left: 0; top: -1px; font-size: 16px; }
            h1, h2, h3, p, li { page-break-inside: avoid; }
            strong { color: #334155; font-weight: 600; }
        </style>
    `
};

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
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('modern');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (optimisedText && !isEditing) {
            setEditedText(optimisedText);
        }
    }, [optimisedText, isEditing]);

    const handleEditClick = () => {
        let text = editedText;

        // Auto-format headings if missing markdown
        const sections = [
            'PROFESSIONAL SUMMARY', 'SUMMARY', 'EXPERIENCE', 'WORK EXPERIENCE', 
            'EDUCATION', 'SKILLS', 'TECHNICAL SKILLS', 'PROJECTS', 'CERTIFICATIONS', 'LANGUAGES'
        ];
        sections.forEach(section => {
            const regex = new RegExp(`^(${section})\\s*$`, 'gim');
            text = text.replace(regex, '\n## $1\n');
        });

        // Format raw links (linkedin/github)
        text = text.replace(/(?<!\]\()(?:https?:\/\/)?(?:www\.)?(linkedin\.com\/in\/[a-zA-Z0-9_-]+|github\.com\/[a-zA-Z0-9_-]+)/gi, '[$1](https://$1)');
        
        // Format raw emails
        text = text.replace(/(?<!\]\()([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '[$1](mailto:$1)');
        
        // Format the name (first non-empty line) as H1 if not already
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().length > 0) {
                if (!lines[i].trim().startsWith('#')) {
                    lines[i] = `# ${lines[i].trim()}`;
                }
                break;
            }
        }
        text = lines.join('\n');

        // Fix line breaks for contact info right under the name
        let inHeader = true;
        const newLines = text.split('\n').map(line => {
            if (line.startsWith('## ')) inHeader = false;
            if (inHeader && line.trim() && !line.startsWith('#')) {
                return line.trim() + '  '; // markdown line break
            }
            return line;
        });
        text = newLines.join('\n');

        setEditedText(text);
        setIsEditing(true);
    };

    const handleGenerateHTML = async () => {
        const rawHtml = await marked.parse(editedText);
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                ${TEMPLATES[selectedTemplate]}
            </head>
            <body>
                ${rawHtml}
            </body>
            </html>
        `;
    };

    const handleDownloadPDF = async () => {
        setIsExporting(true);
        try {
            const rawHtml = await marked.parse(editedText);
            const element = document.createElement('div');
            
            // Provide a fixed width to the wrapper to prevent text squishing in html2canvas
            element.style.width = '800px';
            element.style.background = '#ffffff';
            element.style.boxSizing = 'border-box';
            
            // Apply the selected template's CSS but modify "body" to apply to our container
            let templateStyles = TEMPLATES[selectedTemplate];
            templateStyles = templateStyles.replace(/body\s*\{/g, '.pdf-container {');
            
            element.innerHTML = `
                <div class="pdf-container">
                    ${templateStyles}
                    ${rawHtml}
                </div>
            `;
            
            const opt = {
                margin:       15,
                filename:     'Optimised_CV.pdf',
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, letterRendering: true, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('PDF Export failed', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadDOCX = async () => {
        setIsExporting(true);
        try {
            // @ts-ignore
            let docxModule;
            try {
                // @ts-ignore
                docxModule = await import('html-to-docx');
            } catch (e) {
                console.warn("html-to-docx not supported in browser context directly, falling back to msword blob");
            }

            const htmlContent = await handleGenerateHTML();

            if (docxModule && docxModule.default) {
                const fileBuffer = await docxModule.default(htmlContent, null, {
                    table: { row: { cantSplit: true } },
                    footer: true,
                    pageNumber: true,
                });
                saveAs(fileBuffer, 'Optimised_CV.docx');
            } else {
                // Fallback to simpler method that MS Word opens perfectly
                const blob = new Blob(['\\ufeff', htmlContent], {
                    type: 'application/msword'
                });
                saveAs(blob, 'Optimised_CV.doc');
            }
        } catch (error) {
            console.error('DOCX Export failed', error);
        } finally {
            setIsExporting(false);
        }
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

    const leftPreview = (originalText || '').split('\\n').filter(l => l.trim().length > 0).slice(0, PREVIEW_LINES).join('\\n\\n');

    return (
        <section className="rounded-xl border border-[#E0E0E0] bg-white mb-10 overflow-hidden">
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
                                    onChange={(e) => setSelectedTemplate(e.target.value as keyof typeof TEMPLATES)}
                                >
                                    <option value="modern">Modern</option>
                                    <option value="classic">Classic</option>
                                    <option value="minimalist">Minimalist</option>
                                </select>
                            </div>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all disabled:opacity-50"
                            >
                                <FileText className="h-3.5 w-3.5" /> PDF
                            </button>
                            <button
                                onClick={handleDownloadDOCX}
                                disabled={isExporting}
                                className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all disabled:opacity-50"
                            >
                                <Download className="h-3.5 w-3.5" /> DOCX
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-2 rounded-lg border border-[#0D0D0D] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all ml-2"
                            >
                                <Check className="h-3.5 w-3.5" /> DONE
                            </button>
                        </>
                    ) : (
                        <>
                            {onRestorePrevious && (
                                <button
                                    type="button"
                                    onClick={onRestorePrevious}
                                    className="text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    Discard All
                                </button>
                            )}
                            <button
                                onClick={handleEditClick}
                                className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all shadow-lg shadow-black/10"
                            >
                                <Edit3 className="h-3.5 w-3.5" /> Edit & Export
                            </button>
                        </>
                    )}
                </div>
            </div>

            {critique && !isEditing && (
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
            )}

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
            )}
        </section>
    );
}
