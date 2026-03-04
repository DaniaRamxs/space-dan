import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 400;
const H = 700;
const PLAYER_R = 15;
const PLAY_TIME = 10; // strictly 10 seconds

function makeState() {
    return {
        p: { x: W / 2, y: H * 0.72, vx: 600 }, // vx is horizontal speed
        obstacles: [],
        distance: 0,
        speed: 800, // vertical falling speed
        timeAlive: 0,
        lastTime: 0,
        spawnTimer: 0,
    };
}

function TenSecondsHeroInner() {
    const [status, setStatus] = useState('IDLE'); // IDLE, PLAYING, DEAD, WIN
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(PLAY_TIME);
    const [best, saveScore] = useHighScore('10sec');

    const statusRef = useRef('IDLE');
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef(makeState());

    const [tapActive, setTapActive] = useState(false);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;

        // Clear and background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        // Grid lines moving super fast
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cellSize = 100;
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

        // Intensity vignette based on timeAlive
        const intensity = s.timeAlive / PLAY_TIME; // 0 to 1
        if (intensity > 0) {
            const radGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.8);
            radGrad.addColorStop(0, 'transparent');
            radGrad.addColorStop(1, `rgba(255, 0, 255, ${intensity * 0.3})`);
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, W, H);
        }

        // Draw Obstacles
        for (const ob of s.obstacles) {
            ctx.fillStyle = '#ff1744';
            ctx.shadowColor = '#ff1744';
            ctx.shadowBlur = 15 + intensity * 20;
            ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

            // Core
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.fillRect(ob.x + 2, ob.y + 2, ob.w - 4, ob.h - 4);
        }

        // Draw Player Ship (Triangle)
        ctx.save();
        ctx.translate(s.p.x, s.p.y);

        // Tilt based on direction
        const tilt = (s.p.vx > 0 ? 1 : -1) * 0.2;
        ctx.rotate(tilt);

        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 20 + intensity * 15;
        ctx.fillStyle = '#00e5ff';

        ctx.beginPath();
        ctx.moveTo(0, -PLAYER_R * 1.5);
        ctx.lineTo(PLAYER_R, PLAYER_R);
        ctx.lineTo(-PLAYER_R, PLAYER_R);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -PLAYER_R + 5);
        ctx.lineTo(PLAYER_R / 2, PLAYER_R / 2);
        ctx.lineTo(-PLAYER_R / 2, PLAYER_R / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Thruster particles tail
        ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(s.p.x - 3 + Math.random() * 6, s.p.y + PLAYER_R + Math.random() * 20, 3, 3);
        }

    }, []);

    const tick = useCallback((time) => {
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        let dt = (time - s.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        s.lastTime = time;

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD' || statusRef.current === 'WIN') {
            draw();
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        s.timeAlive += dt;

        let remaining = Math.max(0, PLAY_TIME - s.timeAlive);
        setTimeLeft(Math.ceil(remaining));

        if (s.timeAlive >= PLAY_TIME) {
            // WIN EVENT
            s.timeAlive = PLAY_TIME;
            statusRef.current = 'WIN';
            setStatus('WIN');
            const totalScore = Math.floor(s.distance);
            setScore(totalScore);
            saveScore(totalScore);
            triggerHaptic('heavy');
            spawnParticles('50%', '50%', '#00e5ff', 50);
            triggerFloatingText('¡SOBREVIVISTE!', '50%', '40%', '#00e5ff');
            draw();
            return;
        }

        // Speed ramp up over the 10 seconds
        s.speed = 800 + (s.timeAlive / PLAY_TIME) * 1200; // max 2000 px/s

        // Horizontal movement
        s.p.x += s.p.vx * dt;

        // Bounce off walls
        if (s.p.x < PLAYER_R) {
            s.p.x = PLAYER_R;
            s.p.vx = Math.abs(s.p.vx);
        } else if (s.p.x > W - PLAYER_R) {
            s.p.x = W - PLAYER_R;
            s.p.vx = -Math.abs(s.p.vx);
        }

        s.distance += s.speed * dt;
        setScore(Math.floor(s.distance));

        // Obstacles scroll down
        const dDist = s.speed * dt;
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
            const ob = s.obstacles[i];
            ob.y += dDist;
            if (ob.y > H) s.obstacles.splice(i, 1);
        }

        // Spawning obstacles
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            // Spawn interval decreases as time goes on
            s.spawnTimer = 0.5 - (s.timeAlive / PLAY_TIME) * 0.35; // ranges from 0.5 down to 0.15

            // Random block on left or right, occupying 60% of width
            const isLeft = Math.random() > 0.5;
            const obW = W * 0.65; // Make it extremely tight to dodge

            s.obstacles.push({
                x: isLeft ? 0 : W - obW,
                y: -50,
                w: obW,
                h: 40
            });
        }

        // Collision logic
        const hitRadius = PLAYER_R * 0.6; // forgiving hitbox
        let collided = false;
        for (const ob of s.obstacles) {
            // simple AABB vs Circle
            const rx = Math.max(ob.x, Math.min(s.p.x, ob.x + ob.w));
            const ry = Math.max(ob.y, Math.min(s.p.y, ob.y + ob.h));
            const dx = s.p.x - rx;
            const dy = s.p.y - ry;
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                collided = true;
                break;
            }
        }

        if (collided) {
            statusRef.current = 'DEAD';
            setStatus('DEAD');
            const totalScore = Math.floor(s.distance);
            saveScore(totalScore);
            triggerHaptic('heavy');
            spawnParticles(`${(s.p.x / W) * 100}%`, `${(s.p.y / H) * 100}%`, '#ff1744', 40);
            triggerFloatingText('ELIMINADO', `${(s.p.x / W) * 100}%`, `${(s.p.y / H) * 100}%`, '#ff1744');
            draw();
            return;
        }

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, saveScore, triggerHaptic, spawnParticles, triggerFloatingText]);

    const handlePointerDown = (e) => {
        e.preventDefault();
        setTapActive(true);

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD' || statusRef.current === 'WIN') {
            start();
            return;
        }

        if (statusRef.current === 'PLAYING') {
            // Invert horizontal velocity instantly
            stateRef.current.p.vx *= -1;
            triggerHaptic('light');

            // tiny particle effect on tap position
            const px = (stateRef.current.p.x / W) * 100 + '%';
            const py = (stateRef.current.p.y / H) * 100 + '%';
            spawnParticles(px, py, '#00e5ff', 4);
        }
    };

    const handlePointerUp = (e) => {
        e.preventDefault();
        setTapActive(false);
    };

    const start = useCallback(() => {
        stateRef.current = makeState();
        stateRef.current.lastTime = performance.now();
        setScore(0);
        setTimeLeft(PLAY_TIME);
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
            title="10s Hero"
            score={score}
            scoreLabel="Distancia"
            bestScore={best}
            status={status}
            onRetry={start}
            timeLeft={status !== 'IDLE' ? timeLeft : PLAY_TIME}
            totalTime={PLAY_TIME}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Aguanta 10 segundos. Toca la zona para esquivar."
            gameId="10sec"
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
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,229,255,0.05)',
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

                    {/* Giant Tap Overlay Zone for Mobile */}
                    <div
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        style={{
                            position: 'absolute', inset: 0,
                            zIndex: 10,
                            background: tapActive ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        {status === 'IDLE' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                                <span style={{
                                    color: 'rgba(255,255,255,0.9)',
                                    letterSpacing: 2,
                                    textTransform: 'uppercase',
                                    fontWeight: 900,
                                    fontSize: '1.2rem',
                                    animation: 'pulse 1.5s infinite'
                                }}>Toca para esquivar</span>
                            </div>
                        )}
                        {(status === 'DEAD' || status === 'WIN') && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                                <h1 style={{
                                    fontSize: '3rem',
                                    margin: 0,
                                    color: status === 'WIN' ? '#00e5ff' : '#ff1744',
                                    textShadow: `0 0 20px ${status === 'WIN' ? '#00e5ff' : '#ff1744'}`
                                }}>
                                    {status === 'WIN' ? '¡HÉROE!' : 'R.I.P.'}
                                </h1>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Bar */}
                <div style={{
                    width: 'min(92vw, 400px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '12px 20px',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>Sobrevive</span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: timeLeft <= 3 ? '#ff1744' : '#fff', textShadow: timeLeft <= 3 ? '0 0 15px #ff1744' : 'none' }}>
                        {timeLeft.toFixed(0)}s
                    </span>
                </div>
            </div>
        </ArcadeShell>
    );
}

export default function TenSecondsHero() {
    return (
        <GameImmersiveLayout>
            <TenSecondsHeroInner />
        </GameImmersiveLayout>
    );
}
