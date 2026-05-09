import { Sparkles } from 'lucide-react';

export default function Footer() {
    return (
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
    );
}
