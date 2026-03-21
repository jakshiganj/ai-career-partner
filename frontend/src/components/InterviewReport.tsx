import { motion } from 'framer-motion';
import { Target, MessageSquare, Brain, Award, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
    report: {
        overall_score: number;
        relevance: number;
        clarity: number;
        depth: number;
        star_compliance: number;
        feedback: string;
        tips?: Record<string, string>;
        transcript?: string;
    } | null;
}

export default function InterviewReport({ report }: Props) {
    const [transcriptOpen, setTranscriptOpen] = useState(false);

    if (!report) return null;

    return (
        <div className="mx-auto w-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {/* Header section with overall score */}
            <div className="mb-8 overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
                {/* Decorative gradient blob */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-3xl" />
                
                <div className="relative z-10 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 mb-4">
                            <Sparkles className="h-3.5 w-3.5" />
                            Session Analysis Complete
                        </div>
                        <h2 className="text-3xl font-bold text-[#0F172A] mb-2 tracking-tight">AI Interview Report</h2>
                        <p className="text-[#64748B] max-w-md">Your performance has been evaluated across key dimensions based on your responses.</p>
                    </div>
                    
                    <div className="flex shrink-0 flex-col items-center">
                        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20">
                            <div className="absolute inset-1 rounded-full bg-white flex flex-col items-center justify-center">
                                <span className="text-4xl font-extrabold text-[#0F172A] tracking-tighter">{report.overall_score.toFixed(1)}</span>
                                <span className="text-xs font-medium text-[#64748B] uppercase tracking-widest mt-1">Overall</span>
                            </div>
                            {/* Decorative ring */}
                            <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="48" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-blue-100/20" />
                                <circle cx="50" cy="50" r="48" fill="transparent" stroke="url(#gradient)" strokeWidth="4" strokeDasharray={`${(report.overall_score / 10) * 301.59} 301.59`} strokeLinecap="round" className="text-white drop-shadow-sm" />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#60A5FA" />
                                        <stop offset="100%" stopColor="#A78BFA" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Score Breakdown (Left Column) */}
                <div className="md:col-span-5 flex flex-col gap-4">
                    {[
                        { label: 'Relevance', val: report.relevance, icon: Target, desc: 'Addressed the prompt directly' },
                        { label: 'Clarity', val: report.clarity, icon: MessageSquare, desc: 'Clear and structured delivery' },
                        { label: 'Depth', val: report.depth, icon: Brain, desc: 'Technical & experiential depth' },
                        { label: 'STAR Format', val: report.star_compliance, icon: Award, desc: 'Used Situation, Task, Action, Result' }
                    ].map((dim, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={dim.label} 
                            className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                                        <dim.icon className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-[#0F172A]">{dim.label}</h4>
                                        <p className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider mt-0.5">{dim.desc}</p>
                                    </div>
                                </div>
                                <div className="text-xl font-extrabold text-[#0F172A]">{Number(dim.val).toFixed(1)}</div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(dim.val / 10) * 100}%` }}
                                    transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Feedback & Tips (Right Column) */}
                <div className="md:col-span-7 flex flex-col gap-6">
                    <div className="h-full rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <h3 className="text-lg font-bold text-[#0F172A]">Detailed Feedback</h3>
                        </div>
                        <p className="text-[15px] leading-relaxed text-[#475569] whitespace-pre-wrap font-medium">
                            {report.feedback}
                        </p>
                    </div>

                    {report.tips && Object.keys(report.tips).length > 0 && (
                        <div className="rounded-[24px] border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-6 sm:p-8">
                            <h3 className="text-lg font-bold text-[#0F172A] mb-5">Actionable Tips</h3>
                            <div className="space-y-4">
                                {Object.entries(report.tips).map(([dim, tip]) => (
                                    <div key={dim} className="flex gap-4 bg-white/60 p-4 rounded-[16px] border border-white">
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                            <span className="text-xs font-bold">✓</span>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold capitalize text-[#0F172A] mb-1">{dim.replace('_', ' ')}</h5>
                                            <p className="text-sm text-[#475569] leading-relaxed">{tip}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Transcript Accordion */}
            {report.transcript && (
                <div className="mt-6 rounded-[24px] border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
                    <button 
                        onClick={() => setTranscriptOpen(!transcriptOpen)}
                        className="flex w-full items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-slate-100 border border-slate-200 text-slate-600">
                                <MessageSquare className="h-6 w-6 text-slate-700" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[#0F172A]">Session Transcript</h3>
                                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wider mt-1">Review the conversation verbatim</p>
                            </div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-inner">
                            {transcriptOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                    </button>
                    
                    {transcriptOpen && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="border-t border-[#E2E8F0] bg-slate-50/50 p-6 sm:p-8"
                        >
                            <div className="space-y-6 font-mono text-[13px] leading-relaxed max-h-[600px] overflow-y-auto pr-2">
                                {report.transcript.split('\n').map((line, i) => {
                                    if (!line.trim()) return null;
                                    const isInterviewer = line.startsWith('INTERVIEWER:');
                                    return (
                                        <div key={i} className={`p-5 rounded-[20px] ${isInterviewer ? 'bg-white border border-[#E2E8F0] shadow-sm ml-0 mr-12' : 'bg-blue-600 text-white ml-12 mr-0 shadow-md'}`}>
                                            <span className={`block text-[10px] font-extrabold mb-2 tracking-widest uppercase opacity-80 ${isInterviewer ? 'text-indigo-600' : 'text-blue-200'}`}>
                                                {isInterviewer ? 'Interviewer' : 'You'}
                                            </span>
                                            <span className={isInterviewer ? 'text-[#334155]' : 'text-blue-50'}>
                                                {line.replace(/^(INTERVIEWER|CANDIDATE):\s*/, '')}
                                            </span>
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

