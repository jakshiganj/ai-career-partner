import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    Home, 
    Mic, 
    Settings, 
    LogOut, 
    Zap, 
    TableProperties, 
    FileText, 
    Briefcase, 
    GraduationCap,
    ClipboardCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

const SIDEBAR_WIDTH = 280;

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const isActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

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
            className="fixed left-0 top-0 z-30 flex h-full flex-col border-r border-[#E2E8F0] bg-white transition-all duration-200 lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
            style={{ width: SIDEBAR_WIDTH }}
        >
            {/* Logo */}
            <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[#F1F5F9] px-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] shadow-lg shadow-blue-500/20">
                    <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                    <span className="block text-lg font-extrabold text-[#0F172A] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        CareerAI
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Professional</span>
                </div>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <p className="mb-4 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">
                    Main Menu
                </p>
                <nav className="space-y-1.5">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        const exactActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : active;
                        
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                    exactActive 
                                    ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/10' 
                                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                                }`}
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                            >
                                <item.icon className={`h-5 w-5 shrink-0 transition-colors ${exactActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-[#3B82F6]'}`} />
                                {item.label}
                                {exactActive && (
                                    <motion.div 
                                        layoutId="active-pill"
                                        className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <p className="mt-8 mb-4 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#94A3B8]">
                    System
                </p>
                <div className="space-y-1.5">
                    <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#64748B] transition-all duration-200 hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        onClick={() => {}}
                    >
                        <Settings className="h-5 w-5 shrink-0 text-[#94A3B8]" />
                        Settings
                    </button>
                </div>
            </div>

            {/* Footer / User */}
            <div className="border-t border-[#F1F5F9] p-4">
                <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#EF4444] transition-all duration-200 hover:bg-red-50"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    onClick={handleSignOut}
                >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

export { SIDEBAR_WIDTH };
