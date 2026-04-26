import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import InterviewReport from '../components/InterviewReport';
import { ArrowLeft, FileText, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InterviewReportData } from '../components/InterviewReport';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';

export default function InterviewReportPage() {
    const [report, setReport] = useState<InterviewReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const { data } = await client.get('/interview/latest');
                setReport(data.report);
            } catch (err) {
                console.error("Failed to fetch report", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, []);

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
                    {loading ? (
                        <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-[#E0E0E0] bg-white p-12">
                            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#5BC0EB]" />
                            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-40">Synthesizing Results...</p>
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
