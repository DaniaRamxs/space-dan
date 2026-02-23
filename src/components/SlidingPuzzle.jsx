import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

// --- Puzzle logic ---
const GRID = 3;
const TILE_COUNT = GRID * GRID; // 9
const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0]; // 0 = empty

function isSolvable(tiles) {
  // Count inversions (ignoring the blank tile 0)
  const flat = tiles.filter(t => t !== 0);
  let inversions = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  // For odd-sized grids: solvable iff inversions is even
  return inversions % 2 === 0;
}

function generateSolvable() {
  let tiles;
  do {
    tiles = [...GOAL].sort(() => Math.random() - 0.5);
  } while (!isSolvable(tiles) || isSolved(tiles));
  return tiles;
}

function isSolved(tiles) {
  return tiles.every((v, i) => v === GOAL[i]);
}

function getAdjacent(emptyIndex) {
  const row = Math.floor(emptyIndex / GRID);
  const col = emptyIndex % GRID;
  const adj = [];
  if (row > 0) adj.push(emptyIndex - GRID); // above
  if (row < GRID - 1) adj.push(emptyIndex + GRID); // below
  if (col > 0) adj.push(emptyIndex - 1); // left
  if (col < GRID - 1) adj.push(emptyIndex + 1); // right
  return adj;
}

// --- Timer hook ---
function useTimer(running) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now() - elapsed * 1000;
      const tick = () => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setElapsed(0);
  }, []);

  return { elapsed, reset };
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// --- Main component ---

const STORAGE_KEY = 'space-dan:puzzle-best';

export default function SlidingPuzzle() {
  const [tiles, setTiles] = useState(() => generateSolvable());
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle | playing | solved
  const [, reportScore] = useHighScore('puzzle');
  const [flash, setFlash] = useState(false);
  const [bestMoves, setBestMoves] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  });
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const timerRunning = gameState === 'playing';
  const { elapsed, reset: resetTimer } = useTimer(timerRunning);

  const emptyIndex = tiles.indexOf(0);
  const adjacentToEmpty = getAdjacent(emptyIndex);

  const moveTile = (idx) => {
    if (gameState === 'solved') return;
    if (!adjacentToEmpty.includes(idx)) return;

    const newTiles = [...tiles];
    [newTiles[idx], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[idx]];
    const newMoves = moves + 1;

    setTiles(newTiles);
    setMoves(newMoves);

    if (gameState === 'idle') setGameState('playing');

    if (isSolved(newTiles)) {
      setGameState('solved');
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);

      // Update best
      if (bestMoves === null || newMoves < bestMoves) {
        setBestMoves(newMoves);
        try { localStorage.setItem(STORAGE_KEY, String(newMoves)); } catch {}
      }
    }
  };

  useEffect(() => {
    if (gameState === 'solved') reportScore(Math.max(0, 1000 - moves * 5));
  }, [gameState]);

  const shuffle = () => {
    setTiles(generateSolvable());
    setMoves(0);
    setGameState('idle');
    resetTimer();
    setFlash(false);
  };

  // --- Styles ---
  const containerStyle = {
    backgroundColor: '#0a0a12',
    border: '1px solid #00e5ff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 360,
    margin: '0 auto',
    fontFamily: "'Courier New', Courier, monospace",
    color: '#e0e0e0',
    boxShadow: '0 0 24px rgba(0,229,255,0.12)',
  };

  const titleStyle = {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#00e5ff',
    textShadow: '0 0 12px #00e5ff',
    letterSpacing: 4,
    marginBottom: 20,
    textTransform: 'uppercase',
  };

  const statsBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#0d0d1a',
    border: '1px solid #1a1a2e',
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 16,
    gap: 8,
  };

  const statItemStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const statLabelStyle = {
    fontSize: 10,
    color: 'var(--text-muted, #888)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  };

  const statValueStyle = {
    fontSize: 16,
    fontWeight: 700,
    color: '#00e5ff',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID}, 1fr)`,
    gap: 6,
    marginBottom: 16,
  };

  const getTileStyle = (idx, value) => {
    const isEmpty = value === 0;
    const isAdjacent = adjacentToEmpty.includes(idx);
    const isHovered = hoveredIdx === idx && isAdjacent && gameState !== 'solved';
    const isFlashing = flash && !isEmpty;

    let border = '1px solid #1a1a2e';
    let boxShadow = 'none';
    let background = 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)';
    let color = 'var(--text-soft, #ccc)';
    let cursor = 'default';
    let transform = 'scale(1)';

    if (isEmpty) {
      background = 'transparent';
      border = '1px dashed #1a1a2e';
    } else if (isFlashing) {
      background = 'linear-gradient(135deg, #001a2e 0%, #003344 100%)';
      border = '2px solid #00e5ff';
      boxShadow = '0 0 18px rgba(0,229,255,0.7), inset 0 0 10px rgba(0,229,255,0.15)';
      color = '#00e5ff';
    } else if (gameState === 'solved') {
      background = 'linear-gradient(135deg, #001a2e 0%, #003344 100%)';
      border = '1px solid #00e5ff44';
      color = '#00e5ff';
    } else if (isHovered) {
      background = 'linear-gradient(135deg, #1a0033 0%, #2a0044 100%)';
      border = '2px solid #ff00ff';
      boxShadow = '0 0 12px rgba(255,0,255,0.4)';
      color = '#ff00ff';
      cursor = 'pointer';
      transform = 'scale(1.04)';
    } else if (isAdjacent) {
      border = '1px solid #ff00ff44';
      cursor = 'pointer';
    }

    return {
      aspectRatio: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      background,
      border,
      boxShadow,
      color,
      fontSize: 22,
      fontWeight: 700,
      cursor,
      transform,
      transition: 'all 0.12s ease',
      userSelect: 'none',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
    };
  };

  const shuffleBtnStyle = {
    width: '100%',
    padding: '11px 0',
    backgroundColor: 'transparent',
    border: '2px solid #00e5ff',
    borderRadius: 8,
    color: '#00e5ff',
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 2,
    textTransform: 'uppercase',
    boxShadow: '0 0 10px rgba(0,229,255,0.2)',
    transition: 'all 0.15s',
  };

  const solvedBannerStyle = {
    textAlign: 'center',
    padding: '10px 0 14px',
    color: '#00e5ff',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 3,
    textShadow: '0 0 16px #00e5ff',
    animation: 'none',
  };

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Sliding Puzzle</div>

      {/* Stats */}
      <div style={statsBarStyle}>
        <div style={statItemStyle}>
          <div style={statLabelStyle}>Movimientos</div>
          <div style={statValueStyle}>{moves}</div>
        </div>
        <div style={{ width: 1, backgroundColor: '#1a1a2e' }} />
        <div style={statItemStyle}>
          <div style={statLabelStyle}>Tiempo</div>
          <div style={statValueStyle}>{formatTime(elapsed)}</div>
        </div>
        <div style={{ width: 1, backgroundColor: '#1a1a2e' }} />
        <div style={statItemStyle}>
          <div style={statLabelStyle}>Mejor</div>
          <div style={{ ...statValueStyle, color: '#ff00ff' }}>
            {bestMoves !== null ? bestMoves : '—'}
          </div>
        </div>
      </div>

      {/* Solved banner */}
      {gameState === 'solved' && (
        <div style={solvedBannerStyle}>
          RESUELTO — {moves} movimientos en {formatTime(elapsed)}
        </div>
      )}

      {/* Grid */}
      <div style={gridStyle}>
        {tiles.map((value, idx) => (
          <div
            key={idx}
            style={getTileStyle(idx, value)}
            onClick={() => moveTile(idx)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {value !== 0 ? value : ''}
          </div>
        ))}
      </div>

      {/* Shuffle button */}
      <button
        onClick={shuffle}
        style={shuffleBtnStyle}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#00e5ff11';
          e.currentTarget.style.boxShadow = '0 0 18px rgba(0,229,255,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.boxShadow = '0 0 10px rgba(0,229,255,0.2)';
        }}
      >
        Barajar
      </button>

      {/* Goal hint */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'var(--text-muted, #888)', letterSpacing: 1 }}>
        META: 1–8 en orden, espacio abajo-derecha
      </div>
    </div>
  );
}
