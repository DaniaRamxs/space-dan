import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { auraService } from '../../services/auraService';

export function AuraBlock({ userId }) {
    const [traits, setTraits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        auraService.getAura(userId).then(data => {
            setTraits(data || []);
            setLoading(false);
        });
    }, [userId]);

    if (loading) return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] h-40 animate-pulse p-5" />
    );

    if (traits.length === 0) return null;

    // Get dominant colors from the first 2 traits to build a dynamic gradient
    const colorA = traits[0]?.colorClass || 'from-indigo-500 via-indigo-800';
    const colorB = traits[1]?.colorClass || 'from-purple-500 via-purple-800';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-[#080b12] border border-white/5 shadow-2xl p-6 h-auto min-h-[140px]"
        >
            {/* Dynamic Backgrounds based on Aura */}
            <div className={`absolute -top-10 -left-10 w-48 h-48 rounded-full mix-blend-screen opacity-[0.15] blur-[40px] bg-gradient-to-br ${colorA} to-transparent pointer-events-none transition-colors duration-[3s]`} />
            <div className={`absolute -bottom-10 -right-10 w-48 h-48 rounded-full mix-blend-screen opacity-[0.15] blur-[40px] bg-gradient-to-tl ${colorB} to-transparent pointer-events-none transition-colors duration-[3s]`} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05] pointer-events-none" />

            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40">🌌 Aura de este espacio</span>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                    {traits.map((t) => (
                        <div key={t.id} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${t.bgClass} backdrop-blur-md shadow-lg transition-transform hover:scale-105 cursor-default`}>
                            <span className="text-sm drop-shadow-md">{t.icon}</span>
                            <span className={`text-[11px] font-black uppercase tracking-widest ${t.textColor}`}>
                                {t.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
