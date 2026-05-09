import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';

export default function HeroSection() {
    return (
        <section className="lp-hero">
            <div className="lp-hero-glow" />
            <div className="lp-hero-inner">
                <Reveal>
                    <h1 className="lp-hero-h1">
                        The complete AI career
                        <br />intelligence platform.
                    </h1>
                </Reveal>
                <Reveal delay={0.1}>
                    <p className="lp-hero-sub">
                        Upload your CV. Get AI-powered skill analysis, job matching,
                        interview prep, and a personalized career roadmap — all in one pipeline.
                    </p>
                </Reveal>
                <Reveal delay={0.2}>
                    <div className="lp-hero-actions">
                        <Link to="/signup" className="lp-btn-pill lp-btn-pill--lg">
                            Get Started
                            <span className="lp-btn-icon lp-btn-icon--lg"><ArrowUpRight className="w-5 h-5" /></span>
                        </Link>
                        <Link to="/login" className="lp-btn-outline">Sign in to Dashboard</Link>
                    </div>
                </Reveal>
            </div>

            {/* Trust logos */}
            <Reveal delay={0.3}>
                <div className="lp-trust-bar">
                    <span className="lp-trust-label">Trusted by professionals at</span>
                    <div className="lp-trust-logos">
                        {['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'].map(name => (
                            <span key={name} className="lp-trust-logo">{name}</span>
                        ))}
                    </div>
                </div>
            </Reveal>
        </section>
    );
}
