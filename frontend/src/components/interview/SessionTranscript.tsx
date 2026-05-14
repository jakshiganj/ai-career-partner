import { MessageSquare } from 'lucide-react';
import type { Message } from '../../hooks/useInterviewAudio';

interface SessionTranscriptProps {
    messages: Message[];
    connected: boolean;
    audioMode: boolean;
    input: string;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function SessionTranscript({
    messages, connected, audioMode, input,
    onInputChange, onSend, onKeyDown, scrollContainerRef,
}: SessionTranscriptProps) {
    return (
        <div className="h-72 bg-white rounded-xl border border-[#E0E0E0] p-10 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-[#5BC0EB]" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">Session Transcript</h3>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">Secure Feed</span>
            </div>

            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar"
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">Ready for Input</p>
                    </div>
                )}
                {messages.map(msg => (
                    <div key={msg.id} className="flex gap-8 group">
                        <div className={`w-16 pt-1 shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] ${
                            msg.type === 'user' ? 'text-[#5BC0EB]' : 
                            msg.type === 'system' ? 'text-amber-500' : 'text-[#0D0D0D]'
                        }`}>
                            {msg.type === 'user' ? 'CANDIDATE' : msg.type === 'system' ? 'KERNEL' : 'ADVIEST'}
                        </div>
                        <p className={`text-[13px] leading-relaxed font-medium ${
                            msg.type === 'user' ? 'text-[#0D0D0D] font-bold' : 
                            msg.type === 'system' ? 'text-amber-600 italic' : 'text-[#4A4A4A]'
                        }`}>
                            {msg.text}
                        </p>
                    </div>
                ))}
            </div>

            {connected && (
                <div className="mt-8 pt-8 border-t border-[#F0F0F0] flex gap-4">
                    <input
                        className="flex-1 bg-[#F9F9F9] border border-[#E0E0E0] rounded-lg px-6 py-4 text-[13px] font-bold placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#0D0D0D] transition-all"
                        placeholder={audioMode ? 'Secondary Context Input...' : 'Enter your professional response...'}
                        value={input}
                        onChange={e => onInputChange(e.target.value)}
                        onKeyDown={onKeyDown}
                    />
                    <button
                        className="px-8 bg-[#0D0D0D] text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-[#5BC0EB] transition-all disabled:opacity-20"
                        onClick={onSend}
                        disabled={!input.trim()}
                    >
                        Execute
                    </button>
                </div>
            )}
        </div>
    );
}
