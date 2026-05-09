import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        console.log(`[Toast] ${type}: ${message}`); // Debug logging
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 5000);
    }, [removeToast]);

    // Expose for debugging
    React.useEffect(() => {
        (window as any).showToast = toast;
    }, [toast]);

    const success = (msg: string) => toast(msg, 'success');
    const error = (msg: string) => toast(msg, 'error');
    const info = (msg: string) => toast(msg, 'info');
    const warning = (msg: string) => toast(msg, 'warning');

    return (
        <ToastContext.Provider value={{ toast, success, error, info, warning }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className={`
                                pointer-events-auto
                                flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border-2
                                min-w-[320px] max-w-[450px]
                                ${t.type === 'success' ? 'bg-slate-900 border-emerald-500/50 text-emerald-400' : ''}
                                ${t.type === 'error' ? 'bg-slate-900 border-rose-500/50 text-rose-400' : ''}
                                ${t.type === 'info' ? 'bg-slate-900 border-blue-500/50 text-blue-400' : ''}
                                ${t.type === 'warning' ? 'bg-slate-900 border-amber-500/50 text-amber-400' : ''}
                                backdrop-blur-xl
                            `}
                        >
                            <div className="flex-shrink-0">
                                {t.type === 'success' && <CheckCircle size={20} />}
                                {t.type === 'error' && <XCircle size={20} />}
                                {t.type === 'info' && <Info size={20} />}
                                {t.type === 'warning' && <AlertCircle size={20} />}
                            </div>
                            
                            <p className="flex-1 text-sm font-medium text-slate-200">
                                {t.message}
                            </p>

                            <button
                                onClick={() => removeToast(t.id)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
