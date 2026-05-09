import { motion } from 'framer-motion';
import { Target, MessageSquare, Brain, Award, Sparkles, ChevronDown, ChevronUp, Hexagon } from 'lucide-react';
import { useState } from 'react';

export interface InterviewReportData {
    overall_score: number;
    relevance: number;
    clarity: number;
    depth: number;
    star_compliance: number;
    feedback: string;
    tips?: Record<string, string>;
    transcript?: string;
}

interface Props {
    report: InterviewReportData | null;
}

export default function InterviewReport({ report }: Props) {
    const [transcriptOpen, setTranscriptOpen] = useState(false);

    if (!report) return null;

    return (
        <div className="mx-auto w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header section with overall score */}
            <div className="mb-12 overflow-hidden rounded-xl border border-[#E0E0E0] bg-white p-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-3 rounded-lg border border-[#E0E0E0] bg-[#F9F9F9] px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#0D0D0D] mb-6">
                            <Hexagon className="h-3.5 w-3.5 text-[#5BC0EB] fill-current" />
                            Analytical Synthesis Complete
                        </div>
                        <h2 className="text-4xl font-bold text-[#0D0D0D] mb-4 tracking-tight">Technical & Behavioral Performance</h2>
                        <p className="text-[13px] font-medium text-[#4A4A4A] opacity-60 leading-relaxed max-w-xl">
                            The following metrics represent an algorithmic evaluation of your linguistic structure, logical consistency, and experiential depth recorded during the simulation.
                        </p>
                    </div>
                    
                    <div className="flex shrink-0 flex-col items-center">
                        <div className="relative flex h-40 w-40 items-center justify-center rounded-xl bg-[#0D0D0D] shadow-2xl">
                            <div className="text-center">
                                <span className="text-5xl font-bold text-white tracking-tighter tabular-nums">{report.overall_score.toFixed(1)}</span>
                                <span className="block text-[10px] font-bold text-[#5BC0EB] uppercase tracking-[0.2em] mt-2">Overall Index</span>
                            </div>
                            {/* Institutional accent corners */}
                            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-[#5BC0EB]" />
                            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-[#5BC0EB]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Report Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Metric breakdown (Left Column) */}
                <div className="lg:col-span-4 space-y-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-6">QUANTITATIVE INDICES</span>
                    {[
                        { label: 'Relevance', val: report.relevance, icon: Target, desc: 'Contextual Alignment' },
                        { label: 'Clarity', val: report.clarity, icon: MessageSquare, desc: 'Linguistic Structure' },
                        { label: 'Depth', val: report.depth, icon: Brain, desc: 'Cognitive Complexity' },
                        { label: 'STAR Format', val: report.star_compliance, icon: Award, desc: 'Methodological Fidelity' }
                    ].map((dim, idx) => (
                        <div key={dim.label} className="rounded-xl border border-[#E0E0E0] bg-white p-6 transition-all hover:border-[#0D0D0D] group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F9F9F9] border border-[#E0E0E0] group-hover:bg-[#0D0D0D] group-hover:text-white transition-all">
                                        <dim.icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-[#0D0D0D] uppercase tracking-tight">{dim.label}</h4>
                                        <p className="text-[9px] font-bold text-[#4A4A4A] opacity-40 uppercase tracking-widest mt-1">{dim.desc}</p>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-[#0D0D0D] tabular-nums">{Number(dim.val).toFixed(1)}</div>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-[#F0F0F0]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(dim.val / 10) * 100}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                                    className="h-full rounded-full bg-[#5BC0EB]"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Qualitative Feedback (Right Column) */}
                <div className="lg:col-span-8 space-y-10">
                    <div className="rounded-xl border border-[#E0E0E0] bg-white p-10">
                        <div className="mb-8 flex items-center gap-3">
                            <Sparkles className="h-4 w-4 text-[#5BC0EB]" />
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">Strategic Feedback</h3>
                        </div>
                        <div className="prose prose-sm max-w-none">
                            <p className="text-[14px] leading-[1.8] text-[#4A4A4A] font-medium whitespace-pre-wrap italic pl-8 border-l-2 border-[#5BC0EB]/30">
                                "{report.feedback}"
                            </p>
                        </div>
                    </div>

                    {report.tips && Object.keys(report.tips).length > 0 && (
                        <div className="rounded-xl bg-[#0D0D0D] p-10 text-white shadow-xl">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#5BC0EB] mb-8">OPTIMIZATION PROTOCOLS</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(report.tips).map(([dim, tip]) => (
                                    <div key={dim} className="p-6 rounded-lg bg-white/5 border border-white/10 hover:border-[#5BC0EB]/40 transition-all">
                                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#5BC0EB] mb-3">{dim.replace('_', ' ')}</h5>
                                        <p className="text-[12px] text-white/60 leading-relaxed font-medium">{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript System */}
            {report.transcript && (
                <div className="mt-12 rounded-xl border border-[#E0E0E0] bg-white overflow-hidden">
                    <button 
                        onClick={() => setTranscriptOpen(!transcriptOpen)}
                        className="flex w-full items-center justify-between p-8 text-left hover:bg-[#F9F9F9] transition-all"
                    >
                        <div className="flex items-center gap-6">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0D0D0D] text-white">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#0D0D0D] uppercase tracking-tight">Linguistic Transcript</h3>
                                <p className="text-[10px] font-bold text-[#4A4A4A] opacity-40 uppercase tracking-widest mt-1">Verbatim Neural Extraction</p>
                            </div>
                        </div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border border-[#E0E0E0] transition-all ${transcriptOpen ? 'bg-[#0D0D0D] border-[#0D0D0D] text-white' : 'text-[#4A4A4A]'}`}>
                            {transcriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                    </button>
                    
                    {transcriptOpen && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="border-t border-[#E0E0E0] bg-[#F9F9F9] p-10"
                        >
                            <div className="space-y-8 max-h-[700px] overflow-y-auto pr-6 custom-scrollbar">
                                {report.transcript.split('\n').map((line, i) => {
                                    if (!line.trim()) return null;
                                    const isInterviewer = line.startsWith('INTERVIEWER:');
                                    return (
                                        <div key={i} className={`flex gap-8 ${isInterviewer ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <div className={`max-w-[80%] p-8 rounded-xl ${
                                                isInterviewer 
                                                ? 'bg-white border border-[#E0E0E0] text-[#4A4A4A]' 
                                                : 'bg-[#0D0D0D] text-white shadow-xl'
                                            }`}>
                                                <span className={`block text-[9px] font-bold mb-4 tracking-[0.2em] uppercase ${
                                                    isInterviewer ? 'text-[#5BC0EB]' : 'text-[#5BC0EB]'
                                                }`}>
                                                    {isInterviewer ? '[ SYSTEM_AGENT ]' : '[ CANDIDATE ]'}
                                                </span>
                                                <p className="text-[13px] leading-relaxed font-medium">
                                                    {line.replace(/^(INTERVIEWER|CANDIDATE):\s*/, '')}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}

