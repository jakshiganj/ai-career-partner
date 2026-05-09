import './AuthPages.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { signup } from '../../api/auth';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import LinkedInLoginButton from '../../components/auth/LinkedInLoginButton';

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
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { detail?: string } } };
            setError(axiosError?.response?.data?.detail ?? 'Signup failed.');
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
                        Start your AI-powered career journey today.
                    </h2>
                    <p className="auth-brand-sub">
                        Upload your CV, get instant skill analysis, matched jobs, and a personalized roadmap.
                    </p>
                    <div className="auth-brand-features">
                        {['Multi-agent AI pipeline', 'ESCO skill graph mapping', 'Real-time interview prep'].map(f => (
                            <div key={f} className="auth-brand-feature">
                                <span className="auth-brand-feature-dot" />
                                {f}
                            </div>
                        ))}
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
                        <h1 className="auth-form-title">Create an account</h1>
                        <p className="auth-form-subtitle">Get started with your free career analysis.</p>
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
                            <label htmlFor="fullName">Full name</label>
                            <input
                                id="fullName"
                                type="text"
                                placeholder="Jane Smith"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                required
                            />
                        </div>

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
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={8}
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
                                    Create account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
