import { Lightbulb } from 'lucide-react';

interface PerformancePanelProps {
    connected: boolean;
    audioMode: boolean;
    messageCount: number;
}

export default function PerformancePanel({ connected, audioMode, messageCount }: PerformancePanelProps) {
    return (
        <aside className="flex-1 min-w-[360px] max-w-sm flex flex-col gap-10">
            <div className="bg-[#0D0D0D] rounded-xl p-10 text-white shadow-2xl">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#5BC0EB] block mb-4">PROTOCOL 4.2</span>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Performance Monitor</h2>
                <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest">Active Analysis: Behavioral Response</p>
                
                <div className="mt-10 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Voice Clarity</span>
                        <span className="text-[11px] font-bold text-[#5BC0EB]">{connected && audioMode ? 'Optimal' : '--'}</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-[#5BC0EB] transition-all duration-1000 ${connected && audioMode ? 'w-3/4' : 'w-0'}`} />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Logic Consistency</span>
                        <span className="text-[11px] font-bold text-[#5BC0EB]">{messageCount > 2 ? 'Analyzing' : '--'}</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full bg-[#5BC0EB] transition-all duration-1000 ${messageCount > 2 ? 'w-1/2' : 'w-0'}`} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E0E0E0] p-10 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-10">
                    <Lightbulb className="h-5 w-5 text-[#5BC0EB]" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">Tactical Insights</h3>
                </div>

                <div className="space-y-8 flex-1">
                    <section>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40 block mb-6">Execution Strategy</span>
                        <div className="space-y-4">
                            {[
                                { title: 'The STAR Framework', desc: 'Structure responses: Situation, Task, Action, Result.' },
                                { title: 'Temporal Control', desc: 'Maintain response duration between 60-90 seconds.' }
                            ].map((item, i) => (
                                <div key={i} className="p-5 rounded-lg border border-[#F0F0F0] bg-[#F9F9F9] group hover:border-[#5BC0EB] transition-all">
                                    <p className="text-[11px] font-bold text-[#0D0D0D] mb-1 uppercase tracking-tight">{item.title}</p>
                                    <p className="text-[11px] font-medium text-[#4A4A4A] opacity-60 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="mt-auto pt-10 border-t border-[#F0F0F0]">
                        <div className="p-6 rounded-lg bg-[#5BC0EB]/5 border border-[#5BC0EB]/20">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#5BC0EB]" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#5BC0EB]">Live Observer</span>
                            </div>
                            <p className="text-[11px] font-medium text-[#0D0D0D] leading-relaxed">
                                {connected ? 'The agent is parsing your vocal tone and semantic structure. Maintain a neutral, professional frequency.' : 'Initialize the simulation to activate the real-time feedback kernel.'}
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </aside>
    );
}
