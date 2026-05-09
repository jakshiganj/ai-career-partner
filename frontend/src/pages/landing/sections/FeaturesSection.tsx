import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Reveal } from './Reveal';
import { tabContent } from '../landingData';

const ease = [0.16, 1, 0.3, 1] as const;

export default function FeaturesSection() {
    const [activeTab, setActiveTab] = useState(0);
    const active = tabContent[activeTab];

    return (
        <section id="features" className="lp-section">
            <div className="lp-container">
                <Reveal>
                    <div className="lp-section-head">
                        <span className="lp-label">[ PLATFORM ]</span>
                        <h2 className="lp-h2">Everything you need to accelerate your career.</h2>
                        <p className="lp-section-desc">
                            Choose from AI-powered pipeline analysis, ESCO skill mapping, or interview preparation.
                            All accessible from a single dashboard.
                        </p>
                    </div>
                </Reveal>

                <Reveal delay={0.1}>
                    <div className="lp-tabs">
                        {tabContent.map((tab, i) => (
                            <button
                                key={tab.id}
                                className={`lp-tab ${activeTab === i ? 'active' : ''}`}
                                onClick={() => setActiveTab(i)}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </Reveal>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={active.id}
                        className="lp-tab-content"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4, ease }}
                    >
                        <div className="lp-tab-left">
                            <h3 className="lp-tab-title">{active.title}</h3>
                            <p className="lp-tab-subtitle">{active.subtitle}</p>
                            <ul className="lp-tab-points">
                                {active.points.map(p => (
                                    <li key={p}>
                                        <span className="lp-tab-dot" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="lp-tab-right">
                            <div className="lp-code-block">
                                <div className="lp-code-header">
                                    <span className="lp-code-dot red" />
                                    <span className="lp-code-dot yellow" />
                                    <span className="lp-code-dot green" />
                                    <span className="lp-code-filename">example.ts</span>
                                </div>
                                <pre className="lp-code-body"><code>{active.code}</code></pre>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
}
