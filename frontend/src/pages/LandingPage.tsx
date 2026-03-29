import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, FileText, TrendingUp, Sparkles, ArrowRight, ChevronRight } from 'lucide-react';

export default function LandingPage() {
    return (
        <div className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Navbar */}
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 font-bold text-xl tracking-tight"
                    >
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <span>AI Career Partner</span>
                    </motion.div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
                        <span className="text-slate-500">Based in Milano, working globally.</span>
                    </nav>
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                            Log in
                        </Link>
                        <Link to="/signup" className="text-sm font-medium bg-white text-slate-950 px-5 py-2.5 rounded-full hover:bg-slate-200 transition-colors flex items-center gap-2">
                            Get Started
                        </Link>
                    </motion.div>
                </div>
            </header>

            <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto relative z-10">
                {/* Hero Section */}
                <section className="min-h-[70vh] flex flex-col items-center justify-center text-center mt-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-medium text-slate-300">AI capabilities are now live</span>
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]"
                    >
                        Elevate your career <br className="hidden md:block"/> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">
                            with intelligence.
                        </span>
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12"
                    >
                        Turn your portfolio into a conversion tool. Designed for ambitious professionals, it drives results through strategic mock interviews and resume analysis.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center gap-4"
                    >
                        <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 rounded-full font-bold hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                            Start your journey <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button className="w-full sm:w-auto px-8 py-4 rounded-full font-bold border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2 text-slate-300">
                            Watch demo
                        </button>
                    </motion.div>
                </section>

                {/* Features (Bento Grid) */}
                <section className="py-24">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl font-bold tracking-tight mb-4 text-white">Precision tools for growth.</h2>
                            <p className="text-slate-400 text-lg">Partnership, Not Just Projects.</p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Large Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="md:col-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12 hover:bg-white/[0.04] transition-colors"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-8 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                    <Mic className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-white">Mock Interviews</h3>
                                <p className="text-slate-400 text-lg max-w-md leading-relaxed">Inspiring client experiences powered by real-time voice intelligence and adaptive questioning. Train with AI that understands the industry standard.</p>
                            </div>
                            {/* Decorative element */}
                            <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 w-64 h-64 rounded-full border border-white/5 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                                <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center">
                                    <div className="w-32 h-32 rounded-full border border-white/5" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Standard Card 1 */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors"
                        >
                            <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-8 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                    <FileText className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-white">Resume Analysis</h3>
                                <p className="text-slate-400 leading-relaxed">Quick and clear answers to your key questions about ATS optimization and clarity. Get hired faster.</p>
                            </div>
                        </motion.div>

                        {/* Standard Card 2 - spanning full on mobile, 1 col on md, but let's make it span 1 */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="md:col-span-3 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12 hover:bg-white/[0.04] transition-colors flex flex-col md:flex-row items-center justify-between gap-8"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center mb-8 border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                                    <TrendingUp className="w-6 h-6 text-violet-400" />
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-white">Career Growth</h3>
                                <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">Your passport to flexible design revisions and strategic career path modeling. Visualize where you want to go and let our AI map out the exact steps to get there.</p>
                            </div>
                            <div className="flex gap-2 relative z-10">
                                <Link to="/signup" className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                    <ArrowRight className="w-6 h-6" />
                                </Link>
                            </div>
                        </motion.div>

                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-slate-950 relative z-10 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 py-24 text-center relative z-10">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-8 text-white"
                    >
                        We transform careers.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500">Your success is next.</span>
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                    >
                        <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-950 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                            Start for free <ChevronRight className="w-5 h-5" />
                        </Link>
                    </motion.div>
                </div>
                <div className="border-t border-white/5 py-8 text-center text-slate-500 text-sm relative z-10">
                    © {new Date().getFullYear()} AI Career Partner. Designed for ambitious professionals.
                </div>
            </footer>
        </div>
    );
}
