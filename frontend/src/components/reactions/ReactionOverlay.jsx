import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORM_EMOJIS = ['🚀', '✨', '🔥', '💎', '👑', '🎉', '🌟', '👾', '🌈', '🛸'];

export default function ReactionOverlay({ gifOverlays = [], isStorming = false }) {
    const emojis = useMemo(() => {
        if (!isStorming) return [];
        return [...Array(50)].map((_, i) => ({
            id: i,
            char: STORM_EMOJIS[Math.floor(Math.random() * STORM_EMOJIS.length)],
            x: Math.random() * 100 + "%",
            delay: Math.random() * 2,
            duration: Math.random() * 2 + 1,
            scale: Math.random() * 0.5 + 0.8
        }));
    }, [isStorming]);

    return (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {/* Floating GIFs */}
            <AnimatePresence>
                {gifOverlays.map(g => (
                    <motion.img
                        key={g.id}
                        src={g.url}
                        className="absolute bottom-20 left-1/2 w-32 -translate-x-1/2 z-30 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        initial={{ opacity: 0, y: 40, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, y: -250, scale: 1.2, rotate: Math.random() * 20 - 10 }}
                        exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.5 } }}
                        transition={{ duration: 3, ease: "easeOut" }}
                    />
                ))}
            </AnimatePresence>

            {/* Emoji Rain / Storm */}
            {isStorming && (
                <>
                    {emojis.map(e => (
                        <motion.div
                            key={e.id}
                            initial={{ y: -100, x: e.x, opacity: 0, scale: 0 }}
                            animate={{ 
                                y: "110vh", 
                                opacity: [0, 1, 1, 0],
                                scale: [0, e.scale, e.scale, 0],
                                rotate: [0, 360] 
                            }}
                            transition={{ 
                                duration: e.duration, 
                                delay: e.delay, 
                                repeat: Infinity, 
                                ease: "linear" 
                            }}
                            className="absolute text-3xl select-none"
                        >
                            {e.char}
                        </motion.div>
                    ))}
                    <motion.div 
                        animate={{ scale: [1, 1.02, 1], opacity: [0, 0.1, 0] }}
                        transition={{ duration: 0.1, repeat: Infinity }}
                        className="absolute inset-0 bg-cyan-500/10 pointer-events-none"
                    />
                </>
            )}
        </div>
    );
}
