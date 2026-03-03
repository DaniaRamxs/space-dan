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
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 800);
    }, [toggleReaction]);

    return (
        <>
            <div className="relative flex items-center gap-3 select-none">
                {/* Contenedor principal de reacciones */}
                <div className="flex items-center gap-2">
                    <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all active:scale-95 group ${metadata.user_reaction ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                        onClick={() => setShowPicker(!showPicker)}
                    >
                        <div className="flex -space-x-1.5">
                            {metadata.top_reactions.length > 0 ? (
                                metadata.top_reactions.slice(0, 3).map((r, i) => (
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
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`text-[10px] font-black font-mono tracking-tight ${metadata.user_reaction ? 'text-cyan-400' : 'text-white/40'}`}
                            >
                                {total}
                            </motion.span>
                        )}
                    </div>
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
                                className="absolute bottom-full left-0 mb-3 p-1.5 bg-[#0a0a0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl flex gap-0.5 z-[101] shadow-2xl"
                            >
                                {Object.entries(REACTION_CONFIG).map(([type, config]) => {
                                    const isActive = metadata.user_reaction === type;
                                    return (
                                        <motion.button
                                            key={type}
                                            whileHover={{ scale: 1.2, y: -4 }}
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => handleReact(type)}
                                            className={`p-2 rounded-xl transition-all relative group flex justify-center items-center ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                        >
                                            <span className={`text-lg ${isActive ? '' : 'filter grayscale opacity-60 group-hover:filter-none group-hover:opacity-100'}`}>
                                                {config.icon}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Efecto Partículas Dinámico */}
                <AnimatePresence>
                    {showParticles && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                    animate={{
                                        x: (Math.random() - 0.5) * 100,
                                        y: (Math.random() - 1) * 80,
                                        scale: 0,
                                        opacity: 0
                                    }}
                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                    className="absolute w-1 h-1 bg-cyan-400/40 rounded-full blur-[1px]"
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
