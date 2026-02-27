import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api/auth';
import LinkedInLoginButton from '../components/LinkedInLoginButton';

export default function SignupPage() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await signup({ email, full_name: fullName, password });
            navigate('/login');
        } catch (err: any) {
            setError(err?.response?.data?.detail ?? 'Signup failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚀</div>
                    <h2 className="gradient-text">Create Account</h2>
                    <p className="text-sm text-muted" style={{ marginTop: '0.35rem' }}>
                        Start your AI-powered career journey
                    </p>
                </div>

                <div className="mb-6">
                    <LinkedInLoginButton />
                </div>

                <div className="relative flex py-2 items-center mb-6">
                    <div className="flex-grow border-t border-subtle"></div>
                    <span className="flex-shrink-0 mx-4 text-muted text-xs">OR EMAIL SIGNUP</span>
                    <div className="flex-grow border-t border-subtle"></div>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} id="signup-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="signup-name">Full Name</label>
                        <input
                            id="signup-name"
                            type="text"
                            className="form-input"
                            placeholder="Jane Smith"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="signup-email">Email</label>
                        <input
                            id="signup-email"
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
                        <label className="form-label" htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            className="form-input"
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <button
                        id="signup-submit"
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        disabled={loading}
                    >
                        {loading ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
                    </button>
                </form>

                <p className="auth-divider" style={{ marginTop: '1.5rem' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
