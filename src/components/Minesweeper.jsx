import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const ROWS = 9;
const COLS = 9;
const MINES = 10;
const NUM_COLORS = ['', '#00e5ff', '#00ff88', '#ff00ff', '#ff9500', '#ff4500', '#ff0000', '#ffffff', '#808080'];

const emptyBoard = () =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );

const placeMines = (safeRow, safeCol) => {
  const board = emptyBoard();
  const safeSet = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = safeRow + dr;
      const c = safeCol + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) safeSet.add(`${r},${c}`);
    }
  }

  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].isMine && !safeSet.has(`${r},${c}`)) {
      board[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) count++;
        }
      }
      board[r][c].adjacentMines = count;
    }
  }
  return board;
};

const floodReveal = (board, row, col) => {
  const next = board.map((r) => r.map((cell) => ({ ...cell })));
  const stack = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const cell = next[r][c];
    if (cell.isRevealed || cell.isFlagged || cell.isMine) continue;
    cell.isRevealed = true;
    if (cell.adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          stack.push([r + dr, c + dc]);
        }
      }
    }
  }
  return next;
};

const checkWin = (board) =>
  board.every((row) => row.every((cell) => cell.isMine || cell.isRevealed));

const revealAllMines = (board) =>
  board.map((row) =>
    row.map((cell) => ({
      ...cell,
      isRevealed: cell.isMine ? true : cell.isRevealed,
    }))
  );

function MinesweeperInner() {
  const [board, setBoard] = useState(emptyBoard());
  const [status, setStatus] = useState('IDLE');
  const [minesLeft, setMinesLeft] = useState(MINES);
  const [elapsed, setElapsed] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [best, saveScore] = useHighScore('minesweeper');
  const [score, setScore] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const resetGame = useCallback(() => {
    stopTimer();
    setBoard(emptyBoard());
    setStatus('PLAYING');
    setMinesLeft(MINES);
    setElapsed(0);
    setScore(0);
    setFlagMode(false);
    triggerHaptic('light');
  }, [stopTimer, triggerHaptic]);

  const onCellClick = (r, c) => {
    if (status === 'WIN' || status === 'DEAD') return;
    if (flagMode) return onFlag(r, c);

    let curr = board;
    if (status === 'IDLE' || (status === 'PLAYING' && elapsed === 0 && !board.some(row => row.some(cell => cell.isRevealed)))) {
      curr = placeMines(r, c);
      setStatus('PLAYING');
      startTimer();
    }

    const cell = curr[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    if (cell.isMine) {
      setBoard(revealAllMines(curr));
      setStatus('DEAD');
      stopTimer();
      triggerHaptic('heavy');
      spawnParticles(`${(c / COLS) * 100}%`, `${(r / ROWS) * 100}%`, '#ff0000', 40);
      triggerFloatingText('¡BOOM!', `${(c / COLS) * 100}%`, `${(r / ROWS) * 100}%`, '#ff0000');
      return;
    }

    const next = floodReveal(curr, r, c);
    setBoard(next);
    triggerHaptic('light');

    if (checkWin(next)) {
      setStatus('WIN');
      stopTimer();
      const pts = Math.max(100, 1000 - elapsed * 5);
      setScore(pts);
      animateScore();
      saveScore(pts);
      triggerHaptic('medium');
      spawnParticles('50%', '50%', '#00e5ff', 50);
      triggerFloatingText('¡DESPEJADO!', '50%', '40%', '#00e5ff');
    }
  };

  const onFlag = (r, c) => {
    if (status === 'WIN' || status === 'DEAD') return;
    const cell = board[r][c];
    if (cell.isRevealed) return;

    const next = board.map((row, ir) =>
      row.map((cell, ic) =>
        (ir === r && ic === c) ? { ...cell, isFlagged: !cell.isFlagged } : cell
      )
    );
    setBoard(next);
    setMinesLeft(m => m + (next[r][c].isFlagged ? -1 : 1));
    triggerHaptic('light');
  };

  return (
    <ArcadeShell
      title="Neon Mines"
      score={score}
      bestScore={best}
      status={status}
      onRetry={resetGame}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Despeja el campo sin tocar las minas."
      gameId="mines"
    >
      <div style={{ display: 'flex', gap: 32, marginBottom: 24, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ opacity: 0.5, marginBottom: 4 }}>BOMBAS</span>
          <span style={{ color: '#ff00ff' }}>{minesLeft}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ opacity: 0.5, marginBottom: 4 }}>TIEMPO</span>
          <span style={{ color: '#00e5ff' }}>{elapsed}s</span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, min(35px, 10vw))`,
        gap: 5,
        background: 'rgba(4,4,10,0.75)',
        padding: 14,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              onClick={() => onCellClick(r, c)}
              onContextMenu={(e) => { e.preventDefault(); onFlag(r, c); }}
            />
          ))
        )}
      </div>

      <button
        onClick={() => { setFlagMode(!flagMode); triggerHaptic('light'); }}
        style={{
          marginTop: 24,
          padding: '12px 24px',
          background: flagMode ? 'rgba(255,0,255,0.1)' : 'rgba(255,255,255,0.03)',
          border: `2px solid ${flagMode ? '#ff00ff' : 'rgba(255,255,255,0.1)'}`,
          color: flagMode ? '#ff00ff' : '#fff',
          borderRadius: 16,
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          transition: 'all 0.2s',
          boxShadow: flagMode ? '0 0 15px rgba(255,0,255,0.3)' : 'none'
        }}
      >
        {flagMode ? '🚩 Modo Bandera' : '👆 Modo Revelar'}
      </button>
    </ArcadeShell>
  );
}

function Cell({ cell, onClick, onContextMenu }) {
  const isRevealed = cell.isRevealed;
  const isMine = cell.isMine;
  const isFlagged = cell.isFlagged;

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        width: '100%',
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        cursor: isRevealed ? 'default' : 'pointer',
        background: isRevealed
          ? (isMine ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,255,0.03)')
          : 'rgba(255,255,255,0.05)',
        border: isRevealed
          ? '1px solid rgba(255,255,255,0.05)'
          : `1px solid rgba(255,255,255,${isFlagged ? 0.3 : 0.1})`,
        color: NUM_COLORS[cell.adjacentMines] || 'white',
        fontSize: 'min(16px, 4.5vw)',
        fontWeight: 900,
        transition: 'all 0.15s',
        boxShadow: (isRevealed && isMine) ? '0 0 15px #ff000066' : 'none',
        backdropFilter: isRevealed ? 'none' : 'blur(4px)'
      }}
    >
      {isFlagged && !isRevealed && '🚩'}
      {isRevealed && isMine && '💣'}
      {isRevealed && !isMine && cell.adjacentMines > 0 && cell.adjacentMines}
    </div>
  );
}

export default function Minesweeper() {
  return (
    <GameImmersiveLayout>
      <MinesweeperInner />
    </GameImmersiveLayout>
  );
}
