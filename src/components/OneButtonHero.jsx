import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 8
const FRAME_MS = 1000 / 60;
const H = 400;
const PLAYER_SIZE = 30;
const GRAVITY_MAG = 2200; // pixels per second squared
const OBSTACLE_W = 50;
const SPEED_BASE = 450; // pixels per second

const makeState = () => ({
    p: { x: 100, y: H - PLAYER_SIZE, vy: 0, gravity: GRAVITY_MAG },
    obstacles: [],
    distance: 0,
    speed: SPEED_BASE,
    lastTime: 0,
    spawnTimer: 0,
});

function OneButtonHeroInner() {
    const [status, setStatus] = useState('IDLE');
    const [score, setScore] = useState(0);
    const [best, saveScore] = useHighScore('hero');

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
            // Flip gravity
            s.p.gravity = s.p.gravity > 0 ? -GRAVITY_MAG : GRAVITY_MAG;

            const rect = canvasRef.current.getBoundingClientRect();
            const x = (s.p.x / W) * 100 + '%';
            const y = (s.p.y / H) * 100 + '%';

            spawnParticles(x, y, s.p.gravity > 0 ? '#00e5ff' : '#ff00ff', 6);
            triggerHaptic('light');
        }
    };

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;

        ctx.clearRect(0, 0, W, H);

        // Dynamic grid based on speed
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cellSize = 50;
        for (let i = 0; i < W + cellSize; i += cellSize) {
            const offset = (s.distance % cellSize);
            ctx.moveTo(i - offset, 0);
            ctx.lineTo(i - offset, H);
        }
        for (let i = 0; i < H; i += cellSize) {
            ctx.moveTo(0, i);
            ctx.lineTo(W, i);
        }
        ctx.stroke();

        // Floor and Ceiling Glows based on gravity
        ctx.fillStyle = s.p.gravity > 0 ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 0, 255, 0.1)';
        if (s.p.gravity > 0) ctx.fillRect(0, H - 8, W, 8);
        else ctx.fillRect(0, 0, W, 8);

        // Draw obstacles
        for (const ob of s.obstacles) {
            // Glow and internal gradient for obstacles
            const grad = ctx.createLinearGradient(0, ob.y, 0, ob.y + ob.h);
            grad.addColorStop(0, 'rgba(255, 23, 68, 0.8)');
            grad.addColorStop(1, 'rgba(255, 23, 68, 0.2)');

            ctx.fillStyle = grad;
            ctx.fillRect(ob.x, ob.y, OBSTACLE_W, ob.h);

            // Cyber border
            ctx.strokeStyle = 'rgba(255, 23, 68, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(ob.x, ob.y, OBSTACLE_W, ob.h);
        }

        // Draw player trail
        ctx.fillStyle = s.p.gravity > 0 ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 0, 255, 0.2)';
        ctx.fillRect(s.p.x - 30, s.p.y + Math.abs(s.p.vy) * 0.01, PLAYER_SIZE, PLAYER_SIZE);

        // Draw player
        ctx.fillStyle = s.p.gravity > 0 ? '#00e5ff' : '#ff00ff';

        // Slight squish effect based on vertical velocity
        const squish = Math.min(Math.abs(s.p.vy) / 100, 10);
        const renderH = PLAYER_SIZE + squish;
        const renderW = PLAYER_SIZE - squish * 0.5;

        ctx.fillRect(s.p.x + (PLAYER_SIZE - renderW) / 2, s.p.y, renderW, renderH);
        ctx.fillStyle = '#fff';
        ctx.fillRect(s.p.x + (PLAYER_SIZE - renderW) / 2 + 4, s.p.y + 4, 8, 8);

    }, []);

    const tick = useCallback((time) => {
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        const dt = Math.min((time - s.lastTime) / 1000, 0.1); // cap dt
        s.lastTime = time;

        // Physics
        s.p.vy += s.p.gravity * dt;
        s.p.y += s.p.vy * dt;

        if (s.p.y > H - PLAYER_SIZE) {
            s.p.y = H - PLAYER_SIZE;
            s.p.vy = 0;
        }
        if (s.p.y < 0) {
            s.p.y = 0;
            s.p.vy = 0;
        }

        // Scroll
        const dDist = s.speed * dt;
        s.distance += dDist;
        s.speed += dt * 4; // slowly increase speed

        // Score update (every 100 pixels = 1 point)
        const newScore = Math.floor(s.distance / 100);
        if (newScore > score) {
            setScore(newScore);
            if (newScore % 50 === 0) animateScore();
        }

        // Spawn obstacles
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            s.spawnTimer = 1.2 + Math.random() * 0.8 - (s.speed / 1500); // gets faster
            if (s.spawnTimer < 0.45) s.spawnTimer = 0.45;

            const isTop = Math.random() > 0.5;

            // Determine height between 30% and 65% of screen
            const minH = H * 0.3;
            const maxH = H * 0.65;
            const h = minH + Math.random() * (maxH - minH);

            s.obstacles.push({
                x: W,
                y: isTop ? 0 : H - h,
                h: h
            });
        }

        // Update obstacles
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
            const ob = s.obstacles[i];
            ob.x -= dDist;
            if (ob.x + OBSTACLE_W < 0) {
                s.obstacles.splice(i, 1);
            }
        }

        // Collision
        const pRect = { left: s.p.x + 4, right: s.p.x + PLAYER_SIZE - 4, top: s.p.y + 4, bottom: s.p.y + PLAYER_SIZE - 4 };
        let colliding = false;
        for (const ob of s.obstacles) {
            if (
                pRect.right > ob.x &&
                pRect.left < ob.x + OBSTACLE_W &&
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
            spawnParticles('20%', `${(s.p.y / H) * 100}%`, '#ff1744', 30);
            triggerFloatingText('CRITICAL HIT', '20%', '40%', '#ff1744');
            saveScore(newScore);
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
            title="Neon Dash"
            score={score}
            scoreLabel="Metros"
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Corre sin parar. Toca la pantalla para invertir la gravedad."
            gameId="hero"
        >
            <div
                style={{
                    position: 'relative',
                    width: 'min(92vw, 800px)',
                    aspectRatio: '2/1',
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
                            fontSize: '1rem',
                            textShadow: '0 0 10px rgba(0,229,255,0.5)',
                            animation: 'pulse 2s infinite'
                        }}>Toca para iniciar</span>
                    </div>
                )}
            </div>
        </ArcadeShell>
    );
}

export default function OneButtonHero() {
    return (
        <GameImmersiveLayout>
            <OneButtonHeroInner />
        </GameImmersiveLayout>
    );
}
