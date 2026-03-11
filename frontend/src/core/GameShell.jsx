import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import LeaderboardOverlay from '../components/LeaderboardOverlay';

// Módulo 7 / 9: GameShell Híbrido (Minimal + Competitivo)
// Implementado en Modo Contingencia por Ingeniero IA

const styles = {
    shellWrapper: {
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        maxWidth: 500, margin: '0 auto',
        fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#fff',
        position: 'relative', zIndex: 10
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', height: 48, padding: '0 16px',
        background: 'rgba(20, 20, 25, 0.4)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', boxSizing: 'border-box'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    exitBtn: {
        background: 'transparent', border: 'none', color: '#aaa', fontSize: 20,
        cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    title: { fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#eee' },

    headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
    turnBadge: {
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800,
        letterSpacing: 0.5, textTransform: 'uppercase'
    },
    dot: { width: 6, height: 6, borderRadius: '50%' },
    timeText: { fontSize: 13, fontWeight: 700, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },

    timerWrap: { width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    timerFill: { height: '100%', transition: 'width 0.1s linear, background-color 0.3s ease' },

    // El body ocupará todo el espacio central para dibujar el board al 70-80% de viewheight
    body: { flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '16px 8px', boxSizing: 'border-box' },

    footer: { padding: '16px', width: '100%', display: 'flex', justifyContent: 'space-evenly', alignItems: 'center', gap: 12, boxSizing: 'border-box' },

    // Overlays minimalistas
    overlayMask: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100
    },
    overlayCard: { textAlign: 'center', width: '100%', padding: '0 32px' },
    resultTitle: { fontSize: 48, fontWeight: 900, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
    resultSubtitle: { fontSize: 14, color: '#aaa', marginBottom: 32, fontWeight: 500, letterSpacing: 0.5 },
    primaryBtn: {
        background: '#fff', color: '#000', height: 48, padding: '0 32px', borderRadius: 24,
        border: 'none', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', letterSpacing: 1,
        display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: 280, margin: '0 auto',
        boxShadow: '0 8px 24px rgba(255,255,255,0.15)', transition: 'transform 0.1s'
    }
};

const getTimerColor = (ratio) => {
    if (ratio > 40) return '#00e5ff'; // Turquesa
    if (ratio > 15) return '#ffd700'; // Dorado
    return '#ff4d4d'; // Rojo
};

export function GameShell({
    game = {},
    title = "Spacely Game",
    children,
    bottomSlot,
    onExit,
    playerColors = { P1: '#ff6eb4', P2: '#00e5ff', Draw: '#aaaaaa' }
}) {
    const {
        status = 'PLAYING',
        currentPlayer = 'P1',
        winner = null,
        isThinking = false,
        timeLeft = null,
        resetGame = () => window.location.reload()
    } = game;

    const isFinished = status === 'FINISHED' || status === 'game_over';
    const isPaused = status === 'PAUSED';

    const { gameId } = useParams();
    const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
    const [leaderboardStats, setLeaderboardStats] = useState({ userRank: null, ptsToNext: null, rankDrop: false });

    // Timer Progresivo de Competición
    const maxTime = 15000;
    const timeRatio = timeLeft !== null ? Math.max(0, timeLeft / maxTime) * 100 : 0;
    const timerColor = getTimerColor(timeRatio);
    const activeColor = playerColors[currentPlayer] || '#fff';
    const timeSeconds = timeLeft !== null ? Math.ceil(timeLeft / 1000) : null;

    // Condicionar visualización de turnos para juegos casuales 
    const hasTurns = !!game.currentPlayer;

    const handleExit = () => {
        if (status === 'PLAYING' || status === 'PAUSED') {
            const confirmExit = window.confirm('Toda maniobra evasiva te costará el progreso actual. ¿Abandonar misión?');
            if (!confirmExit) return;
        }
        if (onExit) onExit();
        else window.history.back();
    };

    return (
        <div style={styles.shellWrapper}>
            {/* Header Compacto (48px) de Torneo */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button style={styles.exitBtn} onClick={handleExit} aria-label="Salir">←</button>
                    <span style={styles.title}>{title}</span>

                    {/* Rango en Tiempo Real y Gap */}
                    {leaderboardStats.userRank && (
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 12, justifyContent: 'center' }}>
                            <motion.span
                                animate={leaderboardStats.rankDrop ? { color: ['#fff', '#ff3366', '#ff3366', '#fff'] } : { color: '#00e5ff' }}
                                transition={{ duration: 0.4, repeat: 3 }}
                                style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}
                            >
                                #{leaderboardStats.userRank.user_position}
                            </motion.span>
                            {leaderboardStats.ptsToNext !== null && leaderboardStats.ptsToNext > 0 && (
                                <span style={{ fontSize: 9, color: '#888', marginTop: -2, fontWeight: 600, letterSpacing: 0.5 }}>
                                    +{leaderboardStats.ptsToNext} pts al #{leaderboardStats.userRank.user_position - 1}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div style={styles.headerRight}>
                    <button
                        onClick={() => setIsLeaderboardOpen(true)}
                        style={{ ...styles.exitBtn, fontSize: 16 }}
                        title="Ver Leaderboard"
                        aria-label="Leaderboard"
                    >
                        🏆
                    </button>

                    {hasTurns && (
                        <div style={{ ...styles.turnBadge, color: isFinished ? '#777' : activeColor }}>
                            {isFinished ? 'FIN' : (currentPlayer === 'P1' ? 'TÚ' : 'RIVAL')}

                            {/* IA Pensando Minimalista (3 puntos) vs Glow */}
                            {isThinking && currentPlayer !== 'P1' ? (
                                <span style={{ display: 'flex', gap: 3, marginLeft: 6 }}>
                                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} style={{ ...styles.dot, background: activeColor }} />
                                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ ...styles.dot, background: activeColor }} />
                                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ ...styles.dot, background: activeColor }} />
                                </span>
                            ) : (
                                <span style={{ ...styles.dot, marginLeft: 6, background: isFinished ? '#555' : activeColor, boxShadow: isFinished ? 'none' : `0 0 10px ${activeColor}` }} />
                            )}
                        </div>
                    )}

                    {timeSeconds !== null && !isFinished && (
                        <div style={{ ...styles.timeText, color: timerColor }}>{timeSeconds}s</div>
                    )}
                </div>
            </div>

            {/* Barra Ligera Inferior */}
            <div style={styles.timerWrap}>
                <AnimatePresence>
                    {timeRatio > 0 && !isFinished && (
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: `${timeRatio}%`, backgroundColor: timerColor }}
                            transition={{ ease: 'linear', duration: 0.1 }}
                            style={styles.timerFill}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Injected Game Board (Centrado) */}
            <div style={styles.body}>
                {children}

                {/* Overlays Suaves (Resultados) */}
                <AnimatePresence>
                    {isFinished && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={styles.overlayMask}>
                            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} style={styles.overlayCard}>
                                <div style={{ ...styles.resultTitle, color: winner === 'draw' ? playerColors.Draw : (winner === 'P1' || winner === true || !hasTurns ? playerColors.P1 : playerColors.P2) }}>
                                    {winner === 'draw' ? 'EMPATE' : (winner === 'P1' ? 'GANASTE' : (winner === true || !hasTurns ? 'GAME OVER' : 'PERDISTE'))}
                                </div>
                                <div style={styles.resultSubtitle}>
                                    {winner === 'draw' ? 'Nadie se rinde fácilmente.' : (winner === 'P1' ? 'Gran jugada, piloto.' : 'La entropía te superó.')}
                                </div>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={() => resetGame()} style={styles.primaryBtn}>
                                    JUGAR DE NUEVO
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Overlay intermedio (PAUSA) extra-sutil */}
                <AnimatePresence>
                    {isPaused && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.overlayMask}>
                            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase', color: '#fff' }}>PAUSA</motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            {bottomSlot && <div style={styles.footer}>{bottomSlot}</div>}

            <LeaderboardOverlay
                isOpen={isLeaderboardOpen}
                onClose={() => setIsLeaderboardOpen(false)}
                gameId={gameId}
                onStatsUpdate={setLeaderboardStats}
            />
        </div>
    );
}
