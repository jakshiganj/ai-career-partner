import { useState } from 'react';

export default function LinkedInLoginButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLinkedInLogin() {
        setLoading(true);
        setError(null);
        try {
            const backendUrl = 'http://localhost:8000';
            // Start the OAuth flow via a standard top-level redirect
            window.location.href = `${backendUrl}/auth/linkedin/login`;
        } catch (e: any) {
            setError(e.message || 'An error occurred during LinkedIn connect');
            setLoading(false);
        }
    }

    return (
        <div className="linkedin-import">
            <button
                className="btn outline flex items-center gap-2"
                style={{
                    borderColor: '#0a66c2',
                    color: '#0a66c2',
                    backgroundColor: 'transparent',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px'
                }}
                onClick={handleLinkedInLogin}
                disabled={loading}
            >
                {loading ? <span className="spinner" style={{ borderColor: '#0a66c2', borderTopColor: 'transparent' }} /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                )}
                Sign in with LinkedIn (OpenID)
            </button>
            {error && <p className="text-xs text-error mt-2">{error}</p>}
            <p className="text-xs text-muted mt-2 text-center">OpenID Connect provides name and email only.</p>
        </div>
    );
}
