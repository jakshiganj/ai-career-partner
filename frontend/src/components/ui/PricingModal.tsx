import { motion } from 'framer-motion';
import { CheckCircle2, Zap } from 'lucide-react';

interface PricingModalProps {
    onClose: () => void;
}

export default function PricingModal({ onClose }: PricingModalProps) {
    const handleSubscribe = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/payment/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to create checkout session");
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error(error);
            alert("Payment configuration is missing or invalid. Please check Stripe API keys.");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl"
            >
                <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-10 text-center text-white relative">
                    <div className="absolute top-0 right-0 p-4">
                        <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 ring-4 ring-blue-500/10">
                        <Zap className="h-8 w-8 fill-current" />
                    </div>
                    <h2 className="mb-2 text-3xl font-extrabold tracking-tight">Upgrade to Pro</h2>
                    <p className="text-blue-200">Unlock your true career potential with unlimited AI analysis.</p>
                </div>

                <div className="p-8">
                    <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                        <div className="flex items-end justify-center gap-1">
                            <span className="text-4xl font-extrabold text-[#0F172A]">$5</span>
                            <span className="text-sm font-bold text-[#64748B] mb-1">/ month</span>
                        </div>
                    </div>

                    <ul className="mb-8 space-y-4 text-sm font-semibold text-[#334155]">
                        {[
                            'Unlimited AI Pipeline Runs',
                            'Advanced Salary Negotiation Scripts',
                            'Deep LinkedIn Parsing & Matching',
                            'Premium Cover Letter Generation',
                            'Priority Support'
                        ].map((feature, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleSubscribe}
                        className="w-full rounded-2xl bg-[#3B82F6] py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-[#2563EB] hover:shadow-blue-500/40"
                    >
                        Subscribe Now
                    </button>
                    <p className="mt-4 text-center text-xs font-bold text-[#94A3B8]">
                        Cancel anytime. Secure payment via Stripe.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
