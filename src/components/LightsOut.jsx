import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GRID_SIZE = 5;
const C_ON = '#00e5ff';
const C_OFF = '#0a0a18';
const C_GLOW = 'rgba(0,229,255,0.4)';

// Aplica un toggle a la celda y sus vecinas (UDLR)
function applyToggle(grid, row, col) {
    const next = grid.map(r => [...r]);
    const neighbors = [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
    for (const [r, c] of neighbors) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            next[r][c] = next[r][c] === 1 ? 0 : 1;
        }
    }
    return next;
}

// Genera un tablero con solución garantizada partiendo del estado vacío
function generateBoard(difficulty) {
    let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    const moves = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 15;
    const applied = new Set();
    let count = 0;
    while (count < moves) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);
        const key = `${r},${c}`;
        if (!applied.has(key)) { applied.add(key); count++; }
        grid = applyToggle(grid, r, c);
    }
    // Si todo está apagado por azar genera otro
    if (grid.every(row => row.every(cell => cell === 0))) return generateBoard(difficulty);
    return grid;
}

function isWon(grid) {
    return grid.every(row => row.every(cell => cell === 0));
}

export default function LightsOut() {
    const [difficulty, setDifficulty] = useState('medium');
    const [grid, setGrid] = useState(() => generateBoard('medium'));
    const [moves, setMoves] = useState(0);
    const [phase, setPhase] = useState('playing'); // playing|won
    const [best, setBest] = useState(() => {
        try { return JSON.parse(localStorage.getItem('lo-best') || '{}'); } catch { return {}; }
    });
    const [wonAnim, setWonAnim] = useState(false);
    const startRef = useRef(Date.now());

    const handleCell = useCallback((r, c) => {
        if (phase !== 'playing') return;
        setGrid(prev => {
            const next = applyToggle(prev, r, c);
            if (isWon(next)) {
                setPhase('won');
                setWonAnim(true);
                const score = Math.max(1, 100 - moves);
                setBest(b => {
                    const key = difficulty;
                    const updated = { ...b, [key]: Math.max(b[key] || 0, score) };
                    localStorage.setItem('lo-best', JSON.stringify(updated));
                    return updated;
                });
                window.dispatchEvent(new CustomEvent('dan:game-score', {
                    detail: { gameId: 'lightsout', score, isHighScore: false }
                }));
            }
            return next;
        });
        setMoves(m => m + 1);
    }, [phase, moves, difficulty]);

    const restart = useCallback((diff = difficulty) => {
        setGrid(generateBoard(diff));
        setMoves(0);
        setPhase('playing');
        setWonAnim(false);
        startRef.current = Date.now();
    }, [difficulty]);

    const changeDiff = (d) => {
        setDifficulty(d);
        restart(d);
    };

    // Contar luces encendidas
    const lit = grid.flat().filter(c => c === 1).length;

    const diffColors = { easy: '#22c55e', medium: '#00e5ff', hard: '#ff00ff' };
    const col = diffColors[difficulty];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace', color: '#fff', userSelect: 'none', padding: '8px 0' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 320, marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 2 }}>Movimientos</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: col }}>{moves}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 2 }}>Luces</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: lit === 0 ? '#22c55e' : '#fff' }}>{lit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 2 }}>Récord</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#ff6eb4' }}>{best[difficulty] || '—'}</div>
                </div>
            </div>

            {/* Dificultad */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => changeDiff(d)} style={{
                        padding: '4px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: difficulty === d ? diffColors[d] + '33' : 'rgba(255,255,255,0.05)',
                        color: difficulty === d ? diffColors[d] : 'rgba(255,255,255,0.35)',
                        fontFamily: 'monospace', fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2,
                        boxShadow: difficulty === d ? `0 0 12px ${diffColors[d]}44` : 'none',
                        transition: 'all 0.2s',
                    }}>{d}</button>
                ))}
            </div>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gap: 6,
                padding: 12,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 20,
                border: `1px solid rgba(255,255,255,0.06)`,
                position: 'relative',
            }}>
                {grid.map((row, r) => row.map((cell, c) => (
                    <motion.button
                        key={`${r}-${c}`}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCell(r, c)}
                        style={{
                            width: 52, height: 52,
                            borderRadius: 12,
                            border: cell === 1 ? `2px solid ${C_ON}` : '2px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer',
                            background: cell === 1 ? C_ON : C_OFF,
                            boxShadow: cell === 1 ? `0 0 18px ${C_GLOW}, 0 0 6px ${C_ON}` : 'none',
                            transition: 'background 0.12s, box-shadow 0.12s, border 0.12s',
                        }}
                    />
                )))}

                {/* Won overlay */}
                {phase === 'won' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            position: 'absolute', inset: 0, borderRadius: 20,
                            background: 'rgba(9,9,18,0.92)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#22c55e', textShadow: '0 0 20px #22c55e' }}>¡APAGADO!</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{moves} movimientos</div>
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => restart()}
                            style={{
                                marginTop: 8, padding: '8px 24px', borderRadius: 999,
                                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                                color: '#22c55e', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 900, fontSize: 12,
                            }}
                        >
                            Nuevo tablero
                        </motion.button>
                    </motion.div>
                )}
            </div>

            {/* Instrucción */}
            <p style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: 1 }}>
                APAGA TODAS LAS LUCES · cada celda activa sus vecinas
            </p>

            {/* Botón de reset */}
            {phase === 'playing' && (
                <button onClick={() => restart()} style={{
                    marginTop: 6, padding: '5px 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2,
                }}>
                    ↺ Reiniciar
                </button>
            )}
        </div>
    );
}
