import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const SIZE = 5;
const GAME_TIME = 60;
const COLORS = {
    1: '#00e5ff', // cyan
    2: '#ff00ff', // magenta
    3: '#39ff14', // neon green
    4: '#ffea00', // yellow
    5: '#ff1744'  // red
};

const TEMPLATES = [
    "10203,00040,00000,02040,10300",
    "12300,00004,00000,50004,12305",
    "00100,20003,04000,00500,24153",
    "01000,00020,30405,00000,31425",
    "12000,00340,05000,00002,15340",
    "12003,00400,00005,10000,24350",
    "10020,03004,50000,01402,00305",
    "01002,00340,05000,01040,05302",
    "10000,23040,00050,00201,34050",
    "12030,00004,00500,01034,02050",
    "10000,02030,00400,02030,10004", // 4 colors
    "01020,00000,03400,00000,01423", // 4 colors
];

function generateLevel() {
    const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    let board = t.split(',').map(row => row.split('').map(Number));

    if (Math.random() > 0.5) board = board.reverse();
    if (Math.random() > 0.5) board = board.map(row => row.reverse());
    if (Math.random() > 0.5) {
        const next = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                next[c][r] = board[r][c];
            }
        }
        board = next;
    }

    const nums = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    const colorMap = { 0: 0, 1: nums[0], 2: nums[1], 3: nums[2], 4: nums[3], 5: nums[4], 6: Math.ceil(Math.random() * 5) };
    return board.map(row => row.map(v => colorMap[v] || 0));
}

function getGridPos(e, container) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const c = Math.floor(((clientX - rect.left) / rect.width) * SIZE);
    const r = Math.floor(((clientY - rect.top) / rect.height) * SIZE);
    return { r, c };
}

function areAdjacent(p1, p2) {
    const dr = Math.abs(p1.r - p2.r);
    const dc = Math.abs(p1.c - p2.c);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function NodeChainInner() {
    const [status, setStatus] = useState('IDLE');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [board, setBoard] = useState([]);
    const [paths, setPaths] = useState({});
    const [drawingColor, setDrawingColor] = useState(null);

    const [best, saveScore] = useHighScore('nodechain');

    const boardRef = useRef(null);
    const timerRef = useRef(null);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const numColorsReq = useCallback(() => {
        const unq = new Set();
        board.forEach(row => row.forEach(v => { if (v > 0) unq.add(v); }));
        return unq.size;
    }, [board]);

    const loadNewLevel = useCallback(() => {
        setBoard(generateLevel());
        setPaths({});
        setDrawingColor(null);
    }, []);

    const checkLevelComplete = useCallback((currentPaths) => {
        let allConnected = true;
        const req = numColorsReq();

        if (Object.keys(currentPaths).length < req) return false;

        for (const [colStr, path] of Object.entries(currentPaths)) {
            const col = Number(colStr);
            if (path.length < 2) { allConnected = false; break; }
            const end1 = path[0];
            const end2 = path[path.length - 1];
            if (board[end1.r][end1.c] !== col || board[end2.r][end2.c] !== col) {
                allConnected = false; break;
            }
        }

        // Note: Flow Free usually requires fully packing the board (no empty cells).
        // "Conectar todos sin cruzar líneas." We will enforce that all nodes are connected.

        if (allConnected) {
            triggerHaptic('heavy');
            animateScore();
            setScore(s => s + 1);
            spawnParticles('50%', '50%', '#00e5ff', 30);
            triggerFloatingText('NIVEL COMPLETADO', '50%', '40%', '#00e5ff');
            setTimeout(loadNewLevel, 250);
        }
    }, [board, numColorsReq, triggerHaptic, animateScore, spawnParticles, triggerFloatingText, loadNewLevel]);

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const start = () => {
        setStatus('PLAYING');
        setScore(0);
        setTimeLeft(GAME_TIME);
        loadNewLevel();
        triggerHaptic('medium');

        stopTimer();
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    setStatus('DEAD');
                    saveScore(score); // Score represents connected levels
                    triggerHaptic('heavy');
                    triggerFloatingText('TIEMPO', '50%', '40%', '#ff1744');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        setBoard(generateLevel());
        return () => stopTimer();
    }, []);

    // --- Interaction ---
    const handlePointerDown = (e) => {
        if (status !== 'PLAYING') {
            if (status === 'IDLE' || status === 'DEAD') start();
            return;
        }
        const { r, c } = getGridPos(e, boardRef.current);
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;

        if (board[r][c] > 0) {
            const col = board[r][c];
            setDrawingColor(col);
            setPaths(prev => ({ ...prev, [col]: [{ r, c }] }));
            triggerHaptic('light');
        } else {
            // Find if clicking on an existing path
            for (const [colStr, path] of Object.entries(paths)) {
                const idx = path.findIndex(p => p.r === r && p.c === c);
                if (idx !== -1) {
                    const col = Number(colStr);
                    setDrawingColor(col);
                    setPaths(prev => ({ ...prev, [col]: path.slice(0, idx + 1) }));
                    triggerHaptic('light');
                    return;
                }
            }
        }
    };

    const handlePointerMove = (e) => {
        if (!drawingColor || status !== 'PLAYING') return;
        const { r, c } = getGridPos(e, boardRef.current);
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;

        setPaths(prev => {
            const path = prev[drawingColor] || [];
            if (path.length === 0) return prev;
            const last = path[path.length - 1];

            if (last.r === r && last.c === c) return prev; // same cell

            // Moving back to previous cell
            if (path.length > 1) {
                const prevCell = path[path.length - 2];
                if (prevCell.r === r && prevCell.c === c) {
                    triggerHaptic('light');
                    return { ...prev, [drawingColor]: path.slice(0, -1) };
                }
            }

            if (areAdjacent(last, { r, c })) {
                // Did we hit another color's endpoint?
                if (board[r][c] > 0 && board[r][c] !== drawingColor) return prev;

                // Did we already close our own path?
                if (board[last.r][last.c] === drawingColor && path.length > 1) return prev; // Cannot move from end node

                // Break other paths if we cross them
                let newPaths = { ...prev };
                for (const [colStr, otherPath] of Object.entries(newPaths)) {
                    if (Number(colStr) === drawingColor) continue;
                    const idx = otherPath.findIndex(p => p.r === r && p.c === c);
                    if (idx !== -1) { // Break this path
                        newPaths[colStr] = otherPath.slice(0, idx);
                    }
                }

                const newPath = [...path, { r, c }];
                newPaths[drawingColor] = newPath;

                // If we connected to the end node, vibrate
                if (board[r][c] === drawingColor) {
                    triggerHaptic('medium');
                    setTimeout(() => checkLevelComplete(newPaths), 0);
                } else {
                    triggerHaptic('light'); // tick while drawing
                }

                return newPaths;
            }
            return prev;
        });
    };

    const handlePointerUp = () => {
        if (drawingColor) {
            setDrawingColor(null);
            checkLevelComplete(paths);
        }
    };

    const getCellColor = (r, c) => {
        if (!board || board.length === 0 || !board[r]) return null;
        // If it's an endpoint
        if (board[r][c] > 0) return COLORS[board[r][c]];
        // If it's a path
        for (const [col, path] of Object.entries(paths)) {
            if (path.some(p => p.r === r && p.c === c)) return COLORS[col];
        }
        return null;
    };

    return (
        <ArcadeShell
            title="Node Chain"
            score={score}
            scoreLabel="Niveles"
            bestScore={best}
            status={status}
            onRetry={start}
            timeLeft={timeLeft}
            totalTime={GAME_TIME}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Conecta los nodos de energía del mismo color sin cruzarlos."
            gameId="nodechain"
        >
            <div
                ref={boardRef}
                style={{
                    position: 'relative',
                    width: 'min(92vw, 420px)',
                    aspectRatio: '1',
                    background: 'rgba(4,4,10,0.8)',
                    borderRadius: 24,
                    padding: 10,
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(8px)',
                    touchAction: 'none',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
                    gridTemplateRows: `repeat(${SIZE}, 1fr)`,
                    gap: 6
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {status === 'IDLE' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', zIndex: 30 }}>
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

                {Array.from({ length: SIZE * SIZE }).map((_, idx) => {
                    const r = Math.floor(idx / SIZE);
                    const c = idx % SIZE;
                    const bgCol = getCellColor(r, c);
                    const isEndpoint = board && board[r] ? board[r][c] > 0 : false;

                    // Compute path connections for CSS lines
                    let hasLeft = false, hasRight = false, hasTop = false, hasBottom = false;
                    for (const path of Object.values(paths)) {
                        const pIdx = path.findIndex(p => p.r === r && p.c === c);
                        if (pIdx !== -1) {
                            const prev = path[pIdx - 1];
                            const next = path[pIdx + 1];
                            if (prev) {
                                if (prev.c < c) hasLeft = true;
                                if (prev.c > c) hasRight = true;
                                if (prev.r < r) hasTop = true;
                                if (prev.r > r) hasBottom = true;
                            }
                            if (next) {
                                if (next.c < c) hasLeft = true;
                                if (next.c > c) hasRight = true;
                                if (next.r < r) hasTop = true;
                                if (next.r > r) hasBottom = true;
                            }
                            break;
                        }
                    }

                    return (
                        <div key={idx} style={{
                            position: 'relative',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {/* Lines rendering */}
                            {bgCol && (
                                <>
                                    {hasLeft && <div style={{ position: 'absolute', left: 0, top: '40%', height: '20%', width: '50%', background: bgCol, boxShadow: `0 0 10px ${bgCol}` }} />}
                                    {hasRight && <div style={{ position: 'absolute', right: 0, top: '40%', height: '20%', width: '50%', background: bgCol, boxShadow: `0 0 10px ${bgCol}` }} />}
                                    {hasTop && <div style={{ position: 'absolute', top: 0, left: '40%', width: '20%', height: '50%', background: bgCol, boxShadow: `0 0 10px ${bgCol}` }} />}
                                    {hasBottom && <div style={{ position: 'absolute', bottom: 0, left: '40%', width: '20%', height: '50%', background: bgCol, boxShadow: `0 0 10px ${bgCol}` }} />}
                                    {/* Center Joint */}
                                    {(hasLeft || hasRight || hasTop || hasBottom) && !isEndpoint && <div style={{ position: 'absolute', top: '40%', left: '40%', width: '20%', height: '20%', background: bgCol, borderRadius: '50%', boxShadow: `0 0 10px ${bgCol}` }} />}
                                </>
                            )}

                            {/* Endpoint rendering */}
                            {isEndpoint && (
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.5 }}
                                    style={{
                                        width: '60%', height: '60%',
                                        background: bgCol,
                                        borderRadius: '50%',
                                        zIndex: 2,
                                        boxShadow: `0 0 20px ${bgCol}, inset 0 0 10px rgba(255,255,255,0.5)`,
                                        border: '2px solid rgba(255,255,255,0.8)'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </ArcadeShell>
    );
}

export default function NodeChain() {
    return (
        <GameImmersiveLayout>
            <NodeChainInner />
        </GameImmersiveLayout>
    );
}
