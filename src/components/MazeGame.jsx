import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useHighScore from '../hooks/useHighScore';

/**
 * Generate a random solvable 15×15 maze using recursive-backtracking DFS.
 * Odd (row, col) pairs are rooms; even indices are walls.
 * Returns a 2D array where 1 = wall, 0 = path.
 */
function generateMaze() {
  const SIZE = 15;
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

  function carve(r, c) {
    visited[r][c] = true;
    grid[r][c] = 0;
    const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]];
    // Fisher-Yates shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 1 && nr < SIZE - 1 && nc >= 1 && nc < SIZE - 1 && !visited[nr][nc]) {
        grid[r + dr / 2][c + dc / 2] = 0; // carve the wall between
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);
  return grid;
}

const START = { row: 1, col: 1 };
const GOAL = { row: 13, col: 13 };
const CELL = 20; // px per cell

const styles = {
  wrapper: {
    maxWidth: '420px',
    margin: '0 auto',
    background: '#111',
    minHeight: '420px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    fontFamily: 'monospace',
    color: '#00e5ff',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '13px',
    letterSpacing: '3px',
    color: '#ff6eb4',
    marginBottom: '8px',
    textTransform: 'lowercase',
  },
  timer: {
    fontSize: '12px',
    color: '#00e5ff',
    marginBottom: '10px',
    letterSpacing: '1px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(15, ${CELL}px)`,
    gridTemplateRows: `repeat(15, ${CELL}px)`,
    border: '1px solid rgba(255,110,180,0.3)',
    outline: 'none',
  },
  cell: (isWall, isPlayer, isGoal) => ({
    width: `${CELL}px`,
    height: `${CELL}px`,
    background: isWall ? 'rgba(255,110,180,0.3)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  }),
  playerDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#ff6eb4',
    boxShadow: '0 0 6px #ff6eb4',
    position: 'absolute',
  },
  goalEmoji: {
    fontSize: '14px',
    lineHeight: 1,
    position: 'absolute',
  },
  message: {
    marginTop: '14px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#ff6eb4',
    lineHeight: '1.7',
  },
  btnRow: {
    marginTop: '12px',
    display: 'flex',
    gap: '10px',
  },
  btn: {
    border: '1px solid #ff6eb4',
    background: 'transparent',
    color: '#ff6eb4',
    padding: '6px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  record: {
    marginTop: '10px',
    fontSize: '11px',
    color: 'rgba(255,110,180,0.6)',
    letterSpacing: '1px',
  },
  hint: {
    fontSize: '10px',
    color: 'rgba(0,229,255,0.4)',
    marginTop: '6px',
    letterSpacing: '1px',
  },
};

/**
 * MazeGame — navigate the maze from top-left to bottom-right.
 * @returns {JSX.Element}
 */
export default function MazeGame() {
  const [best, saveScore] = useHighScore('maze');

  const [maze, setMaze] = useState(generateMaze);
  const [player, setPlayer] = useState(START);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [lastScore, setLastScore] = useState(null);

  const gridRef = useRef(null);

  // Responsive cell size: fit 15 cells into available width
  const cellSize = useMemo(() => {
    const available = Math.min(window.innerWidth - 40, 15 * CELL);
    return Math.floor(available / 15);
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Start timer on first move
  const startIfNeeded = useCallback(() => {
    setRunning(prev => { if (!prev) return true; return prev; });
  }, []);

  // Check win
  useEffect(() => {
    if (player.row === GOAL.row && player.col === GOAL.col && !won) {
      setWon(true);
      setRunning(false);
      const score = Math.max(1000 - seconds * 20, 100);
      setLastScore(score);
      saveScore(score);
    }
  }, [player, won, seconds, saveScore]);

  // Shared move logic — used by keyboard and touch buttons
  const move = useCallback((dr, dc) => {
    if (won) return;
    startIfNeeded();
    setPlayer(p => {
      const nr = p.row + dr;
      const nc = p.col + dc;
      if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) return p;
      if (maze[nr][nc] === 1) return p;
      return { row: nr, col: nc };
    });
  }, [won, startIfNeeded, maze]);

  // Keyboard handler
  useEffect(() => {
    const onKey = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      const dir = dirs[e.key];
      if (!dir) return;
      move(dir[0], dir[1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const restart = useCallback(() => {
    setMaze(generateMaze());
    setPlayer(START);
    setSeconds(0);
    setRunning(false);
    setWon(false);
    setLastScore(null);
    setTimeout(() => gridRef.current?.focus(), 50);
  }, []);

  const dpadBtn = {
    width: 44, height: 44,
    border: '1px solid rgba(255,110,180,0.5)',
    background: 'rgba(255,110,180,0.12)',
    color: '#ff6eb4',
    borderRadius: 8,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', touchAction: 'none', WebkitUserSelect: 'none',
    fontFamily: 'monospace',
  };

  return (
    <div style={styles.wrapper}>
      <p style={styles.title}>laberinto</p>
      <p style={styles.timer}>tiempo: {seconds}s</p>

      {/* Grid — scaled to fit mobile screen */}
      <div style={{ width: cellSize * 15, height: cellSize * 15, overflow: 'hidden', flexShrink: 0 }}>
        <div
          ref={gridRef}
          tabIndex={0}
          style={{
            ...styles.grid,
            gridTemplateColumns: `repeat(15, ${cellSize}px)`,
            gridTemplateRows: `repeat(15, ${cellSize}px)`,
          }}
          aria-label="laberinto — usa las teclas de flecha para moverte"
        >
          {maze.map((row, ri) =>
            row.map((cell, ci) => {
              const isWall = cell === 1;
              const isPlayer = ri === player.row && ci === player.col;
              const isGoal = ri === GOAL.row && ci === GOAL.col;
              return (
                <div
                  key={`${ri}-${ci}`}
                  style={{ ...styles.cell(isWall, isPlayer, isGoal), width: cellSize, height: cellSize }}
                  aria-hidden="true"
                >
                  {isPlayer && <span style={styles.playerDot} />}
                  {isGoal && !isPlayer && <span style={styles.goalEmoji}>⭐</span>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {won && lastScore !== null && (
        <p style={styles.message}>
          saliste del laberinto!<br />
          <span style={{ fontSize: '16px' }}>puntos: {lastScore}</span>
        </p>
      )}

      {/* Arrow buttons for mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: '44px 44px 44px', gap: 6, marginTop: 14 }}>
        <div />
        <button style={dpadBtn} onPointerDown={() => move(-1, 0)}>▲</button>
        <div />
        <button style={dpadBtn} onPointerDown={() => move(0, -1)}>◀</button>
        <button style={dpadBtn} onPointerDown={() => move(1, 0)}>▼</button>
        <button style={dpadBtn} onPointerDown={() => move(0, 1)}>▶</button>
      </div>

      <div style={styles.btnRow}>
        <button style={styles.btn} onClick={restart}>reiniciar</button>
      </div>

      {best > 0 && (
        <p style={styles.record}>record: {best} puntos</p>
      )}
    </div>
  );
}
