import { motion } from 'framer-motion';
import { Users, Zap, Trophy, BarChart3, Star, Clock } from 'lucide-react';
import { memo } from 'react';

const ChatSidebar = memo(({ onlineUsers = {}, recentEvents = [], channelStats = {} }) => {
    const activeUserList = Object.values(onlineUsers).slice(0, 15);

    return (
        <aside className="hidden lg:flex w-[320px] flex-col gap-6 p-6 border-l border-white/5 bg-[#050510]/30 backdrop-blur-xl overflow-y-auto no-scrollbar shrink-0">
            {/* Active Users Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Users size={14} />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Tripulantes Online</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-black">
                        {Object.keys(onlineUsers).length}
                    </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                    {activeUserList.map((u, i) => (
                        <div key={i} className="relative group/user cursor-pointer">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-white/5 group-hover:border-cyan-500/50 transition-all">
                                <img
                                    src={u.avatar_url || '/default-avatar.png'}
                                    alt={u.username}
                                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#050510] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />

                            {/* Simple tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-[9px] font-black rounded opacity-0 group-hover/user:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                                @{u.username}
                            </div>
                        </div>
                    ))}
                    {Object.keys(onlineUsers).length > 15 && (
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                            +{Object.keys(onlineUsers).length - 15}
                        </div>
                    )}
                </div>
            </section>

            {/* Recent Discoveries / Events */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-400">
                    <Star size={14} />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Hallazgos Recientes</h3>
                </div>

                <div className="space-y-3">
                    {recentEvents && recentEvents.length > 0 ? (
                        recentEvents.map((ev, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm
                                        ${ev.rarity === 'legendary' ? 'bg-amber-500/20 text-amber-500' : 'bg-cyan-500/20 text-cyan-500'}`}>
                                        {ev.type === 'character_unlock' ? '👤' : '📦'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-white/80 truncate">{ev.title || 'Evento Cósmico'}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] text-white/30 uppercase font-bold tracking-tighter">Hace poco</span>
                                            <span className={`text-[7px] px-1 rounded uppercase font-black ${ev.rarity === 'legendary' ? 'bg-amber-500/10 text-amber-500' : 'text-white/20 border border-white/5'}`}>
                                                {ev.rarity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-8 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-2xl opacity-20">
                            <Clock size={20} className="mx-auto mb-2" />
                            <p className="text-[8px] font-black uppercase tracking-widest">Escaneando el vacío...</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Channel Statistics */}
            <section className="mt-auto space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40">
                    <BarChart3 size={14} />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Métricas del Canal</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[16px] font-black text-white">{channelStats?.messageCount || '1.2k'}</p>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em]">Mensajes / 24h</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[16px] font-black text-cyan-400">{channelStats?.activityLevel || '8.5'}</p>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.1em]">Nivel de Energía</p>
                    </div>
                </div>

                <button className="w-full py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-2">
                    <Zap size={10} /> Canal Sincronizado
                </button>
            </section>
        </aside>
    );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
