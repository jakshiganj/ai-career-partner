import { Reveal } from './Reveal';
import { processSteps } from '../landingData';

export default function ProcessSection() {
    return (
        <section className="lp-section">
            <div className="lp-container">
                <Reveal>
                    <div className="lp-section-head">
                        <span className="lp-label">[ PROCESS ]</span>
                        <h2 className="lp-h2">Three steps. One pipeline.</h2>
                    </div>
                </Reveal>
                <div className="lp-process-grid">
                    {processSteps.map((step, i) => (
                        <Reveal key={step.num} delay={i * 0.1}>
                            <div className="lp-process-card" style={{ '--card-accent': step.accent } as React.CSSProperties}>
                                <span className="lp-process-num">{step.num}</span>
                                <div className="lp-process-icon">{step.icon}</div>
                                <h4 className="lp-process-title">{step.title}</h4>
                                <p className="lp-process-desc">{step.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
