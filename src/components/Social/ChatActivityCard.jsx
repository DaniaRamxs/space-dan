import { memo } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUniverse } from '../../contexts/UniverseContext';

const ChatActivityCard = memo(() => {
    const navigate = useNavigate();
    const { onlineUsers } = useUniverse();

    const activeInChat = Object.values(onlineUsers || {}).filter(u =>
        u?.status?.includes('CHAT GLOBAL') || u?.voiceRoom
    ).length;

    if (activeInChat === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-gradient-to-br from-cyan-500/10 via-[#0a0a1a] to-blue-600/10 border border-cyan-500/20 rounded-[2.5rem] relative overflow-hidden group shadow-2xl"
        >
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <MessageSquare size={120} className="text-white rotate-12" />
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/10 blur-[60px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative">
                        <MessageSquare className="text-cyan-400" size={24} />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Frecuencia Activa</span>
                            <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full inline-block animate-pulse">LIVE</span>
                        </div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                            {activeInChat} {activeInChat === 1 ? 'persona está' : 'personas están'} hablando
                        </h3>
                        <p className="text-[11px] text-white/40 mt-2 font-medium">
                            <TrendingUp size={10} className="inline mr-1 text-cyan-400" /> Conversación activa en el canal #general
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/chat')}
                    className="px-8 py-3.5 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    <Zap size={14} fill="currentColor" />
                    Unirse a la Charla
                </button>
            </div>
        </motion.div>
    );
});

ChatActivityCard.displayName = 'ChatActivityCard';

export default ChatActivityCard;
