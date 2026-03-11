import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signalsService } from '../../services/signalsService';
import { useAuthContext } from '../../contexts/AuthContext';

export function MysterySignals({ userId, isOwn }) {
    const { user } = useAuthContext();
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOwn || !userId) return;
        load();
    }, [userId, isOwn]);

    async function load() {
        setLoading(true);
        const data = await signalsService.getMySignals(userId);
        setSignals(data || []);
        setLoading(false);
    }

    const handleUnlockClue = async (signalId, idx, clues) => {
        if (clues && clues.length > idx) return; // Ya desbloqueada

        // Aquí podríamos validar si el usuario cumplió la condición
        // Por ahora lo hacemos como una acción interactiva directa que simula la validación
        try {
            let clueText = '';
            if (idx === 0) clueText = 'Este explorador tiene una antigüedad mayor a 1 semana.';
            if (idx === 1) clueText = 'Ha dejado más de 5 ecos en la plataforma.';
            if (idx === 2) clueText = 'Suele estar activo durante el Lado Oscuro.';

            const updatedSignal = await signalsService.unlockClue(signalId, idx, clueText);
            setSignals(prev => prev.map(s => s.id === signalId ? { ...s, unlocked_clues: updatedSignal.unlocked_clues, signal_status: updatedSignal.signal_status } : s));
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOwn) return null;
    if (loading) return null;
    if (signals.length === 0) return null;

    return (
        <div className="space-y-4">
            {signals.map(s => (
                <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-2xl bg-[#080814] border border-fuchsia-500/20 p-5 shadow-[0_0_20px_rgba(217,70,239,0.05)]"
                >
                    {/* Background noise/particles simulation */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-fuchsia-400 via-transparent to-transparent pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3 border-b border-fuchsia-500/10 pb-3">
                            <span className="text-2xl animate-pulse text-fuchsia-400">📡</span>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-400/80">Señal detectada en tu universo</p>
                                <h3 className="text-sm font-bold text-white mt-0.5">Alguien pensó en ti hoy.</h3>
                            </div>
                        </div>

                        <div className="bg-fuchsia-500/5 rounded-xl p-3 border border-fuchsia-500/10 backdrop-blur-sm">
                            <p className="text-xs text-white/60 italic leading-relaxed">
                                Un explorador misterioso ha visitado tu espacio repetidamente en las últimas horas.
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Exploraciones detectadas</span>
                                <span className="text-xs font-black text-fuchsia-400">{s.visit_count} visitas hoy</span>
                            </div>
                        </div>

                        {/* Pistas */}
                        <div className="space-y-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-1">Señales fragmentadas</p>

                            {[0, 1, 2].map(idx => {
                                const hasClue = s.unlocked_clues && s.unlocked_clues.length > idx;
                                const isNext = s.unlocked_clues ? s.unlocked_clues.length === idx : idx === 0;

                                return (
                                    <button
                                        key={idx}
                                        disabled={hasClue || !isNext}
                                        onClick={() => handleUnlockClue(s.id, idx, s.unlocked_clues)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${hasClue
                                            ? 'bg-fuchsia-500/10 border-fuchsia-500/30'
                                            : isNext
                                                ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-fuchsia-500/40 cursor-pointer'
                                                : 'bg-white/[0.01] border-transparent opacity-40 cursor-not-allowed'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${hasClue ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-white/5 text-white/30'}`}>
                                            <span className="text-[10px]">{hasClue ? '👁️' : '🔒'}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center">
                                            {hasClue ? (
                                                <p className="text-[10px] font-bold text-white/80 leading-snug">{s.unlocked_clues[idx]}</p>
                                            ) : (
                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                                    {isNext ? 'Descifrar pista (Explorar)' : 'Señal encriptada'}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Final Reveal */}
                        {s.signal_status === 'fully_decrypted' && s.visitor && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 pt-4 border-t border-fuchsia-500/20"
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400 mb-3 text-center">¡Identidad Revelada!</p>
                                <div className="flex flex-col items-center gap-2">
                                    <img src={s.visitor.avatar_url || '/default_user_blank.png'} className="w-12 h-12 rounded-full border-2 border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)] object-cover" alt={s.visitor.username} />
                                    <p className="text-white font-black text-sm">@{s.visitor.username}</p>
                                    <p className="text-white/40 text-[10px] italic">Te ha visitado {s.visit_count} veces</p>
                                    <a href={`/@${s.visitor.username}`} className="mt-2 px-4 py-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-300 text-[10px] uppercase font-bold tracking-wider rounded-xl transition-colors border border-fuchsia-500/30">Devolver Visita</a>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
