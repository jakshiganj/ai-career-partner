import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const data = await login({ username: email, password });
            localStorage.setItem('access_token', data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚡</div>
                    <h2 className="gradient-text">AI Career Partner</h2>
                    <p className="text-sm text-muted" style={{ marginTop: '0.35rem' }}>
                        Sign in to your account
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <button
                        id="login-submit"
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        disabled={loading}
                    >
                        {loading ? <><span className="spinner" /> Signing in…</> : 'Sign In'}
                    </button>
                </form>

                <p className="auth-divider" style={{ marginTop: '1.5rem' }}>
                    Don't have an account?{' '}
                    <Link to="/signup" className="auth-link">Create one</Link>
                </p>
            </div>
        </div>
    );
}
