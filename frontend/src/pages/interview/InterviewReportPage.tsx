import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import InterviewReport from '../../components/interview/InterviewReport';
import { ArrowLeft, FileText, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InterviewReportData } from '../../components/interview/InterviewReport';
import Sidebar, { SIDEBAR_WIDTH } from '../../components/dashboard/Sidebar';

export default function InterviewReportPage() {
    const [report, setReport] = useState<InterviewReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        let pollTimer: ReturnType<typeof setTimeout>;

        const fetchReport = async () => {
            try {
                const { data } = await client.get('/interview/latest');
                if (data.report) {
                    if (isMounted) {
                        setReport(data.report);
                        setLoading(false);
                        setRetrying(false);
                    }
                } else if (retryCount < 5) {
                    // Report not found, but we might be in a processing window
                    if (isMounted) {
                        setRetrying(true);
                        setRetryCount(prev => prev + 1);
                        pollTimer = setTimeout(fetchReport, 3000);
                    }
                } else {
                    if (isMounted) {
                        setLoading(false);
                        setRetrying(false);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch report", err);
                if (isMounted) {
                    setLoading(false);
                    setRetrying(false);
                }
            }
        };

        fetchReport();

        return () => {
            isMounted = false;
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [retryCount]);

    return (
        <div className="flex min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />

            <main className="flex-1 flex flex-col bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                {/* Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div className="flex items-center gap-8">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E0E0E0] text-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ ANALYTICS ]</span>
                            <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Evaluation Dossier</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#4A4A4A] hover:bg-[#F9F9F9] transition-all">
                            <FileText className="h-3.5 w-3.5" /> Export PDF
                        </button>
                        <button className="flex items-center gap-2 rounded-lg bg-[#0D0D0D] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all">
                            <Share2 className="h-3.5 w-3.5" /> Secure Share
                        </button>
                    </div>
                </header>

                <div className="p-12 max-w-6xl mx-auto w-full">
                    {loading || retrying ? (
                        <div className="flex h-[60vh] flex-col items-center justify-center rounded-xl border border-[#E0E0E0] bg-white p-12 relative overflow-hidden">
                            {/* Animated Background Progress Bar */}
                            {retrying && (
                                <motion.div 
                                    className="absolute bottom-0 left-0 h-1 bg-[#5BC0EB]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(retryCount / 5) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            )}
                            
                            <div className="relative">
                                <div className="h-16 w-16 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#5BC0EB]" />
                                <motion.div 
                                    className="absolute inset-0 flex items-center justify-center"
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <FileText className="h-6 w-6 text-[#5BC0EB]" />
                                </motion.div>
                            </div>

                            <div className="mt-10 text-center">
                                <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-[#0D0D0D]">
                                    {retrying ? "Synthesizing Evaluation" : "Retrieving Dossier"}
                                </h3>
                                <p className="mt-4 max-w-md text-[11px] font-medium leading-relaxed text-[#4A4A4A] opacity-60 uppercase tracking-widest">
                                    {retrying 
                                        ? "Our AI is currently analyzing your behavioral patterns and linguistic clarity to generate a comprehensive scoring matrix..."
                                        : "Connecting to secure evaluation servers..."}
                                </p>
                                
                                {retrying && (
                                    <div className="mt-8 flex items-center justify-center gap-3">
                                        {[...Array(5)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className={`h-1 w-8 rounded-full ${i < retryCount ? 'bg-[#5BC0EB]' : 'bg-[#E0E0E0]'}`}
                                                animate={i === retryCount ? { opacity: [0.3, 1, 0.3] } : {}}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : report ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <InterviewReport report={report} />
                        </motion.div>
                    ) : (
                        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-[#E0E0E0] bg-[#F9F9F9] p-12 text-center">
                            <div className="h-16 w-16 border border-dashed border-[#E0E0E0] rounded-full flex items-center justify-center mb-6">
                                <FileText className="h-6 w-6 text-[#E0E0E0]" />
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">No Analysis Found</h3>
                            <p className="mt-3 text-[11px] font-medium text-[#4A4A4A] opacity-60 uppercase tracking-widest">Execute a simulation to generate an evaluation dossier.</p>
                            <button 
                                onClick={() => navigate('/interview')}
                                className="mt-10 rounded-lg bg-[#0D0D0D] px-10 py-4 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#5BC0EB] transition-all"
                            >
                                START SIMULATION
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
