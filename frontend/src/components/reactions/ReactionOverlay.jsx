import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORM_EMOJIS = ['🚀', '✨', '🔥', '💎', '👑', '🎉', '🌟', '👾', '🌈', '🛸'];
const MAX_GIF_OVERLAYS = 5;
const STORM_PARTICLE_COUNT = 50;

/**
 * GifItem — each GIF gets its own stable rotation to avoid recalculating on re-render.
 * Math.random() inside animate recalculates every render → janky animation.
 * By moving it into the component (memo), it's calculated ONCE per mount.
 */
const GifItem = ({ gif }) => {
    const rotation = useMemo(() => Math.random() * 20 - 10, []);

    return (
        <motion.img
            key={gif.id}
            src={gif.url}
            className="absolute bottom-20 left-1/2 w-32 -translate-x-1/2 z-30 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-xl"
            initial={{ opacity: 0, y: 40, scale: 0.5, rotate: -10 }}
            animate={{ opacity: 1, y: -250, scale: 1.2, rotate: rotation }}
            exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.5 } }}
            transition={{ duration: 3, ease: 'easeOut' }}
            alt=""
            loading="lazy"
        />
    );
};

/**
 * ReactionOverlay
 * Renders floating GIFs and emoji storm particles above the video player.
 *
 * Props:
 *   gifOverlays  — array of { id, url } objects (safe: guarded with Array.isArray)
 *   isStorming   — boolean, triggers emoji rain
 */
export default function ReactionOverlay({ gifOverlays = [], isStorming = false }) {
    // ── Safety: guard against undefined/null/non-array ────────────────────────
    const safeOverlays = Array.isArray(gifOverlays)
        ? gifOverlays.slice(-MAX_GIF_OVERLAYS)   // never more than 5 in the DOM
        : [];

    // ── Storm particles: stable — recalculated only when isStorming toggles ──
    // Moving Math.random() here means values are stable between re-renders
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
    }, [isStorming]); // recalculated only when storm starts/stops

    return (
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {/* ── Floating GIFs (max 5) ────────────────────────────────────── */}
            <AnimatePresence>
                {safeOverlays.map(g => (
                    <GifItem key={g.id} gif={g} />
                ))}
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
                                repeat: Infinity,
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
