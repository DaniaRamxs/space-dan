import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 800;
const H = 400; // Landscape orientation for a dash game
const PLAYER_R = 15;
const OBSTACLE_R = 20;

const C_POS = '#00e5ff'; // Cyan (+)
const C_NEG = '#ff00ff'; // Magenta (-)

function makeState() {
    return {
        mode: '+', // '+' or '-'
        p: { x: W * 0.2, y: H / 2, vy: 0 }, // Engine auto horizontal, player moves vertical
        speedX: 300,
        distance: 0,
        obstacles: [],
        lastTime: 0,
        spawnTimer: 0,
        score: 0
    };
}

function MagnetDashInner() {
    const [status, setStatus] = useState('IDLE'); // IDLE, PLAYING, DEAD
    const [score, setScore] = useState(0);
    const [best, saveScore] = useHighScore('magnet');

    const statusRef = useRef('IDLE');
    const stateRef = useRef(makeState());

    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;
        const isPos = s.mode === '+';
        const pColor = isPos ? C_POS : C_NEG;

        // Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        // Grid (Horizontal scrolling)
        ctx.strokeStyle = `rgba(255,255,255, 0.03)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cellSize = 50;
        const offset = (s.distance) % cellSize;
        for (let i = 0; i < W + cellSize; i += cellSize) {
            ctx.moveTo(i - offset, 0);
            ctx.lineTo(i - offset, H);
        }
        for (let i = 0; i < H; i += cellSize) {
            ctx.moveTo(0, i);
            ctx.lineTo(W, i);
        }
        ctx.stroke();

        // Magnetic Field lines (subtle UI)
        ctx.beginPath();
        for (let i = 0; i < H; i += 30) {
            ctx.moveTo(0, i + Math.sin(s.distance * 0.01 + i) * 10);
            ctx.lineTo(W, i + Math.sin(s.distance * 0.01 + i + W) * 10);
        }
        ctx.strokeStyle = isPos ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 0, 255, 0.05)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Player (Circle with sign)
        ctx.fillStyle = pColor;
        ctx.shadowColor = pColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(s.p.x, s.p.y, PLAYER_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#111';
        ctx.font = '900 20px "Outfit"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.mode, s.p.x, s.p.y + 2); // Small vertical tweak for font

        // Draw Player Engine Thrust
        ctx.fillStyle = `rgba(${isPos ? '0,229,255' : '255,0,255'}, 0.4)`;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(s.p.x - PLAYER_R - 5 - Math.random() * 15, s.p.y - 3 + Math.random() * 6, 4 + Math.random() * 8, 4);
        }

        // Draw Obstacles
        for (const ob of s.obstacles) {
            const obCol = ob.mode === '+' ? C_POS : C_NEG;

            ctx.fillStyle = obCol;
            ctx.beginPath();
            ctx.arc(ob.x, ob.y, OBSTACLE_R, 0, Math.PI * 2);
            ctx.fill();

            // Core sign
            ctx.fillStyle = '#050508';
            ctx.font = '900 24px "Outfit"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ob.mode, ob.x, ob.y + 2);

            // Magnetic aura interactions (Visual calculation only)
            const dx = s.p.x - ob.x;
            const dy = s.p.y - ob.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
                const isSame = s.mode === ob.mode;
                ctx.strokeStyle = isSame ? 'rgba(255, 50, 50, 0.3)' : 'rgba(50, 255, 50, 0.3)'; // Red repulse, Green attract
                ctx.setLineDash(isSame ? [5, 5] : []); // Solid line attracts, dashed repulses
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(s.p.x, s.p.y);
                ctx.lineTo(ob.x, ob.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw Bounds Warning (Top and Bottom)
        if (s.p.y < H * 0.1 || s.p.y > H * 0.9) {
            ctx.fillStyle = 'rgba(255,0,0,0.1)';
            ctx.fillRect(0, 0, W, H);
        }

    }, []);

    const tick = useCallback((time) => {
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        let dt = (time - s.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        s.lastTime = time;

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD') {
            draw();
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        // Speed ramps up
        s.speedX += dt * 5;
        s.distance += s.speedX * dt;

        const currentScore = Math.floor(s.distance / 10);
        if (currentScore > s.score) {
            s.score = currentScore;
            setScore(currentScore);
            if (currentScore > 0 && currentScore % 100 === 0) animateScore();
        }

        // Magnetic Physics
        let forceY = 0;
        const MAG_STR = 150000; // Magnetic field strength constant

        for (const ob of s.obstacles) {
            const dx = s.p.x - ob.x;
            const dy = s.p.y - ob.y;
            const distSq = dx * dx + dy * dy;

            // Only interact if within influence radius (prevent global chaos)
            if (distSq < 25000) {
                const dist = Math.sqrt(distSq);
                const force = MAG_STR / Math.max(distSq, 100); // Inverse square law, capped to prevent inf

                // Opposite attract, Same repel
                const direction = s.mode === ob.mode ? 1 : -1;

                // We only care about Y force mostly since X is auto-scrolling
                const normalizedYDir = dy / dist;
                forceY += force * direction * normalizedYDir;
            }
        }

        // Apply physics
        s.p.vy += forceY * dt;

        // Add some dampening/friction to Y velocity so it doesn't spiral
        s.p.vy *= 0.95;

        s.p.y += s.p.vy * dt;

        // Collision logic with Walls
        if (s.p.y < PLAYER_R || s.p.y > H - PLAYER_R) {
            let hitY = s.p.y < PLAYER_R ? 0 : H;
            handleDeath(s.p.x, hitY);
            return;
        }

        // Obstacles scroll left
        const dDist = s.speedX * dt;
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
            const ob = s.obstacles[i];
            ob.x -= dDist;
            if (ob.x < -OBSTACLE_R) s.obstacles.splice(i, 1);
        }

        // Collision with Obstacles
        const hitRadius = PLAYER_R + OBSTACLE_R - 5; // Slight forgiveness
        for (const ob of s.obstacles) {
            const dx = s.p.x - ob.x;
            const dy = s.p.y - ob.y;
            if (dx * dx + dy * dy < hitRadius * hitRadius) {
                handleDeath(s.p.x + (ob.x - s.p.x) / 2, s.p.y + (ob.y - s.p.y) / 2); // roughly midpoint
                return;
            }
        }

        // Spawning logic (Procedural Maze Corridors)
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) {
            s.spawnTimer = 1.2 - Math.min(0.8, s.speedX / 1000);

            // Spawn gates or blocks
            const type = Math.random();
            const spawnX = W + OBSTACLE_R;

            if (type > 0.5) {
                // Spawn a twin gate
                const gapCenter = H * 0.3 + Math.random() * (H * 0.4);
                s.obstacles.push({ mode: '+', x: spawnX, y: gapCenter - 90 });
                s.obstacles.push({ mode: '-', x: spawnX, y: gapCenter + 90 });
            } else {
                // Spawn a single central hazard
                s.obstacles.push({
                    mode: Math.random() > 0.5 ? '+' : '-',
                    x: spawnX,
                    y: H * 0.2 + Math.random() * (H * 0.6)
                });
            }
        }

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, saveScore, triggerHaptic, spawnParticles, triggerFloatingText, animateScore]);

    const handleDeath = useCallback((x, y) => {
        const s = stateRef.current;
        statusRef.current = 'DEAD';
        setStatus('DEAD');
        saveScore(s.score);
        triggerHaptic('heavy');

        const pxPercent = `${(x / W) * 100}%`;
        const pyPercent = `${(y / H) * 100}%`;
        spawnParticles(pxPercent, pyPercent, '#ff1744', 50);
        triggerFloatingText('CORTO CIRCUITO', pxPercent, pyPercent, '#ff1744');

        draw();
    }, [saveScore, triggerHaptic, spawnParticles, triggerFloatingText, draw]);

    const handlePointerDown = (e) => {
        e.preventDefault();

        if (statusRef.current === 'IDLE' || statusRef.current === 'DEAD') {
            start();
            return;
        }

        if (statusRef.current === 'PLAYING') {
            const s = stateRef.current;
            // Swap polarity
            s.mode = s.mode === '+' ? '-' : '+';
            triggerHaptic('light');

            // Burst around player to show swap
            const pColor = s.mode === '+' ? C_POS : C_NEG;
            const pxPercent = `${(s.p.x / W) * 100}%`;
            const pyPercent = `${(s.p.y / H) * 100}%`;
            spawnParticles(pxPercent, pyPercent, pColor, 10);
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
            title="Magnet Dash"
            score={score}
            scoreLabel="Distancia"
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Sobrevive al magnetismo. Toca la pantalla para invertir tu polaridad (+/-)."
            gameId="magnetdash"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div
                    style={{
                        position: 'relative',
                        width: 'min(96vw, 600px)',
                        aspectRatio: '16/9',
                        maxHeight: '40vh',
                        background: 'rgba(4,4,10,1)',
                        borderRadius: 24,
                        border: '2px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,229,255,0.05)',
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
                            }}>Toca para arrancar</span>
                        </div>
                    )}
                </div>

                {/* Visual Legend for accessibility */}
                <div style={{
                    width: 'min(96vw, 600px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1 }}>Polaridades</span>
                    <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, background: C_POS, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '10px', fontWeight: 900 }}>+</div>
                        <span style={{ color: C_POS, fontSize: '0.8rem', fontWeight: 700 }}>POSITIVA</span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, background: C_NEG, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '10px', fontWeight: 900 }}>-</div>
                        <span style={{ color: C_NEG, fontSize: '0.8rem', fontWeight: 700 }}>NEGATIVA</span>
                    </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '80%' }}>
                    Opuestos se <b>Atraen</b>. Iguales se <b>Repelen</b>.<br />Controla la repulsión para no chocar ni tocar los bordes.
                </p>
            </div>
        </ArcadeShell>
    );
}

export default function MagnetDash() {
    return (
        <GameImmersiveLayout>
            <MagnetDashInner />
        </GameImmersiveLayout>
    );
}
