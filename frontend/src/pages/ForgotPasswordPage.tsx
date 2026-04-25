import './AuthPages.css';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mail, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await forgotPassword(email);
            setSubmitted(true);
        } catch {
            setError('Something went wrong. Please try again.');
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
                        Secure account recovery.
                    </h2>
                    <p className="auth-brand-sub">
                        We'll send you a secure link to reset your password and get back to your career dashboard.
                    </p>
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
                    {submitted ? (
                        <div className="auth-success-state">
                            <div className="auth-success-icon">
                                <Mail className="w-7 h-7" />
                            </div>
                            <h1 className="auth-form-title">Check your inbox</h1>
                            <p className="auth-form-subtitle">
                                If an account exists with <strong>{email}</strong>, you'll receive a password reset email within a few minutes.
                            </p>
                            <button
                                className="auth-submit"
                                style={{ marginTop: '1.5rem' }}
                                onClick={() => setSubmitted(false)}
                            >
                                Try a different email
                            </button>
                            <p className="auth-switch">
                                <Link to="/login">← Back to sign in</Link>
                            </p>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="auth-back-link">
                                <ArrowLeft className="w-4 h-4" />
                                Back to sign in
                            </Link>

                            <div className="auth-form-header">
                                <h1 className="auth-form-title">Forgot password?</h1>
                                <p className="auth-form-subtitle">Enter your email and we'll send you a reset link.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="auth-form">
                                <div className="auth-field">
                                    <label htmlFor="forgot-email">Email</label>
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        autoFocus
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
                                            Send reset link
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
