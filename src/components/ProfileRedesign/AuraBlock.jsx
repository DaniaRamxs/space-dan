import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auraService, AURA_TYPES } from '../../services/auraService';
import { useAuthContext } from '../../contexts/AuthContext';

export function AuraBlock({ userId }) {
    const { user, profile: ownProfile } = useAuthContext();
    const [traits, setTraits] = useState([]);
    const [activeAura, setActiveAura] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showStore, setShowStore] = useState(false);

    const isOwn = user?.id === userId;

    useEffect(() => {
        if (!userId) return;
        setLoading(true);

        Promise.all([
            auraService.getAura(userId),
            auraService.getActiveAura(userId)
        ]).then(([traitsData, activeData]) => {
            setTraits(traitsData || []);
            setActiveAura(activeData);
            setLoading(false);
        });
    }, [userId]);

    const handleActivate = async (type) => {
        if (!window.confirm('¿Confirmar activación de aura?')) return;
        try {
            const res = await auraService.activateAura(userId, type);
            if (res.success) {
                setActiveAura({ aura_type: res.aura_type, expires_at: res.expires_at });
                setShowStore(false);
                alert('¡Aura activada con éxito! Revisa tu perfil.');
            }
        } catch (err) {
            alert(err.message || 'Error al activar aura');
        }
    };

    if (loading) return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] h-40 animate-pulse p-5" />
    );

    const auraTheme = activeAura ? AURA_TYPES[activeAura.aura_type.toUpperCase()] : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-[#080b12] border border-white/5 shadow-2xl p-6 min-h-[160px]"
            style={auraTheme ? {
                boxShadow: `0 0 40px ${auraTheme.glow}33`,
                borderColor: `${auraTheme.glow}44`
            } : {}}
        >
            {/* Efectos Visuales de Aura Activa */}
            <AnimatePresence>
                {auraTheme && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.3 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 pointer-events-none"
                            style={{ background: `radial-gradient(circle at center, ${auraTheme.glow}44, transparent 70%)` }}
                        />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                            transition={{ duration: 5, repeat: Infinity }}
                            className="absolute -top-20 -right-20 w-64 h-64 blur-[80px] rounded-full pointer-events-none"
                            style={{ backgroundColor: auraTheme.glow }}
                        />
                    </>
                )}
            </AnimatePresence>

            <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40">
                        {auraTheme ? `⚡ ${auraTheme.label} ACTIVA` : '🌌 Aura de este espacio'}
                    </span>
                    {isOwn && (
                        <button
                            onClick={() => setShowStore(!showStore)}
                            className="text-[9px] font-black uppercase text-cyan-400 hover:text-white transition-colors"
                        >
                            {showStore ? '[ CERRAR ]' : '[ POTENCIAR ]'}
                        </button>
                    )}
                </div>

                {!showStore ? (
                    <div className="flex flex-wrap gap-2.5 pt-1">
                        {traits.map((t) => (
                            <div key={t.id} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border ${t.bgClass} backdrop-blur-md shadow-lg`}>
                                <span className="text-sm">{t.icon}</span>
                                <span className={`text-[11px] font-black uppercase tracking-widest ${t.textColor}`}>
                                    {t.label}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2">
                        {Object.values(AURA_TYPES).map(a => (
                            <button
                                key={a.id}
                                onClick={() => handleActivate(a.id)}
                                className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 transition-all text-left"
                            >
                                <div className="space-y-0.5">
                                    <div className="text-[11px] font-black uppercase text-white group-hover:text-cyan-400">{a.label}</div>
                                    <div className="text-[9px] text-white/40 uppercase font-bold tracking-widest">{a.duration}h Duración</div>
                                </div>
                                <div className="text-[10px] font-black text-amber-400">◈ {a.cost.toLocaleString()}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
