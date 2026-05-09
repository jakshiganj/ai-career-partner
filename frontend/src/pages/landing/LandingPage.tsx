import './LandingPage.css';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowUpRight, Sparkles, X } from 'lucide-react';

import HeroSection from './sections/HeroSection';
import StatsStrip from './sections/StatsStrip';
import FeaturesSection from './sections/FeaturesSection';
import ServicesSection from './sections/ServicesSection';
import ProcessSection from './sections/ProcessSection';
import TestimonialsSection from './sections/TestimonialsSection';
import FAQSection from './sections/FAQSection';
import CTASection from './sections/CTASection';
import Footer from './sections/Footer';

export default function LandingPage() {
    const [showBanner, setShowBanner] = useState(true);

    return (
        <div className="lp-root">
            {/* Announcement Banner */}
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        className="lp-banner"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="lp-banner-inner">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>New: Interview AI with real-time scoring is now live</span>
                            <Link to="/signup" className="lp-banner-link">Try it free →</Link>
                            <button className="lp-banner-close" onClick={(e) => { e.stopPropagation(); setShowBanner(false); }}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navbar */}
            <header className="lp-nav">
                <div className="lp-nav-inner">
                    <Link to="/" className="lp-logo">
                        <div className="lp-logo-mark"><Sparkles className="w-4 h-4" /></div>
                        CareerAI
                    </Link>
                    <nav className="lp-nav-links">
                        <a href="#features">Features</a>
                        <a href="#services">Services</a>
                        <a href="#testimonials">Testimonials</a>
                    </nav>
                    <div className="lp-nav-actions">
                        <Link to="/login" className="lp-nav-signin">Login</Link>
                        <Link to="/signup" className="lp-btn-pill">
                            Get Started
                            <span className="lp-btn-icon"><ArrowUpRight className="w-4 h-4" /></span>
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <HeroSection />
                <StatsStrip />
                <FeaturesSection />
                <ServicesSection />
                <ProcessSection />
                <TestimonialsSection />
                <FAQSection />
                <CTASection />
            </main>

            <Footer />
        </div>
    );
}
