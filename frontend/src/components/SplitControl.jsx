import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 400;
const H = 600;
const FRAME_MS = 1000 / 60;
const LANE_W = 100;
const PLAYER_SIZE = 30;
const OBSTACLE_H = 40;
const TARGET_DIST = 12000; // Total pixels to win
const START_SPEED = 400;

function makeState() {
    return {
        pA: { lane: 0, y: H * 0.72 }, // lane 0 or 1
        pB: { lane: 0, y: H * 0.72 }, // lane 0 or 1
        obstacles: [],
        distance: 0,
        speed: START_SPEED,
        timeAlive: 0,
        lastTime: 0,
        spawnTimer: 0,
    };
}

function SplitControlInner() {
    const [status, setStatus] = useState('IDLE'); // IDLE, PLAYING, DEAD, WIN
    const [score, setScore] = useState(0); // Score will be remaining time * 10 or just a calculated score
    const [displayTime, setDisplayTime] = useState(0);
    const [best, saveScore] = useHighScore('splitcontrol');
    const [progress, setProgress] = useState(0);

    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(makeState());
    const statusRef = useRef('IDLE');
    const lastFrameRef = useRef(0);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;

        // Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        // Center split line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        // The pattern moves with distance
        ctx.lineDashOffset = -s.distance % 30;
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Lane dividers (subtle)
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(LANE_W, 0); ctx.lineTo(LANE_W, H);
        ctx.moveTo(W - LANE_W, 0); ctx.lineTo(W - LANE_W, H);
        ctx.stroke();

        // Draw Meta (Goal Line)
        const remainingDist = TARGET_DIST - s.distance;
        if (remainingDist < H && remainingDist > -100) {
            ctx.fillStyle = '#39ff14';
            ctx.fillRect(0, remainingDist, W, 10);

            ctx.fillStyle = '#fff';
            ctx.font = '900 24px "Outfit"';
            ctx.textAlign = 'center';
            ctx.fillText('META', W / 2, remainingDist - 10);
        }

        // Draw Obstacles
        for (const ob of s.obstacles) {
            const isA = ob.side === 'A';
            const laneX = isA ? ob.lane * LANE_W : (W / 2) + ob.lane * LANE_W;
            const x = laneX + (LANE_W - OBSTACLE_H) / 2;

            ctx.fillStyle = '#ff1744';
            ctx.fillRect(x, ob.y, OBSTACLE_H, OBSTACLE_H);

            // Core
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 4, ob.y + 4, OBSTACLE_H - 8, OBSTACLE_H - 8);
        }

        // Draw Player A (Cyan)
        const ax = s.pA.lane * LANE_W + (LANE_W - PLAYER_SIZE) / 2;
        ctx.fillStyle = '#00e5ff';
        // Triangle pointing up
        ctx.beginPath();
        ctx.moveTo(ax + PLAYER_SIZE / 2, s.pA.y);
        ctx.lineTo(ax + PLAYER_SIZE, s.pA.y + PLAYER_SIZE);
        ctx.lineTo(ax, s.pA.y + PLAYER_SIZE);
        ctx.closePath();
        ctx.fill();

        // Draw Player B (Magenta)
        const bx = (W / 2) + s.pB.lane * LANE_W + (LANE_W - PLAYER_SIZE) / 2;
        ctx.fillStyle = '#ff00ff';
        // Triangle pointing up
        ctx.beginPath();
        ctx.moveTo(bx + PLAYER_SIZE / 2, s.pB.y);
        ctx.lineTo(bx + PLAYER_SIZE, s.pB.y + PLAYER_SIZE);
        ctx.lineTo(bx, s.pB.y + PLAYER_SIZE);
        ctx.closePath();
        ctx.fill();


        // Draw exhaust
        if (statusRef.current === 'PLAYING') {
            ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
            ctx.fillRect(ax + 5 + Math.random() * (PLAYER_SIZE - 10), s.pA.y + PLAYER_SIZE, 4, 10 + Math.random() * 10);

            ctx.fillStyle = 'rgba(255, 0, 255, 0.4)';
            ctx.fillRect(bx + 5 + Math.random() * (PLAYER_SIZE - 10), s.pB.y + PLAYER_SIZE, 4, 10 + Math.random() * 10);
        }

    }, []);

    const tick = useCallback((time) => {
        rafRef.current = requestAnimationFrame(tick);
        if (time - lastFrameRef.current < FRAME_MS) return;
        lastFrameRef.current = time;
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        let dt = (time - s.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        s.lastTime = time;

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD' || statusRef.current === 'WIN') {
            draw();
            return;
        }

        s.timeAlive += dt;
        setDisplayTime(s.timeAlive);

        s.speed = START_SPEED + (s.distance / TARGET_DIST) * 400; // Speeds up as you get closer to goal
        const dDist = s.speed * dt;
        s.distance += dDist;

        const prog = Math.min(100, Math.floor((s.distance / TARGET_DIST) * 100));
        setProgress(prog);

        if (s.distance >= TARGET_DIST) {
            // WIN EVENT
            s.distance = TARGET_DIST;
            statusRef.current = 'WIN';
            setStatus('WIN');

            // Score based on time. Faster is better. 
            // 60s max expected. Score = 60000 - time(ms). Baseline.
            const pts = Math.max(0, 60000 - Math.floor(s.timeAlive * 1000));
            setScore(pts);
            saveScore(pts);

            triggerHaptic('heavy');
            spawnParticles('25%', '50%', '#00e5ff', 40);
            spawnParticles('75%', '50%', '#ff00ff', 40);
            triggerFloatingText('¡META ALCANZADA!', '50%', '40%', '#39ff14');
            draw();
            return;
        }

        // Obstacles scroll
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
            const ob = s.obstacles[i];
            ob.y += dDist;
            if (ob.y > H) s.obstacles.splice(i, 1);
        }

        // Spawning obstacles
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            s.spawnTimer = 0.6 - (s.speed / 2000); // gets slightly faster

            // Spawn for A
            if (Math.random() > 0.3) {
                s.obstacles.push({
                    side: 'A',
                    lane: Math.random() > 0.5 ? 0 : 1,
                    y: -OBSTACLE_H
                });
            }
            // Spawn for B
            if (Math.random() > 0.3) {
                s.obstacles.push({
                    side: 'B',
                    lane: Math.random() > 0.5 ? 0 : 1,
                    y: -OBSTACLE_H
                });
            }
        }

        // Collision logic
        const hitRadius = PLAYER_SIZE * 0.4;
        let collidedA = false;
        let collidedB = false;

        const ax = s.pA.lane * LANE_W + (LANE_W) / 2;
        const ay = s.pA.y + PLAYER_SIZE / 2;
        const bx = (W / 2) + s.pB.lane * LANE_W + (LANE_W) / 2;
        const by = s.pB.y + PLAYER_SIZE / 2;

        for (const ob of s.obstacles) {
            const isA = ob.side === 'A';
            const cx = isA ? ob.lane * LANE_W + LANE_W / 2 : (W / 2) + ob.lane * LANE_W + LANE_W / 2;
            const cy = ob.y + OBSTACLE_H / 2;

            if (isA) {
                const dx = ax - cx;
                const dy = ay - cy;
                if (Math.sqrt(dx * dx + dy * dy) < hitRadius + OBSTACLE_H / 2 - 4) collidedA = true;
            } else {
                const dx = bx - cx;
                const dy = by - cy;
                if (Math.sqrt(dx * dx + dy * dy) < hitRadius + OBSTACLE_H / 2 - 4) collidedB = true;
            }
        }

        if (collidedA || collidedB) {
            statusRef.current = 'DEAD';
            setStatus('DEAD');

            // Si chocan, el puntaje base es la distancia que lograron recorrer (max 12000 pts)
            // Si ganan, se les da un gran bono basado en la velocidad de finalización (+30000 pts)
            const crashScore = Math.floor(s.distance);
            setScore(crashScore);
            saveScore(crashScore);

            triggerHaptic('heavy');
            if (collidedA) {
                spawnParticles('25%', '80%', '#ff1744', 30);
                triggerFloatingText('CRASH', '25%', '70%', '#ff1744');
            }
            if (collidedB) {
                spawnParticles('75%', '80%', '#ff1744', 30);
                triggerFloatingText('CRASH', '75%', '70%', '#ff1744');
            }
            draw();
            return;
        }

        draw();
    }, [draw, saveScore, triggerHaptic, spawnParticles, triggerFloatingText]);

    const handleLeftTap = (e) => {
        e.preventDefault();
        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD' || statusRef.current === 'WIN') {
            start();
            return;
        }
        if (statusRef.current === 'PLAYING') {
            stateRef.current.pA.lane = stateRef.current.pA.lane === 0 ? 1 : 0;
            triggerHaptic('light');
        }
    };

    const handleRightTap = (e) => {
        e.preventDefault();
        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD' || statusRef.current === 'WIN') {
            start();
            return;
        }
        if (statusRef.current === 'PLAYING') {
            stateRef.current.pB.lane = stateRef.current.pB.lane === 0 ? 1 : 0;
            triggerHaptic('light');
        }
    };

    const start = useCallback(() => {
        stateRef.current = makeState();
        stateRef.current.lastTime = performance.now();
        setScore(0);
        setProgress(0);
        setDisplayTime(0);
        statusRef.current = 'PLAYING';
        setStatus('PLAYING');
        triggerHaptic('medium');
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [triggerHaptic, tick]);

    useEffect(() => {
        stateRef.current = makeState();
        statusRef.current = 'IDLE';
        setStatus('IDLE');
        draw();
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [draw, tick]);

    return (
        <ArcadeShell
            title="Split Control"
            score={score}
            scoreLabel="Puntos (Tiempo)"
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Misión paralela. Usa los botones para cambiar de carril y sobrevivir hasta la meta."
            gameId="splitcontrol"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>

                {/* Stats Bar */}
                <div style={{
                    width: 'min(92vw, 400px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>Tiempo</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#00e5ff' }}>{displayTime.toFixed(1)}s</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>Progreso</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#39ff14' }}>{progress}%</span>
                    </div>
                </div>

                <div
                    style={{
                        position: 'relative',
                        width: 'min(92vw, 400px)',
                        aspectRatio: '2/3',
                        maxHeight: '60vh',
                        background: 'rgba(4,4,10,1)',
                        borderRadius: 24,
                        border: '2px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.05)',
                        overflow: 'hidden',
                        touchAction: 'none'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                    />

                    {status === 'IDLE' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.9)',
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                fontWeight: 900,
                                fontSize: '1.2rem',
                                animation: 'pulse 1.5s infinite'
                            }}>Toca los botones para iniciar</span>
                        </div>
                    )}
                </div>

                {/* Ergonomic Dual Controls */}
                <div style={{
                    width: 'min(92vw, 400px)',
                    display: 'flex',
                    gap: 12,
                    marginTop: 4
                }}>
                    <motion.button
                        onPointerDown={handleLeftTap}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 229, 255, 0.2)' }}
                        whileTap={{ scale: 0.92, backgroundColor: 'rgba(0, 229, 255, 0.3)' }}
                        style={{
                            flex: 1,
                            minHeight: 64,
                            borderRadius: 16,
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            background: 'rgba(0, 229, 255, 0.1)',
                            color: '#00e5ff',
                            fontSize: '1rem',
                            fontWeight: 900,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(0, 229, 255, 0.1)',
                            userSelect: 'none',
                            touchAction: 'manipulation'
                        }}
                    >
                        P2 (IZQ)
                    </motion.button>

                    <motion.button
                        onPointerDown={handleRightTap}
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 0, 255, 0.2)' }}
                        whileTap={{ scale: 0.92, backgroundColor: 'rgba(255, 0, 255, 0.3)' }}
                        style={{
                            flex: 1,
                            minHeight: 64,
                            borderRadius: 16,
                            border: '1px solid rgba(255, 0, 255, 0.3)',
                            background: 'rgba(255, 0, 255, 0.1)',
                            color: '#ff00ff',
                            fontSize: '1rem',
                            fontWeight: 900,
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(255, 0, 255, 0.1)',
                            userSelect: 'none',
                            touchAction: 'manipulation'
                        }}
                    >
                        P1 (DER)
                    </motion.button>
                </div>

            </div>
        </ArcadeShell>
    );
}

export default function SplitControl() {
    return (
        <GameImmersiveLayout>
            <SplitControlInner />
        </GameImmersiveLayout>
    );
}
