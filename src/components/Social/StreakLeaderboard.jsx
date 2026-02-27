import { motion } from 'framer-motion';
import { getNicknameClass, getUserDisplayName } from '../../utils/user';
import '../../styles/NicknameStyles.css';

const MEDALS_CONFIG = [
    { id: 1, color: 'from-amber-300 via-yellow-500 to-amber-600', shadow: 'shadow-yellow-500/40', size: 'w-24 h-24 md:w-32 md:h-32', aura: true },
    { id: 2, color: 'from-slate-300 via-slate-400 to-slate-500', shadow: 'shadow-slate-400/30', size: 'w-20 h-20 md:w-24 md:h-24', aura: false },
    { id: 3, color: 'from-orange-400 via-orange-600 to-orange-800', shadow: 'shadow-orange-600/30', size: 'w-20 h-20 md:w-24 md:h-24', aura: false },
];

function getStreakMessage(streak) {
    if (streak >= 100) return 'Presencia consolidada';
    if (streak >= 30) return 'Constelación activa';
    if (streak >= 7) return 'Órbita estable';
    if (streak >= 3) return 'Constancia inicial';
    return 'Iniciando ignición';
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
    const others = users.slice(3, 10); // Solo mostramos los 10 primeros inicialmente por racha

    // Reordenar para podio: 2, 1, 3
    const podium = [top3[1], top3[0], top3[2]].filter(Boolean);

    return (
        <div className="w-full flex flex-col gap-12 py-8">
            {/* Podio */}
            <div className="flex justify-center items-end gap-2 md:gap-8 px-2">
                {podium.map((user, idx) => {
                    const originalRank = user === top3[0] ? 1 : user === top3[1] ? 2 : 3;
                    const config = MEDALS_CONFIG.find(c => c.id === originalRank);
                    const isWinner = originalRank === 1;

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: originalRank * 0.1, duration: 0.6 }}
                            className={`flex flex-col items-center ${isWinner ? 'z-10 -mt-8' : 'z-0'}`}
                            onClick={() => onProfileClick(user)}
                        >
                            {/* Avatar con Aura para el #1 */}
                            <div className="relative group cursor-pointer">
                                {isWinner && (
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: 6, repeat: Infinity }}
                                        className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-blue-500/20 blur-2xl rounded-full opacity-70 group-hover:opacity-100 transition-opacity"
                                    />
                                )}
                                <div className={`relative rounded-full p-1 bg-gradient-to-b ${config.color} ${config.shadow} transition-transform group-hover:scale-105`}>
                                    <div className={`${config.size} rounded-full overflow-hidden border-2 border-black/50 bg-black`}>
                                        <img
                                            src={user.avatar_url || '/default_user_blank.png'}
                                            alt={user.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    {/* Medalla Animada */}
                                    <motion.div
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-lg"
                                    >
                                        {originalRank === 1 ? '🥇' : originalRank === 2 ? '🥈' : '🥉'}
                                    </motion.div>
                                </div>
                            </div>

                            {/* Info Podio */}
                            <div className="mt-4 text-center">
                                <p className="text-xs font-black uppercase tracking-widest overflow-hidden">
                                    <span className={`${getNicknameClass(user) || (user.id === isMeId ? 'text-cyan-400' : 'text-white')} inline-block max-w-[120px] truncate align-bottom`}>
                                        {getUserDisplayName(user)}
                                    </span>
                                </p>
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="text-xl md:text-2xl font-black text-white leading-none">
                                        {user.streak}
                                        <span className="text-[10px] text-cyan-400 ml-1">DIAS</span>
                                    </span>
                                    <p className="text-[8px] font-bold text-white/40 uppercase tracking-tighter">
                                        Max: {user.best_streak}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Lista Minimalista Moderna */}
            <div className="flex flex-col gap-2 max-w-xl mx-auto w-full px-4">
                {others.map((user, i) => {
                    const rank = i + 4;
                    const isMe = user.id === isMeId;

                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => onProfileClick(user)}
                            className={`flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer group
                         ${isMe ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'}`}
                        >
                            <span className="w-6 text-[10px] font-mono text-white/20 font-black text-center">
                                #{rank}
                            </span>

                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                <img src={user.avatar_url || '/default_user_blank.png'} className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black uppercase tracking-wider truncate balance-text">
                                    <span className={getNicknameClass(user) || (isMe ? 'text-cyan-400' : 'text-white')}>
                                        {getUserDisplayName(user)}
                                    </span>
                                </p>
                                <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mt-0.5">
                                    {getStreakMessage(user.streak)}
                                </p>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                                <span className="text-base font-black text-white leading-none">
                                    {user.streak}
                                    <span className="text-[8px] text-cyan-500/50 ml-1 font-mono">STREAK</span>
                                </span>
                                {/* Barra de Progreso */}
                                <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: getProgressWidth(user.streak) }}
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                    />
                                </div>
                                <span className="text-[7px] text-white/10 font-black uppercase">Mejor: {user.best_streak}</span>
                            </div>
                        </motion.div>
                    );
                })}

                {/* Flecha para ver más (placeholder ya que el prompt pide ver 10) */}
                {users.length > 10 && (
                    <div className="flex justify-center mt-4">
                        <button className="text-white/20 hover:text-white/50 transition-colors py-2 flex flex-col items-center gap-1 group">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em]">Explorar más</span>
                            <span className="text-xl group-hover:translate-y-1 transition-transform">↓</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
