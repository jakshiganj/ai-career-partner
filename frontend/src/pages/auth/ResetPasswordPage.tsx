import './AuthPages.css';
import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { verifyResetToken, resetPassword } from '../../api/auth';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkToken() {
            if (!token) {
                setVerifying(false);
                return;
            }
            try {
                const result = await verifyResetToken(token);
                setTokenValid(result.valid);
            } catch {
                setTokenValid(false);
            } finally {
                setVerifying(false);
            }
        }
        checkToken();
    }, [token]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { detail?: string } } };
            setError(axiosError?.response?.data?.detail ?? 'Failed to reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    }

    /* ─── Verifying token ─────────────────────────────── */
    if (verifying) {
        return (
            <div className="auth-page-root">
                <div className="auth-brand-panel">
                    <div className="auth-brand-glow" />
                    <div className="auth-brand-content">
                        <Link to="/" className="auth-logo">
                            <div className="auth-logo-mark"><Sparkles className="w-5 h-5" /></div>
                            CareerAI
                        </Link>
                        <h2 className="auth-brand-heading">Verifying your link…</h2>
                        <p className="auth-brand-sub">Just a moment while we check your reset token.</p>
                    </div>
                </div>
                <div className="auth-form-panel">
                    <div className="auth-form-card" style={{ textAlign: 'center' }}>
                        <div className="auth-success-icon">
                            <span className="auth-spinner" style={{ borderColor: 'rgba(91,192,235,0.3)', borderTopColor: '#5BC0EB' }} />
                        </div>
                        <h1 className="auth-form-title" style={{ marginTop: '1.5rem' }}>Verifying link</h1>
                        <p className="auth-form-subtitle">Please wait…</p>
                    </div>
                </div>
            </div>
        );
    }

    /* ─── Invalid / expired token ─────────────────────── */
    if (!tokenValid && !success) {
        return (
            <div className="auth-page-root">
                <div className="auth-brand-panel">
                    <div className="auth-brand-glow" />
                    <div className="auth-brand-content">
                        <Link to="/" className="auth-logo">
                            <div className="auth-logo-mark"><Sparkles className="w-5 h-5" /></div>
                            CareerAI
                        </Link>
                        <h2 className="auth-brand-heading">Link expired.</h2>
                        <p className="auth-brand-sub">Password reset links are valid for a limited time. Please request a new one.</p>
                    </div>
                </div>
                <div className="auth-form-panel">
                    <motion.div
                        className="auth-form-card auth-success-state"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="auth-success-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                            <XCircle className="w-7 h-7" />
                        </div>
                        <h1 className="auth-form-title">Invalid or expired link</h1>
                        <p className="auth-form-subtitle">This reset link is no longer valid. Request a new one below.</p>
                        <Link to="/forgot-password" className="auth-submit" style={{ marginTop: '1.5rem', textDecoration: 'none' }}>
                            Request new link
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <p className="auth-switch">
                            <Link to="/login">← Back to sign in</Link>
                        </p>
                    </motion.div>
                </div>
            </div>
        );
    }

    /* ─── Success ──────────────────────────────────────── */
    if (success) {
        return (
            <div className="auth-page-root">
                <div className="auth-brand-panel">
                    <div className="auth-brand-glow" />
                    <div className="auth-brand-content">
                        <Link to="/" className="auth-logo">
                            <div className="auth-logo-mark"><Sparkles className="w-5 h-5" /></div>
                            CareerAI
                        </Link>
                        <h2 className="auth-brand-heading">You're all set.</h2>
                        <p className="auth-brand-sub">Your password has been updated. You can now sign in with your new credentials.</p>
                    </div>
                </div>
                <div className="auth-form-panel">
                    <motion.div
                        className="auth-form-card auth-success-state"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="auth-success-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                            <CheckCircle className="w-7 h-7" />
                        </div>
                        <h1 className="auth-form-title">Password reset!</h1>
                        <p className="auth-form-subtitle">Redirecting you to sign in…</p>
                        <Link to="/login" className="auth-submit" style={{ marginTop: '1.5rem', textDecoration: 'none' }}>
                            Sign in now
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        );
    }

    /* ─── Reset form ──────────────────────────────────── */
    return (
        <div className="auth-page-root">
            <div className="auth-brand-panel">
                <div className="auth-brand-glow" />
                <div className="auth-brand-content">
                    <Link to="/" className="auth-logo">
                        <div className="auth-logo-mark"><Sparkles className="w-5 h-5" /></div>
                        CareerAI
                    </Link>
                    <h2 className="auth-brand-heading">
                        Create a strong password.
                    </h2>
                    <p className="auth-brand-sub">
                        Use at least 8 characters with a mix of letters, numbers, and symbols for maximum security.
                    </p>
                </div>
            </div>

            <div className="auth-form-panel">
                <motion.div
                    className="auth-form-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="auth-form-header">
                        <h1 className="auth-form-title">Set new password</h1>
                        <p className="auth-form-subtitle">Enter your new password below.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form" id="reset-password-form">
                        <div className="auth-field">
                            <label htmlFor="reset-password">New password</label>
                            <input
                                id="reset-password"
                                type="password"
                                placeholder="Min. 8 characters"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                                autoFocus
                            />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reset-confirm-password">Confirm password</label>
                            <input
                                id="reset-confirm-password"
                                type="password"
                                placeholder="Re-enter password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </div>

                        {error && (
                            <div className="auth-error">{error}</div>
                        )}

                        <button id="reset-password-submit" type="submit" className="auth-submit" disabled={loading}>
                            {loading ? (
                                <span className="auth-spinner" />
                            ) : (
                                <>
                                    Reset password
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        <Link to="/login">← Back to sign in</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
