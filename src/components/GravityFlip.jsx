import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 400;
const H = 700;
const PLAYER_SIZE = 24;
const GRAVITY_MAG = 4500; // Horizontal gravity (px/s^2)
const OBSTACLE_H = 30;
const SPEED_BASE = 400; // Vertical falling speed (px/s)

const C_CYN = '#00e5ff';

const makeState = () => ({
    p: { x: W / 2 - PLAYER_SIZE / 2, y: 150, vx: 0, gravity: GRAVITY_MAG },
    obstacles: [],
    timeAlive: 0,
    speed: SPEED_BASE,
    lastTime: 0,
    spawnTimer: 0,
});

function GravityFlipInner() {
    const [status, setStatus] = useState('IDLE');
    const [score, setScore] = useState(0);
    const [best, saveScore] = useHighScore('gravityflip');

    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(makeState());

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const handlePointerDown = (e) => {
        e.preventDefault();
        if (status === 'IDLE' || status === 'DEAD') {
            start();
            return;
        }
        if (status === 'PLAYING') {
            const s = stateRef.current;
            // Invert horizontal gravity
            s.p.gravity = s.p.gravity > 0 ? -GRAVITY_MAG : GRAVITY_MAG;

            const px = (s.p.x / W) * 100 + '%';
            const py = (s.p.y / H) * 100 + '%';
            spawnParticles(px, py, s.p.gravity > 0 ? '#ff00ff' : C_CYN, 5);
            triggerHaptic('light');
        }
    };

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;

        ctx.clearRect(0, 0, W, H);

        // Dynamic background grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cellSize = 60;
        for (let i = 0; i < W; i += cellSize) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, H);
        }
        // Vertical scrolling lines to simulate falling
        const offset = (s.timeAlive * s.speed) % cellSize;
        for (let i = 0; i < H + cellSize; i += cellSize) {
            ctx.moveTo(0, i - offset);
            ctx.lineTo(W, i - offset);
        }
        ctx.stroke();

        // Side Walls glow based on gravity direction
        ctx.fillStyle = s.p.gravity < 0 ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 0, 255, 0.15)';
        if (s.p.gravity < 0) ctx.fillRect(0, 0, 10, H);
        else ctx.fillRect(W - 10, 0, 10, H);

        // Draw obstacles
        for (const ob of s.obstacles) {
            const grad = ctx.createLinearGradient(ob.x, 0, ob.x + ob.w, 0);
            grad.addColorStop(0, 'rgba(255, 23, 68, 0.9)');
            grad.addColorStop(1, 'rgba(255, 23, 68, 0.3)');

            ctx.fillStyle = grad;
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 15;
            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

            ctx.strokeStyle = '#ff1744';
            ctx.lineWidth = 2;
            ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
        }
        ctx.shadowBlur = 0;

        // Draw player trail
        ctx.fillStyle = s.p.gravity < 0 ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 0, 255, 0.2)';
        ctx.fillRect(s.p.x - Math.max(0, s.p.vx * 0.02), s.p.y - 15, Math.abs(s.p.vx) * 0.02 + PLAYER_SIZE, PLAYER_SIZE * 1.5);

        // Draw player
        ctx.fillStyle = s.p.gravity < 0 ? '#00e5ff' : '#ff00ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 20;

        // Player is a diamond/rocket shape
        ctx.beginPath();
        const px = s.p.x + PLAYER_SIZE / 2;
        const py = s.p.y + PLAYER_SIZE / 2;
        // Stretch horizontally based on horizontal velocity
        const stretch = Math.min(Math.abs(s.p.vx) / 150, 10);
        ctx.moveTo(px, py - PLAYER_SIZE / 2);
        ctx.lineTo(px + PLAYER_SIZE / 2 + stretch, py);
        ctx.lineTo(px, py + PLAYER_SIZE / 2);
        ctx.lineTo(px - PLAYER_SIZE / 2 - stretch, py);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.fillRect(px - 3, py - 3, 6, 6);
        ctx.shadowBlur = 0;

    }, []);

    const tick = useCallback((time) => {
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        const dt = Math.min((time - s.lastTime) / 1000, 0.1); // cap dt
        s.lastTime = time;

        // Physics
        s.p.vx += s.p.gravity * dt;
        s.p.x += s.p.vx * dt;

        if (s.p.x > W - PLAYER_SIZE) {
            s.p.x = W - PLAYER_SIZE;
            s.p.vx = 0;
        }
        if (s.p.x < 0) {
            s.p.x = 0;
            s.p.vx = 0;
        }

        // Progression
        s.timeAlive += dt;
        s.speed += dt * 15; // Speed increases

        const currentScore = Math.floor(s.timeAlive * 10);
        if (currentScore > score) {
            setScore(currentScore);
            if (currentScore % 100 === 0) animateScore();
        }

        // Scroll obstacles up
        const dDist = s.speed * dt;
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
            const ob = s.obstacles[i];
            ob.y -= dDist;
            if (ob.y + ob.h < 0) {
                s.obstacles.splice(i, 1);
            }
        }

        // Spawn obstacles
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            s.spawnTimer = 0.8 + Math.random() * 0.6 - (s.speed / 2000);
            if (s.spawnTimer < 0.3) s.spawnTimer = 0.3;

            const isLeft = Math.random() > 0.5;
            const w = W * 0.4 + Math.random() * (W * 0.35);

            s.obstacles.push({
                x: isLeft ? 0 : W - w,
                y: H,
                w: w,
                h: OBSTACLE_H
            });
        }

        // Collision Check
        const pRect = { left: s.p.x + 4, right: s.p.x + PLAYER_SIZE - 4, top: s.p.y + 4, bottom: s.p.y + PLAYER_SIZE - 4 };
        let colliding = false;
        for (const ob of s.obstacles) {
            if (
                pRect.right > ob.x &&
                pRect.left < ob.x + ob.w &&
                pRect.bottom > ob.y &&
                pRect.top < ob.y + ob.h
            ) {
                colliding = true;
                break;
            }
        }

        if (colliding) {
            setStatus('DEAD');
            triggerHaptic('heavy');
            spawnParticles(`${(s.p.x / W) * 100}%`, `${(s.p.y / H) * 100}%`, '#ff1744', 40);
            triggerFloatingText('💥', `${(s.p.x / W) * 100}%`, `${(s.p.y / H) * 100}%`, '#ff1744');
            saveScore(currentScore);
            draw();
            return;
        }

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, score, saveScore, triggerHaptic, spawnParticles, triggerFloatingText, animateScore]);

    const start = useCallback(() => {
        stateRef.current = makeState();
        stateRef.current.lastTime = performance.now();
        setScore(0);
        setStatus('PLAYING');
        triggerHaptic('medium');
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [tick, triggerHaptic]);

    useEffect(() => {
        stateRef.current = makeState();
        setStatus('IDLE');
        draw();
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [draw]);

    return (
        <ArcadeShell
            title="Gravity Flip"
            score={score}
            scoreLabel="Tiempo"
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="El vacío te atrae. Toca la pantalla para invertir la gravedad horizontal."
            gameId="gravityflip"
        >
            <div
                style={{
                    position: 'relative',
                    width: 'min(92vw, 420px)',
                    aspectRatio: '9/16',
                    maxHeight: '70vh',
                    background: 'rgba(4,4,10,0.8)',
                    borderRadius: 24,
                    padding: 6,
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(8px)',
                    touchAction: 'none'
                }}
                onPointerDown={handlePointerDown}
            >
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    style={{ width: '100%', height: '100%', display: 'block', borderRadius: 18 }}
                />
                {status === 'IDLE' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)' }}>
                        <span style={{
                            color: 'rgba(255,255,255,0.8)',
                            letterSpacing: 2,
                            textTransform: 'uppercase',
                            fontWeight: 900,
                            fontSize: '1.2rem',
                            textShadow: '0 0 10px rgba(0,229,255,0.5)',
                            animation: 'pulse 2s infinite'
                        }}>Toca para iniciar</span>
                    </div>
                )}
            </div>
        </ArcadeShell>
    );
}

export default function GravityFlip() {
    return (
        <GameImmersiveLayout>
            <GravityFlipInner />
        </GameImmersiveLayout>
    );
}
