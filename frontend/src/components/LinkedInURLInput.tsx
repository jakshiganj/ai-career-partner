import { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';

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
            setError('Failed silently. Continuing with CV data only.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <p className="section-label" style={{ color: 'var(--accent-blue)' }}>
                Optional: Scrape Public Profile
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Paste your open public LinkedIn URL to pull basic metadata into your Candidate Profile.
            </p>
            <div className="flex gap-2" style={{ gap: '0.5rem' }}>
                <input
                    type="text"
                    className="form-input flex-1 text-sm"
                    style={{ flex: 1 }}
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading || scraped}
                />
                <Button
                    variant={scraped ? "secondary" : "default"}
                    size="default"
                    onClick={handleScrape}
                    disabled={loading || scraped || !url}
                >
                    {loading ? 'Scraping...' : scraped ? '✓ Synced' : 'Scrape'}
                </Button>
            </div>
            {error && <p className="text-xs mt-1" style={{ color: 'var(--accent-red)', marginTop: '0.5rem' }}>{error}</p>}
        </div>
    );
}
