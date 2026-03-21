import { useRef, useState } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';

// import worker directly with vite ?url
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
    onResult?: (cvId: number, feedback: unknown, preview: string) => void;
}

export default function CVUpload({ onResult }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Client-side PII Redaction
    const redactPII = (text: string) => {
        // Redact standard Emails
        let redacted = text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[REDACTED_EMAIL]');
        // Redact standard Phone Numbers (basic formatting)
        redacted = redacted.replace(/(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, '[REDACTED_PHONE]');
        // Transformers.js NER step would go here if running fully locally in pure browser (skipped here to save 20mb payload constraint)
        return redacted;
    }

    async function extractTextFromPDF(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    let fullText = '';

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        const pageText = content.items.map((item: unknown) => (item as { str?: string }).str ?? '').join(' ');
                        fullText += pageText + '\n';
                    }
                    resolve(fullText);
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    async function handleFile(file: File) {
        if (file.type !== 'application/pdf') {
            setError('Only PDF files are accepted.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('File exceeds 5MB limit.');
            return;
        }

        setError(null);
        setFileName(file.name);
        setUploading(true);

        try {
            // 1. Client-Side Parsing
            const rawText = await extractTextFromPDF(file);

            // 2. Client-Side Redaction (Transformers.js / Regex)
            const redactedText = redactPII(rawText);

            // 3. Send securely redacted text to backend endpoint
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (!token) {
                setError('You must be logged in to upload a CV.');
                setUploading(false);
                return;
            }

            const res = await axios.post(
                'http://localhost:8000/cv/upload',
                { text: redactedText },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setUploading(false);

            // 4. Auto-analyze for ATS Scoring and pipelines
            setAnalyzing(true);
            const analysis = await axios.post(`http://localhost:8000/cv/analyze/${res.data.cv_id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalyzing(false);

            onResult?.(res.data.cv_id, analysis.data.ai_feedback, redactedText);
        } catch (e: unknown) {
            const axiosError = e as { response?: { data?: { detail?: string } }, message?: string };
            setError(axiosError?.response?.data?.detail ?? axiosError.message ?? 'Upload failed.');
            setUploading(false);
            setAnalyzing(false);
        }
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }

    const isLoading = uploading || analyzing;

    return (
        <div className="w-full">
            <div
                id="cv-drop-zone"
                className={`relative flex flex-col items-center justify-center rounded-lg p-6 text-center transition-all ${dragActive
                        ? 'bg-blue-50 border-2 border-dashed border-[#3B82F6]'
                        : 'bg-transparent'
                    }`}
                onClick={() => !isLoading && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                style={{ cursor: isLoading ? 'default' : 'pointer' }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={onInputChange}
                    id="cv-file-input"
                />

                {isLoading ? (
                    <div className="flex flex-col items-center space-y-3">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
                        <p className="text-sm font-medium text-[#3B82F6]">
                            {uploading ? 'Parsing & Redacting PII locally...' : 'Analyzing with Gemini AI…'}
                        </p>
                    </div>
                ) : fileName ? (
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-green-600 break-all">{fileName}</p>
                        <p className="text-xs font-medium text-[#3B82F6]">Ready for Analysis! Click to replace.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9] text-[#64748B] mb-2">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A]">Drop your CV here or click to browse</p>
                        <p className="text-xs text-[#64748B]">PDF files only (Max 5MB)</p>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}
        </div>
    );
}

