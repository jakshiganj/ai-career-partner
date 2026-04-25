import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { SIDEBAR_WIDTH } from '../components/dashboard/Sidebar';
import { CheckCircle2, Clock, AlertCircle, Play, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPipelineRuns, deletePipelineRun, type PipelineRunSummary } from '../api/pipeline';
import ConfirmModal from '../components/ui/ConfirmModal';

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
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="flex justify-center">
                                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#3B82F6]" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : runs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-[#64748B]">
                                            No pipeline runs found.
                                        </td>
                                    </tr>
                                ) : (
                                    runs.map((run) => (
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
                                                <div className="flex items-center gap-4">
                                                    <button 
                                                        onClick={() => navigate(`/dashboard/cv-analysis?runId=${run.id}`)}
                                                        className="text-sm font-bold text-[#3B82F6] hover:text-[#2563EB] hover:underline"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(run.id)}
                                                        disabled={deletingId === run.id}
                                                        className={`p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ${deletingId === run.id ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        
                        {/* Pagination Controls */}
                        {!loading && total > 0 && (
                            <div className="flex items-center justify-between border-t border-[#F1F5F9] bg-[#F8FAFC] px-6 py-4">
                                <div className="text-sm text-[#64748B]">
                                    Showing <span className="font-semibold text-[#0F172A]">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                                    <span className="font-semibold text-[#0F172A]">{Math.min(currentPage * PAGE_SIZE, total)}</span> of{' '}
                                    <span className="font-semibold text-[#0F172A]">{total}</span> runs
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`h-8 w-8 rounded-lg text-sm font-bold transition-colors ${
                                                    currentPage === page
                                                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                                                    : 'text-[#64748B] hover:bg-[#E2E8F0]'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
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
