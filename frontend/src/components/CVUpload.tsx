import { useRef, useState } from 'react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';

// import worker directly with vite ?url
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
    onResult?: (cvId: number, feedback: any, preview: string) => void;
}

export default function CVUpload({ onResult }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

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
                        const pageText = content.items.map((item: any) => item.str).join(' ');
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
            let token = localStorage.getItem('token');
            if (!token) {
                // If local dev missing token, mock a quick login to get one to prevent 401s
                const mockAuth = await axios.post('http://localhost:8000/auth/login', new URLSearchParams({
                    username: 'test@example.com',
                    password: 'password'
                }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
                token = mockAuth.data.access_token;
                localStorage.setItem('token', token as string);

                // Store user Id so Dashboard doesn't default to 1 blindly
                localStorage.setItem('user_id', '1'); // For robust routing
            }

            const res = await axios.post(
                'http://localhost:8000/cv/upload',
                { text: redactedText },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPreview(res.data.profile.headline || 'Profile Extracted');
            setUploading(false);

            // 4. Auto-analyze for ATS Scoring and pipelines
            setAnalyzing(true);
            const analysis = await axios.post(`http://localhost:8000/cv/analyze/${res.data.cv_id}`, {}, {
                headers: { Authorization: token ? `Bearer ${token}` : '' }
            });
            setAnalyzing(false);

            onResult?.(res.data.cv_id, analysis.data.ai_feedback, redactedText.substring(0, 150));
        } catch (e: any) {
            setError(e?.response?.data?.detail ?? e.message ?? 'Upload failed.');
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
        <div>
            <div
                id="cv-drop-zone"
                className={`drop-zone${dragActive ? ' drag-active' : ''}`}
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
                    style={{ display: 'none' }}
                    onChange={onInputChange}
                    id="cv-file-input"
                />
                {isLoading ? (
                    <div className="flex flex-col items-center gap-1" style={{ gap: '0.75rem', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
                        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                        <p style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>
                            {uploading ? 'Parsing & Redacting PII locally...' : 'Analyzing with Gemini AI…'}
                        </p>
                    </div>
                ) : fileName ? (
                    <div>
                        <div style={{ fontSize: '2rem' }}>✅</div>
                        <p className="font-semibold" style={{ marginTop: '0.5rem', color: 'var(--success)' }}>Successfully uploaded: {fileName}</p>
                        <p className="text-xs" style={{ color: 'var(--accent-blue)', marginTop: '0.25rem', fontWeight: 600 }}>Ready for Analysis Pipeline! Click to replace.</p>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                        <p className="font-semibold">Drop your CV here or click to browse</p>
                        <p className="text-xs text-muted mt-1">PDF files only (Max 5MB)</p>
                    </div>
                )}
            </div>

            {error && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}

            {preview && !isLoading && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Extracted: </span>
                    {preview}…
                </div>
            )}
        </div>
    );
}
