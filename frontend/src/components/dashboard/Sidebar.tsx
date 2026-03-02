import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Mic, Settings, LogOut, Zap, ChevronRight } from 'lucide-react';
import type { PipelineRunSummary } from '../../api/pipeline';

const SIDEBAR_WIDTH = 280;

function formatRelativeTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
}

function ATSBadge({ score }: { score: number | null }) {
    if (score == null) return null;
    const green = score >= 80;
    const yellow = score >= 50 && score < 80;
    return (
        <span
            className="text-xs font-semibold tabular-nums rounded px-1.5 py-0.5"
            style={{
                fontFamily: "'DM Mono', monospace",
                backgroundColor: green ? '#DCFCE7' : yellow ? '#FEF9C3' : '#FEE2E2',
                color: green ? '#16A34A' : yellow ? '#B45309' : '#DC2626',
            }}
        >
            {score}
        </span>
    );
}

function StatusPill({ status }: { status: string }) {
    const isCompleted = status === 'completed';
    const isPartial = status === 'partial';
    const isRunning = status === 'running';
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            {isRunning && (
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3B82F6] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3B82F6]" />
                </span>
            )}
            {isCompleted && <span className="h-2 w-2 rounded-full bg-[#22C55E]" />}
            {isPartial && <span className="h-2 w-2 rounded-full bg-[#EAB308]" />}
            {isRunning ? 'Running' : isPartial ? 'Partial' : 'Completed'}
        </span>
    );
}

interface SidebarProps {
    runs: PipelineRunSummary[];
    selectedRunId: string | null;
    onSelectRun: (id: string) => void;
    hasMoreRuns?: boolean;
}

export default function Sidebar({
    runs,
    selectedRunId,
    onSelectRun,
    hasMoreRuns,
}: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';
    const isInterview = location.pathname === '/interview';

    const handleSignOut = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
    };

    return (
        <aside
            className="fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[#E2E8F0] bg-[#F1F5F9] transition-all duration-200 lg:flex"
            style={{ width: SIDEBAR_WIDTH }}
        >
            {/* Logo */}
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[#E2E8F0] px-5">
                <Zap className="h-5 w-5 text-[#3B82F6]" aria-hidden />
                <span className="font-bold text-[#0F172A]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    CareerAI
                </span>
            </div>

            {/* Previous runs */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <p className="mt-4 px-4 text-[10px] font-medium uppercase tracking-wider text-[#94A3B8]">
                    Previous runs
                </p>
                <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
                    {runs.length === 0 && (
                        <p className="px-2 py-3 text-xs text-[#94A3B8]">No runs yet</p>
                    )}
                    {runs.slice(0, 8).map((run) => {
                        const isSelected = selectedRunId === run.id;
                        return (
                            <button
                                key={run.id}
                                type="button"
                                onClick={() => onSelectRun(run.id)}
                                className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                                style={{
                                    borderColor: isSelected ? '#3B82F6' : '#E2E8F0',
                                    backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
                                    borderLeftWidth: isSelected ? 3 : 1,
                                    borderLeftColor: isSelected ? '#3B82F6' : undefined,
                                }}
                            >
                                <div className="truncate text-sm font-medium text-[#0F172A]">
                                    {run.label || 'Untitled run'}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-[#64748B]">
                                        {formatRelativeTime(run.created_at)}
                                    </span>
                                    <ATSBadge score={run.ats_score ?? null} />
                                    <StatusPill status={run.status} />
                                </div>
                            </button>
                        );
                    })}
                    {hasMoreRuns && (
                        <button
                            type="button"
                            className="flex w-full items-center gap-1 text-xs font-medium text-[#3B82F6] hover:underline"
                        >
                            View all <ChevronRight className="h-3.5 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Nav links */}
            <nav className="border-t border-[#E2E8F0] p-3">
                <Link
                    to="/dashboard"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/80 ${isDashboard ? 'text-[#3B82F6]' : 'text-[#475569] hover:text-[#0F172A]'}`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", ...(isDashboard && { backgroundColor: 'rgba(59, 130, 246, 0.1)' }) }}
                >
                    <Home className="h-4 w-4 shrink-0" />
                    Dashboard
                </Link>
                <Link
                    to="/interview"
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/80 ${isInterview ? 'text-[#3B82F6]' : 'text-[#475569] hover:text-[#0F172A]'}`}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", ...(isInterview && { backgroundColor: 'rgba(59, 130, 246, 0.1)' }) }}
                >
                    <Mic className="h-4 w-4 shrink-0" />
                    Interview Coach
                </Link>
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#475569] hover:bg-white/80 hover:text-[#0F172A]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    onClick={() => {}}
                >
                    <Settings className="h-4 w-4 shrink-0" />
                    Settings
                </button>
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#475569] hover:bg-white/80 hover:text-[#0F172A]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    onClick={handleSignOut}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign Out
                </button>
            </nav>
        </aside>
    );
}

export { SIDEBAR_WIDTH };
