import { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORM_EMOJIS = ['🚀', '✨', '🔥', '💎', '👑', '🎉', '🌟', '👾', '🌈', '🛸'];
const MAX_GIF_OVERLAYS = 5;
const STORM_PARTICLE_COUNT = 50;

export default function ReactionOverlay({ gifOverlays = [], isStorming = false }) {
    const safeOverlays = Array.isArray(gifOverlays)
        ? gifOverlays.slice(-MAX_GIF_OVERLAYS)
        : [];

    // Stable random values per gif id — survives re-renders without useMemo per-child
    const gifRandomsRef = useRef({});
    safeOverlays.forEach(g => {
        if (!gifRandomsRef.current[g.id]) {
            gifRandomsRef.current[g.id] = {
                rotation: Math.random() * 20 - 10,
                left: `${Math.random() * 80 + 10}%`,
            };
        }
    });

    const emojis = useMemo(() => {
        if (!isStorming) return [];
        return Array.from({ length: STORM_PARTICLE_COUNT }, (_, i) => ({
            id: i,
            char: STORM_EMOJIS[Math.floor(Math.random() * STORM_EMOJIS.length)],
            x: `${Math.random() * 100}%`,
            delay: Math.random() * 2,
            duration: Math.random() * 2 + 1,
            scale: Math.random() * 0.5 + 0.8,
        }));
    }, [isStorming]);

    return (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {/* ── Floating GIFs — motion.img directly inside AnimatePresence ── */}
            <AnimatePresence>
                {safeOverlays.map(g => {
                    const r = gifRandomsRef.current[g.id] || { rotation: 0, left: '50%' };
                    return (
                        <motion.img
                            key={g.id}
                            src={g.url}
                            className="absolute bottom-20 w-32 z-30 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-xl -translate-x-1/2"
                            style={{ left: r.left }}
                            initial={{ opacity: 0, y: 40, scale: 0.5, rotate: -10 }}
                            animate={{ opacity: 1, y: -250, scale: 1.2, rotate: r.rotation }}
                            exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.5 } }}
                            transition={{ duration: 3, ease: 'easeOut' }}
                            alt=""
                            loading="lazy"
                        />
                    );
                })}
            </AnimatePresence>

            {/* ── Emoji Rain / Storm ───────────────────────────────────────── */}
            {isStorming && (
                <>
                    {emojis.map(e => (
                        <motion.div
                            key={e.id}
                            initial={{ y: -100, x: e.x, opacity: 0, scale: 0 }}
                            animate={{
                                y: '110vh',
                                opacity: [0, 1, 1, 0],
                                scale: [0, e.scale, e.scale, 0],
                                rotate: [0, 360],
                            }}
                            transition={{
                                duration: e.duration,
                                delay: e.delay,
                                repeat: 2,
                                ease: 'linear',
                            }}
                            className="absolute text-3xl select-none"
                        >
                            {e.char}
                        </motion.div>
                    ))}

                    {/* Screen flash pulse */}
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
