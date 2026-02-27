import { useState } from 'react';
import axios from 'axios';

interface Props {
    onScrapeComplete?: (scrapedData: any) => void;
}

export default function LinkedInURLInput({ onScrapeComplete }: Props) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [scraped, setScraped] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleScrape() {
        if (!url || !url.includes('linkedin.com/in/')) {
            setError('Please enter a valid LinkedIn Profile URL');
            return;
        }

        setLoading(true);
        setError(null);
        setScraped(false);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                'http://localhost:8000/api/linkedin/scrape',
                { url },
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : ''
                    }
                }
            );

            if (res.data?.merged) {
                setScraped(true);
                if (onScrapeComplete) {
                    onScrapeComplete(res.data.scraped_data);
                }
            } else {
                setError('Could not scrape public profile (Private or Blocked). Falling back to CV data.');
            }
        } catch (e: any) {
            // Mute hard errors as per requirements
            setError('Failed silently. Continuing with CV data only.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="card p-4 mt-4" style={{ backgroundColor: '#f9f9fb', border: '1px dashed #cdd0d8' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: '#0a66c2' }}>Optional: Scrape Public Profile</h4>
            <p className="text-xs text-muted mb-3">
                Paste your open public LinkedIn URL to pull basic metadata into your Candidate Profile.
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    className="input flex-1"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading || scraped}
                />
                <button
                    className="btn primary"
                    onClick={handleScrape}
                    disabled={loading || scraped || !url}
                    style={{ backgroundColor: '#0a66c2' }}
                >
                    {loading ? 'Scraping...' : scraped ? 'Synced!' : 'Scrape'}
                </button>
            </div>
            {error && <p className="text-xs text-error mt-2">{error}</p>}
        </div>
    );
}
