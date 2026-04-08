import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { universeAttractionService } from '../../services/universeAttractionService';
import { useAuthContext } from '../../contexts/AuthContext';

export function UniverseAttractionBlock({ userId, isOwn, profileUsername }) {
    const { user } = useAuthContext();
    const [attractions, setAttractions] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!userId) return;
        load();
    }, [userId]);

    async function load() {
        setLoading(true);
        const data = await universeAttractionService.analyzeAttraction(userId);
        setAttractions(data || []);
        setLoading(false);
    }

    if (loading) return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] h-40 animate-pulse p-5" />
    );

    if (attractions.length === 0) return null;

    const headingText = isOwn ? 'El universo que atraes' : `El universo de @${profileUsername} atrae`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-[#080B14] border border-cyan-500/10 p-5 shadow-[0_0_15px_rgba(34,211,238,0.03)] relative overflow-hidden"
        >
            {/* Background Nebulosa */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none opacity-50" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/5 pb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">🌌 {headingText}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    {attractions.map(attr => (
                        <div key={attr.id} className={`flex items-center gap-2 p-2 rounded-xl border border-white/5 ${attr.bgColor} backdrop-blur-sm transition-all`}>
                            <span className="text-xl drop-shadow-lg">{attr.icon}</span>
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${attr.titleColor}`}>
                                {attr.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
