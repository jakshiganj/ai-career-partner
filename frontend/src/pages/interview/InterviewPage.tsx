import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Sidebar, { SIDEBAR_WIDTH } from '../../components/dashboard/Sidebar';
import { useInterviewAudio } from '../../hooks/useInterviewAudio';
import InterviewOrb from '../../components/interview/InterviewOrb';
import SessionTranscript from '../../components/interview/SessionTranscript';
import PerformancePanel from '../../components/interview/PerformancePanel';

export default function InterviewPage() {
    const navigate = useNavigate();
    const {
        messages, input, setInput,
        connected, audioMode, sessionEnded,
        messagesEndRef,
        connect, disconnect, sendMessage, handleKeyDown,
    } = useInterviewAudio();

    return (
        <div className="flex min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />
            
            <main className="flex-1 flex flex-col bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                {/* Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ SIMULATION ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Behavioral Interview Lab</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        {connected && (
                            <div className="flex items-center gap-3 rounded-lg border border-[#E0E0E0] px-4 py-2">
                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D0D0D]">Live Capture Active</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-[#4A4A4A]">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Verified Environment</span>
                        </div>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden p-12 gap-12 h-[calc(100vh-80px)]">
                    {/* Left: Simulation Control & Visuals */}
                    <div className="flex-[3] flex flex-col gap-10 min-w-0">
                        <InterviewOrb
                            connected={connected}
                            audioMode={audioMode}
                            sessionEnded={sessionEnded}
                            onConnectVoice={() => connect(true)}
                            onConnectText={() => connect(false)}
                            onDisconnect={disconnect}
                            onViewReport={() => navigate('/interview/report')}
                        />

                        <SessionTranscript
                            messages={messages}
                            connected={connected}
                            audioMode={audioMode}
                            input={input}
                            onInputChange={setInput}
                            onSend={sendMessage}
                            onKeyDown={handleKeyDown}
                            messagesEndRef={messagesEndRef}
                        />
                    </div>

                    {/* Right: Insights Panel */}
                    <PerformancePanel
                        connected={connected}
                        audioMode={audioMode}
                        messageCount={messages.length}
                    />
                </div>
            </main>
        </div>
    );
}
