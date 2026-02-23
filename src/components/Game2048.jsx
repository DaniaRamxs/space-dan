import { useState, useEffect, useCallback, useRef } from 'react';
import useHighScore from '../hooks/useHighScore';

// --- Tile color map ---
const TILE_COLORS = {
  2:    { bg: '#1a1a2e', color: '#c0c0ff', border: '1px solid #333' },
  4:    { bg: '#16213e', color: '#c0c0ff', border: '1px solid #3a3a6e' },
  8:    { bg: '#ff6b35', color: '#fff',    border: '1px solid #ff8c5a' },
  16:   { bg: '#ff4500', color: '#fff',    border: '1px solid #ff6030' },
  32:   { bg: '#ff0080', color: '#fff',    border: '1px solid #ff40a0' },
  64:   { bg: '#ff00ff', color: '#fff',    border: '1px solid #ff60ff' },
  128:  { bg: '#00e5ff', color: '#000',    border: '1px solid #40efff' },
  256:  { bg: '#00ff88', color: '#000',    border: '1px solid #40ffaa' },
  512:  { bg: '#ffff00', color: '#000',    border: '1px solid #ffff60' },
  1024: { bg: '#ff9500', color: '#000',    border: '1px solid #ffb030' },
  2048: { bg: 'gold',    color: '#000',    border: '2px solid #ffd700', isGold: true },
};

const DEFAULT_COLOR = { bg: '#0d0d1a', color: '#888', border: '1px solid #222' };

// --- Game logic helpers ---
function createEmptyGrid() {
  return Array(4).fill(null).map(() => Array(4).fill(0));
}

function addRandomTile(grid) {
  const empties = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empties.push([r, c]);
    }
  }
  if (empties.length === 0) return grid;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row) {
  // Remove zeros
  const nums = row.filter(v => v !== 0);
  let score = 0;
  const merged = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const val = nums[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function moveLeft(grid) {
  let totalScore = 0;
  const next = grid.map(row => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    return newRow;
  });
  return { grid: next, score: totalScore };
}

function rotateRight(grid) {
  return grid[0].map((_, c) => grid.map(row => row[c]).reverse());
}

function rotateLeft(grid) {
  return grid[0].map((_, c) => grid.map(row => row[row.length - 1 - c]));
}

function moveRight(grid) {
  const rotated = rotateRight(rotateRight(grid));
  const { grid: moved, score } = moveLeft(rotated);
  return { grid: rotateLeft(rotateLeft(moved)), score };
}

function moveUp(grid) {
  const rotated = rotateLeft(grid);
  const { grid: moved, score } = moveLeft(rotated);
  return { grid: rotateRight(moved), score };
}

function moveDown(grid) {
  const rotated = rotateRight(grid);
  const { grid: moved, score } = moveLeft(rotated);
  return { grid: rotateLeft(moved), score };
}

function gridsEqual(a, b) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function hasWon(grid) {
  return grid.some(row => row.some(v => v >= 2048));
}

function hasMovesLeft(grid) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function initGame() {
  let g = createEmptyGrid();
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
}

// --- Component ---
export default function Game2048() {
  // Responsive tile size: shrinks on narrow screens
  const tileSize = typeof window !== 'undefined'
    ? Math.min(80, Math.floor((window.innerWidth - 120) / 4))
    : 80;

  const [grid, setGrid] = useState(() => initGame());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem('2048-best') || '0', 10); } catch { return 0; }
  });
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [continueAfterWin, setContinueAfterWin] = useState(false);
  const [, reportScore] = useHighScore('2048');
  const scoredRef = useRef(false);

  // Touch tracking
  const touchStart = useRef(null);

  const applyMove = useCallback((moveFn) => {
    setGrid(prev => {
      const { grid: moved, score: gained } = moveFn(prev);
      if (gridsEqual(prev, moved)) return prev; // no change
      const next = addRandomTile(moved);
      setScore(s => {
        const newScore = s + gained;
        setBestScore(best => {
          const newBest = Math.max(best, newScore);
          try { localStorage.setItem('2048-best', String(newBest)); } catch {}
          return newBest;
        });
        return newScore;
      });
      if (!continueAfterWin && hasWon(next)) setWon(true);
      if (!hasMovesLeft(next)) setGameOver(true);
      return next;
    });
  }, [continueAfterWin]);

  useEffect(() => {
    if ((gameOver || won) && !scoredRef.current) {
      scoredRef.current = true;
      reportScore(score);
    }
  }, [gameOver, won]);

  const newGame = useCallback(() => {
    setGrid(initGame());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setContinueAfterWin(false);
    scoredRef.current = false;
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKey = (e) => {
      if (gameOver) return;
      if (won && !continueAfterWin) return;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); applyMove(moveLeft);  break;
        case 'ArrowRight': e.preventDefault(); applyMove(moveRight); break;
        case 'ArrowUp':    e.preventDefault(); applyMove(moveUp);    break;
        case 'ArrowDown':  e.preventDefault(); applyMove(moveDown);  break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [applyMove, gameOver, won, continueAfterWin]);

  // Touch handlers
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    if (gameOver || (won && !continueAfterWin)) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (Math.max(absDx, absDy) < 20) return;
    if (absDx > absDy) {
      dx > 0 ? applyMove(moveRight) : applyMove(moveLeft);
    } else {
      dy > 0 ? applyMove(moveDown) : applyMove(moveUp);
    }
    touchStart.current = null;
  };

  // --- Styles ---
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Courier New', Courier, monospace",
    padding: '24px 16px',
    minHeight: '100vh',
    background: 'transparent',
    userSelect: 'none',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: `${tileSize * 4 + 24 + 20}px`,
    marginBottom: '16px',
  };

  const titleStyle = {
    fontSize: '2.2rem',
    fontWeight: 'bold',
    background: 'linear-gradient(90deg, #ff00ff, #00e5ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '4px',
    margin: 0,
  };

  const scoreBoxStyle = {
    display: 'flex',
    gap: '8px',
  };

  const scoreCardStyle = {
    background: 'rgba(255,0,255,0.1)',
    border: '1px solid rgba(255,0,255,0.3)',
    borderRadius: '6px',
    padding: '6px 14px',
    textAlign: 'center',
    minWidth: '70px',
  };

  const scoreLabelStyle = {
    fontSize: '0.6rem',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'block',
  };

  const scoreValueStyle = {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ff00ff',
  };

  const btnStyle = {
    marginBottom: '16px',
    padding: '8px 24px',
    background: 'transparent',
    border: '1px solid #ff00ff',
    color: '#ff00ff',
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: '0.85rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.2s',
  };

  const gridWrapperStyle = {
    position: 'relative',
    background: 'rgba(255,0,255,0.06)',
    border: '1px solid rgba(255,0,255,0.25)',
    borderRadius: '10px',
    padding: '10px',
    touchAction: 'none',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(4, ${tileSize}px)`,
    gridTemplateRows: `repeat(4, ${tileSize}px)`,
    gap: '8px',
  };

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    backdropFilter: 'blur(6px)',
    zIndex: 10,
  };

  const overlayTitleStyle = (color) => ({
    fontSize: '2rem',
    fontWeight: 'bold',
    color,
    textShadow: `0 0 20px ${color}`,
    letterSpacing: '4px',
    marginBottom: '16px',
    textTransform: 'uppercase',
  });

  const getTileStyle = (value) => {
    const colors = TILE_COLORS[value] || DEFAULT_COLOR;
    const isGold = colors.isGold;
    return {
      width: `${tileSize}px`,
      height: `${tileSize}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontSize: value >= 1000 ? '1.2rem' : value >= 100 ? '1.5rem' : '1.9rem',
      fontWeight: 'bold',
      background: isGold
        ? 'linear-gradient(135deg, #ffd700, #ff9500, #ffd700)'
        : colors.bg,
      color: colors.color,
      border: colors.border,
      boxShadow: value >= 64
        ? `0 0 12px ${colors.bg}, 0 0 24px ${colors.bg}44`
        : 'none',
      transition: 'background 0.15s, box-shadow 0.15s',
      letterSpacing: value >= 1000 ? '0' : '1px',
    };
  };

  const emptyTileStyle = {
    width: `${tileSize}px`,
    height: `${tileSize}px`,
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>2048</h1>
        <div style={scoreBoxStyle}>
          <div style={scoreCardStyle}>
            <span style={scoreLabelStyle}>score</span>
            <span style={scoreValueStyle}>{score}</span>
          </div>
          <div style={scoreCardStyle}>
            <span style={scoreLabelStyle}>best</span>
            <span style={scoreValueStyle}>{bestScore}</span>
          </div>
        </div>
      </div>

      {/* New Game button */}
      <button
        style={btnStyle}
        onClick={newGame}
        onMouseEnter={e => {
          e.target.style.background = 'rgba(255,0,255,0.15)';
          e.target.style.boxShadow = '0 0 12px rgba(255,0,255,0.4)';
        }}
        onMouseLeave={e => {
          e.target.style.background = 'transparent';
          e.target.style.boxShadow = 'none';
        }}
      >
        nuevo juego
      </button>

      {/* Grid */}
      <div
        style={gridWrapperStyle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={gridStyle}>
          {grid.map((row, r) =>
            row.map((value, c) =>
              value === 0 ? (
                <div key={`${r}-${c}`} style={emptyTileStyle} />
              ) : (
                <div key={`${r}-${c}`} style={getTileStyle(value)}>
                  {value}
                </div>
              )
            )
          )}
        </div>

        {/* Game Over overlay */}
        {gameOver && (
          <div style={{ ...overlayStyle, background: 'rgba(10,0,20,0.85)' }}>
            <div style={overlayTitleStyle('#ff00ff')}>game over</div>
            <button
              style={btnStyle}
              onClick={newGame}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(255,0,255,0.15)';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'transparent';
              }}
            >
              nuevo juego
            </button>
          </div>
        )}

        {/* Won overlay */}
        {won && !continueAfterWin && (
          <div style={{ ...overlayStyle, background: 'rgba(0,10,10,0.85)' }}>
            <div style={overlayTitleStyle('#ffd700')}>ganaste!</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                style={{ ...btnStyle, borderColor: '#ffd700', color: '#ffd700' }}
                onClick={() => setContinueAfterWin(true)}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255,215,0,0.15)';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent';
                }}
              >
                continuar
              </button>
              <button
                style={btnStyle}
                onClick={newGame}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255,0,255,0.15)';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent';
                }}
              >
                nuevo juego
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p style={{
        marginTop: '20px',
        fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: '1px',
        textAlign: 'center',
        lineHeight: '1.6',
      }}>
        usa las flechas o desliza para mover<br />
        une fichas iguales para llegar a 2048
      </p>
    </div>
  );
}
