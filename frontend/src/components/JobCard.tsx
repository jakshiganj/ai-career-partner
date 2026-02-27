import { useState } from 'react';
import SalaryBenchmark from './SalaryBenchmark';

interface JobData {
    id: string;
    title: string;
    company: string;
    match_score: number;
    tier: "Realistic" | "Stretch" | "Reach";
    missing_skills: string[];
    salary_min?: number;
    salary_max?: number;
    salary_median?: number;
    url?: string;
}

interface Props {
    job: JobData;
    userExpectedSalary?: number;
}

export default function JobCard({ job, userExpectedSalary }: Props) {
    const [showDetails, setShowDetails] = useState(false);

    // Badge styling based on tier
    const tierColors = {
        "Realistic": "bg-success text-white",
        "Stretch": "bg-warning text-white",
        "Reach": "bg-error text-white"
    };

    return (
        <div className="card job-card transition-all hover:shadow-md border border-subtle">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-lg">{job.title}</h4>
                    <p className="text-secondary">{job.company}</p>
                </div>
                <span className={`tag ${tierColors[job.tier]} font-semibold tracking-wide py-1 px-3 shadow-sm`}>
                    {job.tier} Match
                </span>
            </div>

            <div className="flex items-center gap-4 mt-4 mb-3">
                <div className="text-sm font-medium">Match: {(job.match_score * 100).toFixed(0)}%</div>
                <button
                    className="text-accent text-sm hover:underline"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? "Hide Insights" : "View Insights"}
                </button>
            </div>

            {showDetails && (
                <div className="mt-4 pt-4 border-t border-subtle animate-fade-in">
                    {/* Feature 5: Missing Skills Tooltip Area */}
                    <div className="mb-4">
                        <h5 className="text-xs font-semibold uppercase text-muted mb-2 tracking-wider">Skill Gaps</h5>
                        {job.missing_skills?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {job.missing_skills.map(s => (
                                    <span key={s} className="tag bg-error/10 text-error border-error/20 text-xs">
                                        Missing: {s}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-success">You have all the core skills for this role!</p>
                        )}
                    </div>

                    {/* Feature 6: Salary Benchmark */}
                    {(job.salary_min || job.salary_median || job.salary_max) && (
                        <div className="mb-2">
                            <h5 className="text-xs font-semibold uppercase text-muted mb-3 tracking-wider">Salary Benchmark</h5>
                            <SalaryBenchmark
                                min={job.salary_min || 0}
                                max={job.salary_max || 0}
                                median={job.salary_median || 0}
                                userExpected={userExpectedSalary}
                            />
                        </div>
                    )}

                    {job.url && (
                        <a href={job.url} target="_blank" rel="noreferrer" className="btn btn-primary w-full mt-4 text-center block">
                            View Application
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
