import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Target, Check, ChevronDown, ChevronUp, Sparkles, Loader2, MessageSquare, Send, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentRoadmap, updateRoadmap, pivotRoadmap, chatRoadmap, getRoadmapByPipelineId } from '../api/roadmap';
import type { ActionItem, SkillRoadmapResponse, RoadmapPhase } from '../api/roadmap';

interface InteractiveRoadmapProps {
    implicitSkills?: string[];
    pipelineId?: string;
}

export default function InteractiveRoadmap({ implicitSkills, pipelineId }: InteractiveRoadmapProps) {
    const [dbRoadmap, setDbRoadmap] = useState<SkillRoadmapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pivoting, setPivoting] = useState(false);
    const [constraint, setConstraint] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [chatReply, setChatReply] = useState<{ text: string, time: Date } | null>(null);
    const [chatting, setChatting] = useState(false);
    const [expandedPhase, setExpandedPhase] = useState<number>(0);

    useEffect(() => {
        setLoading(true);
        const fetchRoadmap = async () => {
            try {
                let data: SkillRoadmapResponse;
                if (pipelineId) {
                    data = await getRoadmapByPipelineId(pipelineId);
                } else {
                    data = await getCurrentRoadmap();
                }

                // Migrate old string-based action items if necessary
                const migratedRoadmap = data.roadmap.map(phase => ({
                    ...phase,
                    action_items: phase.action_items?.map(item => {
                        if (typeof item === 'string') return { task: item, completed: false };
                        return item;
                    }) || phase.milestones?.map(item => ({ task: item, completed: false })) || []
                }));

                setDbRoadmap({ ...data, roadmap: migratedRoadmap });
            } catch (err) {
                console.error("Failed to load roadmap", err);
                setDbRoadmap(null);
            } finally {
                setLoading(false);
            }
        };

        fetchRoadmap();
    }, [pipelineId]);

    const renderTaskWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#5BC0EB] hover:text-[#0D0D0D] underline underline-offset-4 transition-colors inline-block break-all max-w-[200px] truncate align-bottom" onClick={(e) => e.stopPropagation()}>
                        {part.replace(/^https?:\/\//, '')}
                    </a>
                );
            }
            return part;
        });
    };

    const toggleActionItem = async (phaseIndex: number, taskIndex: number) => {
        if (!dbRoadmap) return;

        const newRoadmap = [...dbRoadmap.roadmap];
        const phase = newRoadmap[phaseIndex];
        const items = phase.action_items ? [...(phase.action_items as ActionItem[])] : [];
        
        const isCompleting = !items[taskIndex].completed;
        const currentCompletedCount = items.filter(i => i.completed).length;
        
        items[taskIndex] = { ...items[taskIndex], completed: isCompleting };
        newRoadmap[phaseIndex] = { ...phase, action_items: items };

        setDbRoadmap({ ...dbRoadmap, roadmap: newRoadmap });
        
        if (isCompleting && currentCompletedCount + 1 === items.length && items.length > 0) {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#5BC0EB', '#0D0D0D', '#F4D35E', '#EE6C4D']
            });
        }
        
        try {
            await updateRoadmap(dbRoadmap.id, newRoadmap);
        } catch (e) {
            console.error("Failed to sync roadmap update", e);
        }
    };

    const handlePivot = async () => {
        if (!dbRoadmap || !constraint.trim()) return;
        setPivoting(true);
        try {
            const updated = await pivotRoadmap(dbRoadmap.id, constraint);
            const migratedRoadmap = updated.roadmap.map(phase => ({
                ...phase,
                action_items: phase.action_items?.map(item => {
                    if (typeof item === 'string') return { task: item, completed: false };
                    return item;
                }) || phase.milestones?.map(item => ({ task: item, completed: false })) || []
            }));
            setDbRoadmap({ ...updated, roadmap: migratedRoadmap });
            setConstraint('');
            setExpandedPhase(0);
        } catch (e) {
            console.error("Failed to pivot roadmap", e);
            alert("Pivot failed. Make sure you haven't checked off all tasks.");
        } finally {
            setPivoting(false);
        }
    };

    const handleChat = async () => {
        if (!dbRoadmap || !chatMessage.trim()) return;
        setChatting(true);
        try {
            const { reply, roadmap } = await chatRoadmap(dbRoadmap.id, chatMessage);
            const migratedRoadmap = roadmap.roadmap.map(phase => ({
                ...phase,
                action_items: phase.action_items?.map(item => {
                    if (typeof item === 'string') return { task: item, completed: false };
                    return item;
                }) || phase.milestones?.map(item => ({ task: item, completed: false })) || []
            }));
            
            setDbRoadmap({ ...roadmap, roadmap: migratedRoadmap });
            setChatReply({ text: reply, time: new Date() });
            setChatMessage('');
        } catch (e) {
            console.error("Failed to chat with roadmap", e);
            alert("Chat failed. Our agent might be taking a break.");
        } finally {
            setChatting(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-[#F9F9F9] h-96 rounded-xl border border-[#E0E0E0]"></div>;
    }

    if (!dbRoadmap || !dbRoadmap.roadmap.length) {
        return (
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-16 text-center text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">
                Roadmap compilation required. Run your first career analysis to begin.
            </div>
        );
    }

    return (
        <div className="space-y-10" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-white border border-[#E0E0E0] p-10 rounded-xl">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5BC0EB] block mb-2">[ GROWTH TRAJECTORY ]</span>
                    <h2 className="text-2xl font-bold tracking-tight text-[#0D0D0D]">Interactive Career Roadmap</h2>
                    <p className="text-[14px] text-[#4A4A4A] mt-2 opacity-80">
                        Strategic progression plan for <span className="font-bold text-[#0D0D0D]">{dbRoadmap.target_role}</span>
                    </p>
                </div>
                
                {/* Pivot UI */}
                <div className="bg-[#F9F9F9] border border-[#E0E0E0] p-6 rounded-xl flex flex-col gap-4 min-w-[350px]">
                    <div className="flex items-center gap-2.5 text-[10px] font-bold text-[#0D0D0D] uppercase tracking-[0.2em]">
                        <Sparkles className="h-4 w-4 text-[#5BC0EB]" /> AI Optimization
                    </div>
                    <div className="flex gap-3">
                        <input 
                            type="text" 
                            placeholder="e.g. 'Shorten timeline to 4 weeks'" 
                            value={constraint}
                            onChange={e => setConstraint(e.target.value)}
                            disabled={pivoting}
                            className="flex-1 px-4 py-2.5 text-xs font-bold border border-[#E0E0E0] rounded-lg outline-none focus:border-[#0D0D0D] disabled:opacity-50"
                        />
                        <button 
                            disabled={!constraint.trim() || pivoting}
                            onClick={handlePivot}
                            className="bg-[#0D0D0D] hover:bg-[#5BC0EB] disabled:bg-[#A0A0A0] text-white px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            {pivoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "PIVOT"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {dbRoadmap.roadmap.map((phase, pIdx) => {
                    const title = phase.phase_name || phase.focus || `Phase ${pIdx + 1}`;
                    const items = (phase.action_items as ActionItem[]) || [];
                    const completedCount = items.filter(i => i.completed).length;
                    const totalCount = items.length;
                    const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
                    const isExpanded = expandedPhase === pIdx;

                    return (
                        <div key={pIdx} className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden transition-all hover:border-[#0D0D0D]">
                            {/* Header row */}
                            <div 
                                className={`p-8 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-[#F9F9F9] border-b border-[#E0E0E0]' : ''}`}
                                onClick={() => setExpandedPhase(isExpanded ? -1 : pIdx)}
                            >
                                <div className="flex items-center gap-6 flex-1">
                                    <div className="flex-shrink-0">
                                        {progressPct === 100 ? (
                                            <div className="h-12 w-12 rounded-lg bg-[#0D0D0D] flex items-center justify-center text-[#5BC0EB]">
                                                <Check strokeWidth={4} className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="h-12 w-12 rounded-lg border-2 border-[#E0E0E0] flex items-center justify-center text-[#0D0D0D] font-bold text-sm">
                                                0{pIdx + 1}
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
                                                {phase.skills_covered.map(skill => (
                                                    <span key={skill} className="px-3 py-1.5 bg-[#F9F9F9] border border-[#E0E0E0] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-widest rounded-lg">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40 mb-6">STRATEGIC ACTION ITEMS</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            {items.map((item, iIdx) => (
                                                <div 
                                                    key={iIdx} 
                                                    onClick={(e) => { e.stopPropagation(); toggleActionItem(pIdx, iIdx); }}
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
                })}
            </div>
            
            {/* Agent Chat Section */}
            <div className="bg-[#0D0D0D] rounded-xl overflow-hidden shadow-2xl mt-12">
                <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 text-[#5BC0EB]">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm uppercase tracking-widest">Progress Orchestrator</h3>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">LOG YOUR ACHIEVEMENTS TO UPDATE THE ROADMAP</p>
                        </div>
                    </div>
                </div>
                <div className="p-10 space-y-8">
                    {chatReply && (
                        <div className="bg-white/5 border border-white/10 p-8 rounded-xl">
                            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5BC0EB] mb-4 flex items-center gap-3">
                                <Sparkles className="h-3.5 w-3.5" /> AGENT ANALYSIS
                            </div>
                            <p className="text-white text-[14px] leading-relaxed opacity-90">{chatReply.text}</p>
                            <span className="text-[9px] font-bold text-white/20 block mt-6 uppercase tracking-widest">
                                RECEIVED: {chatReply.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                    <div className="flex gap-4">
                        <textarea 
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            disabled={chatting}
                            placeholder="Describe your learning progress (e.g. 'I completed the AWS Solutions Architect certification')..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white placeholder:text-white/20 focus:border-[#5BC0EB] outline-none resize-none disabled:opacity-50"
                            rows={3}
                        />
                        <button 
                            disabled={!chatMessage.trim() || chatting}
                            onClick={handleChat}
                            className="bg-[#5BC0EB] hover:bg-white disabled:bg-white/10 text-[#0D0D0D] px-8 rounded-xl flex items-center justify-center transition-all group"
                        >
                            {chatting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        </button>
                    </div>
                </div>
            </div>

            {implicitSkills && implicitSkills.length > 0 && (
                <div className="bg-white rounded-xl border border-[#E0E0E0] p-8 mt-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40 mb-6">INFERRED DOMAIN MASTERIES</h4>
                    <div className="flex flex-wrap gap-2">
                        {implicitSkills.map(s => (
                            <span key={s} className="bg-[#F9F9F9] border border-[#E0E0E0] text-[#0D0D0D] px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
