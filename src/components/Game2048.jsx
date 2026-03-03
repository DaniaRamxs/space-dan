import { useState, useEffect, useCallback, useRef } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const TILE_COLORS = {
  2: { bg: 'rgba(255, 255, 255, 0.05)', color: '#fff', shadow: 'transparent', glow: 'none' },
  4: { bg: 'rgba(0, 229, 255, 0.05)', color: '#00e5ff', shadow: '#00e5ff', glow: '0 0 10px rgba(0, 229, 255, 0.3)' },
  8: { bg: 'rgba(255, 0, 255, 0.05)', color: '#ff00ff', shadow: '#ff00ff', glow: '0 0 10px rgba(255, 0, 255, 0.3)' },
  16: { bg: 'rgba(255, 255, 0, 0.1)', color: '#ffee58', shadow: '#ffee58', glow: '0 0 15px rgba(255, 255, 0, 0.4)' },
  32: { bg: 'rgba(255, 121, 198, 0.15)', color: '#ff79c6', shadow: '#ff79c6', glow: '0 0 20px rgba(255, 121, 198, 0.5)' },
  64: { bg: 'rgba(189, 147, 249, 0.2)', color: '#bd93f9', shadow: '#bd93f9', glow: '0 0 25px rgba(189, 147, 249, 0.6)' },
  128: { bg: 'rgba(80, 250, 123, 0.25)', color: '#50fa7b', shadow: '#50fa7b', glow: '0 0 30px rgba(80, 250, 123, 0.7)' },
  256: { bg: 'rgba(255, 184, 108, 0.3)', color: '#ffb86c', shadow: '#ffb86c', glow: '0 0 35px rgba(255, 184, 108, 0.8)' },
  512: { bg: 'rgba(139, 233, 253, 0.35)', color: '#8be9fd', shadow: '#8be9fd', glow: '0 0 40px rgba(139, 233, 253, 0.9)' },
  1024: { bg: 'rgba(255, 85, 85, 0.4)', color: '#ff5555', shadow: '#ff5555', glow: '0 0 45px rgba(255, 85, 85, 1)' },
  2048: { bg: 'linear-gradient(135deg, #f1fa8c, #ffb86c)', color: '#000', shadow: '#f1fa8c', glow: '0 0 50px #f1fa8c' },
};

const DEFAULT_COLOR = { bg: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.1)', shadow: 'transparent', glow: 'none' };

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

function Game2048Inner() {
  const [grid, setGrid] = useState(() => initGame());
  const [score, setScore] = useState(0);
  const [best, saveScore] = useHighScore('2048');
  const [status, setStatus] = useState('IDLE');
  const [continueAfterWin, setContinueAfterWin] = useState(false);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const applyMove = useCallback((moveFn) => {
    setGrid(prev => {
      const { grid: moved, score: gained } = moveFn(prev);
      if (gridsEqual(prev, moved)) return prev;

      const next = addRandomTile(moved);
      if (gained > 0) {
        setScore(s => s + gained);
        animateScore();
        triggerHaptic('medium');
        spawnParticles('50%', '50%', '#ff00ff', 15);
        triggerFloatingText(`+${gained}`, '50%', '40%', '#ff00ff');
      } else {
        triggerHaptic('light');
      }

      if (!continueAfterWin && hasWon(next)) {
        setStatus('WIN');
        saveScore(score + gained);
      }
      if (!hasMovesLeft(next)) {
        setStatus('DEAD');
        saveScore(score + gained);
      }
      return next;
    });
  }, [continueAfterWin, score, saveScore, animateScore, triggerHaptic, spawnParticles, triggerFloatingText]);

  const reset = useCallback(() => {
    setGrid(initGame());
    setScore(0);
    setStatus('PLAYING');
    setContinueAfterWin(false);
    triggerHaptic('medium');
  }, [triggerHaptic]);

  useEffect(() => {
    const handleKey = (e) => {
      if (status !== 'PLAYING') return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); applyMove(moveLeft); break;
        case 'ArrowRight': e.preventDefault(); applyMove(moveRight); break;
        case 'ArrowUp': e.preventDefault(); applyMove(moveUp); break;
        case 'ArrowDown': e.preventDefault(); applyMove(moveDown); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [applyMove, status]);

  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current || status !== 'PLAYING') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? applyMove(moveRight) : applyMove(moveLeft);
    } else {
      dy > 0 ? applyMove(moveDown) : applyMove(moveUp);
    }
    touchStart.current = null;
  };

  const tileSize = 'min(75px, 20vw)';

  return (
    <ArcadeShell
      title="2048 Neon"
      score={score}
      bestScore={best}
      status={status}
      onRetry={reset}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Une las fichas para llegar al 2048."
    >
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: 12,
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: 12,
          position: 'relative',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)'
        }}
      >
        {grid.map((row, r) =>
          row.map((value, c) => (
            <Tile key={`${r}-${c}`} value={value} size={tileSize} />
          ))
        )}

        {status === 'WIN' && !continueAfterWin && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: 24, zIndex: 10, backdropFilter: 'blur(8px)'
          }}>
            <h2 style={{ color: '#ffd700', fontSize: '2rem', marginBottom: 24, fontWeight: 900, textShadow: '0 0 20px #ffd700aa' }}>¡VICTORIA!</h2>
            <button
              onClick={() => { setContinueAfterWin(true); setStatus('PLAYING'); }}
              style={{ padding: '12px 24px', background: 'rgba(255, 215, 0, 0.15)', border: '2px solid #ffd700', color: '#ffd700', borderRadius: 16, cursor: 'pointer', fontWeight: 700, letterSpacing: 1 }}
            >
              CONTINUAR
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        Desliza para mover las fichas
      </div>
    </ArcadeShell>
  );
}

function Tile({ value, size }) {
  const config = TILE_COLORS[value] || DEFAULT_COLOR;
  return (
    <div style={{
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 14,
      background: config.bg,
      color: config.color,
      fontSize: value >= 1024 ? '0.8rem' : value >= 100 ? '1rem' : '1.4rem',
      fontWeight: 900,
      border: value === 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
      boxShadow: value > 0 ? config.glow : 'none',
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: value > 0 ? 'scale(1)' : 'scale(0.95)',
      opacity: value > 0 ? 1 : 0.4,
      textShadow: value > 8 ? `0 0 10px ${config.color}88` : 'none',
      backdropFilter: value > 0 ? 'blur(10px)' : 'none'
    }}>
      {value > 0 ? value : ''}
    </div>
  );
}

export default function Game2048() {
  return (
    <GameImmersiveLayout>
      <Game2048Inner />
    </GameImmersiveLayout>
  );
}
