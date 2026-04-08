import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Leaderboard from './Leaderboard';
import { useRealtimeLeaderboard } from '../hooks/useRealtimeLeaderboard';

export default function LeaderboardOverlay({ isOpen, onClose, gameId, onStatsUpdate }) {
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const { leaderboard, userRank, ptsToNext, rankDrop, loading } = useRealtimeLeaderboard(gameId);

    // Comunicar micro-estados al header
    useEffect(() => {
        if (onStatsUpdate) {
            onStatsUpdate({ userRank, ptsToNext, rankDrop });
        }
    }, [userRank, ptsToNext, rankDrop, onStatsUpdate]);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Bloquear scroll del body general
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = originalOverflow; }
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999, // Superponer sobre la UI del Shell Inmersivo
                    pointerEvents: 'auto',
                    display: 'flex',
                    flexDirection: isDesktop ? 'row' : 'column',
                    justifyContent: 'flex-end',
                    fontFamily: "'Inter', sans-serif"
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(3, 3, 8, 0.75)',
                            backdropFilter: 'blur(6px)',
                            zIndex: 1
                        }}
                    />

                    <motion.div
                        initial={isDesktop ? { x: '100%' } : { y: '100%' }}
                        animate={isDesktop ? { x: 0 } : { y: 0 }}
                        exit={isDesktop ? { x: '100%' } : { y: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        drag={!isDesktop ? 'y' : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(!isDesktop) ? (e, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) onClose();
                        } : undefined}
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            background: 'linear-gradient(180deg, rgba(20,20,30,0.95) 0%, rgba(10,10,15,0.98) 100%)',
                            backdropFilter: 'blur(20px)',
                            borderTop: !isDesktop ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            borderLeft: isDesktop ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            borderTopLeftRadius: isDesktop ? 0 : 28,
                            borderTopRightRadius: isDesktop ? 0 : 28,
                            width: isDesktop ? '380px' : '100%',
                            height: isDesktop ? '100%' : '75vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: isDesktop ? '-15px 0 50px rgba(0,0,0,0.6)' : '0 -15px 50px rgba(0,0,0,0.6)'
                        }}
                    >
                        {!isDesktop && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '16px 0 8px', cursor: 'grab' }}>
                                <div style={{ width: 48, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.2)' }} />
                            </div>
                        )}

                        <div style={{ padding: '0 24px 24px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: isDesktop ? 32 : 8, marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff' }}>
                                    <span style={{ marginRight: 8 }}>🏆</span> Ranking
                                </h3>
                                {isDesktop && (
                                    <button
                                        onClick={onClose}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: 20, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                                        onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <Leaderboard gameId={gameId} prefetchedData={leaderboard} prefetchedRank={userRank} loading={loading} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
