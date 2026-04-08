import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { missionService } from '../../services/missionService';
import { Star, Trophy, MessageSquare, Timer, Mic, Coins, CheckCircle, Zap } from 'lucide-react';
import { useEconomy } from '../../contexts/EconomyContext';

const ICON_MAP = {
    'Star': Star,
    'Trophy': Trophy,
    'MessageSquare': MessageSquare,
    'Timer': Timer,
    'Mic': Mic,
    'Coins': Coins
};

export default function MissionsPanel({ onClose }) {
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { refreshEconomy } = useEconomy();

    useEffect(() => {
        async function fetchMissions() {
            setLoading(true);
            const data = await missionService.getDailyMissions();
            setMissions(data || []);
            setLoading(false);
        }
        fetchMissions();
    }, []);

    const handleClaim = async (id) => {
        try {
            const res = await missionService.claimReward(id);
            if (res?.success) {
                // Actualizar localmente
                setMissions(prev => prev.map(m =>
                    m.id === id ? { ...m, is_claimed: true } : m
                ));
                // Refrescar balance
                refreshEconomy?.();
            }
        } catch (err) {
            console.error('[MissionsPanel] Error claiming:', err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="bg-[#070710] border border-white/10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-cyan-500/10 to-violet-500/10">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <Star className="text-yellow-400 fill-current" size={24} />
                            Misiones Estelares
                        </h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">Nuevas cada 24 horas</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">Escaneando el firmamento...</p>
                        </div>
                    ) : (
                        missions.map((m, i) => {
                            const Icon = ICON_MAP[m.template?.icon] || Star;
                            const isCompleted = m.is_completed || m.progress >= (m.template?.target_value || 1);

                            return (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`relative p-5 border rounded-3xl transition-all overflow-hidden group ${m.is_claimed
                                            ? 'bg-black/40 border-white/5 opacity-50'
                                            : isCompleted
                                                ? 'bg-cyan-500/5 border-cyan-500/20'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-start gap-5 relative z-10">
                                        <div className={`p-3 rounded-2xl ${isCompleted ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40'}`}>
                                            <Icon size={24} />
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-black text-white text-sm uppercase tracking-tight">{m.template?.title}</h3>
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">
                                                    {m.progress} / {m.template?.target_value}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/40 mb-4">{m.template?.description}</p>

                                            {/* Progress Bar */}
                                            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-4">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (m.progress / (m.template?.target_value || 1)) * 100)}%` }}
                                                    className={`h-full ${isCompleted ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : 'bg-white/20'}`}
                                                />
                                            </div>

                                            {/* Rewards & Button */}
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-1 text-[10px] font-black text-yellow-400 uppercase">
                                                        <Coins size={12} className="fill-current" />
                                                        +{m.template?.reward_starlys} Starlys
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] font-black text-cyan-400 uppercase">
                                                        <Zap size={12} className="fill-current" />
                                                        +{m.template?.reward_xp} XP
                                                    </div>
                                                </div>

                                                {isCompleted && !m.is_claimed && (
                                                    <button
                                                        onClick={() => handleClaim(m.id)}
                                                        className="px-6 py-2 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-400/20"
                                                    >
                                                        Reclamar
                                                    </button>
                                                )}
                                                {m.is_claimed && (
                                                    <div className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-widest">
                                                        <CheckCircle size={14} />
                                                        Reclamado
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center text-[8px] text-white/20 uppercase tracking-[0.4em] shrink-0 font-bold">
                    El universo recompensa a quienes exploran
                </div>
            </motion.div>
        </motion.div>
    );
}
