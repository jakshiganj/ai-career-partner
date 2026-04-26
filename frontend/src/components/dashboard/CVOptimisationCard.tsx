import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Edit3, Download, FileText, Check } from 'lucide-react';
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
            // For browser DOCX export, a simple standard way without heavy node dependencies is saving as a .doc mime type, 
            // but since we installed html-to-docx, let's try to use it if available, else fallback to standard msword blob.
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

    const leftPreview = (originalText || '').split('\\n').filter(l => l.trim().length > 0).slice(0, PREVIEW_LINES).join('\\n\\n');

    return (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm mb-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#F1F5F9] px-6 py-4 gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h3 className="text-lg font-bold text-[#0F172A]">CV Optimisation</h3>
                    <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#3B82F6] border border-[#BFDBFE] flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> AI Suggestions
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    {isEditing ? (
                        <>
                            <div className="flex items-center gap-2 mr-4 border-r border-[#E2E8F0] pr-4">
                                <span className="text-xs font-semibold text-[#64748B]">Template:</span>
                                <select 
                                    className="text-sm border border-[#E2E8F0] rounded-md px-2 py-1 text-[#0F172A] bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
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
                                className="flex items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#DC2626] transition-colors shadow-sm disabled:opacity-50"
                            >
                                <FileText className="h-4 w-4" /> PDF
                            </button>
                            <button
                                onClick={handleDownloadDOCX}
                                disabled={isExporting}
                                className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors shadow-sm disabled:opacity-50"
                            >
                                <Download className="h-4 w-4" /> DOCX
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors shadow-sm ml-2"
                            >
                                <Check className="h-4 w-4 text-[#10B981]" /> Done
                            </button>
                        </>
                    ) : (
                        <>
                            {onRestorePrevious && (
                                <button
                                    type="button"
                                    onClick={onRestorePrevious}
                                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
                                >
                                    Discard All
                                </button>
                            )}
                            <button
                                onClick={handleEditClick}
                                className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2563EB] transition-colors shadow-sm"
                            >
                                <Edit3 className="h-4 w-4" /> Edit & Export
                            </button>
                        </>
                    )}
                </div>
            </div>

            {critique && !isEditing && (
                <div className="bg-[#F8FAFC] border-b border-[#F1F5F9] p-6 text-sm text-[#475569] shadow-inner inset-0">
                    <h4 className="font-bold text-[#0F172A] mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#3B82F6]" /> Strategic Feedback</h4>
                    <p className="mb-5 leading-relaxed">{critique.summary}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {critique.matching_skills && critique.matching_skills.length > 0 && (
                            <div>
                                <h5 className="font-bold text-[#16A34A] mb-2 uppercase tracking-wider text-[10px]">Matching Skills</h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {critique.matching_skills.map(s => <span key={s} className="bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] px-2 py-0.5 rounded shadow-sm text-xs font-semibold">{s}</span>)}
                                </div>
                            </div>
                        )}
                        {critique.transferable_skills && critique.transferable_skills.length > 0 && (
                            <div>
                                <h5 className="font-bold text-[#3B82F6] mb-2 uppercase tracking-wider text-[10px]">Transferable</h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {critique.transferable_skills.map(s => <span key={s} className="bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] px-2 py-0.5 rounded shadow-sm text-xs font-semibold">{s}</span>)}
                                </div>
                            </div>
                        )}
                        {critique.missing_critical_skills && critique.missing_critical_skills.length > 0 && (
                            <div>
                                <h5 className="font-bold text-[#DC2626] mb-2 uppercase tracking-wider text-[10px]">Missing / Critical</h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {critique.missing_critical_skills.map(s => <span key={s} className="bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] px-2 py-0.5 rounded shadow-sm text-xs font-semibold">{s}</span>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isEditing ? (
                <div className="flex flex-col h-[600px] bg-white">
                    <div className="p-4 bg-[#F8FAFC] border-b border-[#F1F5F9] flex justify-between items-center">
                        <span className="text-sm font-bold text-[#0F172A]">Markdown Editor</span>
                        <span className="text-xs text-[#64748B]">You can freely edit your CV here before exporting.</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#F1F5F9]">
                    {/* Original Column */}
                    <div className="flex flex-col">
                        <div className="bg-[#F8FAFC] px-6 py-3 border-b border-[#F1F5F9]">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Original Content</span>
                        </div>
                        <div className="p-6 relative h-[500px] overflow-y-auto">
                            <div className="absolute right-0 top-1/2 -mt-4 -mr-4 bg-white rounded-full p-2 border border-[#E2E8F0] shadow-sm z-10 hidden md:block">
                                <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                            </div>
                            <div className="group relative rounded-xl border border-transparent p-4 hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                                <pre className="whitespace-pre-wrap font-display text-sm leading-relaxed text-[#475569] opacity-80" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {leftPreview}
                                    {originalText && originalText.split('\\n').filter(l => l.trim().length > 0).length > PREVIEW_LINES && '\\n\\n...'}
                                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Optimised Column */}
                    <div className="flex flex-col bg-[#F8FAFC]/30">
                        <div className="bg-[#EFF6FF]/50 px-6 py-3 border-b border-[#E0E7FF] flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">Optimised Content Preview</span>
                            <span className="text-[10px] uppercase font-bold text-[#3B82F6] bg-white px-2 py-0.5 rounded border border-[#BFDBFE]">Markdown</span>
                        </div>
                        <div className="p-6 h-[500px] overflow-y-auto" data-color-mode="light">
                            <div className="group relative rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm overflow-hidden prose prose-sm max-w-none">
                                <MDEditor.Markdown source={editedText} style={{ whiteSpace: 'pre-wrap', backgroundColor: 'transparent', color: '#0F172A' }} />
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs px-2">
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
            )}
        </section>
    );
}
