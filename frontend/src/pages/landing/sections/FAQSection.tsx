import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import { Reveal } from './Reveal';
import { faqs } from '../landingData';

function Accordion({ items, openIdx, setOpenIdx }: {
    items: { q: string; a: string }[];
    openIdx: number | null;
    setOpenIdx: (i: number | null) => void;
}) {
    return (
        <div className="lp-accordion">
            {items.map((item, i) => (
                <div key={i} className={`lp-acc-item ${openIdx === i ? 'open' : ''}`} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                    <div className="lp-acc-q">
                        <span>{item.q}</span>
                        <ChevronDown className={`lp-acc-chevron ${openIdx === i ? 'rotated' : ''}`} />
                    </div>
                    <div className={`lp-acc-a ${openIdx === i ? 'show' : ''}`}>
                        <p>{item.a}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function FAQSection() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <section className="lp-section">
            <div className="lp-container">
                <div className="lp-faq-layout">
                    <Reveal>
                        <div className="lp-faq-left">
                            <span className="lp-label">[ FAQ ]</span>
                            <h2 className="lp-h2">Frequently Asked Questions</h2>
                            <div className="lp-faq-cta">
                                <Link to="/signup" className="lp-btn-pill">
                                    Get Started
                                    <span className="lp-btn-icon"><ArrowUpRight className="w-4 h-4" /></span>
                                </Link>
                            </div>
                        </div>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <Accordion items={faqs} openIdx={openFaq} setOpenIdx={setOpenFaq} />
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
