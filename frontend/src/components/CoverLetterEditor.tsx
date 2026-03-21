import { useState } from 'react';

interface Props {
    initialContent: string | null;
    onRegenerate: (tone: string) => Promise<string>;
}

export default function CoverLetterEditor({ initialContent, onRegenerate }: Props) {
    const [content, setContent] = useState(initialContent || '');
    const [tone, setTone] = useState('professional');
    const [loading, setLoading] = useState(false);

    // Sync prop changes
    if (initialContent && content === '' && initialContent !== '') {
        setContent(initialContent);
    }

    async function handleRegenerate() {
        setLoading(true);
        try {
            const newContent = await onRegenerate(tone);
            setContent(newContent);
        } catch (e) {
            console.error(e);
            alert("Failed to regenerate cover letter");
        } finally {
            setLoading(false);
        }
    }

    function handleCopy() {
        navigator.clipboard.writeText(content);
        alert("Copied to clipboard!");
    }

    if (!content && !loading) return null;

    return (
        <div className="card cover-letter-editor">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h3>✍️ Tailored Cover Letter</h3>
                <div className="flex items-center gap-3">
                    <select
                        className="form-input py-1 text-sm bg-elevated"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                    >
                        <option value="professional">Professional</option>
                        <option value="conversational">Conversational</option>
                        <option value="creative">Creative & Bold</option>
                    </select>
                    <button className="btn btn-outline btn-sm" onClick={handleRegenerate} disabled={loading}>
                        {loading ? "Generating..." : "Regenerate"}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleCopy}>
                        Copy Text
                    </button>
                </div>
            </div>

            <div className="editor-container relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 transition-all rounded">
                        <span className="spinner"></span>
                    </div>
                )}
                <textarea
                    className="w-full h-[60vh] max-h-96 min-h-[300px] p-4 text-sm font-sans bg-transparent border-none resize-none focus:outline-none focus:ring-0 leading-relaxed overflow-y-auto"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Cover letter content..."
                />
            </div>
            <p className="text-xs text-muted mt-3 text-right">
                Generated based on your latest CV and target job description. Feel free to edit directly in the box above.
            </p>
        </div>
    );
}
