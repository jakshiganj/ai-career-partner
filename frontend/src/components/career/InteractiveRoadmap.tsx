import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useRoadmapData } from '../../hooks/useRoadmapData';
import RoadmapPhaseCard from './RoadmapPhaseCard';
import RoadmapChatPanel from './RoadmapChatPanel';

// Shared utility: convert bare URLs in task text to clickable links
function renderTaskWithLinks(text: string): React.ReactNode {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s)]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
        urlRegex.test(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#5BC0EB] underline">{part}</a>
        ) : <span key={i}>{part}</span>
    );
}

interface InteractiveRoadmapProps {
    pipelineId?: string;
    implicitSkills?: string[];
}

export default function InteractiveRoadmap({ pipelineId }: InteractiveRoadmapProps) {
    const {
        dbRoadmap, loading, pipelineStatus,
        expandedPhase, setExpandedPhase,
        constraint, setConstraint, pivoting, handlePivot,
        chatMessage, setChatMessage, chatReply, chatting, handleChat,
        toggleActionItem,
    } = useRoadmapData(pipelineId);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 bg-[#F9F9F9] rounded-xl">
                <Loader2 className="h-8 w-8 animate-spin text-[#5BC0EB]" />
            </div>
        );
    }

    const isGenerating = pipelineStatus === 'running' || pipelineStatus === 'initialized';

    if (!dbRoadmap || !dbRoadmap.roadmap || dbRoadmap.roadmap.length === 0) {
        return (
            <div className="bg-white border border-[#E0E0E0] rounded-xl p-16 text-center">
                <div className="h-16 w-16 mx-auto mb-6 bg-[#F9F9F9] rounded-xl flex items-center justify-center">
                    {isGenerating ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#5BC0EB]" />
                    ) : (
                        <Sparkles className="h-6 w-6 text-[#A0A0A0]" />
                    )}
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#0D0D0D] mb-2">
                    {isGenerating ? 'Generating Your Roadmap...' : 'No Roadmap Available'}
                </h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60 max-w-md mx-auto">
                    {isGenerating 
                        ? 'Our AI agents are building your career development path. This usually takes about 60 seconds.' 
                        : 'Run a pipeline analysis to generate a personalized skill development roadmap.'}
                </p>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            {/* Phase Cards */}
            {dbRoadmap.roadmap.map((phase, idx) => (
                <RoadmapPhaseCard
                    key={idx}
                    phase={phase}
                    index={idx}
                    isExpanded={expandedPhase === idx}
                    onToggle={() => setExpandedPhase(expandedPhase === idx ? -1 : idx)}
                    onToggleItem={toggleActionItem}
                    renderTaskWithLinks={renderTaskWithLinks}
                />
            ))}

            {/* Pivot Control */}
            <div className="flex gap-4 items-center bg-[#F9F9F9] rounded-xl p-6 border border-[#E0E0E0]">
                <input
                    value={constraint}
                    onChange={(e) => setConstraint(e.target.value)}
                    disabled={pivoting}
                    placeholder="Pivot your roadmap — e.g. 'Focus on DevOps instead of Frontend'"
                    className="flex-1 bg-white border border-[#E0E0E0] rounded-lg p-4 text-sm font-medium placeholder:text-[#A0A0A0] focus:border-[#0D0D0D] focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                    disabled={!constraint.trim() || pivoting}
                    onClick={handlePivot}
                    className="bg-[#0D0D0D] hover:bg-[#5BC0EB] disabled:bg-[#E0E0E0] text-white px-8 py-4 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-3"
                >
                    {pivoting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Pivot
                </button>
            </div>

            {/* Chat Panel */}
            <RoadmapChatPanel
                chatMessage={chatMessage}
                chatReply={chatReply}
                chatting={chatting}
                onMessageChange={setChatMessage}
                onSend={handleChat}
            />
        </div>
    );
}
