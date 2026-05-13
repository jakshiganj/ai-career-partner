import { useState, useEffect } from 'react';
import { 
    Check, 
    CreditCard, 
    ExternalLink, 
    Crown, 
    ChevronRight,
    ShieldCheck,
    Clock,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../../components/dashboard/Sidebar';
import { getSubscriptionStatus, createCheckoutSession, createPortalSession } from '../../api/payment';
import type { SubscriptionStatus } from '../../api/payment';
import { useToast } from '../../components/ui/Toast';

const tiers = [
    {
        id: 'free',
        name: 'Free',
        price: '0',
        description: 'Perfect for getting started.',
        features: [
            '5 AI Pipeline Runs',
            'Full CV Analysis & ATS Scoring',
            'ESCO Skill Gap Mapping',
            'Up to 10 Job Matches'
        ],
        btnText: 'Current Plan',
        accent: '#94A3B8'
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '1,500',
        description: 'Unlimited career acceleration.',
        features: [
            'Unlimited AI Pipeline Runs',
            'AI Interview Coach',
            'Salary Negotiation Scripts',
            'Unlimited Job Matching',
            'Real-time Tracking'
        ],
        btnText: 'Upgrade to Pro',
        accent: '#5BC0EB',
        popular: true
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '3,000',
        description: 'The ultimate career partner.',
        features: [
            'Everything in Pro',
            'AI Cover Letter Generation',
            'Priority Processing',
            'Deep LinkedIn Matching',
            'Dedicated Support'
        ],
        btnText: 'Upgrade to Premium',
        accent: '#0D0D0D'
    }
];

export default function BillingPage() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { error } = useToast();

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await getSubscriptionStatus();
                console.log('[Billing] Status data:', data);
                setStatus(data);
            } catch (err) {
                console.error('Failed to fetch subscription status', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const handleUpgrade = async (tierId: string) => {
        if (tierId === status?.tier || tierId === 'free') return;
        
        setActionLoading(tierId);
        try {
            const { url } = await createCheckoutSession(tierId as 'pro' | 'premium');
            window.location.href = url;
        } catch (err) {
            error('Failed to initiate checkout. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleManageBilling = async () => {
        setActionLoading('portal');
        try {
            const { url } = await createPortalSession();
            window.location.href = url;
        } catch (err) {
            error('Failed to open billing portal.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F9F9F9]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#5BC0EB]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F9F9]">
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white ml-[280px]">
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ BILLING ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Plans & Subscriptions</h2>
                    </div>
                </header>

                <div className="p-12 max-w-6xl mx-auto space-y-16">
                    {/* Active Subscription Summary */}
                    <section className="bg-[#F9F9F9] rounded-2xl border border-[#E0E0E0] p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <ShieldCheck className="w-32 h-32" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            {/* Left: Plan Info */}
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 flex-shrink-0 rounded-xl bg-white border border-[#E0E0E0] flex items-center justify-center text-[#5BC0EB] shadow-sm">
                                    <CreditCard className="w-7 h-7" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4A4A4A] opacity-60">Current Plan</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <h3 className="text-lg font-black text-[#0D0D0D] uppercase tracking-tight">{status?.tier}</h3>
                                        {status?.status === 'active' && (
                                            <span className="text-[11px] font-bold text-green-600 flex items-center gap-1.5 ml-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Center: Dates & Status */}
                            <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4A4A4A] opacity-60 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> Next Payment
                                    </span>
                                    <p className="font-bold text-[#0D0D0D] mt-1">
                                        {status?.current_period_end 
                                            ? new Date(status.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : 'N/A'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4A4A4A] opacity-60">Status</span>
                                    <p className="font-bold text-[#0D0D0D] mt-1">
                                        {status?.cancel_at_period_end ? 'Cancels soon' : 'Auto-renew on'}
                                    </p>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            {status?.stripe_customer_id && (
                                <button
                                    onClick={handleManageBilling}
                                    disabled={actionLoading === 'portal'}
                                    className="lp-btn-pill bg-[#5BC0EB] text-white border-none hover:bg-[#0D0D0D] shadow-md transition-all h-12"
                                >
                                    {actionLoading === 'portal' ? 'Loading...' : 'Manage Billing'}
                                    <span className="lp-btn-icon bg-white/20"><ExternalLink className="w-4 h-4" /></span>
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Pricing Grid */}
                    <div>
                        <div className="text-center mb-12">
                            <h3 className="text-2xl font-bold text-[#0D0D0D]">Choose the right plan for your career</h3>
                            <p className="text-[#4A4A4A] mt-2">Upgrade anytime to unlock more features.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {tiers.map((tier) => {
                                const isCurrent = status?.tier === tier.id;
                                const isPremium = tier.id === 'premium';
                                
                                return (
                                    <motion.div
                                        key={tier.id}
                                        whileHover={{ y: -8 }}
                                        className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
                                            isCurrent 
                                            ? 'bg-white border-[#5BC0EB] shadow-xl ring-1 ring-[#5BC0EB]' 
                                            : 'bg-white border-[#E0E0E0] hover:border-[#4A4A4A]'
                                        }`}
                                    >
                                        {tier.popular && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#5BC0EB] text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                                                Most Popular
                                            </div>
                                        )}

                                        <div className="mb-8">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-bold text-[#0D0D0D]">{tier.name}</h4>
                                                {isPremium && <Crown className="w-5 h-5 text-amber-500" />}
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-[#0D0D0D]">LKR {tier.price}</span>
                                                <span className="text-sm font-bold text-[#4A4A4A] opacity-60">/mo</span>
                                            </div>
                                            <p className="text-xs font-semibold text-[#4A4A4A] mt-3 leading-relaxed">
                                                {tier.description}
                                            </p>
                                        </div>

                                        <ul className="flex-1 space-y-4 mb-10">
                                            {tier.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm font-semibold text-[#0D0D0D]">
                                                    <div className="mt-0.5 rounded-full bg-[#E0E0E0] p-0.5">
                                                        <Check className="w-3 h-3 text-[#0D0D0D]" />
                                                    </div>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleUpgrade(tier.id)}
                                            disabled={isCurrent || actionLoading === tier.id}
                                            className={`w-full py-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                                isCurrent
                                                ? 'bg-[#F9F9F9] text-[#4A4A4A] cursor-default'
                                                : 'bg-[#0D0D0D] text-white hover:bg-[#4A4A4A] shadow-lg hover:shadow-xl active:scale-[0.98]'
                                            }`}
                                        >
                                            {actionLoading === tier.id ? 'Processing...' : isCurrent ? 'Current Plan' : tier.btnText}
                                            {!isCurrent && <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Support & FAQ Snippet */}
                    <div className="bg-[#F9F9F9] rounded-2xl p-8 border border-[#E0E0E0] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-sm">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0D0D0D]">Need help with billing?</h4>
                                <p className="text-sm font-semibold text-[#4A4A4A]">Our team is here to help you with plan transitions.</p>
                            </div>
                        </div>
                        <a href="mailto:support@careerai.com" className="text-sm font-bold text-[#5BC0EB] hover:underline">
                            Contact Support
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
