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
            icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
            iconBg: 'bg-red-50',
            button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/10',
            borderColor: 'border-red-100'
        },
        warning: {
            icon: <AlertTriangle className="h-5 w-5 text-[#F4D35E]" />,
            iconBg: 'bg-[#F4D35E]/10',
            button: 'bg-[#F4D35E] hover:bg-[#E5C34E] text-[#0D0D0D] shadow-amber-500/10',
            borderColor: 'border-amber-100'
        },
        info: {
            icon: <AlertTriangle className="h-5 w-5 text-[#5BC0EB]" />,
            iconBg: 'bg-[#5BC0EB]/10',
            button: 'bg-[#0D0D0D] hover:bg-[#5BC0EB] text-white shadow-black/10',
            borderColor: 'border-[#5BC0EB]/20'
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
                        className="fixed inset-0 bg-[#0D0D0D]/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl border border-[#E0E0E0]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        <div className="absolute right-6 top-6">
                            <button
                                onClick={onClose}
                                className="h-8 w-8 flex items-center justify-center rounded-lg text-[#A0A0A0] hover:bg-[#F9F9F9] hover:text-[#0D0D0D] transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-10">
                            <div className="flex items-start gap-6">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${styles.borderColor} ${styles.iconBg}`}>
                                    {styles.icon}
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-2">[ SECURITY PROTOCOL ]</span>
                                    <h3 className="text-xl font-bold tracking-tight text-[#0D0D0D]">{title}</h3>
                                    <p className="mt-4 text-[13px] leading-relaxed font-medium text-[#4A4A4A]">
                                        {description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-12 flex items-center justify-end gap-4 border-t border-[#F0F0F0] pt-8">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="rounded-lg px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] hover:bg-[#F9F9F9] transition-all disabled:opacity-50"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className={`flex items-center gap-3 rounded-lg px-8 py-3 text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg ${styles.button}`}
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            EXECUTING...
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
