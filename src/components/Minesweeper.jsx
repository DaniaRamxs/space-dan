import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

// --- Constants ---

const ROWS = 9;
const COLS = 9;
const MINES = 10;

// --- Cell state shape ---
// { isMine, isRevealed, isFlagged, adjacentMines }

// --- Helpers ---

/**
 * Build a fresh board without mine placement yet.
 * @returns {object[][]}
 */
const emptyBoard = () =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );

/**
 * Place mines randomly, avoiding the first-clicked cell and its neighbors.
 * @param {number} safeRow
 * @param {number} safeCol
 * @returns {object[][]}
 */
const placeMines = (safeRow, safeCol) => {
  const board = emptyBoard();

  // Safe zone: the clicked cell and its 8 neighbors
  const safeSet = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = safeRow + dr;
      const c = safeCol + dc;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        safeSet.add(`${r},${c}`);
      }
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

  // Calculate adjacent mine counts
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
            count++;
          }
        }
      }
      board[r][c].adjacentMines = count;
    }
  }

  return board;
};

/**
 * Flood-fill reveal from (row, col). Mutates a deep-copied board.
 * @param {object[][]} board
 * @param {number} row
 * @param {number} col
 * @returns {object[][]}
 */
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

/**
 * Check win condition: all non-mine cells are revealed.
 * @param {object[][]} board
 * @returns {boolean}
 */
const checkWin = (board) =>
  board.every((row) =>
    row.every((cell) => cell.isMine || cell.isRevealed)
  );

/**
 * Reveal all mines on the board (for game over display).
 * @param {object[][]} board
 * @returns {object[][]}
 */
const revealAllMines = (board) =>
  board.map((row) =>
    row.map((cell) => ({
      ...cell,
      isRevealed: cell.isMine ? true : cell.isRevealed,
    }))
  );

// Adjacent mine number colors
const NUM_COLORS = ['', '#1e90ff', '#228b22', '#ff4500', '#800080', '#800000', '#008b8b', '#000', '#808080'];

// --- Styles ---

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 420,
    margin: '0 auto',
    fontFamily: "'Segoe UI', sans-serif",
    color: '#e0e0e0',
    background: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: '20px 16px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,110,180,0.2)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#ff6eb4',
    marginBottom: 12,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
    marginBottom: 12,
    fontSize: 13,
    color: '#aaa',
  },
  statGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#00e5ff',
  },
  statRecord: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ff6eb4',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 28px)`,
    gridTemplateRows: `repeat(${ROWS}, 28px)`,
    gap: 2,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,110,180,0.15)',
    borderRadius: 6,
    padding: 6,
  },
  btn: {
    marginTop: 14,
    border: '1px solid #ff6eb4',
    background: 'transparent',
    color: '#ff6eb4',
    padding: '6px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  overlay: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 1.8,
  },
};

/**
 * Minesweeper component — 9x9 grid, 10 mines, dark glassmorphism UI.
 * Score = max(100, 1000 - elapsed_seconds * 10) on win.
 *
 * @returns {JSX.Element}
 */
export default function Minesweeper() {
  const [best, saveScore] = useHighScore('minesweeper');

  const [board, setBoard] = useState(emptyBoard());
  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'won' | 'lost'
  const [minesLeft, setMinesLeft] = useState(MINES);
  const [elapsed, setElapsed] = useState(0);
  const [finalScore, setFinalScore] = useState(null);
  const [newRecord, setNewRecord] = useState(false);
  const [flagMode, setFlagMode] = useState(false); // toggle for mobile: flag vs reveal

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const boardRef = useRef(board);
  boardRef.current = board;

  // Timer management
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    startTimeRef.current = Date.now() - elapsed * 1000;
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [elapsed, stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const resetGame = () => {
    stopTimer();
    setBoard(emptyBoard());
    setStatus('idle');
    setMinesLeft(MINES);
    setElapsed(0);
    setFinalScore(null);
    setNewRecord(false);
    setFlagMode(false);
  };

  /**
   * Handle left click on a cell.
   * @param {number} row
   * @param {number} col
   */
  const handleClick = (row, col) => {
    if (status === 'won' || status === 'lost') return;

    let currentBoard = boardRef.current;
    const cell = currentBoard[row][col];

    if (cell.isRevealed || cell.isFlagged) return;

    // First click: place mines avoiding the clicked cell
    if (status === 'idle') {
      currentBoard = placeMines(row, col);
      setStatus('playing');
      startTimer();
    }

    if (currentBoard[row][col].isMine) {
      // Lost
      const revealed = revealAllMines(currentBoard);
      setBoard(revealed);
      setStatus('lost');
      stopTimer();
      return;
    }

    const next = floodReveal(currentBoard, row, col);
    setBoard(next);

    if (checkWin(next)) {
      stopTimer();
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const pts = Math.max(100, 1000 - secs * 10);
      setFinalScore(pts);
      setStatus('won');
      const isNew = saveScore(pts);
      setNewRecord(isNew);
    }
  };

  /**
   * Handle right click (flag) on a cell.
   * @param {React.MouseEvent} e
   * @param {number} row
   * @param {number} col
   */
  const handleRightClick = (e, row, col) => {
    e.preventDefault();
    if (status === 'won' || status === 'lost') return;

    const currentBoard = boardRef.current;
    const cell = currentBoard[row][col];
    if (cell.isRevealed) return;
    if (status === 'idle') return; // no flagging before first reveal

    const next = currentBoard.map((r) => r.map((c) => ({ ...c })));
    next[row][col].isFlagged = !next[row][col].isFlagged;
    setBoard(next);
    setMinesLeft((prev) => prev + (next[row][col].isFlagged ? -1 : 1));
  };

  // --- Render helpers ---

  const getCellStyle = (cell) => {
    const base = {
      width: 28,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
      borderRadius: 4,
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background 0.1s',
    };

    if (!cell.isRevealed) {
      return {
        ...base,
        background: 'rgba(255,110,180,0.1)',
        border: '1px solid rgba(255,110,180,0.2)',
      };
    }

    if (cell.isMine) {
      return {
        ...base,
        background: '#3a0000',
        border: '1px solid #ff0000',
        color: '#ff0000',
      };
    }

    return {
      ...base,
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.06)',
      color: NUM_COLORS[cell.adjacentMines] || 'transparent',
    };
  };

  const getCellContent = (cell) => {
    if (cell.isFlagged && !cell.isRevealed) return '🚩';
    if (!cell.isRevealed) return '';
    if (cell.isMine) return '💣';
    return cell.adjacentMines > 0 ? cell.adjacentMines : '';
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>buscaminas</div>

      <div style={styles.topBar}>
        <div style={styles.statGroup}>
          <span>minas</span>
          <span style={styles.statValue}>{minesLeft}</span>
        </div>
        <div style={styles.statGroup}>
          <span>tiempo</span>
          <span style={styles.statValue}>{elapsed}s</span>
        </div>
        <div style={styles.statGroup}>
          <span>récord</span>
          <span style={styles.statRecord}>{best ?? 0}</span>
        </div>
      </div>

      {/* Flag mode toggle — visible when playing */}
      {(status === 'playing' || status === 'idle') && (
        <button
          style={{
            ...styles.btn,
            marginBottom: 10,
            background: flagMode ? 'rgba(255,110,180,0.2)' : 'transparent',
            borderColor: flagMode ? '#ff6eb4' : 'rgba(255,110,180,0.4)',
          }}
          onClick={() => setFlagMode(f => !f)}
        >
          {flagMode ? '🚩 modo bandera' : '👆 modo revelar'}
        </button>
      )}

      <div style={styles.grid}>
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              style={getCellStyle(cell)}
              onClick={() => flagMode ? handleRightClick({ preventDefault: () => {} }, r, c) : handleClick(r, c)}
              onContextMenu={(e) => handleRightClick(e, r, c)}
            >
              {getCellContent(cell)}
            </div>
          ))
        )}
      </div>

      {status === 'won' && (
        <div style={styles.overlay}>
          <div style={{ color: '#00e5ff', fontWeight: 700 }}>ganaste!</div>
          <div>puntos: {finalScore}</div>
          {newRecord && (
            <div style={{ color: '#ff6eb4', fontSize: 12 }}>nuevo récord!</div>
          )}
        </div>
      )}

      {status === 'lost' && (
        <div style={styles.overlay}>
          <div style={{ color: '#ff4444', fontWeight: 700 }}>pisaste una mina 💥</div>
        </div>
      )}

      <button style={styles.btn} onClick={resetGame}>
        {status === 'idle' ? 'nuevo juego' : 'reiniciar'}
      </button>

      {status === 'idle' && (
        <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>
          toca: revelar &nbsp;|&nbsp; modo bandera: poner/quitar 🚩
        </div>
      )}
    </div>
  );
}
