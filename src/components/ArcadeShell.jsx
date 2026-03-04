import { useCallback, memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Leaderboard from './Leaderboard';

// ──────────────────────────────────────────────
//  ArcadeShell — Premium Game Wrapper v2
//  Visual upgrade: progressive timer, polished
//  overlays, unified HUD, premium exit btn.
//  Architecture (FSM / Engine) untouched.
// ──────────────────────────────────────────────

const getTimerColor = (ratio) => {
    if (ratio > 0.55) return '#00e5ff';   // cyan — safe
    if (ratio > 0.25) return '#ffd700';   // amber — warning
    return '#ff4444';                      // red   — critical
};

const getTimerGlow = (ratio) => {
    if (ratio > 0.55) return 'rgba(0,229,255,0.4)';
    if (ratio > 0.25) return 'rgba(255,215,0,0.4)';
    return 'rgba(255,68,68,0.5)';
};

// ── Memoized Particle (prevent unnecessary re-renders) ──
const Particle = memo(({ p }) => (
    <motion.div
        initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
        animate={{ x: p.x + p.vx * 22, y: p.y + p.vy * 22, opacity: 0, scale: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        style={{
            position: 'absolute',
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: '50%',
            boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}44`,
            pointerEvents: 'none',
        }}
    />
));

// ── Memoized Floating Text ──
const FloatingText = memo(({ f }) => (
    <motion.div
        initial={{ x: f.x, y: f.y, opacity: 0 }}
        animate={{ opacity: 1, y: f.y - 64 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{
            position: 'absolute',
            color: f.color,
            fontWeight: 900,
            fontSize: '1.4rem',
            letterSpacing: 2,
            textShadow: `0 0 12px ${f.color}99, 0 2px 8px rgba(0,0,0,0.8)`,
            pointerEvents: 'none',
            fontFamily: "'Outfit', sans-serif",
            textTransform: 'uppercase',
        }}
    >
        {f.text}
    </motion.div>
));

// ── Timer Bar — progressive color + glow ──
const TimerBar = memo(({ timeLeft, totalTime }) => {
    if (timeLeft === null || totalTime === null) return null;
    const ratio = Math.max(0, timeLeft / totalTime);
    const color = getTimerColor(ratio);
    const glow = getTimerGlow(ratio);
    const isCritical = ratio < 0.25;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', zIndex: 100,
        }}>
            <motion.div
                initial={{ width: '100%' }}
                animate={{
                    width: `${ratio * 100}%`,
                    backgroundColor: color,
                    boxShadow: isCritical ? `0 0 12px ${glow}, 0 0 24px ${glow}` : `0 0 6px ${glow}`,
                }}
                transition={{ duration: 0.3, ease: 'linear' }}
                style={{ height: '100%' }}
            />
        </div>
    );
});

// ── HUD — score + best + turn indicator ──
const HUD = memo(({ score, bestScore, scoreControls, turn }) => (
    <div style={{
        position: 'absolute',
        top: '4vh', left: 0, right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 50,
        gap: 4,
    }}>
        {/* Score */}
        <motion.h1
            animate={scoreControls}
            style={{
                fontSize: '3.2rem',
                fontWeight: 900,
                fontFamily: "'Exo 2', sans-serif",
                color: '#fff',
                textShadow: '0 0 20px rgba(255,255,255,0.15)',
                lineHeight: 1,
                margin: 0,
                letterSpacing: -1,
            }}
        >
            {score}
        </motion.h1>

        {/* Best score row */}
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.28)',
        }}>
            <span style={{ color: '#ffd700', fontSize: '0.6rem' }}>◆</span>
            <span>MEJOR {bestScore}</span>
        </div>

        {/* Turn indicator */}
        {turn && (
            <motion.div
                key={turn}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                    marginTop: 6,
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.6rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.2em',
                    color: turn === 'PLAYER' ? '#00e5ff' : 'rgba(255,110,180,0.9)',
                    padding: '4px 14px',
                    borderRadius: 20,
                    background: turn === 'PLAYER'
                        ? 'rgba(0,229,255,0.07)'
                        : 'rgba(255,110,180,0.07)',
                    border: `1px solid ${turn === 'PLAYER' ? 'rgba(0,229,255,0.15)' : 'rgba(255,110,180,0.15)'}`,
                    backdropFilter: 'blur(8px)',
                }}
            >
                {/* Pulsing dot */}
                <motion.span
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: turn === 'PLAYER' ? '#00e5ff' : '#ff6eb4',
                        boxShadow: `0 0 8px ${turn === 'PLAYER' ? '#00e5ff' : '#ff6eb4'}`,
                        display: 'inline-block',
                    }}
                />
                {turn === 'PLAYER' ? 'TU TURNO' : turn === 'AI' ? 'IA PENSANDO' : turn}
            </motion.div>
        )}
    </div>
));

// ── Exit Button ──
const ExitButton = memo(({ onClick }) => (
    <motion.button
        onClick={onClick}
        onPointerDown={e => e.stopPropagation()}
        whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.1)' }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{
            position: 'absolute',
            top: 20, left: 20,
            width: 42, height: 42,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 200,
            fontSize: 18,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        }}
        title="Salir del Juego"
        aria-label="Salir"
    >
        ←
    </motion.button>
));

// ── Start / Waiting Overlay ──
const StartOverlay = memo(({ title, subTitle, onRetry }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={overlayStyle}
    >
        <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.05 }}
            style={{ textAlign: 'center', padding: '0 32px', maxWidth: 400 }}
        >
            <h2 style={{
                fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: '#fff',
                marginBottom: 10, lineHeight: 1.1,
                fontFamily: "'Outfit', sans-serif",
            }}>
                {title}
            </h2>
            <p style={{
                color: 'rgba(255,255,255,0.4)', marginBottom: 36,
                fontSize: '0.85rem', letterSpacing: '0.05em', lineHeight: 1.5,
            }}>
                {subTitle}
            </p>
            <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(0,229,255,0.25), 0 8px 32px rgba(0,0,0,0.4)' }}
                whileTap={{ scale: 0.96 }}
                style={primaryBtnStyle}
                onClick={onRetry}
            >
                INICIAR MISIÓN
            </motion.button>
        </motion.div>
    </motion.div>
));

// ── Game Over Overlay ──
const GameOverOverlay = memo(({ score, bestScore, onRetry, onExit }) => {
    const isNewRecord = score >= bestScore && score > 0;
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={overlayStyle}
        >
            {/* Ambient pulse behind card */}
            <motion.div
                animate={{ opacity: [0, 0.18, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,110,180,0.2) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }}
            />

            <motion.div
                initial={{ scale: 0.88, y: 24, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
                style={{
                    textAlign: 'center', padding: '40px 36px',
                    background: 'rgba(8,8,14,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 28,
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    maxWidth: 320, width: '90%',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
                }}
            >
                <h2 style={{
                    fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.18em', color: 'rgba(255,255,255,0.9)',
                    marginBottom: 24, fontFamily: "'Outfit', sans-serif",
                }}>
                    GAME OVER
                </h2>

                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
                    PUNTUACIÓN
                </div>
                <div style={{ fontSize: '3.8rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: "'Exo 2', sans-serif", marginBottom: 16 }}>
                    {score}
                </div>

                {/* New record badge */}
                <AnimatePresence>
                    {isNewRecord && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.6, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                color: '#00e5ff', fontWeight: 900,
                                fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.15em',
                                padding: '5px 14px', borderRadius: 20,
                                background: 'rgba(0,229,255,0.1)',
                                border: '1px solid rgba(0,229,255,0.25)',
                                marginBottom: 20,
                                boxShadow: '0 0 20px rgba(0,229,255,0.12)',
                            }}
                        >
                            <span style={{ color: '#ffd700' }}>◆</span>
                            NUEVO RÉCORD
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(255,255,255,0.2)' }}
                    whileTap={{ scale: 0.96 }}
                    style={{ ...primaryBtnStyle, marginBottom: 12 }}
                    onClick={onRetry}
                >
                    REINTENTAR
                </motion.button>

                <button
                    onClick={onExit}
                    style={{
                        background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.25)',
                        fontSize: '0.72rem', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                        fontWeight: 600, padding: '8px 0',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.25)'}
                >
                    Volver al Hub
                </button>
            </motion.div>
        </motion.div>
    );
});

// ── Pause Overlay ──
const PauseOverlay = memo(({ onRetry }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={overlayStyle}
    >
        <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{ textAlign: 'center' }}
        >
            <div style={{
                fontSize: '1.4rem', fontWeight: 900,
                letterSpacing: '0.25em', textTransform: 'uppercase',
                color: '#fff', marginBottom: 32,
                fontFamily: "'Outfit', sans-serif",
            }}>
                PAUSA
            </div>
            {onRetry && (
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    style={primaryBtnStyle}
                    onClick={onRetry}
                >
                    CONTINUAR
                </motion.button>
            )}
        </motion.div>
    </motion.div>
));

// ── Shared styles ──
const overlayStyle = {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(4,4,9,0.88)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 500,
};

const primaryBtnStyle = {
    display: 'block', width: '100%', maxWidth: 240,
    margin: '0 auto',
    padding: '14px 0',
    background: '#fff', color: '#000',
    borderRadius: 14,
    border: 'none',
    fontWeight: 900, fontSize: '0.82rem',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    cursor: 'pointer',
    boxShadow: '0 8px 28px rgba(255,255,255,0.14)',
    fontFamily: "'Outfit', sans-serif",
    transition: 'box-shadow 0.2s',
};

// ── Leaderboard Toggle Button (Added for Immersive Mode) ──
const LeaderboardToggle = memo(({ onClick }) => (
    <motion.button
        onClick={onClick}
        onPointerDown={e => e.stopPropagation()}
        whileHover={{ scale: 1.08, backgroundColor: 'rgba(255,255,255,0.1)' }}
        whileTap={{ scale: 0.88 }}
        style={{
            position: 'absolute',
            top: 20, right: 20,
            width: 42, height: 42,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 200,
            fontSize: 20,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        }}
        title="Leaderboard"
        aria-label="Leaderboard"
    >
        🏆
    </motion.button>
));

// ──────────────────────────────────────────────
//  ArcadeShell — Main Component
// ──────────────────────────────────────────────
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
    subTitle = 'Listo para la misión, piloto.',
    gameId, // Passed for leaderboard
}) {
    const isGameOver = status === 'DEAD' || status === 'game_over' || status === 'FINISHED';
    const isPaused = status === 'PAUSED';
    const isIdle = status === 'IDLE' || status === 'WAITING' || status === 'START';
    const navigate = useNavigate();

    // Leaderboard state
    const [lbOpen, setLbOpen] = useState(false);

    const handleExit = useCallback(() => navigate('/games'), [navigate]);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: 'rgba(5,5,8,0.35)',
        }}>
            {/* Progressive Timer Bar */}
            <TimerBar timeLeft={timeLeft} totalTime={totalTime} />

            {/* HUD */}
            <HUD
                score={score}
                bestScore={bestScore}
                scoreControls={scoreControls}
                turn={turn}
            />

            {/* Game Canvas / Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    position: 'relative',
                    width: '100dvw',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    padding: '12vh 0 2vh 0', // HUD clearance + Tight bottom margin for controls
                }}
            >
                {children}

                {/* Particle Layer */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden' }}>
                    {particles.map(p => <Particle key={p.id} p={p} />)}
                    {floatingTexts.map(f => <FloatingText key={f.id} f={f} />)}
                </div>
            </motion.div>

            {/* Exit Button */}
            <ExitButton onClick={handleExit} />

            {/* Leaderboard Toggle Button */}
            {gameId && (
                <LeaderboardToggle onClick={() => setLbOpen(true)} />
            )}

            {/* Overlays */}
            <AnimatePresence>
                {isIdle && (
                    <StartOverlay
                        key="start"
                        title={title}
                        subTitle={subTitle}
                        onRetry={onRetry}
                    />
                )}
                {isGameOver && (
                    <GameOverOverlay
                        key="gameover"
                        score={score}
                        bestScore={bestScore}
                        onRetry={onRetry}
                        onExit={handleExit}
                    />
                )}
                {isPaused && (
                    <PauseOverlay key="pause" onRetry={onRetry} />
                )}
                {lbOpen && (
                    <LeaderboardOverlay key="leaderboard" gameId={gameId} onClose={() => setLbOpen(false)} />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── In-Game Leaderboard Overlay ──
const LeaderboardOverlay = memo(({ gameId, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
                ...overlayStyle,
                zIndex: 600, // Highest over everything
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                padding: '2vh 2vw',
                background: 'rgba(0,0,0,0.6)'
            }}
            onPointerDown={(e) => {
                // Close if wrapper is clicked (not the modal itself)
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{
                    width: '100%',
                    maxWidth: 380,
                    height: '96dvh',
                    background: 'rgba(10, 10, 15, 0.95)',
                    borderLeft: '1px solid rgba(255,110,180,0.2)',
                    boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
                    borderRadius: '24px 0 0 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: 1 }}>🏆 CLASIFICACIÓN</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                            fontSize: '1.5rem', cursor: 'pointer', padding: 4
                        }}
                    >×</button>
                </div>

                {/* Scrollable List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
                    {!gameId ? (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: 40, fontSize: '0.9rem' }}>
                            Leaderboard no disponible para este juego.
                        </div>
                    ) : (
                        <Leaderboard gameId={gameId} />
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
});
