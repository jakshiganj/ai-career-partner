import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, Target, Check, ChevronDown, ChevronUp, Sparkles, Loader2, MessageSquare, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getCurrentRoadmap, updateRoadmap, pivotRoadmap, chatRoadmap } from '../api/roadmap';
import type { ActionItem, SkillRoadmapResponse } from '../api/roadmap';

export default function InteractiveRoadmap({ implicitSkills }: { implicitSkills?: string[] }) {
    const [dbRoadmap, setDbRoadmap] = useState<SkillRoadmapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [pivoting, setPivoting] = useState(false);
    const [constraint, setConstraint] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [chatReply, setChatReply] = useState<{ text: string, time: Date } | null>(null);
    const [chatting, setChatting] = useState(false);
    const [expandedPhase, setExpandedPhase] = useState<number>(0);

    useEffect(() => {
        getCurrentRoadmap()
            .then(data => {
                // Ensure action_items are objects with 'completed' flag
                const migratedRoadmap = data.roadmap.map(phase => ({
                    ...phase,
                    action_items: phase.action_items?.map(item => {
                        if (typeof item === 'string') return { task: item, completed: false };
                        return item;
                    }) || phase.milestones?.map(item => ({ task: item, completed: false })) || []
                }));
                setDbRoadmap({ ...data, roadmap: migratedRoadmap });
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load roadmap", err);
                setLoading(false);
            });
    }, []);

    const renderTaskWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline underline-offset-2 transition-colors inline-block break-all max-w-[200px] truncate align-bottom" onClick={(e) => e.stopPropagation()}>
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
        
        // Trigger generic milestone celebration if completing the very last item in this phase
        if (isCompleting && currentCompletedCount + 1 === items.length && items.length > 0) {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6']
            });
        }
        
        // Debounce or flush immediately
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
        return <div className="animate-pulse bg-[#F8FAFC] h-64 rounded-xl border border-[#E2E8F0]"></div>;
    }

    if (!dbRoadmap || !dbRoadmap.roadmap.length) {
        return (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-[#64748B]">
                Your Skill Roadmap has not been generated yet.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">Your Learning Capability Roadmap</h2>
                    <p className="text-sm text-[#64748B] mt-1">
                        Track your progress towards becoming a <span className="font-semibold text-[#3B82F6]">{dbRoadmap.target_role}</span>
                    </p>
                </div>
                
                {/* Pivot UI */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg flex flex-col gap-2 min-w-[300px]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
                        <Sparkles className="h-4 w-4 text-[#8B5CF6]" /> AI Auto-Adjust
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="e.g. 'Compress this to 4 weeks'" 
                            value={constraint}
                            onChange={e => setConstraint(e.target.value)}
                            disabled={pivoting}
                            className="flex-1 px-3 py-1.5 text-sm border border-[#CBD5E1] rounded outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] disabled:opacity-50"
                        />
                        <button 
                            disabled={!constraint.trim() || pivoting}
                            onClick={handlePivot}
                            className="bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#94A3B8] text-white px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            {pivoting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pivot"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {dbRoadmap.roadmap.map((phase, pIdx) => {
                    const title = phase.phase_name || phase.focus || `Phase ${pIdx + 1}`;
                    const items = (phase.action_items as ActionItem[]) || [];
                    const completedCount = items.filter(i => i.completed).length;
                    const totalCount = items.length;
                    const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
                    const isExpanded = expandedPhase === pIdx;

                    return (
                        <div key={pIdx} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm transition-all">
                            {/* Header row */}
                            <div 
                                className={`p-5 flex items-center justify-between cursor-pointer hover:bg-[#F8FAFC] transition-colors ${isExpanded ? 'bg-[#F8FAFC] border-b border-[#E2E8F0]' : ''}`}
                                onClick={() => setExpandedPhase(isExpanded ? -1 : pIdx)}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex-shrink-0">
                                        {progressPct === 100 ? (
                                            <div className="h-10 w-10 rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
                                                <Check strokeWidth={3} className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] font-bold">
                                                {pIdx + 1}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[#0F172A]">{title}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-[#64748B]">
                                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {(phase.estimated_weeks || phase.duration_weeks || phase.weeks || 0)} Weeks</span>
                                            {phase.skills_covered && <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {phase.skills_covered.length} Skills</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-sm font-medium text-[#0F172A]">{progressPct}%</div>
                                        <div className="text-xs text-[#64748B]">{completedCount} of {totalCount} tasks</div>
                                    </div>
                                    <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden hidden sm:block">
                                        <div className="h-full bg-[#3B82F6] transition-all duration-500" style={{ width: `${progressPct}%` }}></div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="h-5 w-5 text-[#94A3B8]" /> : <ChevronDown className="h-5 w-5 text-[#94A3B8]" />}
                                </div>
                            </div>
                            
                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="p-5 bg-white space-y-4">
                                    {phase.skills_covered && phase.skills_covered.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Skills Covered</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {phase.skills_covered.map(skill => (
                                                    <span key={skill} className="px-2.5 py-1 bg-[#F1F5F9] text-[#475569] text-xs font-medium rounded-md">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">Action Items</h4>
                                        <div className="space-y-3">
                                            {items.map((item, iIdx) => (
                                                <div 
                                                    key={iIdx} 
                                                    onClick={(e) => { e.stopPropagation(); toggleActionItem(pIdx, iIdx); }}
                                                    className={`group p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3
                                                        ${item.completed ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-white border-[#E2E8F0] hover:border-[#3B82F6] hover:shadow-sm'}`}
                                                >
                                                    <button className="flex-shrink-0 mt-0.5 focus:outline-none">
                                                        {item.completed ? (
                                                            <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                                                        ) : (
                                                            <Circle className="h-5 w-5 text-[#CBD5E1] group-hover:text-[#3B82F6] transition-colors" />
                                                        )}
                                                    </button>
                                                    <span className={`text-sm leading-relaxed transition-colors ${item.completed ? 'text-[#166534] line-through opacity-70' : 'text-[#334155]'}`}>
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
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-sm mt-8">
                <div className="bg-[#F8FAFC] p-4 border-b border-[#E2E8F0] flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-[#3B82F6]" />
                    <div>
                        <h3 className="font-bold text-[#0F172A] text-sm">Weekly Check-in Agent</h3>
                        <p className="text-xs text-[#64748B]">Tell me what you learned this week, and I'll update your roadmap!</p>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    {chatReply && (
                        <div className="bg-[#EFF6FF] text-[#1E3A8A] p-4 rounded-lg text-sm border border-[#BFDBFE]">
                            <div className="font-bold mb-1 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" /> Agent Response
                            </div>
                            <p className="leading-relaxed">{chatReply.text}</p>
                            <span className="text-[10px] text-[#60A5FA] block mt-2 text-right">
                                {chatReply.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <textarea 
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            disabled={chatting}
                            placeholder="e.g. 'I finished the freeCodeCamp Docker crash course...'"
                            className="flex-1 border border-[#E2E8F0] rounded-lg p-3 text-sm focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none resize-none disabled:opacity-50"
                            rows={2}
                        />
                        <button 
                            disabled={!chatMessage.trim() || chatting}
                            onClick={handleChat}
                            className="bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-[#94A3B8] text-white px-5 rounded-lg flex items-center justify-center transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-[#0F172A]"
                        >
                            {chatting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {implicitSkills && implicitSkills.length > 0 && (
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 mt-6 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Inferred Masteries (Neo4j Graph Context)</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {implicitSkills.map(s => <span key={s} className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] px-2 py-0.5 rounded shadow-sm text-[10px] font-bold uppercase">{s}</span>)}
                    </div>
                </div>
            )}
        </div>
    );
}
