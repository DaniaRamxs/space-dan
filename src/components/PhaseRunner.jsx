import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 400;
const H = 700;
const FRAME_MS = 1000 / 60;
const PLAYER_SIZE = 24;
const OBSTACLE_H = 30;
const SPEED_BASE = 500; // pixels per second down

const C_A = '#00e5ff'; // Cyan (Phase A)
const C_B = '#ff00ff'; // Magenta (Phase B)

function makeState() {
    return {
        phase: 'A', // 'A' or 'B'
        px: W / 2, // Center fixed X
        y: H * 0.75, // Fixed Y towards bottom
        obstacles: [],
        distance: 0,
        speed: SPEED_BASE,
        lastTime: 0,
        spawnTimer: 0,
        flashTime: 0, // glitch effect duration tracking
        score: 0
    };
}

function PhaseRunnerInner() {
    const [status, setStatus] = useState('IDLE'); // IDLE, PLAYING, DEAD
    const [score, setScore] = useState(0);
    const [best, saveScore] = useHighScore('phaserunner');

    const statusRef = useRef('IDLE');
    const stateRef = useRef(makeState());

    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const lastFrameRef = useRef(0);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;
        const isPhaseA = s.phase === 'A';
        const activeColor = isPhaseA ? C_A : C_B;

        // Glitch Shake calculation
        let gx = 0, gy = 0;
        if (s.flashTime > 0) {
            gx = (Math.random() - 0.5) * 6;
            gy = (Math.random() - 0.5) * 6;
        }

        // Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.translate(gx, gy);

        // Grid (Moves with dist)
        ctx.strokeStyle = `rgba(${isPhaseA ? '0,229,255' : '255,0,255'}, 0.05)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cellSize = 80;
        const offset = (s.distance) % cellSize;
        for (let i = 0; i < H + cellSize; i += cellSize) {
            ctx.moveTo(0, i - offset);
            ctx.lineTo(W, i - offset);
        }
        for (let i = 0; i < W; i += cellSize) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, H);
        }
        ctx.stroke();

        // Draw Obstacles
        for (const ob of s.obstacles) {
            const obIsA = ob.phase === 'A';
            const isActivePhase = ob.phase === s.phase;

            ctx.fillStyle = obIsA ? C_A : C_B;

            if (isActivePhase) {
                // Lethal obstacle (matches your phase) -> Solid and Bright
                ctx.globalAlpha = 1;
            } else {
                // Harmless obstacle (different phase) -> Ghostly, dashed outline
                ctx.globalAlpha = 0.15;
            }

            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

            if (!isActivePhase) {
                ctx.strokeStyle = ctx.fillStyle;
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.globalAlpha = 0.5;
                ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
                ctx.setLineDash([]);
            }

            ctx.globalAlpha = 1;

            if (isActivePhase) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(ob.x + 2, ob.y + 2, ob.w - 4, ob.h - 4);
            }
        }

        // Draw Player Ship (Diamond)
        ctx.fillStyle = activeColor;

        // Player Diamond
        ctx.beginPath();
        ctx.moveTo(s.px, s.y - PLAYER_SIZE);
        ctx.lineTo(s.px + PLAYER_SIZE, s.y);
        ctx.lineTo(s.px, s.y + PLAYER_SIZE);
        ctx.lineTo(s.px - PLAYER_SIZE, s.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(s.px, s.y - PLAYER_SIZE / 2);
        ctx.lineTo(s.px + PLAYER_SIZE / 2, s.y);
        ctx.lineTo(s.px, s.y + PLAYER_SIZE / 2);
        ctx.lineTo(s.px - PLAYER_SIZE / 2, s.y);
        ctx.closePath();
        ctx.fill();

        // Screen Flash Glitch Overlay (< 150ms transition)
        ctx.restore(); // reset translated position

        if (s.flashTime > 0) {
            ctx.fillStyle = activeColor;
            ctx.globalAlpha = s.flashTime * 2; // fade out fast (time max is 0.15)
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;

            // Chromatic Abberation slices
            ctx.fillStyle = C_B;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(0, H * 0.3, W, 20);
            ctx.fillStyle = C_A;
            ctx.fillRect(0, H * 0.6, W, 30);
            ctx.globalAlpha = 1;
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

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD') {
            draw();
            return;
        }

        if (s.flashTime > 0) {
            s.flashTime -= dt;
        }

        s.distance += s.speed * dt;
        s.speed += dt * 10; // Speed ramp up

        const currentScore = Math.floor(s.distance / 10);
        if (currentScore > s.score) {
            s.score = currentScore;
            setScore(currentScore);
            if (currentScore > 0 && currentScore % 50 === 0) animateScore();
        }

        // Move Obstacles
        const dDist = s.speed * dt;
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
            const ob = s.obstacles[i];
            ob.y += dDist;
            if (ob.y > H) s.obstacles.splice(i, 1);
        }

        // Spawn logic
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            s.spawnTimer = 0.9 - Math.min(0.5, s.speed / 2500); // Gets faster

            // Generate obstacle mixed pattern
            const mixChance = Math.random();
            const obPhase = mixChance > 0.5 ? 'A' : 'B';

            // Size mapping
            const obW = W * 0.5; // Always takes half width
            const isLeft = Math.random() > 0.5;

            s.obstacles.push({
                phase: obPhase,
                x: isLeft ? 0 : W - obW,
                y: -OBSTACLE_H,
                w: obW,
                h: OBSTACLE_H
            });

            // 20% chance to spawn overlapping/impossible-without-swap pair
            if (Math.random() > 0.8) {
                s.obstacles.push({
                    phase: obPhase === 'A' ? 'B' : 'A',
                    x: !isLeft ? 0 : W - obW,
                    y: -OBSTACLE_H,
                    w: obW,
                    h: OBSTACLE_H
                });
            }
        }

        // Collision Check
        const hitRadius = PLAYER_SIZE * 0.7;
        let collided = false;

        for (const ob of s.obstacles) {
            // ONLY check collision if they are in the exact same phase dimension
            if (ob.phase !== s.phase) continue;

            const rx = Math.max(ob.x, Math.min(s.px, ob.x + ob.w));
            const ry = Math.max(ob.y, Math.min(s.y, ob.y + ob.h));
            const dx = s.px - rx;
            const dy = s.y - ry;

            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                collided = true;
                break;
            }
        }

        if (collided) {
            statusRef.current = 'DEAD';
            setStatus('DEAD');
            saveScore(currentScore);
            triggerHaptic('heavy');
            spawnParticles('50%', '75%', '#ff1744', 40);
            triggerFloatingText('COLISIÓN', '50%', '60%', '#ff1744');
            draw();
            return;
        }

        draw();
    }, [draw, saveScore, triggerHaptic, spawnParticles, triggerFloatingText, animateScore]);

    const handlePointerDown = (e) => {
        e.preventDefault();

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD') {
            start();
            return;
        }

        if (statusRef.current === 'PLAYING') {
            const s = stateRef.current;
            s.phase = s.phase === 'A' ? 'B' : 'A';
            s.flashTime = 0.15; // 150ms visual glitch/flash

            triggerHaptic('light');

            // Phase burst
            const activeColor = s.phase === 'A' ? C_A : C_B;
            spawnParticles('50%', '75%', activeColor, 8);
        }
    };

    const start = useCallback(() => {
        stateRef.current = makeState();
        stateRef.current.lastTime = performance.now();
        setScore(0);
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
            title="Phase Runner"
            score={score}
            scoreLabel="Distancia"
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Sobrevive al vacío cuántico. Toca para cambiar tu fase dimensional."
            gameId="phaserunner"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div
                    style={{
                        position: 'relative',
                        width: 'min(92vw, 400px)',
                        aspectRatio: '9/16',
                        maxHeight: '60vh',
                        background: 'rgba(4,4,10,1)',
                        borderRadius: 24,
                        border: '2px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                        touchAction: 'none'
                    }}
                    onPointerDown={handlePointerDown}
                >
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                    />

                    {/* Interaction Overlay layer for text only */}
                    {status === 'IDLE' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.9)',
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                fontWeight: 900,
                                fontSize: '1.2rem',
                                animation: 'pulse 1.5s infinite'
                            }}>Toca para iniciar</span>
                        </div>
                    )}
                </div>

                {/* Visual Legend for accessibility */}
                <div style={{
                    width: 'min(92vw, 400px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, background: C_A, boxShadow: `0 0 10px ${C_A}`, borderRadius: '50%' }} />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1 }}>FASE A</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>⇄</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, background: C_B, boxShadow: `0 0 10px ${C_B}`, borderRadius: '50%' }} />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1 }}>FASE B</span>
                    </div>
                </div>
            </div>
        </ArcadeShell>
    );
}

export default function PhaseRunner() {
    return (
        <GameImmersiveLayout>
            <PhaseRunnerInner />
        </GameImmersiveLayout>
    );
}
