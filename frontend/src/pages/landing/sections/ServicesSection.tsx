import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from './Reveal';
import { services } from '../landingData';

export default function ServicesSection() {
    const [openService, setOpenService] = useState(0);

    return (
        <section id="services" className="lp-section lp-section--alt">
            <div className="lp-container">
                <Reveal>
                    <div className="lp-section-head">
                        <span className="lp-label">[ SERVICES ]</span>
                        <h2 className="lp-h2">Discover Our Advisory Services</h2>
                        <p className="lp-section-desc">Serving professionals with disciplined, AI-powered career intelligence.</p>
                    </div>
                </Reveal>
                <div className="lp-services-list">
                    {services.map((s, i) => (
                        <Reveal key={s.num} delay={i * 0.05}>
                            <div className={`lp-service-item ${openService === i ? 'open' : ''}`} onClick={() => setOpenService(openService === i ? -1 : i)}>
                                <div className="lp-service-header">
                                    <div className="lp-service-left">
                                        <span className="lp-service-num">{s.num}</span>
                                        <div>
                                            <h4 className="lp-service-title">{s.title}</h4>
                                            <p className="lp-service-short">{s.short}</p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`lp-acc-chevron ${openService === i ? 'rotated' : ''}`} />
                                </div>
                                <div className={`lp-acc-a ${openService === i ? 'show' : ''}`}>
                                    <p className="lp-service-long">{s.long}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
