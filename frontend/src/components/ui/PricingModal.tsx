import { motion } from 'framer-motion';
import { Check, X, Zap, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { createCheckoutSession } from '../../api/payment';

interface PricingModalProps {
    onClose: () => void;
}

export default function PricingModal({ onClose }: PricingModalProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSubscribe = async (tier: 'pro' | 'premium') => {
        setLoading(tier);
        try {
            const { url } = await createCheckoutSession(tier);
            window.location.href = url;
        } catch (error) {
            console.error(error);
            alert("Payment configuration is missing or invalid. Please check Stripe API keys.");
        } finally {
            setLoading(null);
        }
    };

    const tiers = [
        {
            id: 'free',
            name: 'Free',
            price: '0',
            features: ['5 Pipeline Runs', 'CV Analysis', 'Job Matching (10)'],
            color: '#94A3B8',
            btn: 'Current'
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '1,500',
            features: ['Unlimited Runs', 'Interview Coach', 'Negotiation Scripts'],
            color: '#5BC0EB',
            popular: true,
            btn: 'Upgrade'
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '3,000',
            features: ['Everything in Pro', 'Cover Letters', 'Priority Support'],
            color: '#0D0D0D',
            btn: 'Upgrade'
        }
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl flex flex-col md:flex-row"
            >
                {/* Left Side: Image/Info */}
                <div className="md:w-1/3 bg-[#0D0D0D] p-10 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#5BC0EB]">
                            <Zap className="h-6 w-6 fill-current" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight mb-4">Unlock Your Potential</h2>
                        <p className="text-white/60 text-sm font-medium leading-relaxed">
                            Join 10,000+ professionals using CareerAI to accelerate their job search.
                        </p>
                    </div>

                    <button onClick={onClose} className="absolute top-6 left-6 text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative z-10 mt-12 space-y-4">
                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#5BC0EB]">
                            <div className="h-[1px] w-8 bg-[#5BC0EB]" />
                            Trusted By
                        </div>
                        <div className="flex flex-wrap gap-4 opacity-50">
                            {['Google', 'Meta', 'Amazon', 'Stripe'].map(brand => (
                                <span key={brand} className="text-[10px] font-black">{brand}</span>
                            ))}
                        </div>
                    </div>

                    {/* Decorative element */}
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#5BC0EB]/20 rounded-full blur-3xl" />
                </div>

                {/* Right Side: Tiers */}
                <div className="flex-1 p-8 md:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tiers.map((tier) => (
                            <div 
                                key={tier.id}
                                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                                    tier.popular ? 'border-[#5BC0EB] bg-[#5BC0EB]/5 ring-1 ring-[#5BC0EB]' : 'border-[#E0E0E0]'
                                }`}
                            >
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5BC0EB] text-white text-[8px] font-black uppercase tracking-tighter px-3 py-1 rounded-full">
                                        Popular
                                    </div>
                                )}
                                
                                <div className="mb-4">
                                    <h4 className="text-sm font-bold text-[#4A4A4A]">{tier.name}</h4>
                                    <div className="flex items-baseline gap-0.5 mt-1">
                                        <span className="text-xl font-black text-[#0D0D0D]">LKR {tier.price}</span>
                                    </div>
                                </div>

                                <ul className="flex-1 space-y-3 mb-6">
                                    {tier.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-[#4A4A4A]">
                                            <Check className="w-3 h-3 text-[#5BC0EB] shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => tier.id !== 'free' && handleSubscribe(tier.id as 'pro' | 'premium')}
                                    disabled={tier.id === 'free' || loading === tier.id}
                                    className={`w-full py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                                        tier.id === 'free'
                                        ? 'bg-[#E0E0E0] text-[#4A4A4A] cursor-default'
                                        : 'bg-[#0D0D0D] text-white hover:bg-[#4A4A4A] active:scale-[0.97]'
                                    }`}
                                >
                                    {loading === tier.id ? 'Wait...' : tier.btn}
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    <p className="mt-8 text-center text-[10px] font-bold text-[#94A3B8] flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Secure LKR payment powered by Stripe. Cancel anytime.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
