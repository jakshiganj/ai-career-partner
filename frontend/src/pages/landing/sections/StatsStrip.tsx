import { stats } from '../landingData';

export default function StatsStrip() {
    return (
        <section className="lp-stats-strip">
            <div className="lp-container">
                <div className="lp-stats-grid">
                    {stats.map(stat => (
                        <div key={stat.label} className="lp-stat-item">
                            <span className="lp-stat-num">{stat.num}</span>
                            <span className="lp-stat-label">{stat.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
