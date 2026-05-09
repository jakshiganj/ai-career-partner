import './AuthPages.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { login } from '../../api/auth';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import LinkedInLoginButton from '../../components/auth/LinkedInLoginButton';

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
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { detail?: string } } };
            setError(axiosError?.response?.data?.detail ?? 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page-root">
            {/* Left panel — branding */}
            <div className="auth-brand-panel">
                <div className="auth-brand-glow" />
                <div className="auth-brand-content">
                    <Link to="/" className="auth-logo">
                        <div className="auth-logo-mark"><Sparkles className="w-5 h-5" /></div>
                        CareerAI
                    </Link>
                    <h2 className="auth-brand-heading">
                        AI-powered career intelligence for professionals.
                    </h2>
                    <p className="auth-brand-sub">
                        Skill mapping, job matching, interview prep — all in one pipeline.
                    </p>
                    <div className="auth-brand-stats">
                        <div className="auth-brand-stat">
                            <span className="auth-brand-stat-num">10k+</span>
                            <span className="auth-brand-stat-label">Profiles</span>
                        </div>
                        <div className="auth-brand-stat">
                            <span className="auth-brand-stat-num">97%</span>
                            <span className="auth-brand-stat-label">Accuracy</span>
                        </div>
                        <div className="auth-brand-stat">
                            <span className="auth-brand-stat-num">&lt;2min</span>
                            <span className="auth-brand-stat-label">Runtime</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="auth-form-panel">
                <motion.div
                    className="auth-form-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">Welcome back</h1>
                        <p className="auth-form-subtitle">Sign in to your account to continue.</p>
                    </div>

                    {/* Social login */}
                    <div className="auth-social-row">
                        <div className="auth-social-btn">
                            <GoogleLoginButton minimal />
                        </div>
                        <div className="auth-social-btn">
                            <LinkedInLoginButton minimal />
                        </div>
                    </div>

                    <div className="auth-divider-row">
                        <span className="auth-divider-line" />
                        <span className="auth-divider-text">or continue with email</span>
                        <span className="auth-divider-line" />
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <div className="auth-field-header">
                                <label htmlFor="password">Password</label>
                                <Link to="/forgot-password" className="auth-field-link">Forgot password?</Link>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="auth-error">{error}</div>
                        )}

                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? (
                                <span className="auth-spinner" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Don't have an account? <Link to="/signup">Create one</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
