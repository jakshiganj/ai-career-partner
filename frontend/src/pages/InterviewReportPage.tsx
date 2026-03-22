import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import InterviewReport from '../components/InterviewReport';
import { ArrowLeft } from 'lucide-react';
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
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />

            <main className="flex-1 min-h-screen relative overflow-hidden py-12 sm:py-20" style={{ marginLeft: SIDEBAR_WIDTH, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {/* Ambient background blur blobs */}
                <div className="absolute top-0 right-0 -mr-48 -mt-48 h-[600px] w-[600px] rounded-full bg-blue-200/20 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-48 -mb-48 h-[600px] w-[600px] rounded-full bg-indigo-200/20 blur-[120px] pointer-events-none" />
                
                <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <motion.button 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => navigate('/dashboard')}
                        className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#F1F5F9] bg-white/80 backdrop-blur-sm px-6 py-3 text-sm font-bold text-[#475569] shadow-sm hover:bg-white hover:text-[#0F172A] hover:shadow-lg transition-all group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Overview
                    </motion.button>
                    
                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-3xl border border-[#F1F5F9] bg-white p-8 shadow-sm">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                        </div>
                    ) : report ? (
                        <InterviewReport report={report} />
                    ) : (
                        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-[#F1F5F9] bg-white p-8 text-center shadow-sm">
                            <h3 className="text-xl font-bold text-[#0F172A]">No report available</h3>
                            <p className="mt-2 text-sm font-medium text-[#64748B]">Complete an interview session to generate a report.</p>
                            <button 
                                onClick={() => navigate('/interview')}
                                className="mt-8 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                            >
                                Start Interview Now
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
