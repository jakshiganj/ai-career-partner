import { useRef, useState } from 'react';
import { uploadCV, analyzeCV } from '../api/cv';

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


    async function handleFile(file: File) {
        if (file.type !== 'application/pdf') {
            setError('Only PDF files are accepted.');
            return;
        }
        setError(null);
        setFileName(file.name);
        setUploading(true);
        try {
            const res = await uploadCV(file);

            setPreview(res.text_preview);
            setUploading(false);

            // Auto-analyze
            setAnalyzing(true);
            const analysis = await analyzeCV(res.cv_id);
            setAnalyzing(false);
            onResult?.(res.cv_id, analysis.ai_feedback, res.text_preview);
        } catch (e: any) {
            setError(e?.response?.data?.detail ?? 'Upload failed.');
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
                            {uploading ? 'Uploading your CV…' : 'Analyzing with Gemini AI…'}
                        </p>
                    </div>
                ) : fileName ? (
                    <div>
                        <div style={{ fontSize: '2rem' }}>✅</div>
                        <p className="font-semibold" style={{ marginTop: '0.5rem' }}>{fileName}</p>
                        <p className="text-xs text-muted mt-1">Click to replace</p>
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                        <p className="font-semibold">Drop your CV here or click to browse</p>
                        <p className="text-xs text-muted mt-1">PDF files only</p>
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
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Preview: </span>
                    {preview}…
                </div>
            )}
        </div>
    );
}
