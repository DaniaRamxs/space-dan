import { motion } from 'framer-motion';
import { Zap, Flame, Trophy, Coins, Gamepad2, Timer, MessageSquare, Mic } from 'lucide-react';

export default function LevelGuide({ onClose }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#070710] border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-cyan-500/10 to-violet-500/10">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Zap className="text-cyan-400 fill-current" size={24} />
                            Sistemas de Rango Estelar
                            <Flame className="text-violet-400 fill-current" size={24} />
                        </h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Guía oficial de progresión de Space Dan</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all outline-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-12">

                    {/* Stellar Level Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-cyan-500/20 pb-4">
                            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                                <Zap className="text-cyan-400 fill-current" size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-cyan-400 uppercase tracking-tighter">Nivel Estelar (Azul)</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Tu Poder Global en el Universo</p>
                            </div>
                        </div>

                        <p className="text-sm text-white/60 leading-relaxed italic">
                            El Nivel Estelar representa tu progreso total como explorador. Se calcula sumando toda tu experiencia acumulada en la plataforma.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3 text-cyan-400">
                                    <Trophy size={18} />
                                    <span className="font-black text-xs uppercase">Logros</span>
                                </div>
                                <p className="text-xs text-white/50">Cada medallón desbloqueado te otorga **150 XP**. ¡Explora para hallarlos!</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3 text-cyan-400">
                                    <Gamepad2 size={18} />
                                    <span className="font-black text-xs uppercase">Juegos Únicos</span>
                                </div>
                                <p className="text-xs text-white/50">Probar un nuevo juego te otorga **200 XP** iniciales por cada uno.</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3 text-cyan-400">
                                    <Timer size={18} />
                                    <span className="font-black text-xs uppercase">Enfoque</span>
                                </div>
                                <p className="text-xs text-white/50">Cada minuto en la Cabina Espacial cuenta: **2 XP** por minuto de concentración.</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3 text-cyan-400">
                                    <Coins size={18} />
                                    <span className="font-black text-xs uppercase">Riqueza</span>
                                </div>
                                <p className="text-xs text-white/50">Tus Starlys acumulados también aportan XP: **1 XP** por cada Starly en tu balance.</p>
                            </div>
                        </div>

                        <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-3xl text-center">
                            <p className="text-[10px] text-cyan-400/80 uppercase font-black tracking-widest">
                                Fórmula: floor(0.1 × sqrt(XP Total)) — ¡Incrementa exponencialmente!
                            </p>
                        </div>
                    </section>

                    {/* Activity Level Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-violet-500/20 pb-4">
                            <div className="p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20">
                                <Flame className="text-violet-400 fill-current" size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-violet-400 uppercase tracking-tighter">Nivel de Actividad (Morada)</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Tu Presencia Social en Vivo</p>
                            </div>
                        </div>

                        <p className="text-sm text-white/60 leading-relaxed italic">
                            El Nivel de Actividad mide qué tan presente estás en la comunidad ahora mismo. Se basa puramente en la interacción directa con otros pilotos.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3 text-violet-400">
                                    <MessageSquare size={18} />
                                    <span className="font-black text-xs uppercase">Chat Global</span>
                                </div>
                                <p className="text-xs text-white/50">Enviar un mensaje en cualquier canal te otorga **+5 XP de Actividad**.</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                                <div className="flex items-center gap-3 text-violet-400">
                                    <Mic size={18} />
                                    <span className="font-black text-xs uppercase">Salas de Voz</span>
                                </div>
                                <p className="text-xs text-white/50">Estar conectado en una Sala de Voz genera XP de Actividad masiva por minuto.</p>
                            </div>
                        </div>

                        <div className="bg-violet-500/5 border border-violet-500/20 p-4 rounded-3xl text-center">
                            <p className="text-[10px] text-violet-400/80 uppercase font-black tracking-widest">
                                ¡A mayor nivel, tu llama brillará con más intensidad en la lista de usuarios!
                            </p>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center shrink-0">
                    <button
                        onClick={onClose}
                        className="px-12 py-3 bg-gradient-to-r from-cyan-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:from-cyan-500 hover:to-violet-500 transition-all shadow-lg shadow-cyan-500/20 transform hover:scale-105 active:scale-95"
                    >
                        Entendido, a explorar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
