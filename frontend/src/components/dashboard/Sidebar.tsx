import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
    Home, 
    Mic, 
    Settings, 
    LogOut, 
    Sparkles, 
    TableProperties, 
    FileText, 
    Briefcase, 
    GraduationCap,
    ClipboardCheck,
    ChevronRight,
    CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';

const SIDEBAR_WIDTH = 280;

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const currentRunId = searchParams.get('runId');
    const [tier, setTier] = useState<string>('free');

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) return;
            try {
                const res = await fetch('http://localhost:8000/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTier(data.tier || 'free');
                }
            } catch {
                // Ignore errors during user fetch
            }
        };
        fetchUser();
    }, []);
    
    const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

    const buildLink = (path: string) => {
        if (currentRunId && path.startsWith('/dashboard') && path !== '/dashboard/pipeline-runs') {
            return `${path}?runId=${currentRunId}`;
        }
        return path;
    };

    const handleSignOut = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        navigate('/login');
    };

    const navItems = [
        { label: 'Overview', icon: Home, path: '/dashboard' },
        { label: 'Pipeline Runs', icon: TableProperties, path: '/dashboard/pipeline-runs' },
        { label: 'CV Analysis', icon: FileText, path: '/dashboard/cv-analysis' },
        { label: 'Job Search', icon: Briefcase, path: '/dashboard/job-search' },
        { label: 'Skills & Learning', icon: GraduationCap, path: '/dashboard/skills' },
        { label: 'Interview Coach', icon: Mic, path: '/interview' },
        { label: 'Interview Report', icon: ClipboardCheck, path: '/interview/report' },
    ];

    return (
        <aside
            className="fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[#E0E0E0] bg-white transition-all duration-300"
            style={{ width: SIDEBAR_WIDTH }}
        >
            {/* Logo area matching Landing Page */}
            <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[#E0E0E0] px-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5BC0EB] text-white">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <span className="block text-lg font-bold tracking-tight text-[#0D0D0D]">
                        CareerAI
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4A4A4A]">
                        {tier === 'premium' ? 'PREMIUM MEMBER' : tier === 'pro' ? 'PRO MEMBER' : 'FREE TIER'}
                    </span>
                </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-4 py-8">
                <span className="mb-6 block px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">
                    [ MENU ]
                </span>
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        const exactActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : active;
                        
                        return (
                            <Link
                                key={item.path}
                                to={buildLink(item.path)}
                                className={`group relative flex items-center gap-3 rounded-lg px-4 py-3.5 text-[13px] font-semibold transition-all duration-200 ${
                                    exactActive 
                                    ? 'bg-[#F9F9F9] text-[#0D0D0D]' 
                                    : 'text-[#4A4A4A] hover:bg-[#F9F9F9] hover:text-[#0D0D0D]'
                                }`}
                            >
                                <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${exactActive ? 'text-[#5BC0EB]' : 'text-[#A0A0A0] group-hover:text-[#5BC0EB]'}`} />
                                {item.label}
                                
                                {exactActive && (
                                    <motion.div 
                                        layoutId="sidebar-active-indicator"
                                        className="absolute left-0 h-4 w-1 rounded-r-full bg-[#5BC0EB]"
                                    />
                                )}

                                {exactActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-10">
                    <span className="mb-6 block px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A4A4A] opacity-60">
                        [ PREFERENCES ]
                    </span>
                    <div className="space-y-1">
                        <Link
                            to="/dashboard/billing"
                            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left text-[13px] font-semibold transition-all duration-200 ${
                                isActive('/dashboard/billing') 
                                ? 'bg-[#F9F9F9] text-[#0D0D0D]' 
                                : 'text-[#4A4A4A] hover:bg-[#F9F9F9] hover:text-[#0D0D0D]'
                            }`}
                        >
                            <CreditCard className={`h-4.5 w-4.5 shrink-0 ${isActive('/dashboard/billing') ? 'text-[#5BC0EB]' : 'text-[#A0A0A0]'}`} />
                            Billing & Plans
                        </Link>
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left text-[13px] font-semibold text-[#4A4A4A] transition-all duration-200 hover:bg-[#F9F9F9] hover:text-[#0D0D0D]"
                            onClick={() => {}}
                        >
                            <Settings className="h-4.5 w-4.5 shrink-0 text-[#A0A0A0]" />
                            Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer / User */}
            <div className="border-t border-[#E0E0E0] p-6">
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-[#E0E0E0] bg-white px-4 py-3.5 text-left text-[13px] font-bold text-[#0D0D0D] transition-all duration-200 hover:bg-[#0D0D0D] hover:text-white hover:border-[#0D0D0D]"
                    onClick={handleSignOut}
                >
                    <LogOut className="h-4.5 w-4.5 shrink-0" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

export { SIDEBAR_WIDTH };
