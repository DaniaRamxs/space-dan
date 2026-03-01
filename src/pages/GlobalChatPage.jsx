
import { motion } from 'framer-motion';
import GlobalChat from '../components/Social/GlobalChat/GlobalChatSystem';
import { Link } from 'react-router-dom';

export default function GlobalChatPage() {
    return (
        <main className="w-full max-w-4xl mx-auto h-screen text-white font-sans flex flex-col pt-4 md:pt-8 px-0 md:px-4 overflow-hidden">

            {/* Header Area */}
            <div className="flex justify-end mb-4 px-4 md:px-0 shrink-0">
                <div className="flex items-center gap-4">
                    <Link to="/posts" className="px-5 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                        ← Feed de Noticias
                    </Link>
                </div>
            </div>

            {/* Main Chat Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex-1 flex flex-col min-h-0 mb-4 md:mb-10"
            >
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/5 blur-[80px] rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/5 blur-[80px] rounded-full" />

                <div className="relative z-10 bg-[#070710]/80 backdrop-blur-3xl border border-white/[0.06] rounded-[32px] shadow-2xl flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-white/[0.02] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Frecuencia Activa</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/60">v2.5 Global Sync</span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <GlobalChat />
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
