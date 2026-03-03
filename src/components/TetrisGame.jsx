import { useState, useEffect, useCallback, useRef } from 'react';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import useHighScore from '../hooks/useHighScore';

const ROWS = 20;
const COLS = 10;

const COLORS = {
  I: '#00e5ff', // cyan
  J: '#2979ff', // blue
  L: '#ff9100', // orange
  O: '#ffea00', // yellow
  S: '#00e676', // green
  T: '#d500f9', // purple
  Z: '#ff1744', // red
  empty: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.07)',
  ghost: 'rgba(255, 255, 255, 0.1)',
};

const TETROMINOS = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: COLORS.I },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: COLORS.J },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: COLORS.L },
  O: { shape: [[1, 1], [1, 1]], color: COLORS.O },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: COLORS.S },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: COLORS.T },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: COLORS.Z },
};

const createEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

function TetrisGameInner() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [nextPiece, setNextPiece] = useState(null);
  const [activePiece, setActivePiece] = useState(null);

  const [best, saveScore] = useHighScore('tetris');
  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const gameLoopRef = useRef(null);
  const pieceRef = useRef(null);
  const boardRef = useRef(createEmptyBoard());

  const getRandomPiece = useCallback(() => {
    const keys = Object.keys(TETROMINOS);
    const type = keys[Math.floor(Math.random() * keys.length)];
    return { ...TETROMINOS[type], type, pos: { x: 3, y: 0 } };
  }, []);

  const resetGame = useCallback(() => {
    boardRef.current = createEmptyBoard();
    setBoard(boardRef.current);
    setScore(0);
    setLevel(1);
    setLines(0);
    const first = getRandomPiece();
    const second = getRandomPiece();
    setActivePiece(first);
    setNextPiece(second);
    pieceRef.current = first;
    setStatus('PLAYING');
    triggerHaptic('medium');
  }, [getRandomPiece, triggerHaptic]);

  const collision = (p, b, offset = { x: 0, y: 0 }) => {
    for (let y = 0; y < p.shape.length; y++) {
      for (let x = 0; x < p.shape[y].length; x++) {
        if (p.shape[y][x]) {
          const newX = p.pos.x + x + offset.x;
          const newY = p.pos.y + y + offset.y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && b[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotate = (matrix) => {
    const rotated = matrix[0].map((_, index) => matrix.map((col) => col[index]).reverse());
    return rotated;
  };

  const drop = useCallback(() => {
    if (status !== 'PLAYING' || !pieceRef.current) return;

    if (!collision(pieceRef.current, boardRef.current, { x: 0, y: 1 })) {
      pieceRef.current = { ...pieceRef.current, pos: { ...pieceRef.current.pos, y: pieceRef.current.pos.y + 1 } };
      setActivePiece(pieceRef.current);
    } else {
      // Lock piece
      const newBoard = boardRef.current.map((row) => [...row]);
      pieceRef.current.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = pieceRef.current.pos.y + y;
            const boardX = pieceRef.current.pos.x + x;
            if (boardY >= 0) newBoard[boardY][boardX] = pieceRef.current.type;
          }
        });
      });

      // Clear lines
      let clearedLines = 0;
      const filteredBoard = newBoard.filter((row) => {
        const isFull = row.every((cell) => cell !== 0);
        if (isFull) clearedLines++;
        return !isFull;
      });

      while (filteredBoard.length < ROWS) {
        filteredBoard.unshift(Array(COLS).fill(0));
      }

      const currentScoreRef = score; // Use current score from state
      if (clearedLines > 0) {
        const points = [0, 100, 300, 500, 800][clearedLines] * level;
        setScore((prev) => {
          const next = prev + points;
          return next;
        });
        setLines((prev) => prev + clearedLines);
        setLevel((prev) => Math.floor((lines + clearedLines) / 10) + 1);

        triggerHaptic('heavy');
        animateScore();
        triggerFloatingText(`+${points}`, '50%', '40%', COLORS[pieceRef.current.type]);
        spawnParticles('50%', '40%', COLORS[pieceRef.current.type], 20);
      } else {
        triggerHaptic('light');
      }

      boardRef.current = filteredBoard;
      setBoard(boardRef.current);

      if (collision(nextPiece, boardRef.current)) {
        setStatus('DEAD');
        saveScore(currentScoreRef + ([0, 100, 300, 500, 800][clearedLines] * level || 0));
        return;
      }

      const next = nextPiece;
      setNextPiece(getRandomPiece());
      setActivePiece(next);
      pieceRef.current = next;
    }
  }, [status, nextPiece, level, lines, getRandomPiece, saveScore, score, triggerHaptic, animateScore, triggerFloatingText, spawnParticles]);

  const move = useCallback((dir) => {
    if (status !== 'PLAYING' || !pieceRef.current) return;
    if (!collision(pieceRef.current, boardRef.current, { x: dir, y: 0 })) {
      pieceRef.current = { ...pieceRef.current, pos: { ...pieceRef.current.pos, x: pieceRef.current.pos.x + dir } };
      setActivePiece(pieceRef.current);
      triggerHaptic('light');
    }
  }, [status, triggerHaptic]);

  const handleRotate = useCallback(() => {
    if (status !== 'PLAYING' || !pieceRef.current) return;
    const rotatedShape = rotate(pieceRef.current.shape);
    const clonedPiece = { ...pieceRef.current, shape: rotatedShape };

    // Kick wall logic
    let offset = 0;
    if (collision(clonedPiece, boardRef.current)) {
      offset = 1;
      if (collision({ ...clonedPiece, pos: { ...clonedPiece.pos, x: clonedPiece.pos.x + offset } }, boardRef.current)) {
        offset = -1;
        if (collision({ ...clonedPiece, pos: { ...clonedPiece.pos, x: clonedPiece.pos.x + offset } }, boardRef.current)) {
          return;
        }
      }
    }

    pieceRef.current = { ...clonedPiece, pos: { ...clonedPiece.pos, x: clonedPiece.pos.x + offset } };
    setActivePiece(pieceRef.current);
    triggerHaptic('medium');
  }, [status, triggerHaptic]);

  const hardDrop = useCallback(() => {
    if (status !== 'PLAYING' || !pieceRef.current) return;
    let offset = 0;
    while (!collision(pieceRef.current, boardRef.current, { x: 0, y: offset + 1 })) {
      offset++;
    }
    pieceRef.current = { ...pieceRef.current, pos: { ...pieceRef.current.pos, y: pieceRef.current.pos.y + offset } };
    setActivePiece(pieceRef.current);
    drop();
    triggerHaptic('heavy');
  }, [status, drop, triggerHaptic]);

  useEffect(() => {
    if (status === 'PLAYING') {
      const interval = Math.max(100, 1000 - (level - 1) * 100);
      gameLoopRef.current = setInterval(drop, interval);
    } else {
      clearInterval(gameLoopRef.current);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [status, level, drop]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (status !== 'PLAYING') return;
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
      if (e.key === 'ArrowDown') drop();
      if (e.key === 'ArrowUp') handleRotate();
      if (e.key === ' ') hardDrop();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, drop, move, handleRotate, hardDrop]);

  // Project ghost piece
  const getGhostPos = () => {
    if (!activePiece) return null;
    let offset = 0;
    while (!collision(activePiece, boardRef.current, { x: 0, y: offset + 1 })) {
      offset++;
    }
    return { ...activePiece.pos, y: activePiece.pos.y + offset };
  };

  const ghostPos = getGhostPos();

  const displayBoard = board.map((row) => [...row]);
  if (activePiece) {
    // Draw ghost
    if (ghostPos) {
      activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = ghostPos.y + y;
            const boardX = ghostPos.x + x;
            if (boardY >= 0 && boardY < ROWS) displayBoard[boardY][boardX] = 'GHOST';
          }
        });
      });
    }
    // Draw active
    activePiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const boardY = activePiece.pos.y + y;
          const boardX = activePiece.pos.x + x;
          if (boardY >= 0 && boardY < ROWS) displayBoard[boardY][boardX] = activePiece.type;
        }
      });
    });
  }

  return (
    <ArcadeShell
      title="Tetris"
      score={score}
      bestScore={best}
      status={status}
      onRetry={resetGame}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Une los fragmentos para despejar líneas."
    >
      <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start justify-center">
        {/* Board */}
        <div style={{
          position: 'relative',
          padding: 10,
          background: 'rgba(4,4,10,0.8)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 2,
            width: 'min(65vw, 240px)', // Board más ancho en móvil
            aspectRatio: '10/20',
          }}>
            {displayBoard.flat().map((cell, i) => (
              <div
                key={i}
                style={{
                  background: cell === 'GHOST' ? COLORS.ghost : (cell ? COLORS[cell] : COLORS.empty),
                  borderRadius: 4,
                  border: cell === 'GHOST' ? '1px dashed rgba(255,255,255,0.2)' : 'none',
                  boxShadow: cell && cell !== 'GHOST' ? `0 0 10px ${COLORS[cell]}aa, inset 0 0 5px rgba(255,255,255,0.4)` : 'none',
                  transition: 'background 0.1s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Side Info */}
        <div className="flex flex-row md:flex-col gap-4 md:gap-10 w-full md:w-[90px] justify-center md:justify-start">
          {/* Next Piece */}
          <div style={{
            padding: 16,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, letterSpacing: 1 }}>SIGUIENTE</span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
              width: 60
            }}>
              {nextPiece?.shape.flat().map((cell, i) => (
                <div key={i} style={{
                  width: 13,
                  height: 13,
                  borderRadius: 3,
                  background: cell ? COLORS[nextPiece.type] : 'transparent',
                  boxShadow: cell ? `0 0 8px ${COLORS[nextPiece.type]}88` : 'none'
                }} />
              ))}
              {!nextPiece && Array(16).fill(0).map((_, i) => <div key={i} style={{ width: 13, height: 13 }} />)}
            </div>
          </div>

          {/* Stats */}
          <div style={{
            padding: 16,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>NIVEL</div>
              <div style={{ fontSize: '1.1rem', color: COLORS.I, fontWeight: 900 }}>{level}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>LÍNEAS</div>
              <div style={{ fontSize: '1.1rem', color: COLORS.T, fontWeight: 900 }}>{lines}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <ControlBtn icon="◀" onClick={() => move(-1)} />
        <ControlBtn icon="▶" onClick={() => move(1)} />
        <ControlBtn icon="▼" onClick={() => drop()} />
        <ControlBtn icon="↻" onClick={() => handleRotate()} color={COLORS.T} />
        <ControlBtn icon="DROP" onClick={() => hardDrop()} color={COLORS.I} wide />
      </div>
    </ArcadeShell>
  );
}

function ControlBtn({ icon, onClick, color = '#00e5ff', wide = false }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        width: wide ? 80 : 46,
        height: 46,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        color,
        fontSize: icon === 'DROP' ? '0.7rem' : '1.2rem',
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.1s'
      }}
      className="active:scale-95 active:bg-white/10"
    >
      {icon}
    </button>
  );
}

export default function TetrisGame() {
  return (
    <GameImmersiveLayout>
      <TetrisGameInner />
    </GameImmersiveLayout>
  );
}
