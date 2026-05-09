export const TEMPLATES = {
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
} as const;

export type TemplateName = keyof typeof TEMPLATES;
