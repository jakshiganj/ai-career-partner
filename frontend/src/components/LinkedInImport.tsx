import { useState } from 'react';
import axios from 'axios';

interface Props {
    onImportComplete?: (profileData: any) => void;
}

export default function LinkedInImport({ onImportComplete }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLinkedInLogin() {
        setLoading(true);
        setError(null);
        try {
            // Step 1: Redirect to LinkedIn OAuth flow
            // The backend /auth/linkedin/login route should redirect the user to LinkedIn
            // We will open it in a popup window to keep the SPA state
            const backendUrl = 'http://localhost:8000';
            const width = 600, height = 700;
            const left = window.screen.width / 2 - width / 2;
            const top = window.screen.height / 2 - height / 2;

            const popup = window.open(
                `${backendUrl}/auth/linkedin/login`,
                'LinkedIn Login',
                `width=${width},height=${height},top=${top},left=${left}`
            );

            if (!popup) {
                throw new Error('Please allow popups for this site');
            }

            // Step 2: Listen for message from popup once callback is complete
            const handleMessage = async (event: MessageEvent) => {
                // Ensure message is from our backend
                if (event.origin !== backendUrl && event.origin !== "http://127.0.0.1:8000") return;

                if (event.data?.type === 'LINKEDIN_AUTH_SUCCESS') {
                    // Callback success, access token is in event data
                    window.removeEventListener('message', handleMessage);
                    popup.close();

                    try {
                        // Fetch imported profile data using the token/session
                        const profileRes = await axios.get(`${backendUrl}/api/candidate-profile`, {
                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                        });
                        setLoading(false);
                        onImportComplete?.(profileRes.data);
                    } catch (e) {
                        setError('Failed to fetch profile after import');
                        setLoading(false);
                    }
                }

                if (event.data?.type === 'LINKEDIN_AUTH_ERROR') {
                    window.removeEventListener('message', handleMessage);
                    popup.close();
                    setError(event.data.error || 'LinkedIn authentication failed');
                    setLoading(false);
                }
            };

            window.addEventListener('message', handleMessage);

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
                    width: '100%'
                }}
                onClick={handleLinkedInLogin}
                disabled={loading}
            >
                {loading ? <span className="spinner" style={{ borderColor: '#0a66c2', borderTopColor: 'transparent' }} /> : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                )}
                Import from LinkedIn
            </button>
            {error && <p className="text-xs text-error mt-2">{error}</p>}
        </div>
    );
}
