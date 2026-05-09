import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';

export default function CTASection() {
    return (
        <section className="lp-cta-section">
            <div className="lp-cta-glow" />
            <div className="lp-container lp-cta-inner">
                <Reveal>
                    <h2 className="lp-cta-h2">
                        Whether you're switching careers or aiming for your next promotion — CareerAI gives you the clarity to move forward.
                    </h2>
                </Reveal>
                <Reveal delay={0.1}>
                    <div className="lp-cta-actions">
                        <Link to="/signup" className="lp-btn-pill lp-btn-pill--lg">
                            Get Started
                            <span className="lp-btn-icon lp-btn-icon--lg"><ArrowUpRight className="w-5 h-5" /></span>
                        </Link>
                        <Link to="/login" className="lp-btn-outline">Sign in</Link>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
