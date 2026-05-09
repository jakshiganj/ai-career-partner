import { Reveal } from './Reveal';
import { testimonials } from '../landingData';

export default function TestimonialsSection() {
    return (
        <section id="testimonials" className="lp-section lp-section--alt">
            <div className="lp-container">
                <Reveal>
                    <div className="lp-section-head">
                        <span className="lp-label">[ TESTIMONIALS ]</span>
                        <h2 className="lp-h2">Trusted by professionals worldwide.</h2>
                    </div>
                </Reveal>
                <div className="lp-testimonials-grid">
                    {testimonials.map((t, i) => (
                        <Reveal key={t.name} delay={i * 0.08}>
                            <div className="lp-testimonial">
                                <p className="lp-testimonial-quote">"{t.quote}"</p>
                                <div className="lp-testimonial-footer">
                                    <div className="lp-testimonial-avatar">{t.name[0]}</div>
                                    <div>
                                        <div className="lp-testimonial-name">{t.name}</div>
                                        <div className="lp-testimonial-role">{t.role} · {t.company}</div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
