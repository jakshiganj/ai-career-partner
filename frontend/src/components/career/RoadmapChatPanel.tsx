import { MessageSquare, Sparkles, Loader2, Send } from 'lucide-react';

interface RoadmapChatPanelProps {
    chatMessage: string;
    chatReply: { text: string; time: Date } | null;
    chatting: boolean;
    onMessageChange: (value: string) => void;
    onSend: () => void;
}

export default function RoadmapChatPanel({
    chatMessage, chatReply, chatting, onMessageChange, onSend,
}: RoadmapChatPanelProps) {
    return (
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
                        onChange={e => onMessageChange(e.target.value)}
                        disabled={chatting}
                        placeholder="Describe your learning progress (e.g. 'I completed the AWS Solutions Architect certification')..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 text-sm text-white placeholder:text-white/20 focus:border-[#5BC0EB] outline-none resize-none disabled:opacity-50"
                        rows={3}
                    />
                    <button 
                        disabled={!chatMessage.trim() || chatting}
                        onClick={onSend}
                        className="bg-[#5BC0EB] hover:bg-white disabled:bg-white/10 text-[#0D0D0D] px-8 rounded-xl flex items-center justify-center transition-all group"
                    >
                        {chatting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
