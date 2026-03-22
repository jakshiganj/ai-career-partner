import { useDashboardData } from '../hooks/useDashboardData';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import { CheckCircle2, Clock, AlertCircle, Play } from 'lucide-react';

export default function PipelineRunsPage() {
    const { runs, loading, setSelectedRunId } = useDashboardData();
    
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
            </div>
        );
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#F1F5F9] bg-white/80 px-8 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0F172A]">Pipeline Runs</h2>
                        <p className="text-sm text-[#64748B]">View and manage all your career analysis sessions.</p>
                    </div>
                </header>

                <div className="p-8">
                    <div className="overflow-hidden rounded-2xl border border-[#F1F5F9] bg-white shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Label</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Date Started</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">ATS Score</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F1F5F9]">
                                {runs.map((run) => (
                                    <tr key={run.id} className="group hover:bg-[#F8FAFC] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Play className="h-3 w-3 fill-current" />
                                                </div>
                                                <span className="font-semibold text-[#0F172A]">{run.label || 'Career Analysis'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[#64748B]">
                                            {formatDate(run.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {run.ats_score ? (
                                                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold bg-[#DCFCE7] text-[#16A34A]">
                                                    {run.ats_score}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-[#94A3B8]">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={run.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => setSelectedRunId(run.id)}
                                                className="text-sm font-bold text-[#3B82F6] hover:text-[#2563EB] hover:underline"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === 'completed';
    const isRunning = status === 'running' || status === 'waiting_for_input';
    const isFailed = status === 'failed';
    
    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            isCompleted ? 'bg-[#DCFCE7] text-[#16A34A]' :
            isRunning ? 'bg-blue-50 text-[#3B82F6]' :
            isFailed ? 'bg-red-50 text-red-600' :
            'bg-gray-50 text-gray-400'
        }`}>
            {isRunning && <Clock className="h-3 w-3 animate-pulse" />}
            {isCompleted && <CheckCircle2 className="h-3 w-3" />}
            {isFailed && <AlertCircle className="h-3 w-3" />}
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </div>
    );
}
