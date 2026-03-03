import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const styles = {
    container: {
        position: 'relative',
        width: '100%',
        height: '100dvh', // Full height for absolute immersion
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'rgba(5, 5, 8, 0.4)', // Subtle backing to the radial gradient
    },
    canvasContainer: {
        position: 'relative',
        width: '100%',
        height: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    hud: {
        position: 'absolute',
        top: '5vh',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 50,
    },
    score: {
        fontSize: '3.5rem',
        fontWeight: 900,
        fontFamily: "'Exo 2', sans-serif",
        color: '#fff',
        textShadow: '0 0 15px rgba(255,255,255,0.2)',
        lineHeight: 1,
        margin: 0,
    },
    bestScore: {
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.3)',
        marginTop: 4,
    },
    turnIndicator: {
        fontSize: '0.65rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'var(--accent)',
        marginTop: 8,
        padding: '4px 12px',
        borderRadius: 20,
        background: 'rgba(0, 229, 255, 0.05)',
        border: '1px solid rgba(0, 229, 255, 0.1)',
        backdropFilter: 'blur(4px)',
    },
    timerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        zIndex: 100,
    },
    timerBar: {
        height: '100%',
        background: 'var(--accent)',
        boxShadow: '0 0 10px var(--accent)',
    },
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5,5,8,0.9)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        padding: 32,
    },
    gameOverTitle: {
        fontSize: '2.5rem',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        color: '#fff',
        marginBottom: 8,
    },
    retryBtn: {
        marginTop: 40,
        padding: '14px 40px',
        background: '#fff',
        color: '#000',
        borderRadius: 12,
        fontWeight: 900,
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    }
};

/**
 * ArcadeShell
 * Premium wrapper for Spacely Arcade games.
 */
export function ArcadeShell({
    title,
    score = 0,
    bestScore = 0,
    status = 'PLAYING',
    onRetry,
    children,
    scoreControls,
    particles = [],
    floatingTexts = [],
    timeLeft = null,
    totalTime = null,
    turn = null,
    subTitle = "Listo para la misión, piloto."
}) {
    const isGameOver = status === 'DEAD' || status === 'game_over' || status === 'FINISHED';
    const isPaused = status === 'PAUSED';
    const navigate = useNavigate();

    return (
        <div style={styles.container} className="arcade-shell-container">
            {/* Global Timer Bar */}
            {timeLeft !== null && totalTime !== null && (
                <div style={styles.timerContainer}>
                    <motion.div
                        initial={{ width: '100%' }}
                        animate={{ width: `${(timeLeft / totalTime) * 100}%` }}
                        transition={{ duration: 0.5, ease: "linear" }}
                        style={styles.timerBar}
                    />
                </div>
            )}

            {/* HUD Central */}
            <div style={styles.hud}>
                <motion.h1
                    animate={scoreControls}
                    style={styles.score}
                >
                    {score}
                </motion.h1>
                <div style={styles.bestScore}>Mejor: {bestScore}</div>

                {/* Turn Indicator */}
                {turn && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={styles.turnIndicator}
                    >
                        {turn === 'PLAYER' ? 'TU TURNO' : turn === 'AI' ? 'TURNO IA' : turn}
                    </motion.div>
                )}
            </div>

            {/* Game Canvas Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.canvasContainer}
            >
                {children}

                {/* Particle Layer (Neon) */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
                    {particles.map(p => (
                        <motion.div
                            key={p.id}
                            initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                            animate={{
                                x: p.x + p.vx * 20,
                                y: p.y + p.vy * 20,
                                opacity: 0,
                                scale: 0
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{
                                position: 'absolute',
                                width: p.size,
                                height: p.size,
                                background: p.color,
                                borderRadius: '50%',
                                boxShadow: `0 0 10px ${p.color}`,
                            }}
                        />
                    ))}

                    {floatingTexts.map(f => (
                        <motion.div
                            key={f.id}
                            initial={{ x: f.x, y: f.y, opacity: 0, y: f.y }}
                            animate={{ opacity: 1, y: f.y - 60 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute',
                                color: f.color,
                                fontWeight: 900,
                                fontSize: '1.5rem',
                                textShadow: '0 0 10px rgba(0,0,0,0.5)',
                            }}
                        >
                            {f.text}
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Persistent Exit Button (Top Left) */}
            <button
                onClick={() => navigate('/games')}
                onPointerDown={e => e.stopPropagation()}
                style={{
                    position: 'absolute',
                    top: 24,
                    left: 24,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 200,
                    fontSize: 20,
                    backdropFilter: 'blur(8px)',
                }}
                className="hover:bg-white/10 active:scale-90 transition-all"
                title="Salir del Juego"
            >
                ✕
            </button>

            {/* Overlays */}
            <AnimatePresence>
                {(status === 'IDLE' || status === 'WAITING' || status === 'START') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.overlay}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{ textAlign: 'center' }}
                        >
                            <h2 style={{ ...styles.gameOverTitle, fontSize: '2rem' }}>
                                {title}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 30, fontSize: '0.9rem', letterSpacing: 1 }}>
                                {subTitle}
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}
                                whileTap={{ scale: 0.95 }}
                                style={styles.retryBtn}
                                onClick={onRetry}
                            >
                                INICIAR JUEGO
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}

                {isGameOver && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.overlay}
                    >
                        <motion.h2
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            style={styles.gameOverTitle}
                        >
                            Game Over
                        </motion.h2>

                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: 4 }}>
                            Tu puntuación
                        </div>
                        <div style={{ fontSize: '4rem', fontWeight: 900 }}>{score}</div>

                        {score >= bestScore && score > 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ color: '#00e5ff', fontWeight: 900, textTransform: 'uppercase', marginTop: 8 }}
                            >
                                ¡Nuevo Récord!
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: '#00e5ff', color: '#000' }}
                            whileTap={{ scale: 0.95 }}
                            style={styles.retryBtn}
                            onClick={onRetry}
                        >
                            Reintentar
                        </motion.button>

                        <button
                            onClick={() => navigate('/games')}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', marginTop: 20, fontSize: '0.8rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        >
                            Volver al Hub
                        </button>
                    </motion.div>
                )}

                {isPaused && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.overlay}
                    >
                        <h2 style={{ ...styles.gameOverTitle, color: '#fff' }}>Pausa</h2>
                        <button style={styles.retryBtn} onClick={onRetry}>Continuar</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Background Glow Pulse (for death) */}
            <AnimatePresence>
                {isGameOver && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.2, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'radial-gradient(circle, rgba(255,110,180,0.2) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
