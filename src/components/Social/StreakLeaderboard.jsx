import { motion } from 'framer-motion';
import { getNicknameClass, getUserDisplayName } from '../../utils/user';
import { Flame, Trophy, Award, Zap } from 'lucide-react';
import '../../styles/NicknameStyles.css';

const PODIUM_CONFIG = [
    { rank: 1, color: 'text-white', border: 'border-white/20', size: 'w-24 h-24 md:w-32 md:h-32', aura: 'bg-white/10' },
    { rank: 2, color: 'text-white/60', border: 'border-white/10', size: 'w-20 h-20 md:w-24 md:h-24', aura: 'bg-white/5' },
    { rank: 3, color: 'text-white/40', border: 'border-white/5', size: 'w-20 h-20 md:w-24 md:h-24', aura: 'bg-white/5' },
];

function getStreakMessage(streak) {
    if (streak >= 100) return 'RANGO_ETERNAL';
    if (streak >= 30) return 'ÓRBITA_SÍNCRONA';
    if (streak >= 7) return 'CONSOLIDAD_REAL';
    if (streak >= 3) return 'INICIO_IGNICIÓN';
    return 'SECTOR_BASE';
}

function getProgressWidth(streak) {
    if (streak >= 100) return '100%';
    if (streak >= 30) return `${(streak / 100) * 100}%`;
    if (streak >= 7) return `${(streak / 30) * 100}%`;
    return `${(streak / 7) * 100}%`;
}

export default function StreakLeaderboard({ users, onProfileClick, isMeId }) {
    if (!users || users.length === 0) return null;

    const top3 = users.slice(0, 3);
    const others = users.slice(3, 10);
    const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
        <div className="w-full flex flex-col gap-16 py-8">
            {/* Elegant Podium */}
            <div className="flex justify-center items-end gap-2 md:gap-12 px-4">
                {podium.map((user) => {
                    const rank = user === top3[0] ? 1 : user === top3[1] ? 2 : 3;
                    const config = PODIUM_CONFIG.find(c => c.rank === rank);
                    const isFirst = rank === 1;

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col items-center ${isFirst ? 'z-10 -mt-12' : 'z-0 opacity-80'}`}
                            onClick={() => onProfileClick(user)}
                        >
                            <div className="relative group cursor-pointer mb-6">
                                {isFirst && (
                                    <div className="absolute -inset-10 bg-white/5 blur-3xl rounded-full opacity-40 animate-pulse" />
                                )}
                                <div className={`relative rounded-full p-1 bg-gradient-to-b from-white/20 to-transparent ${config.border} transition-all duration-500 group-hover:scale-105`}>
                                    <div className={`${config.size} rounded-full overflow-hidden border border-white/10 bg-[#0a0a0f]`}>
                                        <img
                                            src={user.avatar_url || '/default_user_blank.png'}
                                            alt={user.username}
                                            className="w-full h-full object-cover grayscale-[0.2] transition-all group-hover:grayscale-0"
                                        />
                                    </div>
                                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-black shadow-2xl ring-4 ring-[#050510]`}>
                                        #{rank}
                                    </div>
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <p className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] max-w-[140px] truncate ${getNicknameClass(user) || (user.id === isMeId ? 'text-white' : 'text-white/60')}`}>
                                    {getUserDisplayName(user)}
                                </p>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl md:text-4xl font-black font-mono tracking-tighter text-white">
                                            {user.streak}
                                        </span>
                                        <span className="text-[10px] font-black text-purple-400 opacity-60 tracking-widest uppercase italic">Día</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 mt-1">
                                        <Flame size={10} className="text-purple-400" />
                                        <span className="text-[8px] font-semibold text-purple-400/80 uppercase tracking-[0.15em] font-mono">ESTADO_ACTIVO</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* List Section */}
            <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full px-6">
                <div className="flex items-center justify-between px-6 mb-2 opacity-20">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] font-mono">Registro_Actividad</span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] font-mono">Sincronización</span>
                </div>
                {others.map((user, i) => {
                    const rank = i + 4;
                    const isMe = user.id === isMeId;

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => onProfileClick(user)}
                            className={`flex items-center gap-5 p-4 rounded-[24px] border transition-all cursor-pointer group
                             ${isMe ? 'bg-white/[0.05] border-white/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}
                        >
                            <span className="w-8 text-[11px] font-mono text-white/10 font-bold text-center">
                                {rank.toString().padStart(2, '0')}
                            </span>

                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/5 shrink-0 bg-[#0a0a0f]">
                                <img src={user.avatar_url || '/default_user_blank.png'} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={`text-[11px] md:text-sm font-bold uppercase tracking-wider truncate transition-colors ${getNicknameClass(user) || (isMe ? 'text-white' : 'text-white/60 group-hover:text-white')}`}>
                                    {getUserDisplayName(user)}
                                </p>
                                <p className="text-[8px] font-semibold text-white/20 uppercase tracking-[0.15em] mt-0.5 font-mono">
                                    {getStreakMessage(user.streak)}
                                </p>
                            </div>

                            <div className="text-right space-y-2">
                                <div className="flex items-baseline justify-end gap-1 leading-none">
                                    <span className="text-xl font-bold font-mono tracking-tighter text-white/90">
                                        {user.streak}
                                    </span>
                                    <span className="text-[8px] font-semibold text-white/10 uppercase tracking-widest">Días</span>
                                </div>
                                <div className="w-24 h-1 bg-white/[0.03] rounded-full overflow-hidden p-[1px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: getProgressWidth(user.streak) }}
                                        className="h-full bg-gradient-to-r from-purple-500/40 to-cyan-500/40 rounded-full"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {users.length > 10 && (
                    <div className="flex justify-center mt-6">
                        <button className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white/60 transition-all py-3 flex items-center gap-2 group">
                            Explorar registro completo
                            <Zap size={10} className="group-hover:text-yellow-400 group-hover:scale-125 transition-all" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
