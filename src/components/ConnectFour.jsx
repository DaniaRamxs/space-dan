import { useState, useEffect, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

// --- Constants ---

const ROWS = 6;
const COLS = 7;
const EMPTY = null;
const PLAYER = 'player';
const CPU = 'cpu';

const PLAYER_COLOR = '#ff6eb4';
const CPU_COLOR = '#00e5ff';
const EMPTY_COLOR = 'rgba(255,255,255,0.05)';

// --- Board helpers ---

/** @returns {(string|null)[][]} */
const emptyBoard = () =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

/**
 * Drop a piece in the given column. Returns new board or null if column is full.
 * @param {(string|null)[][]} board
 * @param {number} col
 * @param {string} player
 * @returns {(string|null)[][]|null}
 */
const dropPiece = (board, col, player) => {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      const next = board.map((r) => [...r]);
      next[row][col] = player;
      return next;
    }
  }
  return null; // column full
};

/**
 * Check if there is a winner on the board.
 * @param {(string|null)[][]} board
 * @returns {string|null} winner player id or null
 */
const checkWinner = (board) => {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = board[r][c];
      if (val && board[r][c + 1] === val && board[r][c + 2] === val && board[r][c + 3] === val) {
        return val;
      }
    }
  }
  // Vertical
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const val = board[r][c];
      if (val && board[r + 1][c] === val && board[r + 2][c] === val && board[r + 3][c] === val) {
        return val;
      }
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = board[r][c];
      if (val && board[r + 1][c + 1] === val && board[r + 2][c + 2] === val && board[r + 3][c + 3] === val) {
        return val;
      }
    }
  }
  // Diagonal down-left
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      const val = board[r][c];
      if (val && board[r + 1][c - 1] === val && board[r + 2][c - 2] === val && board[r + 3][c - 3] === val) {
        return val;
      }
    }
  }
  return null;
};

/** @param {(string|null)[][]} board @returns {boolean} */
const isBoardFull = (board) => board[0].every((cell) => cell !== EMPTY);

/**
 * Get available columns.
 * @param {(string|null)[][]} board
 * @returns {number[]}
 */
const availableCols = (board) =>
  Array.from({ length: COLS }, (_, i) => i).filter((c) => board[0][c] === EMPTY);

/**
 * CPU AI: win > block > random.
 * @param {(string|null)[][]} board
 * @returns {number} column index
 */
const cpuMove = (board) => {
  const cols = availableCols(board);
  if (cols.length === 0) return -1;

  // 1. Check if CPU can win
  for (const col of cols) {
    const next = dropPiece(board, col, CPU);
    if (next && checkWinner(next) === CPU) return col;
  }

  // 2. Check if player can win and block
  for (const col of cols) {
    const next = dropPiece(board, col, PLAYER);
    if (next && checkWinner(next) === PLAYER) return col;
  }

  // 3. Prefer center column, then random
  const preferred = [3, 2, 4, 1, 5, 0, 6];
  for (const col of preferred) {
    if (cols.includes(col)) return col;
  }

  return cols[Math.floor(Math.random() * cols.length)];
};

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
  stats: {
    display: 'flex',
    gap: 24,
    marginBottom: 12,
    fontSize: 13,
    color: '#aaa',
  },
  statItem: {
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
  boardContainer: {
    background: 'rgba(255,110,180,0.06)',
    border: '1px solid rgba(255,110,180,0.2)',
    borderRadius: 10,
    padding: 8,
  },
  colButtons: {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 40px)`,
    gap: 4,
    marginBottom: 4,
  },
  colBtn: {
    width: 40,
    height: 20,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#ff6eb4',
    fontSize: 12,
    lineHeight: 1,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'opacity 0.15s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 40px)`,
    gridTemplateRows: `repeat(${ROWS}, 40px)`,
    gap: 4,
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
    fontSize: 15,
    lineHeight: 1.8,
  },
  legend: {
    display: 'flex',
    gap: 16,
    marginTop: 10,
    fontSize: 12,
    color: '#777',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: 4,
    verticalAlign: 'middle',
  },
};

/**
 * ConnectFour component — Player vs CPU with win/block AI.
 * Tracks cumulative wins and saves via useHighScore.
 *
 * @returns {JSX.Element}
 */
export default function ConnectFour() {
  const [best, saveScore] = useHighScore('connectfour');

  const [board, setBoard] = useState(emptyBoard());
  const [turn, setTurn] = useState(PLAYER); // who moves next
  const [status, setStatus] = useState('playing'); // 'playing' | 'won' | 'lost' | 'draw'
  const [wins, setWins] = useState(0);
  const [newRecord, setNewRecord] = useState(false);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [cpuThinking, setCpuThinking] = useState(false);

  /** Resolve game outcome after a board update. */
  const resolveOutcome = useCallback(
    (nextBoard, mover, currentWins) => {
      const winner = checkWinner(nextBoard);
      if (winner === PLAYER) {
        const newWins = currentWins + 1;
        setWins(newWins);
        setStatus('won');
        const isNew = saveScore(newWins * 100);
        setNewRecord(isNew);
        return true;
      }
      if (winner === CPU) {
        setStatus('lost');
        return true;
      }
      if (isBoardFull(nextBoard)) {
        setStatus('draw');
        return true;
      }
      return false;
    },
    [saveScore]
  );

  /** Player clicks a column. */
  const handleColumnClick = useCallback(
    (col) => {
      if (status !== 'playing' || turn !== PLAYER || cpuThinking) return;
      if (board[0][col] !== EMPTY) return; // column full

      const next = dropPiece(board, col, PLAYER);
      if (!next) return;

      setBoard(next);

      const gameOver = resolveOutcome(next, PLAYER, wins);
      if (!gameOver) {
        setTurn(CPU);
      }
    },
    [board, status, turn, cpuThinking, wins, resolveOutcome]
  );

  /** CPU move runs after turn switches to CPU. */
  useEffect(() => {
    if (status !== 'playing' || turn !== CPU) return;

    setCpuThinking(true);
    const timeout = setTimeout(() => {
      const col = cpuMove(board);
      if (col === -1) {
        setStatus('draw');
        setCpuThinking(false);
        return;
      }

      const next = dropPiece(board, col, CPU);
      if (!next) {
        setCpuThinking(false);
        return;
      }

      setBoard(next);
      const gameOver = resolveOutcome(next, CPU, wins);
      if (!gameOver) {
        setTurn(PLAYER);
      }
      setCpuThinking(false);
    }, 450); // small delay so CPU move feels intentional

    return () => clearTimeout(timeout);
  }, [turn, status, board, wins, resolveOutcome]);

  const restartGame = () => {
    setBoard(emptyBoard());
    setTurn(PLAYER);
    setStatus('playing');
    setNewRecord(false);
    setCpuThinking(false);
    setHoveredCol(null);
  };

  // --- Render ---

  const getCellColor = (cell) => {
    if (cell === PLAYER) return PLAYER_COLOR;
    if (cell === CPU) return CPU_COLOR;
    return EMPTY_COLOR;
  };

  const getCellGlow = (cell) => {
    if (cell === PLAYER) return `0 0 10px ${PLAYER_COLOR}99`;
    if (cell === CPU) return `0 0 10px ${CPU_COLOR}99`;
    return 'none';
  };

  const isInteractive = status === 'playing' && turn === PLAYER && !cpuThinking;

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>conecta cuatro</div>

      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span>victorias</span>
          <span style={styles.statValue}>{wins}</span>
        </div>
        <div style={styles.statItem}>
          <span>récord</span>
          <span style={styles.statRecord}>{best ?? 0}</span>
        </div>
        <div style={styles.statItem}>
          <span>turno</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color:
                status !== 'playing'
                  ? '#555'
                  : turn === PLAYER
                    ? PLAYER_COLOR
                    : CPU_COLOR,
            }}
          >
            {status !== 'playing' ? '—' : turn === PLAYER ? 'tú' : cpuThinking ? 'cpu...' : 'cpu'}
          </span>
        </div>
      </div>

      <div style={styles.boardContainer}>
        {/* Column drop buttons */}
        <div style={styles.colButtons}>
          {Array.from({ length: COLS }, (_, col) => (
            <button
              key={col}
              style={{
                ...styles.colBtn,
                opacity: isInteractive && board[0][col] === EMPTY ? 1 : 0,
              }}
              onClick={() => handleColumnClick(col)}
              onMouseEnter={() => setHoveredCol(col)}
              onMouseLeave={() => setHoveredCol(null)}
              disabled={!isInteractive}
              aria-label={`columna ${col + 1}`}
            >
              ▼
            </button>
          ))}
        </div>

        {/* Board grid */}
        <div style={styles.grid}>
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onClick={() => handleColumnClick(c)}
                onMouseEnter={() => setHoveredCol(c)}
                onMouseLeave={() => setHoveredCol(null)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: getCellColor(cell),
                  boxShadow: getCellGlow(cell),
                  cursor: isInteractive && board[0][c] === EMPTY ? 'pointer' : 'default',
                  transition: 'background 0.15s, box-shadow 0.15s',
                  outline:
                    isInteractive && hoveredCol === c && cell === EMPTY
                      ? `2px solid ${PLAYER_COLOR}55`
                      : 'none',
                }}
              />
            ))
          )}
        </div>
      </div>

      {status === 'won' && (
        <div style={styles.overlay}>
          <span style={{ color: PLAYER_COLOR, fontWeight: 700 }}>ganaste! 🎉</span>
          {newRecord && (
            <div style={{ color: '#00e5ff', fontSize: 12 }}>nuevo récord!</div>
          )}
        </div>
      )}

      {status === 'lost' && (
        <div style={styles.overlay}>
          <span style={{ color: CPU_COLOR, fontWeight: 700 }}>ganó la cpu 🤖</span>
        </div>
      )}

      {status === 'draw' && (
        <div style={styles.overlay}>
          <span style={{ color: '#888', fontWeight: 700 }}>empate</span>
        </div>
      )}

      {status !== 'playing' && (
        <button style={styles.btn} onClick={restartGame}>
          reiniciar
        </button>
      )}

      <div style={styles.legend}>
        <span>
          <span style={{ ...styles.legendDot, background: PLAYER_COLOR }} />
          tú
        </span>
        <span>
          <span style={{ ...styles.legendDot, background: CPU_COLOR }} />
          cpu
        </span>
      </div>
    </div>
  );
}
