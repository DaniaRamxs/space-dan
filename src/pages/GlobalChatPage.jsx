
import { motion } from 'framer-motion';
import GlobalChat from '../components/Social/GlobalChat/GlobalChat';
import { Link } from 'react-router-dom';

export default function GlobalChatPage() {
    return (
        <main className="w-full max-w-4xl mx-auto min-h-[100dvh] pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xl">📡</span>
                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                            Canal <span className="text-cyan-400">Global</span>
                        </h1>
                    </div>
                    <p className="text-[10px] md:text-sm text-white/40 uppercase tracking-[0.3em] font-black">
                        Transmisión en tiempo real a través del sistema Space-Dan
                    </p>
                </div>

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
                className="relative"
            >
                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/5 blur-[80px] rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/5 blur-[80px] rounded-full" />

                <div className="relative z-10 bg-[#070710]/80 backdrop-blur-3xl border border-white/[0.06] rounded-[32px] shadow-2xl">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Frecuencia Activa</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/60">v2.5 Global Sync</span>
                        </div>
                    </div>

                    <GlobalChat />
                </div>

                {/* Legend / Tips */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Menciones</span>
                        <p className="text-[9px] text-white/30 leading-relaxed uppercase">Usa @nombre para resaltar a un usuario y notificarle con un pulso estelar.</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Impacto VIP</span>
                        <p className="text-[9px] text-white/30 leading-relaxed uppercase">Activa el modo VIP para que tu mensaje brille con aura dorada en todo el chat.</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-1">Markdown</span>
                        <p className="text-[9px] text-white/30 leading-relaxed uppercase">Usa ::neon:: o ::cyber:: para dar energía a tus palabras de forma personalizada.</p>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
