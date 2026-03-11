import { useState, useEffect, useMemo } from 'react';
import { useSeason } from '../hooks/useSeason';
import { motion } from 'framer-motion';
import { Timer, Trophy, TrendingUp, Sparkles, Orbit } from 'lucide-react';

function getRemainingTime(endAt) {
    const endTime = new Date(endAt).getTime();
    const now = new Date().getTime();
    const d = endTime - now;

    if (d <= 0) return '00:00:00';
    const days = Math.floor(d / (1000 * 60 * 60 * 24));
    const hrs = Math.floor((d / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((d / 1000 / 60) % 60);
    const secs = Math.floor((d / 1000) % 60);

    return `${days}d ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const TIERS = [
    { label: 'Bronce I', min: 0, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { label: 'Plata II', min: 500, color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20' },
    { label: 'Oro III', min: 2000, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
    { label: 'Platino IV', min: 5000, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
    { label: 'Diamante V', min: 12000, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
    { label: 'Maestro', min: 25000, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' },
    { label: 'Élite', min: 50000, color: 'text-white', bg: 'bg-white/10', border: 'border-white/20' },
];

export default function SeasonWidget() {
    const { season, loading } = useSeason();
    const [timeLeft, setTimeLeft] = useState('...');

    useEffect(() => {
        if (!season?.end_at) return;
        const interval = setInterval(() => {
            setTimeLeft(getRemainingTime(season.end_at));
        }, 1000);
        return () => clearInterval(interval);
    }, [season?.end_at]);

    if (loading || !season) return null;

    const currentTier = [...TIERS].reverse().find(t => (season?.my_balance || 0) >= t.min) || TIERS[0];
    const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
    const progress = nextTier
        ? Math.min(100, Math.max(0, ((season.my_balance - currentTier.min) / (nextTier.min - currentTier.min)) * 100))
        : 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 md:p-8 rounded-[32px] bg-[#0c0c16] border border-white/5 relative overflow-hidden group/season"
        >
            {/* Subtle Aurora background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent_70%)]" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Info Section */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-purple-400 uppercase">
                            <Orbit size={12} />
                            <span>Temporada {season.number}</span>
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">
                            CRÓNICA <br /> ESTELAR
                        </h2>
                    </div>

                    <div className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
                        <Timer size={14} className="text-white/40" />
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Finaliza en</span>
                            <span className="text-xs font-mono font-bold text-white/60">{timeLeft}</span>
                        </div>
                    </div>
                </div>

                {/* Progress & Tier Section */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Rango de Temporada</span>
                            <div className={`text-2xl font-black italic tracking-tight uppercase ${currentTier.color}`}>
                                {currentTier.label}
                            </div>
                        </div>
                        <div className="text-right space-y-1">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Posición</span>
                            <div className="text-2xl font-black font-mono tracking-tighter text-white">
                                #{season.my_position}
                            </div>
                        </div>
                    </div>

                    {/* Clean Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] items-center">
                            <span className="font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={10} />
                                Próximo: {nextTier?.label || 'Máximo'}
                            </span>
                            <span className="font-mono text-purple-400">{Math.floor(progress)}%</span>
                        </div>
                        <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden p-[2px]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                            />
                        </div>
                        <div className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em] text-center">
                            {season.my_balance.toLocaleString()} / {nextTier?.min.toLocaleString() || '∞'} SECTOR_COINS
                        </div>
                    </div>
                </div>

                {/* Rewards & Boosts */}
                <div className="lg:col-span-3 lg:border-l lg:border-white/5 lg:pl-8 space-y-6">
                    <div className="p-4 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-widest">
                            <Sparkles size={12} className="text-yellow-400/40" />
                            <span>Recompensa Estimada</span>
                        </div>
                        <div className="text-2xl font-black font-mono text-white tracking-tighter">
                            ◈ {Math.floor(season.my_balance * 0.1).toLocaleString()}
                        </div>
                        {(season.active_boosts?.night || season.active_boosts?.weekend || season.is_final_phase) && (
                            <div className="flex gap-2 pt-2 border-t border-white/5">
                                {season.active_boosts?.night && <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400" title="Night Boost"><Timer size={12} /></span>}
                                {season.active_boosts?.weekend && <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400" title="Weekend Boost group-hover"><Sparkles size={12} /></span>}
                                {season.is_final_phase && <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse ml-auto" title="Final Phase Active" />}
                            </div>
                        )}
                    </div>

                    {season.gap_to_next > 0 && (
                        <div className="px-4 py-2 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[9px] font-bold text-rose-500/60 uppercase tracking-widest text-center">
                            A ◈ {season.gap_to_next.toLocaleString()} del sgte puesto
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
