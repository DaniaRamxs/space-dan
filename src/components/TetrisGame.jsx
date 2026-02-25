import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

// --- Constants ---

const COLS = 10;
const ROWS = 20;
const EMPTY = 0;

/** @type {Record<string, {shape: number[][], color: string}>} */
const TETROMINOES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00e5ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffe600' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#bf5fff' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff87' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff6eb4' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#ff9500' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#3399ff' },
};

const PIECE_KEYS = Object.keys(TETROMINOES);

const LINE_SCORES = [0, 100, 300, 500, 800];

// Speed in ms per drop tick; decreases every 10 lines
const calcSpeed = (level) => Math.max(100, 800 - level * 70);

// --- Helpers ---

/** @returns {number[][]} empty board */
const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

/** @returns {string} random tetromino key */
const randomKey = () => PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];

/**
 * Rotate a 2D matrix 90° clockwise.
 * @param {number[][]} matrix
 * @returns {number[][]}
 */
const rotate = (matrix) =>
  matrix[0].map((_, colIdx) => matrix.map((row) => row[colIdx]).reverse());

/**
 * Check whether a piece at (x, y) with given shape is valid on the board.
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
const isValid = (board, shape, x, y) => {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = r + y;
      const nc = c + x;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
      if (board[nr][nc] !== EMPTY) return false;
    }
  }
  return true;
};

/**
 * Merge a piece into the board, returning the new board.
 * @param {number[][]} board
 * @param {number[][]} shape
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @returns {number[][]}
 */
const mergePiece = (board, shape, x, y, color) => {
  const next = board.map((row) => [...row]);
  shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) next[r + y][c + x] = color;
    });
  });
  return next;
};

/**
 * Clear completed lines and return updated board + lines cleared.
 * @param {number[][]} board
 * @returns {{ board: number[][], lines: number }}
 */
const clearLines = (board) => {
  const remaining = board.filter((row) => row.some((cell) => cell === EMPTY));
  const cleared = ROWS - remaining.length;
  const newBoard = [
    ...Array.from({ length: cleared }, () => Array(COLS).fill(EMPTY)),
    ...remaining,
  ];
  return { board: newBoard, lines: cleared };
};

// --- Initial piece factory ---
const spawnPiece = (key) => {
  const { shape, color } = TETROMINOES[key];
  return {
    key,
    shape,
    color,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
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
    gap: 20,
    marginBottom: 10,
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
  boardWrapper: {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 26px)`,
    gridTemplateRows: `repeat(${ROWS}, 26px)`,
    gap: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,110,180,0.15)',
    borderRadius: 6,
    padding: 4,
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
    transition: 'background 0.2s',
  },
  overlay: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 1.8,
  },
  nextLabel: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  nextGrid: {
    display: 'grid',
    gap: 1,
    marginBottom: 10,
  },
};

/**
 * TetrisGame component — self-contained Tetris with dark glassmorphism UI.
 * Saves the best score via the useHighScore hook.
 *
 * @returns {JSX.Element}
 */
export default function TetrisGame() {
  const [best, saveScore] = useHighScore('tetris');

  const [board, setBoard] = useState(emptyBoard());
  const [piece, setPiece] = useState(null);
  const [nextKey, setNextKey] = useState(randomKey());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'playing' | 'over'
  const [newRecord, setNewRecord] = useState(false);

  // Use refs for values needed inside the game loop without stale closure issues
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const scoreRef = useRef(score);
  const linesRef = useRef(lines);
  const levelRef = useRef(level);
  const nextKeyRef = useRef(nextKey);
  const statusRef = useRef(status);

  boardRef.current = board;
  pieceRef.current = piece;
  scoreRef.current = score;
  linesRef.current = lines;
  levelRef.current = level;
  nextKeyRef.current = nextKey;
  statusRef.current = status;

  const tickRef = useRef(null);

  // --- Game logic ---

  const lockPiece = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p) return;

    const merged = mergePiece(b, p.shape, p.x, p.y, p.color);
    const { board: clearedBoard, lines: linesCleared } = clearLines(merged);

    const addedScore = LINE_SCORES[linesCleared] ?? 0;
    const newScore = scoreRef.current + addedScore;
    const newLines = linesRef.current + linesCleared;
    const newLevel = Math.floor(newLines / 10) + 1;

    setBoard(clearedBoard);
    setScore(newScore);
    setLines(newLines);
    setLevel(newLevel);

    // Spawn next piece
    const nk = nextKeyRef.current;
    const next = spawnPiece(nk);
    const nextNext = randomKey();

    if (!isValid(clearedBoard, next.shape, next.x, next.y)) {
      // Game over
      setStatus('over');
      setPiece(null);
      const isNew = saveScore(newScore);
      setNewRecord(isNew);
      return;
    }

    setPiece(next);
    setNextKey(nextNext);
  }, [saveScore]);

  const dropPiece = useCallback(() => {
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p || statusRef.current !== 'playing') return;

    const newY = p.y + 1;
    if (isValid(b, p.shape, p.x, newY)) {
      setPiece((prev) => ({ ...prev, y: newY }));
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  // Restart the tick whenever level changes (to change speed)
  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      dropPiece();
    }, calcSpeed(levelRef.current));
  }, [dropPiece]);

  useEffect(() => {
    if (status === 'playing') {
      startTick();
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [status, level, startTick]);

  // Shared action handler — used by keyboard AND touch buttons
  const doAction = useCallback((action) => {
    if (status !== 'playing') return;
    const p = pieceRef.current;
    const b = boardRef.current;
    if (!p) return;
    if (action === 'left') {
      if (isValid(b, p.shape, p.x - 1, p.y)) setPiece((prev) => ({ ...prev, x: prev.x - 1 }));
    } else if (action === 'right') {
      if (isValid(b, p.shape, p.x + 1, p.y)) setPiece((prev) => ({ ...prev, x: prev.x + 1 }));
    } else if (action === 'down') {
      dropPiece();
    } else if (action === 'rotate') {
      const rotated = rotate(p.shape);
      if (isValid(b, rotated, p.x, p.y)) {
        setPiece((prev) => ({ ...prev, shape: rotated }));
      } else if (isValid(b, rotated, p.x - 1, p.y)) {
        setPiece((prev) => ({ ...prev, shape: rotated, x: prev.x - 1 }));
      } else if (isValid(b, rotated, p.x + 1, p.y)) {
        setPiece((prev) => ({ ...prev, shape: rotated, x: prev.x + 1 }));
      }
    } else if (action === 'drop') {
      let ny = p.y;
      while (isValid(b, p.shape, p.x, ny + 1)) ny++;
      setPiece((prev) => ({ ...prev, y: ny }));
      setTimeout(lockPiece, 0);
    }
  }, [status, dropPiece, lockPiece]);

  // Keyboard controls
  useEffect(() => {
    if (status !== 'playing') return;
    const handleKey = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', ' ': 'drop' };
      const action = map[e.key];
      if (!action) return;
      doAction(action);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, doAction]);

  const startGame = () => {
    const firstKey = randomKey();
    const secondKey = randomKey();
    setBoard(emptyBoard());
    setScore(0);
    setLines(0);
    setLevel(1);
    setNewRecord(false);
    setPiece(spawnPiece(firstKey));
    setNextKey(secondKey);
    setStatus('playing');
  };

  // --- Render ---

  // Build display board (board + active piece projected)
  const displayBoard = board.map((row) => [...row]);
  if (piece) {
    piece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const dr = r + piece.y;
          const dc = c + piece.x;
          if (dr >= 0 && dr < ROWS && dc >= 0 && dc < COLS) {
            displayBoard[dr][dc] = piece.color;
          }
        }
      });
    });
  }

  // Ghost piece
  if (piece && status === 'playing') {
    let ghostY = piece.y;
    while (isValid(board, piece.shape, piece.x, ghostY + 1)) ghostY++;
    if (ghostY !== piece.y) {
      piece.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            const dr = r + ghostY;
            const dc = c + piece.x;
            if (dr >= 0 && dr < ROWS && dc >= 0 && dc < COLS && displayBoard[dr][dc] === EMPTY) {
              displayBoard[dr][dc] = 'ghost';
            }
          }
        });
      });
    }
  }

  // Next piece preview grid
  const nextPiece = TETROMINOES[nextKey];
  const previewRows = 2;
  const previewCols = 4;
  const previewGrid = Array.from({ length: previewRows }, () => Array(previewCols).fill(null));
  nextPiece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (r < previewRows && c < previewCols) {
        previewGrid[r][c] = cell ? nextPiece.color : null;
      }
    });
  });

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>tetris</div>

      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span>puntos</span>
          <span style={styles.statValue}>{score}</span>
        </div>
        <div style={styles.statItem}>
          <span>nivel</span>
          <span style={styles.statValue}>{level}</span>
        </div>
        <div style={styles.statItem}>
          <span>líneas</span>
          <span style={styles.statValue}>{lines}</span>
        </div>
        <div style={styles.statItem}>
          <span>récord</span>
          <span style={styles.statRecord}>{best ?? 0}</span>
        </div>
      </div>

      {status !== 'idle' && (
        <>
          <div style={styles.nextLabel}>siguiente</div>
          <div
            style={{
              ...styles.nextGrid,
              gridTemplateColumns: `repeat(${previewCols}, 18px)`,
              gridTemplateRows: `repeat(${previewRows}, 18px)`,
              display: 'grid',
              gap: 1,
              marginBottom: 10,
            }}
          >
            {previewGrid.flat().map((color, i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  background: color ?? 'rgba(255,255,255,0.03)',
                  boxShadow: color ? `0 0 6px ${color}88` : 'none',
                }}
              />
            ))}
          </div>
        </>
      )}

      <div style={styles.boardWrapper}>
        {displayBoard.flat().map((cell, i) => (
          <div
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: 3,
              background:
                cell === EMPTY
                  ? 'rgba(255,255,255,0.03)'
                  : cell === 'ghost'
                    ? 'rgba(255,255,255,0.08)'
                    : cell,
              boxShadow:
                cell && cell !== EMPTY && cell !== 'ghost'
                  ? `0 0 8px ${cell}88`
                  : 'none',
              border: cell === 'ghost' ? '1px dashed rgba(255,255,255,0.15)' : 'none',
              transition: 'background 0.05s',
            }}
          />
        ))}
      </div>

      {status === 'idle' && (
        <button style={styles.btn} onClick={startGame}>
          iniciar
        </button>
      )}

      {status === 'over' && (
        <div style={styles.overlay}>
          <div style={{ color: '#ff6eb4', fontWeight: 700 }}>game over</div>
          <div>puntos: {score}</div>
          {newRecord && (
            <div style={{ color: '#00e5ff', fontSize: 12 }}>nuevo récord!</div>
          )}
          <button style={styles.btn} onClick={startGame}>
            reiniciar
          </button>
        </div>
      )}

      {/* Touch controls for mobile */}
      {status === 'playing' && (() => {
        const ctrlBtn = {
          border: '1px solid rgba(255,110,180,0.5)',
          background: 'rgba(255,110,180,0.12)',
          color: '#ff6eb4',
          borderRadius: 8,
          fontSize: 16,
          cursor: 'pointer',
          width: 50, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', touchAction: 'none', WebkitUserSelect: 'none',
          fontFamily: 'monospace',
        };
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <button style={{ ...ctrlBtn, width: 110 }} onPointerDown={() => doAction('rotate')}>↺ rotar</button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={ctrlBtn} onPointerDown={() => doAction('left')}>◀</button>
              <button style={ctrlBtn} onPointerDown={() => doAction('down')}>▼</button>
              <button style={ctrlBtn} onPointerDown={() => doAction('right')}>▶</button>
            </div>
            <button style={{ ...ctrlBtn, width: 110 }} onPointerDown={() => doAction('drop')}>⬇ caída</button>
          </div>
        );
      })()}

      <div style={{ fontSize: 11, color: '#555', marginTop: 10, textAlign: 'center' }}>
        ← → mover &nbsp; ↑ rotar &nbsp; ↓ bajar &nbsp; espacio caída
      </div>
    </div>
  );
}
