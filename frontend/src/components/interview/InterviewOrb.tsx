import { Mic, Keyboard, Square, ArrowRight } from 'lucide-react';

interface InterviewOrbProps {
    connected: boolean;
    audioMode: boolean;
    sessionEnded: boolean;
    onConnectVoice: () => void;
    onConnectText: () => void;
    onDisconnect: () => void;
    onViewReport: () => void;
}

export default function InterviewOrb({
    connected, audioMode, sessionEnded,
    onConnectVoice, onConnectText, onDisconnect, onViewReport,
}: InterviewOrbProps) {
    return (
        <div className="relative flex-1 bg-[#F9F9F9] rounded-xl border border-[#E0E0E0] overflow-hidden flex items-center justify-center">
            {/* Institutional Grid Background */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#0D0D0D 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            {connected ? (
                <div className="relative flex flex-col items-center">
                    {audioMode ? (
                        <div className="relative">
                            <div className="w-48 h-48 bg-[#0D0D0D] rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(91,192,235,0.2)] animate-pulse">
                                <div className="w-44 h-44 border border-white/10 rounded-full" />
                            </div>
                            <div className="absolute -inset-4 border border-[#5BC0EB]/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                        </div>
                    ) : (
                        <div className="w-48 h-48 bg-white border border-[#E0E0E0] rounded-full flex items-center justify-center shadow-xl">
                            <Keyboard className="h-12 w-12 text-[#0D0D0D]" />
                        </div>
                    )}
                    <div className="mt-12 text-center">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">ADVIEST CO-PILOT</h3>
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-60">Processing Neural Inputs...</p>
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <div className="w-24 h-24 border border-dashed border-[#E0E0E0] rounded-full flex items-center justify-center mx-auto mb-8">
                        <Mic className="h-8 w-8 text-[#E0E0E0]" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0D0D0D] opacity-40">Awaiting Signal</h3>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] opacity-40">Initialize session to begin</p>
                </div>
            )}

            {/* Control Bar */}
            <div className="absolute bottom-10 flex items-center gap-4">
                {!connected ? (
                    <>
                        <button 
                            className="h-12 px-8 flex items-center gap-3 rounded-lg bg-[#0D0D0D] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#5BC0EB] transition-all" 
                            onClick={onConnectVoice}
                        >
                            <Mic className="h-4 w-4" /> Initialize Voice
                        </button>
                        <button 
                            className="h-12 px-8 flex items-center gap-3 rounded-lg bg-white border border-[#E0E0E0] text-[#0D0D0D] text-[11px] font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-all" 
                            onClick={onConnectText}
                        >
                            <Keyboard className="h-4 w-4" /> Text Interface
                        </button>
                        {sessionEnded && (
                            <button 
                                className="h-12 px-8 flex items-center gap-3 rounded-lg bg-[#5BC0EB] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#0D0D0D] transition-all" 
                                onClick={onViewReport}
                            >
                                Analytical Report <ArrowRight className="h-4 w-4" />
                            </button>
                        )}
                    </>
                ) : (
                    <button 
                        className="h-12 px-8 flex items-center gap-3 rounded-lg bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/10" 
                        onClick={onDisconnect}
                    >
                        <Square className="h-3 w-3 fill-current" /> Terminate Session
                    </button>
                )}
            </div>
        </div>
    );
}
