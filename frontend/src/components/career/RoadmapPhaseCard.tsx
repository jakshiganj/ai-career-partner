import { Clock, Target, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { ActionItem, RoadmapPhase } from '../../api/roadmap';

interface RoadmapPhaseCardProps {
    phase: RoadmapPhase;
    index: number;
    isExpanded: boolean;
    onToggle: () => void;
    onToggleItem: (phaseIndex: number, taskIndex: number) => void;
    renderTaskWithLinks: (text: string) => React.ReactNode;
}

export default function RoadmapPhaseCard({
    phase, index, isExpanded, onToggle, onToggleItem, renderTaskWithLinks,
}: RoadmapPhaseCardProps) {
    const title = phase.phase_name || phase.focus || `Phase ${index + 1}`;
    const items = (phase.action_items as ActionItem[]) || [];
    const completedCount = items.filter(i => i.completed).length;
    const totalCount = items.length;
    const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return (
        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden transition-all hover:border-[#0D0D0D]">
            {/* Header row */}
            <div 
                className={`p-8 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-[#F9F9F9] border-b border-[#E0E0E0]' : ''}`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-6 flex-1">
                    <div className="flex-shrink-0">
                        {progressPct === 100 ? (
                            <div className="h-12 w-12 rounded-lg bg-[#0D0D0D] flex items-center justify-center text-[#5BC0EB]">
                                <Check strokeWidth={4} className="h-5 w-5" />
                            </div>
                        ) : (
                            <div className="h-12 w-12 rounded-lg border-2 border-[#E0E0E0] flex items-center justify-center text-[#0D0D0D] font-bold text-sm">
                                0{index + 1}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#0D0D0D]">{title}</h3>
                        <div className="flex items-center gap-6 mt-2 text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">
                            <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {(phase.estimated_weeks || phase.duration_weeks || phase.weeks || 0)} Weeks</span>
                            {phase.skills_covered && <span className="flex items-center gap-2"><Target className="h-3.5 w-3.5" /> {phase.skills_covered.length} Core Skills</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                        <div className="text-[13px] font-bold text-[#0D0D0D]">{progressPct}% COMPLETION</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40 mt-1">{completedCount} / {totalCount} MILESTONES</div>
                    </div>
                    <div className="w-32 h-1.5 bg-[#E0E0E0] rounded-full overflow-hidden hidden md:block">
                        <div className="h-full bg-[#0D0D0D] transition-all duration-700" style={{ width: `${progressPct}%` }}></div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-[#0D0D0D]" /> : <ChevronDown className="h-4 w-4 text-[#0D0D0D]" />}
                </div>
            </div>
            
            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-10 bg-white space-y-10">
                    {phase.skills_covered && phase.skills_covered.length > 0 && (
                        <div>
                            <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40 mb-4">COMPETENCY FOCUS</h4>
                            <div className="flex flex-wrap gap-2">
                                {phase.skills_covered.map((skill, sIdx) => {
                                    const skillName = typeof skill === 'string' 
                                        ? skill 
                                        : (skill as Record<string, unknown>).name as string || 'Skill';
                                    return (
                                        <span key={sIdx} className="px-3 py-1.5 bg-[#F9F9F9] border border-[#E0E0E0] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-widest rounded-lg">
                                            {skillName}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40 mb-6">STRATEGIC ACTION ITEMS</h4>
                        <div className="grid grid-cols-1 gap-4">
                            {items.map((item, iIdx) => (
                                <div 
                                    key={iIdx} 
                                    onClick={(e) => { e.stopPropagation(); onToggleItem(index, iIdx); }}
                                    className={`group p-5 rounded-xl border transition-all cursor-pointer flex items-center gap-5
                                        ${item.completed ? 'bg-[#F9F9F9] border-[#E0E0E0] opacity-60' : 'bg-white border-[#E0E0E0] hover:border-[#0D0D0D]'}`}
                                >
                                    <div className="flex-shrink-0">
                                        {item.completed ? (
                                            <div className="h-6 w-6 rounded-full bg-[#0D0D0D] flex items-center justify-center text-[#5BC0EB]">
                                                <Check className="h-3 w-3" strokeWidth={4} />
                                            </div>
                                        ) : (
                                            <div className="h-6 w-6 rounded-full border-2 border-[#E0E0E0] group-hover:border-[#0D0D0D] transition-colors" />
                                        )}
                                    </div>
                                    <span className={`text-[13px] font-medium leading-relaxed transition-colors ${item.completed ? 'text-[#4A4A4A] line-through' : 'text-[#0D0D0D]'}`}>
                                        {renderTaskWithLinks(item.task)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
