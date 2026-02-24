import { useRef, useEffect, useState, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

const GRID = 14;
const C_BG = '#090912';
const C_P1 = '#00e5ff';
const C_P2 = '#ff00ff';
const C_DIM = 'rgba(255,255,255,0.15)';
const C_WHT = '#ffffff';

function makeGrid() {
    return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}
function makeState() {
    return {
        phase: 'idle',
        grid: makeGrid(),
        p1: { x: Math.floor(GRID / 4), y: Math.floor(GRID / 2), dx: 1, dy: 0 },
        p2: { x: Math.floor((3 * GRID) / 4), y: Math.floor(GRID / 2), dx: -1, dy: 0 },
        winner: null,
        speed: 7,
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
        let space = 0, cx = nx, cy = ny;
        for (let i = 0; i < 5; i++) {
            cx += d.dx; cy += d.dy;
            if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID || grid[cy][cx] !== 0) break;
            space++;
        }
        const dist = Math.abs(nx - p1.x) + Math.abs(ny - p1.y);
        return { d, score: space * 2 - dist * 0.4 };
    }).sort((a, b) => b.score - a.score);
    return ranked[0]?.d ?? { dx: p2.dx, dy: p2.dy };
}

export default function TronGame() {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const stateRef = useRef(makeState());
    const rafRef = useRef(null);
    const keysRef = useRef({});
    const cellRef = useRef(0);  // px por celda (calculado responsive)
    const [best, saveScore] = useHighScore('tron');
    const [uiPhase, setUiPhase] = useState('idle');

    // ── Calcula tamaño de celda según el contenedor ───────────────────────
    const updateCell = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const maxW = el.clientWidth - 16;
        cellRef.current = Math.floor(Math.min(32, maxW / GRID));
        const canvas = canvasRef.current;
        if (canvas) {
            const C = cellRef.current;
            canvas.width = GRID * C;
            canvas.height = GRID * C + 36; // +36 para HUD
        }
    }, []);

    // ── Draw ──────────────────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;
        const C = cellRef.current;
        const GW = GRID * C, GH = GRID * C;

        // Fondo
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= GRID; i++) {
            ctx.beginPath(); ctx.moveTo(i * C, 0); ctx.lineTo(i * C, GH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * C); ctx.lineTo(GW, i * C); ctx.stroke();
        }

        // Trails
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const v = s.grid[y][x];
                if (!v) continue;
                ctx.fillStyle = v === 1 ? C_P1 + 'aa' : C_P2 + 'aa';
                ctx.shadowColor = v === 1 ? C_P1 : C_P2;
                ctx.shadowBlur = 6;
                ctx.fillRect(x * C + 1, y * C + 1, C - 2, C - 2);
            }
        }
        ctx.shadowBlur = 0;

        // Cabezas
        if (s.phase !== 'idle') {
            const drawHead = (p, color) => {
                ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18;
                ctx.fillRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2);
                ctx.shadowBlur = 0;
            };
            drawHead(s.p1, C_P1);
            drawHead(s.p2, C_P2);
        }

        // HUD inferior
        const hudY = GH + 4;
        ctx.font = `bold ${Math.max(10, C - 4)}px monospace`;
        ctx.fillStyle = C_P1; ctx.textAlign = 'left';
        ctx.fillText('■ TÚ', 6, hudY + C - 4);
        ctx.fillStyle = C_P2; ctx.textAlign = 'right';
        ctx.fillText('IA ■', GW - 6, hudY + C - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'center';
        ctx.fillText(`BEST: ${best}`, GW / 2, hudY + C - 4);

        // Overlays
        const overlay = (title, sub, color) => {
            ctx.fillStyle = 'rgba(9,9,18,0.9)';
            ctx.fillRect(0, 0, GW, GH);
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18;
            ctx.font = `bold ${Math.floor(C * 1.2)}px monospace`; ctx.textAlign = 'center';
            ctx.fillText(title, GW / 2, GH / 2 - C * 2);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_WHT; ctx.font = `${Math.max(11, C - 4)}px monospace`;
            ctx.fillText(sub, GW / 2, GH / 2);
            ctx.fillStyle = C_DIM; ctx.font = `${Math.max(9, C - 6)}px monospace`;
            ctx.fillText('TAP ó ESPACIO para empezar', GW / 2, GH / 2 + C * 2);
        };
        if (s.phase === 'idle') overlay('TRON', 'Sobrevive más que la IA', C_P1);
        if (s.phase === 'over') {
            const t = s.winner === 'player' ? '¡GANASTE!' : s.winner === 'draw' ? 'EMPATE' : 'PERDISTE';
            const c = s.winner === 'player' ? C_P1 : s.winner === 'draw' ? '#ffea00' : C_P2;
            overlay(t, 'tap para reiniciar', c);
        }
    }, [best]);

    // ── Game loop ─────────────────────────────────────────────────────────
    const tick = useCallback(() => {
        const s = stateRef.current;
        if (s.phase === 'playing') {
            s.frame++;
            if (s.frame % s.speed === 0) {
                // Input jugador
                const k = keysRef.current;
                if ((k.ArrowUp || k.w) && s.p1.dy !== 1) { s.p1.dx = 0; s.p1.dy = -1; }
                if ((k.ArrowDown || k.s) && s.p1.dy !== -1) { s.p1.dx = 0; s.p1.dy = 1; }
                if ((k.ArrowLeft || k.a) && s.p1.dx !== 1) { s.p1.dx = -1; s.p1.dy = 0; }
                if ((k.ArrowRight || k.d) && s.p1.dx !== -1) { s.p1.dx = 1; s.p1.dy = 0; }

                // IA
                const ai = aiMove(s.p2, s.p1, s.grid);
                s.p2.dx = ai.dx; s.p2.dy = ai.dy;

                const n1x = s.p1.x + s.p1.dx, n1y = s.p1.y + s.p1.dy;
                const n2x = s.p2.x + s.p2.dx, n2y = s.p2.y + s.p2.dy;
                const oob = (x, y) => x < 0 || x >= GRID || y < 0 || y >= GRID;
                const hit = (x, y) => !oob(x, y) && s.grid[y][x] !== 0;

                const p1d = oob(n1x, n1y) || hit(n1x, n1y);
                const p2d = oob(n2x, n2y) || hit(n2x, n2y);

                if (p1d || p2d) {
                    s.phase = 'over';
                    s.winner = p1d && p2d ? 'draw' : p1d ? 'ai' : 'player';
                    const sc = s.winner === 'player' ? 150 : s.winner === 'draw' ? 50 : 0;
                    saveScore(sc);
                    setUiPhase('over');
                } else {
                    s.grid[s.p1.y][s.p1.x] = 1;
                    s.grid[s.p2.y][s.p2.x] = 2;
                    s.p1.x = n1x; s.p1.y = n1y;
                    s.p2.x = n2x; s.p2.y = n2y;
                }
            }
        }
        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, saveScore]);

    function startGame() {
        const s = makeState(); s.phase = 'playing';
        stateRef.current = s;
        setUiPhase('playing');
    }

    // Swipe táctil
    const swipe = (dir) => {
        const s = stateRef.current;
        if (s.phase !== 'playing') return;
        if (dir === 'up' && s.p1.dy !== 1) { s.p1.dx = 0; s.p1.dy = -1; }
        if (dir === 'down' && s.p1.dy !== -1) { s.p1.dx = 0; s.p1.dy = 1; }
        if (dir === 'left' && s.p1.dx !== 1) { s.p1.dx = -1; s.p1.dy = 0; }
        if (dir === 'right' && s.p1.dx !== -1) { s.p1.dx = 1; s.p1.dy = 0; }
    };

    useEffect(() => {
        updateCell();
        draw();
        rafRef.current = requestAnimationFrame(tick);

        const onKey = (e) => {
            keysRef.current[e.key] = e.type === 'keydown';
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            if (e.type === 'keydown' && (e.code === 'Space' || e.key === 'Enter')) {
                if (stateRef.current.phase !== 'playing') startGame();
            }
        };
        const onResize = () => { updateCell(); };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            window.removeEventListener('resize', onResize);
        };
    }, [tick, draw, updateCell]);

    const DPAD_SIZE = 48;
    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', fontFamily: 'monospace', color: C_WHT, gap: 8 }}>
            <canvas
                ref={canvasRef}
                onClick={() => { if (stateRef.current.phase !== 'playing') startGame(); }}
                style={{ display: 'block', maxWidth: '100%', borderRadius: 6, border: `1px solid ${C_P1}33`, cursor: 'pointer', touchAction: 'manipulation' }}
            />

            {/* D-pad táctil — siempre visible */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(3,${DPAD_SIZE}px)`, gap: 4, marginTop: 4 }}>
                {[
                    [null, 'up', null],
                    ['left', null, 'right'],
                    [null, 'down', null],
                ].map((row, r) => row.map((dir, c) => (
                    <button key={`${r}-${c}`}
                        onPointerDown={e => { e.preventDefault(); if (dir) { if (stateRef.current.phase !== 'playing') startGame(); swipe(dir); } }}
                        style={{
                            width: DPAD_SIZE, height: DPAD_SIZE,
                            background: dir ? 'rgba(0,229,255,0.08)' : 'transparent',
                            border: dir ? '1px solid rgba(0,229,255,0.2)' : 'none',
                            borderRadius: 10, color: C_WHT,
                            cursor: dir ? 'pointer' : 'default',
                            fontSize: 18,
                            visibility: dir ? 'visible' : 'hidden',
                            touchAction: 'manipulation',
                        }}
                    >{{ up: '▲', down: '▼', left: '◀', right: '▶' }[dir]}</button>
                )))}
            </div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
                TRON CYCLES · flechas / wasd / d-pad
            </p>
        </div>
    );
}
