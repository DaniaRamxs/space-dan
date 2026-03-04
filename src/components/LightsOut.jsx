import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const GRID_SIZE = 5;

const DIFFS = {
    easy: { moves: 6, label: 'EASY', color: '#22c55e' },
    medium: { moves: 10, label: 'MEDIUM', color: '#00e5ff' },
    hard: { moves: 15, label: 'HARD', color: '#ff00ff' },
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
    if (grid.every(row => row.every(cell => cell === 0))) return generateBoard(numMoves);
    return grid;
}

function LightsOutInner() {
    const [diff, setDiff] = useState('medium');
    const [grid, setGrid] = useState(() => generateBoard(DIFFS.medium.moves));
    const [moves, setMoves] = useState(0);
    const [status, setStatus] = useState('PLAYING');
    const [best, saveScore] = useHighScore('lightsout');

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const lit = grid.flat().filter(c => c === 1).length;
    const cfg = DIFFS[diff];

    const restart = useCallback((d = diff) => {
        setGrid(generateBoard(DIFFS[d].moves));
        setMoves(0);
        setStatus('PLAYING');
        triggerHaptic('medium');
    }, [diff, triggerHaptic]);

    const handleCell = useCallback((r, c) => {
        if (status === 'FINISHED') return;

        triggerHaptic('light');
        setGrid(prev => {
            const next = applyToggle(prev, r, c);
            const allOff = next.every(row => row.every(cell => cell === 0));
            if (allOff) {
                setStatus('FINISHED');
                const sc = Math.max(1, 250 - moves * 5);
                saveScore(sc);
                triggerHaptic('heavy');
                spawnParticles('50%', '50%', '#00e5ff', 30);
                triggerFloatingText('¡SISTEMA APAGADO!', '50%', '40%', '#00e5ff');
            }
            return next;
        });
        setMoves(m => m + 1);
        animateScore();
    }, [status, moves, saveScore, triggerHaptic, spawnParticles, triggerFloatingText, animateScore]);

    const changeDiff = (d) => {
        setDiff(d);
        restart(d);
    };

    return (
        <ArcadeShell
            title="Lights Out"
            score={moves}
            bestScore={best}
            status={status === 'FINISHED' ? 'WIN' : 'PLAYING'}
            onRetry={() => restart()}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Apaga todos los nodos de energía para ganar."
            gameId="lightsout"
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 30 }}>
                {/* Stats & Difficulty */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                    {Object.entries(DIFFS).map(([key, d]) => (
                        <button key={key} onClick={() => changeDiff(key)} style={{
                            padding: '10px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                            background: diff === key ? `${d.color}22` : 'rgba(255,255,255,0.03)',
                            color: diff === key ? d.color : 'rgba(255,255,255,0.3)',
                            fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 2,
                            border: `1px solid ${diff === key ? d.color : 'rgba(255,255,255,0.05)'}`,
                            boxShadow: diff === key ? `0 0 15px ${d.color}33` : 'none',
                            transition: 'all 0.2s',
                        }}>{d.label}</button>
                    ))}
                </div>

                {/* The Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    gap: 10,
                    padding: 20,
                    background: 'rgba(4,4,10,0.75)',
                    borderRadius: 24,
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.02)',
                    width: 'min(340px, 90vw)',
                    position: 'relative'
                }}>
                    <AnimatePresence>
                        {grid.map((row, r) => row.map((cell, c) => (
                            <motion.button
                                key={`${r}-${c}`}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCell(r, c)}
                                style={{
                                    aspectRatio: '1',
                                    borderRadius: 14,
                                    border: cell === 1 ? `1px solid #00e5ff` : '1px solid rgba(255,255,255,0.08)',
                                    cursor: 'pointer',
                                    background: cell === 1 ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                                    boxShadow: cell === 1 ? '0 0 20px rgba(0,229,255,0.3), inset 0 0 10px rgba(0,229,255,0.2)' : 'none',
                                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {cell === 1 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            position: 'absolute', inset: '25%', background: '#00e5ff',
                                            borderRadius: '50%', filter: 'blur(10px)', opacity: 0.5
                                        }}
                                    />
                                )}
                            </motion.button>
                        )))}
                    </AnimatePresence>
                </div>

                {/* Footer Info */}
                <div style={{ display: 'flex', gap: 32, fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.3)', textTransform: 'uppercase', letterSpacing: 2 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>Nodos Activos</span>
                        <span style={{ color: lit === 0 ? '#22c55e' : '#fff', fontSize: '1rem' }}>{lit}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>Movimientos</span>
                        <span style={{ color: cfg.color, fontSize: '1rem' }}>{moves}</span>
                    </div>
                </div>
            </div>
        </ArcadeShell>
    );
}

export default function LightsOut() {
    return (
        <GameImmersiveLayout>
            <LightsOutInner />
        </GameImmersiveLayout>
    );
}
