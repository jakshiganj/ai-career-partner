import './LandingPage.css';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  FileText,
  Brain,
  Target,
  MessageSquare,
  TrendingUp,
  Zap,
  X,
} from 'lucide-react';

const ease = [0.16, 1, 0.3, 1];

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Accordion ──────────────────────────────────────────────── */
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

/* ═════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [openService, setOpenService] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const services = [
    { num: '01', title: 'Resume Analysis', short: 'AI-driven CV parsing and gap identification.', long: 'Your resume is parsed against industry benchmarks using our multi-agent pipeline. We identify skill gaps, optimize keyword density for ATS systems, and map your experience to market demands — all in under 60 seconds.' },
    { num: '02', title: 'Skill Graph Mapping', short: 'ESCO-powered knowledge graph for career intelligence.', long: 'We build a personalized skill graph using the European Skills ontology. This maps your existing skills to adjacent competencies, revealing hidden transferable strengths and clear upskilling paths.' },
    { num: '03', title: 'Job Matching', short: 'Precision-matched opportunities from live market data.', long: 'Our agents continuously scan job markets to find roles that match your skill profile. Each listing is scored for compatibility, salary alignment, and growth potential — delivering a curated shortlist.' },
    { num: '04', title: 'Interview Preparation', short: 'Real-time mock interviews with AI feedback.', long: 'Prepare for behavioral and technical interviews with our AI interviewer. Each session generates a detailed report covering communication clarity, technical depth, and response structure.' },
  ];

  const tabContent = [
    {
      id: 'pipeline',
      label: 'AI Pipeline',
      icon: <Zap className="w-4 h-4" />,
      title: 'Multi-agent career pipeline.',
      subtitle: 'Upload once — get CV analysis, skill mapping, job matches, and a career roadmap in a single automated run.',
      points: ['5 specialized AI agents working in parallel', 'Full pipeline runs in under 2 minutes', 'Real-time progress tracking'],
      code: `// Start a career analysis pipeline
const result = await careerai.pipeline.run({
  cv: uploadedFile,
  target_role: "Senior Software Engineer",
  location: "London, UK"
});

// result.skills → matched & missing skills
// result.jobs  → 47 precision-matched roles
// result.roadmap → personalized learning path`,
    },
    {
      id: 'skills',
      label: 'Skill Mapping',
      icon: <Brain className="w-4 h-4" />,
      title: 'ESCO-powered knowledge graph.',
      subtitle: 'Your skills mapped against the European Skills, Competences, and Occupations ontology — revealing hidden strengths and gaps.',
      points: ['13,000+ skills in the ontology', 'Transferable skill discovery', 'Market demand alignment'],
      code: `// Skill graph analysis
const graph = await careerai.skills.analyze({
  cv_skills: extractedSkills,
  target: "Product Manager"
});

// graph.matched   → 24 direct matches
// graph.adjacent  → 8 transferable skills
// graph.gaps      → 5 skills to develop`,
    },
    {
      id: 'interview',
      label: 'Interview AI',
      icon: <MessageSquare className="w-4 h-4" />,
      title: 'AI-powered mock interviews.',
      subtitle: 'Practice behavioral and technical questions with real-time feedback, scoring, and actionable improvement suggestions.',
      points: ['Role-specific question generation', 'Real-time scoring & feedback', 'Detailed performance reports'],
      code: `// Start an interview session
const session = await careerai.interview.start({
  role: "Senior Software Engineer",
  type: "behavioral",
  difficulty: "hard"
});

// session.score    → 8.5 / 10
// session.feedback → detailed per-answer analysis
// session.report   → downloadable PDF`,
    },
  ];

  const testimonials = [
    { quote: 'Their analysis approach brought clarity and confidence to my job search process.', name: 'Sarah K.', role: 'Software Engineer', company: 'Google' },
    { quote: 'The skill gap insights were something no other platform had surfaced for me before.', name: 'James L.', role: 'Product Manager', company: 'Stripe' },
    { quote: 'Independent, data-driven advice that helped me negotiate a 40% salary increase.', name: 'Priya M.', role: 'Data Scientist', company: 'Meta' },
  ];

  const faqs = [
    { q: 'How does the AI analysis work?', a: 'We use a multi-agent pipeline where specialized AI agents handle CV parsing, skill extraction, job matching, and interview prep independently — then synthesize results into a unified career dashboard.' },
    { q: 'Is my data secure?', a: 'Yes. Your CV and personal data are encrypted at rest and in transit. We never share your information with third parties or use it for training purposes.' },
    { q: 'How long does the analysis take?', a: 'The full pipeline — from CV upload to complete results — typically runs in under 2 minutes. You can track each agent\'s progress in real-time.' },
    { q: 'Is there a free plan?', a: 'Yes. The free tier includes full CV analysis, skill mapping, and up to 10 matched job listings per run. Pro users get unlimited runs, interview prep, and priority processing.' },
  ];

  const active = tabContent[activeTab];

  return (
    <div className="lp-root">
      {/* ─── ANNOUNCEMENT BANNER ──────────────────────── */}
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

      {/* ─── NAVBAR ──────────────────────────────────── */}
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
        {/* ─── HERO ──────────────────────────────────── */}
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

        {/* ─── STATS STRIP ────────────────────────────── */}
        <section className="lp-stats-strip">
          <div className="lp-container">
            <div className="lp-stats-grid">
              {[
                { num: '10k+', label: 'Profiles analyzed' },
                { num: '97%', label: 'Match accuracy' },
                { num: '<2min', label: 'Pipeline runtime' },
                { num: '500+', label: 'Jobs found daily' },
              ].map(stat => (
                <div key={stat.label} className="lp-stat-item">
                  <span className="lp-stat-num">{stat.num}</span>
                  <span className="lp-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── TABBED FEATURES (fal.ai style) ─────────── */}
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

            {/* Tab switcher */}
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

            {/* Tab content */}
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

        {/* ─── SERVICES ACCORDION ─────────────────────── */}
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

        {/* ─── PROCESS ───────────────────────────────── */}
        <section className="lp-section">
          <div className="lp-container">
            <Reveal>
              <div className="lp-section-head">
                <span className="lp-label">[ PROCESS ]</span>
                <h2 className="lp-h2">Three steps. One pipeline.</h2>
              </div>
            </Reveal>
            <div className="lp-process-grid">
              {[
                { num: '01', title: 'Upload', desc: 'Drop your CV. Our engine parses every detail — skills, experience, education.', icon: <FileText className="w-6 h-6" />, accent: '#5BC0EB' },
                { num: '02', title: 'Analyze', desc: 'Multi-agent AI pipeline runs skill mapping, gap analysis, and market indexing.', icon: <Brain className="w-6 h-6" />, accent: '#3AAED8' },
                { num: '03', title: 'Accelerate', desc: 'Receive matched jobs, a personalized roadmap, and interview prep — all in one place.', icon: <TrendingUp className="w-6 h-6" />, accent: '#2196C5' },
              ].map((step, i) => (
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

        {/* ─── TESTIMONIALS ──────────────────────────── */}
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

        {/* ─── FAQ ────────────────────────────────────── */}
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

        {/* ─── CTA ────────────────────────────────────── */}
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
      </main>

      {/* ─── FOOTER ──────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-logo">
                <div className="lp-logo-mark"><Sparkles className="w-4 h-4" /></div>
                CareerAI
              </div>
              <p className="lp-footer-desc">AI-powered career intelligence for professionals.</p>
            </div>
            {[
              { title: 'Product', links: ['Pipeline', 'Skill Mapping', 'Job Search', 'Interview AI'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'] },
            ].map(col => (
              <div key={col.title} className="lp-footer-col">
                <h5 className="lp-footer-col-title">{col.title}</h5>
                <ul>{col.links.map(link => <li key={link}><a href="#">{link}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="lp-footer-bottom">
            <span>© 2026 CareerAI. All rights reserved.</span>
            <div className="lp-footer-socials">
              <a href="#">LinkedIn</a>
              <a href="#">X (Twitter)</a>
              <a href="#">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
