import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';

const GRID_SIZE = 5;

const DIFFS = {
    easy: { moves: 6, label: 'Easy', color: '#22c55e' },
    medium: { moves: 10, label: 'Medium', color: '#00e5ff' },
    hard: { moves: 15, label: 'Hard', color: '#ff00ff' },
};

function applyToggle(grid, row, col) {
    const next = grid.map(r => [...r]);
    [[row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]].forEach(([r, c]) => {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) next[r][c] ^= 1;
    });
    return next;
}

function generateBoard(numMoves) {
    let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    const applied = new Set();
    let count = 0;
    while (count < numMoves) {
        const r = Math.floor(Math.random() * GRID_SIZE);
        const c = Math.floor(Math.random() * GRID_SIZE);
        if (!applied.has(`${r},${c}`)) { applied.add(`${r},${c}`); count++; }
        grid = applyToggle(grid, r, c);
    }
    // Si por azar todo quedó apagado, regenerar
    if (grid.every(row => row.every(cell => cell === 0))) return generateBoard(numMoves);
    return grid;
}

export default function LightsOut() {
    const [diff, setDiff] = useState('medium');
    const [grid, setGrid] = useState(() => generateBoard(DIFFS.medium.moves));
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [best, saveScore] = useHighScore('lightsout');

    const lit = grid.flat().filter(c => c === 1).length;
    const cfg = DIFFS[diff];

    const restart = useCallback((d = diff) => {
        setGrid(generateBoard(DIFFS[d].moves));
        setMoves(0); setWon(false);
    }, [diff]);

    const handleCell = useCallback((r, c) => {
        if (won) return;
        setGrid(prev => {
            const next = applyToggle(prev, r, c);
            const allOff = next.every(row => row.every(cell => cell === 0));
            if (allOff) {
                setWon(true);
                // Puntaje: más movidas menos = más score
                const sc = Math.max(1, 200 - moves * 4);
                saveScore(sc);
            }
            return next;
        });
        setMoves(m => m + 1);
    }, [won, moves, saveScore]);

    const changeDiff = (d) => {
        setDiff(d);
        restart(d);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace', color: '#fff', width: '100%', padding: '4px 0', userSelect: 'none' }}>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: 'min(320px,95%)', marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, opacity: 0.35, textTransform: 'uppercase', letterSpacing: 2 }}>Movs</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: cfg.color }}>{moves}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, opacity: 0.35, textTransform: 'uppercase', letterSpacing: 2 }}>Luces</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: lit === 0 ? '#22c55e' : '#fff' }}>{lit}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, opacity: 0.35, textTransform: 'uppercase', letterSpacing: 2 }}>Récord</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#ff6eb4' }}>{best || '—'}</div>
                </div>
            </div>

            {/* Dificultad */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {Object.entries(DIFFS).map(([key, d]) => (
                    <button key={key} onClick={() => changeDiff(key)} style={{
                        padding: '5px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: diff === key ? d.color + '28' : 'rgba(255,255,255,0.05)',
                        color: diff === key ? d.color : 'rgba(255,255,255,0.3)',
                        fontFamily: 'monospace', fontWeight: 900, fontSize: 10,
                        textTransform: 'uppercase', letterSpacing: 2,
                        boxShadow: diff === key ? `0 0 12px ${d.color}40` : 'none',
                        transition: 'all 0.2s',
                    }}>{d.label}</button>
                ))}
            </div>

            {/* Tablero */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gap: 'clamp(4px, 1.5vw, 8px)',
                padding: 'clamp(10px, 3vw, 16px)',
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.06)',
                width: 'min(300px, 90vw)',
                position: 'relative',
            }}>
                {grid.map((row, r) => row.map((cell, c) => (
                    <motion.button
                        key={`${r}-${c}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => handleCell(r, c)}
                        style={{
                            aspectRatio: '1',
                            borderRadius: 'clamp(8px,2vw,14px)',
                            border: cell === 1 ? `2px solid #00e5ff` : '2px solid rgba(255,255,255,0.06)',
                            cursor: 'pointer',
                            background: cell === 1 ? '#00e5ff' : '#0a0a18',
                            boxShadow: cell === 1 ? '0 0 18px rgba(0,229,255,0.45), 0 0 6px #00e5ff' : 'none',
                            transition: 'all 0.1s',
                            minWidth: 0,
                        }}
                    />
                )))}

                {/* Victory overlay */}
                {won && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            position: 'absolute', inset: 0, borderRadius: 20,
                            background: 'rgba(9,9,18,0.93)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        <div style={{ fontSize: 'clamp(20px,6vw,28px)', fontWeight: 900, color: '#22c55e', textShadow: '0 0 20px #22c55e' }}>
                            ¡APAGADO!
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{moves} movimientos</div>
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => restart()}
                            style={{
                                marginTop: 6, padding: '8px 24px', borderRadius: 999,
                                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
                                color: '#22c55e', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 900, fontSize: 12,
                                touchAction: 'manipulation',
                            }}
                        >Nuevo tablero</motion.button>
                    </motion.div>
                )}
            </div>

            {/* Instrucción y reset */}
            <p style={{ marginTop: 10, fontSize: 9, color: 'rgba(255,255,255,0.18)', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' }}>
                apaga todas las luces · cada celda afecta sus vecinas
            </p>
            {!won && (
                <button onClick={() => restart()} style={{
                    marginTop: 4, padding: '5px 18px', borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)',
                    cursor: 'pointer', fontFamily: 'monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2,
                    touchAction: 'manipulation',
                }}>↺ Reiniciar</button>
            )}
        </div>
    );
}
