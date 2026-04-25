import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
            iconBg: 'bg-red-100',
            button: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            icon: <AlertTriangle className="h-6 w-6 text-amber-600" />,
            iconBg: 'bg-amber-100',
            button: 'bg-amber-600 hover:bg-amber-700 text-white',
        },
        info: {
            icon: <AlertTriangle className="h-6 w-6 text-blue-600" />,
            iconBg: 'bg-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
        }
    };

    const styles = variantStyles[variant];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="absolute right-4 top-4">
                            <button
                                onClick={onClose}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
                                    {styles.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        {description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold shadow-lg shadow-red-500/10 transition-all active:scale-95 disabled:opacity-50 ${styles.button}`}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Processing...
                                        </>
                                    ) : (
                                        confirmText
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
