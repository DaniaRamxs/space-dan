import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { motion, AnimatePresence } from 'framer-motion';

const GRID_SIZE = 20;
const INITIAL_SPEED = 140;
const SPEED_INC = 2;

// Colors
const C_BG = 'rgba(10, 10, 18, 0.95)';
const C_SNAKE = '#ff00ff';
const C_HEAD = '#ffddff';
const C_FOOD = '#00e5ff';

export default function SnakeGame() {
  const [best, saveScore] = useHighScore('snake');
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | playing | over
  const [isHighScore, setIsHighScore] = useState(false);

  // Refs for logic to avoid stale closures in interval
  const snakeRef = useRef([[10, 10], [10, 11], [10, 12]]);
  const dirRef = useRef({ x: 0, y: -1 });
  const nextDirRef = useRef({ x: 0, y: -1 });
  const foodRef = useRef([5, 5]);
  const speedRef = useRef(INITIAL_SPEED);
  const timerRef = useRef(null);

  const spawnFood = useCallback((currentSnake) => {
    let newFood;
    while (true) {
      newFood = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE)
      ];
      const collision = currentSnake.some(seg => seg[0] === newFood[0] && seg[1] === newFood[1]);
      if (!collision) break;
    }
    foodRef.current = newFood;
  }, []);

  const gameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalScore = score * 15;
    const isNewRecord = saveScore(finalScore);
    setIsHighScore(isNewRecord);
    setPhase('over');
  }, [score, saveScore]);

  const move = useCallback(() => {
    const s = snakeRef.current;
    const d = nextDirRef.current;
    dirRef.current = d;

    const head = s[0];
    const newHead = [head[0] + d.x, head[1] + d.y];

    if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
      gameOver();
      return;
    }

    if (s.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
      gameOver();
      return;
    }

    const newSnake = [newHead, ...s];

    if (newHead[0] === foodRef.current[0] && newHead[1] === foodRef.current[1]) {
      setScore(prev => {
        const next = prev + 1;
        speedRef.current = Math.max(60, INITIAL_SPEED - next * SPEED_INC);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(move, speedRef.current);
        return next;
      });
      spawnFood(newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
  }, [gameOver, spawnFood]);

  const start = () => {
    snakeRef.current = [[10, 10], [10, 11], [10, 12]];
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    speedRef.current = INITIAL_SPEED;
    setScore(0);
    setPhase('playing');
    setIsHighScore(false);
    spawnFood(snakeRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(move, speedRef.current);
  };

  useEffect(() => {
    const handleKey = (e) => {
      const d = dirRef.current;
      if (e.key === 'ArrowUp' && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [move]);

  const cellSize = 'min(14px, 4vw)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 12, padding: 12, userSelect: 'none', touchAction: 'none'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 320,
        fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase'
      }}>
        <div>Score: <span style={{ color: C_FOOD }}>{score}</span></div>
        <div style={{ color: C_SNAKE }}>Best: {best}</div>
      </div>

      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize})`,
        gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize})`,
        background: C_BG,
        border: '2px solid rgba(255,255,255,0.05)',
        borderRadius: 8,
        padding: 4,
        overflow: 'hidden'
      }}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isFood = foodRef.current[0] === x && foodRef.current[1] === y;
          const snakeCopy = [...snakeRef.current];
          const segIdx = snakeCopy.findIndex(s => s[0] === x && s[1] === y);
          const isSnake = segIdx !== -1;
          const isHead = segIdx === 0;

          return (
            <div key={i} style={{
              width: cellSize, height: cellSize,
              background: isHead ? C_HEAD : isSnake ? C_SNAKE : isFood ? C_FOOD : 'transparent',
              borderRadius: isFood ? '50%' : isSnake ? 2 : 0,
              boxShadow: isHead ? `0 0 10px ${C_HEAD}` : isFood ? `0 0 12px ${C_FOOD}` : 'none',
              opacity: isSnake && !isHead ? 0.8 : 1,
              transition: 'all 0.1s ease'
            }} />
          );
        })}

        <AnimatePresence>
          {phase !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 10,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16
              }}
            >
              <h2 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C_SNAKE, textShadow: `0 0 20px ${C_SNAKE}` }}>
                {phase === 'idle' ? 'NEON SNAKE' : 'GAME OVER'}
              </h2>
              {phase === 'over' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, color: '#fff' }}>Score: {score}</div>
                  {isHighScore && <div style={{ color: '#00e5ff', fontSize: 12, marginTop: 4 }}>¡NUEVO RÉCORD!</div>}
                </div>
              )}
              <button onClick={start} style={{
                padding: '10px 24px', borderRadius: 999, border: `1px solid ${C_FOOD}`,
                background: 'rgba(0,229,255,0.1)', color: C_FOOD,
                fontWeight: 900, fontSize: 14, cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: 2
              }}>
                {phase === 'idle' ? 'Jugar' : 'Reiniciar'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: 8, justifyContent: 'center' }}>
        <div />
        <Btn onClick={() => { if (dirRef.current.y !== 1) nextDirRef.current = { x: 0, y: -1 } }}>▲</Btn>
        <div />
        <Btn onClick={() => { if (dirRef.current.x !== 1) nextDirRef.current = { x: -1, y: 0 } }}>◀</Btn>
        <Btn onClick={() => { if (dirRef.current.y !== -1) nextDirRef.current = { x: 0, y: 1 } }}>▼</Btn>
        <Btn onClick={() => { if (dirRef.current.x !== -1) nextDirRef.current = { x: 1, y: 0 } }}>▶</Btn>
      </div>
      <p style={{ fontSize: 9, opacity: 0.2, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 }}>
        usa las flechas o el d-pad táctil
      </p>
    </div>
  );
}

function Btn({ children, onClick }) {
  return (
    <button onPointerDown={e => { e.preventDefault(); onClick(); }} style={{
      width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(255,0,255,0.2)',
      background: 'rgba(255,0,255,0.05)', color: '#ff00ff', fontSize: 18, cursor: 'pointer'
    }}>{children}</button>
  );
}
