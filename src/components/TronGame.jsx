import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const GRID = 16;
const C_P1 = '#00e5ff'; // Cyan
const C_P2 = '#ff00ff'; // Magenta

function makeGrid() {
    return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function makeState() {
    return {
        phase: 'PLAYING',
        grid: makeGrid(),
        p1: { x: 2, y: Math.floor(GRID / 2), dx: 1, dy: 0 },
        p2: { x: GRID - 3, y: Math.floor(GRID / 2), dx: -1, dy: 0 },
        winner: null,
        speed: 6,
        frame: 0,
    };
}

function aiMove(p2, p1, grid) {
    const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    const valid = dirs.filter(d => !(d.dx === -p2.dx && d.dy === -p2.dy));

    const ranked = valid.map(d => {
        const nx = p2.x + d.dx, ny = p2.y + d.dy;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || grid[ny][nx] !== 0)
            return { d, score: -999 };

        // Look ahead for space
        let space = 0;
        const q = [[nx, ny]];
        const v = new Set([`${nx},${ny}`]);
        while (q.length > 0 && space < 10) {
            const [cx, cy] = q.shift();
            dirs.forEach(({ dx, dy }) => {
                const tx = cx + dx, ty = cy + dy;
                if (tx >= 0 && tx < GRID && ty >= 0 && ty < GRID && grid[ty][tx] === 0 && !v.has(`${tx},${ty}`)) {
                    v.add(`${tx},${ty}`);
                    q.push([tx, ty]);
                    space++;
                }
            });
        }

        const distToPlayer = Math.abs(nx - p1.x) + Math.abs(ny - p1.y);
        return { d, score: space * 10 - distToPlayer * 0.5 };
    }).sort((a, b) => b.score - a.score);

    return ranked[0]?.d ?? { dx: p2.dx, dy: p2.dy };
}

function TronGameInner() {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const rafRef = useRef(null);
    const keysRef = useRef({});
    const cellRef = useRef(20);

    const [best, saveScore] = useHighScore('tron');
    const [status, setStatus] = useState('IDLE');
    const [score, setScore] = useState(0);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const updateCellSize = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const maxW = Math.min(el.clientWidth - 48, 380);
        cellRef.current = Math.floor(maxW / GRID);
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = GRID * cellRef.current;
            canvas.height = GRID * cellRef.current;
        }
    }, []);

    const draw = useCallback((now) => {
        const canvas = canvasRef.current;
        if (!canvas || !stateRef.current) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;
        const C = cellRef.current;
        const GW = GRID * C, GH = GRID * C;

        ctx.clearRect(0, 0, GW, GH);

        // Digital Grid
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID; i++) {
            ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, GH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(GW, i * C); ctx.stroke();
        }

        // Trails with Glow
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const v = s.grid[y][x];
                if (!v) continue;
                const color = v === 1 ? C_P1 : C_P2;
                ctx.shadowBlur = 12;
                ctx.shadowColor = color;
                ctx.fillStyle = `${color}dd`;
                ctx.beginPath();
                ctx.roundRect(x * C + 2, y * C + 2, C - 4, C - 4, 3);
                ctx.fill();
            }
        }
        ctx.shadowBlur = 0;

        // Heads (Light Cycles)
        const pulse = Math.sin(now / 150) * 5;
        const drawHead = (p, color) => {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = color;
            ctx.shadowBlur = 20 + pulse;
            ctx.beginPath();
            ctx.roundRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2, 4);
            ctx.fill();

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
        };

        if (s.phase === 'PLAYING') {
            drawHead(s.p1, C_P1);
            drawHead(s.p2, C_P2);
        }
    }, []);

    const tick = useCallback((now) => {
        const s = stateRef.current;
        if (!s || s.phase !== 'PLAYING') return;

        s.frame++;
        if (s.frame % s.speed === 0) {
            const k = keysRef.current;
            let changed = false;

            // Player Input
            if ((k.ArrowUp || k.w) && s.p1.dy === 0) { s.p1.dx = 0; s.p1.dy = -1; changed = true; }
            else if ((k.ArrowDown || k.s) && s.p1.dy === 0) { s.p1.dx = 0; s.p1.dy = 1; changed = true; }
            else if ((k.ArrowLeft || k.a) && s.p1.dx === 0) { s.p1.dx = -1; s.p1.dy = 0; changed = true; }
            else if ((k.ArrowRight || k.d) && s.p1.dx === 0) { s.p1.dx = 1; s.p1.dy = 0; changed = true; }

            if (changed) triggerHaptic('light');

            // AI Logic
            const ai = aiMove(s.p2, s.p1, s.grid);
            s.p2.dx = ai.dx; s.p2.dy = ai.dy;

            const n1x = s.p1.x + s.p1.dx, n1y = s.p1.y + s.p1.dy;
            const n2x = s.p2.x + s.p2.dx, n2y = s.p2.y + s.p2.dy;

            const oob = (x, y) => x < 0 || x >= GRID || y < 0 || y >= GRID;
            const hit = (x, y) => !oob(x, y) && s.grid[y][x] !== 0;

            const p1d = oob(n1x, n1y) || hit(n1x, n1y);
            const p2d = oob(n2x, n2y) || hit(n2x, n2y);

            if (p1d || p2d) {
                s.phase = 'DEAD';
                s.winner = (p1d && p2d) ? 'DRAW' : p1d ? 'AI' : 'PLAYER';

                if (s.winner === 'PLAYER') {
                    setScore(prev => prev + 1);
                    animateScore();
                    saveScore(best + 1);
                    setStatus('WIN');
                    spawnParticles(s.p2.x / GRID * 100 + '%', s.p2.y / GRID * 100 + '%', C_P2, 30);
                    triggerFloatingText('¡IA ELIMINADA!', '50%', '40%', C_P1);
                    triggerHaptic('heavy');
                } else if (s.winner === 'AI') {
                    setStatus('DEAD');
                    spawnParticles(s.p1.x / GRID * 100 + '%', s.p1.y / GRID * 100 + '%', C_P1, 30);
                    triggerFloatingText('CRASH DETECTADO', '50%', '40%', C_P2);
                    triggerHaptic('heavy');
                } else {
                    setStatus('DEAD');
                    triggerFloatingText('COLISIÓN MUTUA', '50%', '40%', '#fff');
                    triggerHaptic('medium');
                }
            } else {
                s.grid[s.p1.y][s.p1.x] = 1;
                s.grid[s.p2.y][s.p2.x] = 2;
                s.p1.x = n1x; s.p1.y = n1y;
                s.p2.x = n2x; s.p2.y = n2y;
            }
        }

        draw(now);
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, triggerHaptic, triggerFloatingText, spawnParticles, animateScore, saveScore, best]);

    const start = useCallback(() => {
        stateRef.current = makeState();
        setStatus('PLAYING');
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
        triggerHaptic('medium');
    }, [tick, triggerHaptic]);

    useEffect(() => {
        updateCellSize();
        stateRef.current = makeState();
        stateRef.current.phase = 'IDLE';
        setStatus('IDLE');
        draw(0);

        const onKey = (e) => {
            keysRef.current[e.key] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(e.key)) e.preventDefault();
        };
        const onKeyUp = (e) => { keysRef.current[e.key] = false; };

        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('resize', updateCellSize);
        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('resize', updateCellSize);
        };
    }, [tick, draw, updateCellSize]);

    const handleMobileMove = (dir) => {
        const k = keysRef.current;
        Object.keys(k).forEach(key => k[key] = false);
        if (dir === 'up') k.w = true;
        if (dir === 'down') k.s = true;
        if (dir === 'left') k.a = true;
        if (dir === 'right') k.d = true;

        if (status !== 'PLAYING') start();
    };

    return (
        <ArcadeShell
            title="Cyber Cycles"
            score={score}
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Sobrevive al rastro de luz de la IA en la red."
        >
            <div ref={containerRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                <div style={{
                    position: 'relative',
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: 'rgba(4,4,10,0.8)',
                    border: '1px solid rgba(255,110,180,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(8px)',
                }}>
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </div>

                {/* Mobile D-Pad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 54px)', gap: 10 }}>
                    <div />
                    <DpadBtn icon="▲" onDown={() => handleMobileMove('up')} />
                    <div />
                    <DpadBtn icon="◀" onDown={() => handleMobileMove('left')} />
                    <DpadBtn icon="▼" onDown={() => handleMobileMove('down')} />
                    <DpadBtn icon="▶" onDown={() => handleMobileMove('right')} />
                </div>

                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 800 }}>
                    WASD / FLECHAS PARA GIRAR
                </div>
            </div>
        </ArcadeShell>
    );
}

function DpadBtn({ icon, onDown }) {
    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onPointerDown={(e) => { e.preventDefault(); onDown(); }}
            style={{
                width: 54, height: 54, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
                color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
        >
            {icon}
        </motion.button>
    );
}

export default function TronGame() {
    return (
        <GameImmersiveLayout>
            <TronGameInner />
        </GameImmersiveLayout>
    );
}
