import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { SIDEBAR_WIDTH } from '../../components/dashboard/Sidebar';
import { CheckCircle2, Clock, AlertCircle, Play, Trash2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getPipelineRuns, deletePipelineRun, type PipelineRunSummary } from '../../api/pipeline';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PAGE_SIZE = 10;

export default function PipelineRunsPage() {
    const navigate = useNavigate();
    const [runs, setRuns] = useState<PipelineRunSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [runToDelete, setRunToDelete] = useState<string | null>(null);

    const fetchPage = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const skip = (page - 1) * PAGE_SIZE;
            const data = await getPipelineRuns(skip, PAGE_SIZE);
            setRuns(data.runs);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch pipeline runs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPage(currentPage);
    }, [currentPage, fetchPage]);

    const openDeleteModal = (id: string) => {
        setRunToDelete(id);
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!runToDelete) return;
        
        setDeletingId(runToDelete);
        try {
            await deletePipelineRun(runToDelete);
            setIsModalOpen(false);
            setRunToDelete(null);
            
            // If we're on a page that becomes empty after deletion, go to previous page
            const newTotal = total - 1;
            const maxPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
            if (currentPage > maxPage) {
                setCurrentPage(maxPage);
            } else {
                await fetchPage(currentPage);
            }
        } catch (error) {
            console.error('Failed to delete run:', error);
            alert('Failed to delete pipeline run. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

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
        <div className="min-h-screen bg-[#F9F9F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />

            <main className="min-h-screen flex-1 bg-white" style={{ marginLeft: SIDEBAR_WIDTH }}>
                {/* Institutional Header */}
                <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-[#E0E0E0] bg-white/90 px-12 backdrop-blur-md">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60 block mb-0.5">[ REPOSITORY ]</span>
                        <h2 className="text-xl font-bold tracking-tight text-[#0D0D0D]">Historical Runs</h2>
                    </div>
                </header>

                <div className="p-12">
                    <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#F9F9F9] border-b border-[#E0E0E0]">
                                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] opacity-60">Session Label</th>
                                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] opacity-60">Timestamp</th>
                                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] opacity-60">ATS Index</th>
                                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] opacity-60">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A] opacity-60">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E0E0E0]">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <div className="flex justify-center">
                                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E0E0E0] border-t-[#5BC0EB]" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : runs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-sm font-medium text-[#4A4A4A] opacity-60">
                                            No sessions found in the repository.
                                        </td>
                                    </tr>
                                ) : (
                                    runs.map((run) => (
                                        <tr key={run.id} className="group hover:bg-[#F9F9F9] transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-[#E0E0E0] group-hover:bg-[#0D0D0D] group-hover:text-white group-hover:border-[#0D0D0D] transition-all">
                                                        <Play className="h-3 w-3 fill-current" />
                                                    </div>
                                                    <span className="text-sm font-bold tracking-tight text-[#0D0D0D]">{run.label || 'Career Analysis'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[13px] font-medium text-[#4A4A4A]">
                                                {formatDate(run.created_at)}
                                            </td>
                                            <td className="px-8 py-6">
                                                {run.ats_score ? (
                                                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#E0E0E0] px-3 py-1 text-[13px] font-bold tabular-nums text-[#0D0D0D]">
                                                        {run.ats_score}%
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-[#A0A0A0]">--</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <StatusBadge status={run.status} />
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-6">
                                                    <button 
                                                        onClick={() => navigate(`/dashboard?runId=${run.id}`)}
                                                        className="text-[11px] font-bold uppercase tracking-widest text-[#5BC0EB] hover:text-[#0D0D0D] flex items-center gap-2 transition-colors"
                                                    >
                                                        Details
                                                        <ArrowRight className="h-3 w-3" />
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(run.id)}
                                                        disabled={deletingId === run.id}
                                                        className={`p-2 text-[#A0A0A0] hover:text-[#0D0D0D] transition-colors ${deletingId === run.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        title="Delete run"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        
                        {/* Institutional Pagination */}
                        {!loading && total > 0 && (
                            <div className="flex items-center justify-between border-t border-[#E0E0E0] bg-[#F9F9F9] px-8 py-5">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-[#4A4A4A] opacity-60">
                                    Displaying {Math.min(currentPage * PAGE_SIZE, total)} of {total} Sessions
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#E0E0E0] bg-white text-[#4A4A4A] transition-all hover:bg-[#0D0D0D] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`h-9 w-9 rounded-lg text-[11px] font-bold transition-all ${
                                                    currentPage === page
                                                    ? 'bg-[#0D0D0D] text-white'
                                                    : 'bg-white border border-[#E0E0E0] text-[#4A4A4A] hover:border-[#0D0D0D]'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#E0E0E0] bg-white text-[#4A4A4A] transition-all hover:bg-[#0D0D0D] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Pipeline Run"
                    description="Are you sure you want to delete this pipeline run? This action will permanently remove all analysis data, skill roadmaps, and interview prep associated with this run."
                    confirmText="Delete Run"
                    isLoading={!!deletingId}
                    variant="danger"
                />
            </main>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isCompleted = status === 'completed';
    const isRunning = status === 'running' || status === 'waiting_for_input';
    const isFailed = status === 'failed';
    
    return (
        <div className={`inline-flex items-center gap-1.5 rounded-lg border border-[#E0E0E0] px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
            isCompleted ? 'bg-white text-[#16A34A]' :
            isRunning ? 'bg-white text-[#5BC0EB]' :
            isFailed ? 'bg-white text-red-600' :
            'bg-white text-[#A0A0A0]'
        }`}>
            {isRunning && <Clock className="h-3 w-3 animate-pulse" />}
            {isCompleted && <CheckCircle2 className="h-3 w-3" />}
            {isFailed && <AlertCircle className="h-3 w-3" />}
            {status.replace('_', ' ')}
        </div>
    );
}
