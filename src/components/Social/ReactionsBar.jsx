import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactions } from '../../hooks/useReactions';
import ReactionModal from './ReactionModal';

const REACTION_CONFIG = {
    connection: { icon: '💖', label: 'Conexión' },
    impact: { icon: '🔥', label: 'Impacto' },
    represent: { icon: '🌙', label: 'Representa' },
    think: { icon: '🧠', label: 'Interesante' },
    underrated: { icon: '🪐', label: 'Infravalorado' }
};

export default function ReactionsBar({ post, onUpdate }) {
    const { toggleReaction } = useReactions(post, onUpdate);
    const [showPicker, setShowPicker] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showParticles, setShowParticles] = useState(false);

    const metadata = post.reactions_metadata || { total_count: 0, top_reactions: [], user_reaction: null };
    const total = parseInt(metadata.total_count) || 0;

    const handleReact = useCallback((type) => {
        toggleReaction(type);
        setShowPicker(false);

        // Si cruza la barrera de 50 o ya tiene más
        if (total >= 50) {
            setShowParticles(true);
            setTimeout(() => setShowParticles(false), 500);
        }
    }, [toggleReaction, total]);

    return (
        <>
            <div className="relative flex items-center gap-3 mt-4 select-none">
                {/* Contenedor principal de reacciones */}
                <div className="flex items-center gap-2">
                    {/* Botón flotante para abrir el modal si hay muchas */}
                    <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all active:scale-95 group"
                        onClick={() => setShowPicker(!showPicker)}
                        title="Reaccionar"
                        aria-label="Reaccionar"
                    >
                        <div className="flex -space-x-1.5">
                            {metadata.top_reactions.length > 0 ? (
                                metadata.top_reactions.map((r, i) => (
                                    <span key={r.reaction_type} className="text-sm drop-shadow-md z-10" style={{ zIndex: 10 - i }}>
                                        {REACTION_CONFIG[r.reaction_type]?.icon}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm opacity-40 group-hover:opacity-100 transition-opacity">✨</span>
                            )}
                        </div>

                        {total > 0 && (
                            <motion.span
                                key={total}
                                initial={{ y: 8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-[10px] font-black text-white/60 font-mono tracking-tight"
                            >
                                {total}
                            </motion.span>
                        )}
                    </div>

                    {/* Botón +X para abrir modal de quienes reaccionaron */}
                    {total > 0 && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="text-[10px] uppercase font-black tracking-widest text-white/30 hover:text-white/80 transition-colors"
                        >
                            Ver +
                        </button>
                    )}
                </div>

                {/* Picker / Dropdown */}
                <AnimatePresence>
                    {showPicker && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => setShowPicker(false)} />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                className="absolute bottom-full left-0 mb-3 p-2 bg-[#0a0a0f]/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex gap-1 z-[101] shadow-2xl"
                            >
                                {Object.entries(REACTION_CONFIG).map(([type, config]) => {
                                    const isActive = metadata.user_reaction === type;
                                    return (
                                        <motion.button
                                            key={type}
                                            whileHover={{ scale: 1.25, y: -4 }}
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => handleReact(type)}
                                            aria-label={config.label}
                                            className={`p-2.5 rounded-xl transition-all relative group flex justify-center items-center ${isActive ? 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.15)]' : 'hover:bg-white/5'}`}
                                        >
                                            <span className={`text-xl drop-shadow-xl ${isActive ? 'filter-none' : 'grayscale-[0.6] opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all'}`}>
                                                {config.icon}
                                            </span>

                                            {/* Tooltip sutil */}
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                                {config.label}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Efecto Partículas al superar 50 */}
                <AnimatePresence>
                    {showParticles && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                    animate={{
                                        x: (Math.random() - 0.5) * 80,
                                        y: (Math.random() - 1) * 60,
                                        scale: 0,
                                        opacity: 0
                                    }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="absolute w-1.5 h-1.5 bg-pink-400/50 rounded-full blur-[1px]"
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <ReactionModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                postId={post.id}
            />
        </>
    );
}
