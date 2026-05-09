import { marked } from 'marked';
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { TEMPLATES, type TemplateName } from './cvTemplates';

/**
 * Formats raw CV text with markdown headings, links, and line breaks for editing.
 */
export function formatCVForEditing(rawText: string): string {
    let text = rawText;

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

    return text;
}

/**
 * Generates full HTML document from markdown text with the selected template.
 */
export async function generateHTML(markdownText: string, template: TemplateName): Promise<string> {
    const rawHtml = await marked.parse(markdownText);
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            ${TEMPLATES[template]}
        </head>
        <body>
            ${rawHtml}
        </body>
        </html>
    `;
}

/**
 * Exports the CV as a PDF file.
 */
export async function downloadPDF(markdownText: string, template: TemplateName): Promise<void> {
    const rawHtml = await marked.parse(markdownText);
    const element = document.createElement('div');
    
    element.style.width = '800px';
    element.style.background = '#ffffff';
    element.style.boxSizing = 'border-box';
    
    let templateStyles: string = TEMPLATES[template];
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
}

/**
 * Exports the CV as a DOCX file (with fallback to .doc).
 */
export async function downloadDOCX(markdownText: string, template: TemplateName): Promise<void> {
    let docxModule;
    try {
        // @ts-expect-error - dynamic import lacks types
        docxModule = await import('html-to-docx');
    } catch {
        console.warn("html-to-docx not supported in browser context directly, falling back to msword blob");
    }

    const htmlContent = await generateHTML(markdownText, template);

    if (docxModule && docxModule.default) {
        const fileBuffer = await docxModule.default(htmlContent, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        });
        saveAs(fileBuffer, 'Optimised_CV.docx');
    } else {
        const blob = new Blob(['\\ufeff', htmlContent], {
            type: 'application/msword'
        });
        saveAs(blob, 'Optimised_CV.doc');
    }
}
