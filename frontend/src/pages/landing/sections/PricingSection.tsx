import { Check, ArrowRight, Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from './Reveal';

const plans = [
    {
        name: 'Free',
        price: '0',
        description: 'For individuals exploring new opportunities.',
        features: [
            '5 AI Pipeline Runs',
            'Full CV Analysis & ATS Scoring',
            'ESCO Skill Gap Mapping',
            'Up to 10 Job Matches'
        ],
        btn: 'Get Started',
        btnLink: '/signup',
        accent: '#94A3B8'
    },
    {
        name: 'Pro',
        price: '1,500',
        description: 'Accelerate your job search with AI.',
        features: [
            'Unlimited AI Pipeline Runs',
            'AI Interview Coach',
            'Salary Negotiation Scripts',
            'Unlimited Job Matching',
            'Priority Email Support'
        ],
        btn: 'Start Pro Free Trial',
        btnLink: '/signup',
        popular: true,
        accent: '#5BC0EB'
    },
    {
        name: 'Premium',
        price: '3,000',
        description: 'Full-service career transformation.',
        features: [
            'Everything in Pro',
            'AI Cover Letter Generation',
            'Priority Processing',
            'Deep LinkedIn Matching',
            'Dedicated Career Partner'
        ],
        btn: 'Go Premium',
        btnLink: '/signup',
        accent: '#0D0D0D'
    }
];

export default function PricingSection() {
    return (
        <section id="pricing" className="lp-section bg-[#F9F9F9] py-32 overflow-hidden relative">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#5BC0EB]/5 rounded-full blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0D0D0D]/5 rounded-full blur-[120px] -ml-64 -mb-64" />

            <div className="lp-container relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <Reveal>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#5BC0EB] mb-4 block">
                            Simple Pricing
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black text-[#0D0D0D] mb-6 tracking-tight">
                            Invest in your future self
                        </h2>
                        <p className="text-lg font-medium text-[#4A4A4A] leading-relaxed">
                            Start for free, then upgrade as you grow. No hidden fees, cancel anytime.
                        </p>
                    </Reveal>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <Reveal key={plan.name} delay={i * 0.1}>
                            <div className={`relative flex flex-col p-10 rounded-[40px] bg-white border transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                                plan.popular ? 'border-[#5BC0EB] shadow-xl' : 'border-[#E0E0E0]'
                            }`}>
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#5BC0EB] text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-[#0D0D0D]">{plan.name}</h3>
                                        {plan.name === 'Premium' && <Crown className="w-6 h-6 text-amber-500" />}
                                        {plan.name === 'Pro' && <Zap className="w-6 h-6 text-[#5BC0EB] fill-current" />}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[10px] font-bold text-[#4A4A4A] self-start mt-2">LKR</span>
                                        <span className="text-5xl font-black text-[#0D0D0D]">{plan.price}</span>
                                        <span className="text-sm font-bold text-[#4A4A4A] opacity-60">/mo</span>
                                    </div>
                                    <p className="text-sm font-semibold text-[#4A4A4A] mt-6 leading-relaxed opacity-80">
                                        {plan.description}
                                    </p>
                                </div>

                                <ul className="flex-1 space-y-5 mb-12">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-4 text-sm font-bold text-[#0D0D0D]">
                                            <div className="mt-1 rounded-full bg-[#E0E0E0] p-0.5">
                                                <Check className="w-3.5 h-3.5 text-[#0D0D0D]" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link 
                                    to={plan.btnLink}
                                    className={`lp-btn-pill w-full py-5 text-sm font-black uppercase tracking-widest group ${
                                        plan.popular 
                                        ? 'bg-[#0D0D0D] text-white hover:bg-[#4A4A4A]' 
                                        : 'bg-white text-[#0D0D0D] border border-[#E0E0E0] hover:border-[#0D0D0D]'
                                    }`}
                                >
                                    {plan.btn}
                                    <span className="lp-btn-icon group-hover:translate-x-1 transition-transform">
                                        <ArrowRight className="w-5 h-5" />
                                    </span>
                                </Link>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal delay={0.4}>
                    <p className="text-center mt-16 text-sm font-bold text-[#4A4A4A] opacity-60">
                        Interested in a team plan? <Link to="/contact" className="text-[#5BC0EB] hover:underline">Contact us</Link>
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
