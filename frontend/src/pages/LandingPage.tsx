import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Navbar Minimal */}
            <header style={{
                padding: '1.5rem 3rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'transparent',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10
            }}>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>
                    AI Career Partner
                </div>
                <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>We are based in Milano and work remotely.</span>
                    <Link to="/login" className="btn btn-outline" style={{ borderRadius: '99px', padding: '0.5rem 1.25rem' }}>Login</Link>
                    <Link to="/signup" className="btn btn-primary" style={{ borderRadius: '99px', padding: '0.5rem 1.25rem' }}>Get Started</Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                padding: '8rem 3rem 5rem',
                marginTop: '60px',
                maxWidth: '1200px',
                margin: '0 auto',
                width: '100%'
            }}>
                <div style={{ maxWidth: '800px' }}>
                    <h1 style={{
                        fontSize: '4.5rem',
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.05,
                        marginBottom: '1.5rem',
                        color: 'var(--text-primary)'
                    }}>
                        Perfectly aligned AI expertise to increase your career impact.
                    </h1>
                    <p style={{
                        fontSize: '1.25rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '2.5rem',
                        maxWidth: '500px',
                        lineHeight: 1.5
                    }}>
                        Turn your portfolio into a conversion tool. Designed for ambitious professionals, it drives results through strategic mock interviews and resume analysis.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link to="/signup" className="btn btn-primary btn-lg" style={{ borderRadius: '99px' }}>
                            Start your journey
                        </Link>
                        <Link to="/login" className="btn btn-outline btn-lg" style={{ borderRadius: '99px', border: 'none', background: 'var(--bg-elevated)' }}>
                            watch reel
                        </Link>
                    </div>
                </div>
            </section>

            {/* What we do */}
            <section style={{ background: 'var(--bg-elevated)', padding: '6rem 3rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>What we do</h2>
                        <p style={{ maxWidth: '300px', color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            Partnership, Not Just Projects
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div className="card" style={{ padding: '3rem', borderRadius: '24px', background: 'var(--bg-surface)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                                <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>01</span>
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Mock Interviews</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Inspiring client experiences powered by real-time voice intelligence and adaptive questioning.</p>
                        </div>

                        <div className="card" style={{ padding: '3rem', borderRadius: '24px', background: 'var(--bg-surface)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                                <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>02</span>
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Resume Analysis</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Quick and clear answers to your key questions about ATS optimization and clarity.</p>
                        </div>

                        <div className="card" style={{ padding: '3rem', borderRadius: '24px', background: 'var(--bg-surface)' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(109,40,217,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px' }}>
                                <span style={{ color: 'var(--accent-violet)', fontWeight: 700 }}>03</span>
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>Career Growth</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Your passport to flexible design revisions and strategic career path modeling.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '4rem 3rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <h2 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '2rem' }}>
                    We transform careers.<br />Your success is next.
                </h2>
                <Link to="/signup" className="btn btn-primary btn-lg" style={{ borderRadius: '99px', padding: '1rem 3rem', fontSize: '1.1rem' }}>
                    Start for free
                </Link>
            </footer>
        </div>
    );
}
