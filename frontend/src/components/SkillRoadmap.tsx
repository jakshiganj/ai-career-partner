import { useState } from 'react';

interface RoadmapPhase {
    phase_number: number;
    duration_weeks: number;
    focus: string;
    milestones: string[];
}

interface Props {
    roadmap: {
        target_role: string;
        estimated_months: number;
        phases: RoadmapPhase[];
    } | null;
}

export default function SkillRoadmap({ roadmap }: Props) {
    const [activePhase, setActivePhase] = useState<number>(1);

    if (!roadmap || !roadmap.phases?.length) return null;

    return (
        <div className="card">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="flex items-center gap-2">
                        <span>🗺️</span> Skill Gap Roadmap
                    </h3>
                    <p className="text-sm text-secondary mt-1">
                        Path to <span className="font-semibold text-accent">{roadmap.target_role}</span>
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold">{roadmap.estimated_months}</span>
                    <span className="text-muted text-sm ml-1">Months</span>
                </div>
            </div>

            {/* Horizontal Timeline (Feature 8 Visual Requirement) */}
            <div className="relative mb-8 px-4">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-subtle -translate-y-1/2 rounded" />

                <div className="relative flex justify-between">
                    {roadmap.phases.map((phase) => {
                        const isActive = phase.phase_number === activePhase;
                        const isPast = phase.phase_number < activePhase;

                        return (
                            <button
                                key={phase.phase_number}
                                onClick={() => setActivePhase(phase.phase_number)}
                                className={`relative flex flex-col items-center z-10 hover:opacity-100 transition-all ${!isActive && 'opacity-60'}`}
                            >
                                <div
                                    className={`w-6 h-6 rounded-full border-4 shadow-sm z-20 transition-all
                                ${isActive ? 'bg-accent border-white scale-125' :
                                            isPast ? 'bg-success border-success/20' : 'bg-elevated border-subtle'}
                              `}
                                />
                                <div className="absolute top-8 w-24 text-center">
                                    <div className={`text-xs font-bold ${isActive ? 'text-accent' : 'text-secondary'}`}>
                                        Phase {phase.phase_number}
                                    </div>
                                    <div className="text-[10px] text-muted whitespace-nowrap">
                                        {phase.duration_weeks} weeks
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Phase Details Area */}
            <div className="mt-14 bg-elevated p-5 rounded-xl border border-subtle relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                {roadmap.phases.map((phase) => (
                    <div
                        key={phase.phase_number}
                        className={`transition-all duration-300 ${phase.phase_number === activePhase ? 'block animate-fade-in' : 'hidden'}`}
                    >
                        <h4 className="font-bold text-lg mb-4 text-text">{phase.focus}</h4>
                        <ul className="space-y-3">
                            {phase.milestones.map((milestone, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 border-accent flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                                    </div>
                                    <span className="text-sm text-secondary leading-relaxed">{milestone}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}
