import { useRef, useEffect, useCallback } from 'react';

// ── Config ───────────────────────────────────────────────────────────────────
const W = 400, H = 420;
const GRID = 15;           // celdas por lado
const CELL = Math.floor(W / GRID);

const C_BG = '#090912';
const C_P1 = '#00e5ff';  // jugador (cyan)
const C_P2 = '#ff00ff';  // IA    (magenta)
const C_WALL = '#1a1a2e';
const C_GLOW = 'rgba(0,229,255,0.15)';

function makeGrid() {
    return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function makeState() {
    const grid = makeGrid();
    // Paredes del borde sin trazar todavía — el grid se llena con trails
    return {
        phase: 'idle', // idle|playing|over
        grid,          // 0=libre, 1=trail P1, 2=trail P2, -1=crash
        p1: { x: Math.floor(GRID / 4), y: Math.floor(GRID / 2), dx: 1, dy: 0 },
        p2: { x: Math.floor((3 * GRID) / 4), y: Math.floor(GRID / 2), dx: -1, dy: 0 },
        winner: null,  // 'player'|'ai'|'draw'
        speed: 8,      // frames por tick
        frame: 0,
    };
}

// IA simple: sigue hacia el jugador pero evita colisiones
function aiMove(p2, p1, grid) {
    const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
    ];

    // Filtrar dirección opuesta
    const valid = dirs.filter(d => !(d.dx === -p2.dx && d.dy === -p2.dy));

    // Score: preferir avanzar hacia el jugador, evitar colisiones
    const ranked = valid.map(d => {
        const nx = p2.x + d.dx, ny = p2.y + d.dy;
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return { d, score: -1000 };
        if (grid[ny][nx] !== 0) return { d, score: -1000 };

        // Heurística: distancia al jugador (menor = mejor para perseguir)
        const dist = Math.abs(nx - p1.x) + Math.abs(ny - p1.y);
        // También evaluar espacio libre hacia adelante
        let space = 0;
        let cx = nx, cy = ny;
        for (let i = 0; i < 4; i++) {
            cx += d.dx; cy += d.dy;
            if (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) break;
            if (grid[cy][cx] !== 0) break;
            space++;
        }
        return { d, score: space * 2 - dist * 0.5 };
    }).sort((a, b) => b.score - a.score);

    return ranked[0]?.d || { dx: p2.dx, dy: p2.dy };
}

export default function Tron() {
    const canvasRef = useRef(null);
    const stateRef = useRef(makeState());
    const rafRef = useRef(null);
    const keysRef = useRef({});
    const firedRef = useRef(false);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, W, H);

        // Grid cells
        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const val = s.grid[y][x];
                if (val === 1) {
                    ctx.fillStyle = C_P1 + 'bb';
                    ctx.shadowColor = C_P1;
                    ctx.shadowBlur = 8;
                    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
                } else if (val === 2) {
                    ctx.fillStyle = C_P2 + 'bb';
                    ctx.shadowColor = C_P2;
                    ctx.shadowBlur = 8;
                    ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
                }
            }
        }
        ctx.shadowBlur = 0;

        // Heads
        const drawHead = (p, color) => {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 18;
            ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
            ctx.shadowBlur = 0;
        };
        if (s.phase === 'playing' || s.phase === 'over') {
            drawHead(s.p1, C_P1);
            drawHead(s.p2, C_P2);
        }

        // HUD
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, H - 30, W, 30);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = C_P1;
        ctx.textAlign = 'left';
        ctx.fillText('▶ TÚ', 10, H - 10);
        ctx.fillStyle = C_P2;
        ctx.textAlign = 'right';
        ctx.fillText('IA ◀', W - 10, H - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText('TRON CYCLE', W / 2, H - 10);

        // Overlay
        const overlay = (title, sub, color) => {
            ctx.fillStyle = 'rgba(9,9,18,0.88)';
            ctx.fillRect(0, 0, W, H - 30);
            ctx.fillStyle = color;
            ctx.shadowColor = color; ctx.shadowBlur = 18;
            ctx.font = 'bold 30px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(title, W / 2, H / 2 - 44);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '14px monospace';
            ctx.fillText(sub, W / 2, H / 2);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '11px monospace';
            ctx.fillText('[Click o Espacio para empezar]', W / 2, H / 2 + 30);
            ctx.fillText('Flechas o WASD para mover', W / 2, H / 2 + 50);
        };

        if (s.phase === 'idle') overlay('TRON', 'Sobrevive más que la IA', C_P1);
        if (s.phase === 'over') {
            const title = s.winner === 'player' ? '¡GANASTE!' : s.winner === 'draw' ? 'EMPATE' : 'PERDISTE';
            const color = s.winner === 'player' ? C_P1 : s.winner === 'draw' ? '#ffea00' : C_P2;
            overlay(title, `[Click para reiniciar]`, color);
        }
    }, []);

    const tick = useCallback(() => {
        const s = stateRef.current;
        if (s.phase !== 'playing') { draw(); return; }

        s.frame++;
        if (s.frame % s.speed !== 0) {
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        // Player input → cambiar dirección
        const k = keysRef.current;
        if ((k['ArrowUp'] || k['w']) && s.p1.dy !== 1) { s.p1.dx = 0; s.p1.dy = -1; }
        if ((k['ArrowDown'] || k['s']) && s.p1.dy !== -1) { s.p1.dx = 0; s.p1.dy = 1; }
        if ((k['ArrowLeft'] || k['a']) && s.p1.dx !== 1) { s.p1.dx = -1; s.p1.dy = 0; }
        if ((k['ArrowRight'] || k['d']) && s.p1.dx !== -1) { s.p1.dx = 1; s.p1.dy = 0; }

        // AI move
        const aiDir = aiMove(s.p2, s.p1, s.grid);
        s.p2.dx = aiDir.dx; s.p2.dy = aiDir.dy;

        // Nueva posición
        const n1x = s.p1.x + s.p1.dx, n1y = s.p1.y + s.p1.dy;
        const n2x = s.p2.x + s.p2.dx, n2y = s.p2.y + s.p2.dy;

        const oob = (x, y) => x < 0 || x >= GRID || y < 0 || y >= GRID;
        const hit = (x, y) => !oob(x, y) && s.grid[y][x] !== 0;

        const p1dead = oob(n1x, n1y) || hit(n1x, n1y);
        const p2dead = oob(n2x, n2y) || hit(n2x, n2y);

        if (p1dead || p2dead) {
            s.phase = 'over';
            s.winner = p1dead && p2dead ? 'draw' : p1dead ? 'ai' : 'player';
            const sc = p1dead ? 0 : 10;
            if (!firedRef.current) {
                firedRef.current = true;
                window.dispatchEvent(new CustomEvent('dan:game-score', {
                    detail: { gameId: 'tron', score: sc, isHighScore: false }
                }));
            }
            draw();
            return;
        }

        // Marcar trails
        s.grid[s.p1.y][s.p1.x] = 1;
        s.grid[s.p2.y][s.p2.x] = 2;

        s.p1.x = n1x; s.p1.y = n1y;
        s.p2.x = n2x; s.p2.y = n2y;

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw]);

    const startGame = useCallback(() => {
        const s = makeState();
        s.phase = 'playing';
        stateRef.current = s;
        firedRef.current = false;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [tick]);

    useEffect(() => {
        draw();
        rafRef.current = requestAnimationFrame(tick);

        const onKey = (e) => {
            keysRef.current[e.key] = e.type === 'keydown';
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            if (e.type === 'keydown' && e.code === 'Space') {
                const s = stateRef.current;
                if (s.phase !== 'playing') startGame();
            }
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
        };
    }, [draw, tick, startGame]);

    // Touch: dpad
    const swipe = (dir) => {
        const s = stateRef.current;
        if (s.phase !== 'playing') return;
        if (dir === 'up' && s.p1.dy !== 1) { s.p1.dx = 0; s.p1.dy = -1; }
        if (dir === 'down' && s.p1.dy !== -1) { s.p1.dx = 0; s.p1.dy = 1; }
        if (dir === 'left' && s.p1.dx !== 1) { s.p1.dx = -1; s.p1.dy = 0; }
        if (dir === 'right' && s.p1.dx !== -1) { s.p1.dx = 1; s.p1.dy = 0; }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace', color: '#fff', userSelect: 'none' }}>
            <canvas
                ref={canvasRef}
                width={W} height={H}
                onClick={() => { if (stateRef.current.phase !== 'playing') startGame(); }}
                style={{ display: 'block', maxWidth: '100%', border: `1px solid ${C_P1}44`, cursor: 'pointer' }}
            />

            {/* D-pad táctil */}
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,44px)', gap: 4 }}>
                {[
                    [null, 'up', null],
                    ['left', null, 'right'],
                    [null, 'down', null],
                ].map((row, r) => row.map((dir, c) => (
                    <button key={`${r}-${c}`}
                        onPointerDown={() => dir && swipe(dir)}
                        style={{
                            width: 44, height: 44,
                            background: dir ? 'rgba(0,229,255,0.08)' : 'transparent',
                            border: dir ? '1px solid rgba(0,229,255,0.25)' : 'none',
                            borderRadius: 8, color: '#fff', cursor: dir ? 'pointer' : 'default',
                            fontSize: 16, visibility: dir ? 'visible' : 'hidden',
                        }}
                    >{{ up: '▲', down: '▼', left: '◀', right: '▶' }[dir]}</button>
                )))}
            </div>
        </div>
    );
}
