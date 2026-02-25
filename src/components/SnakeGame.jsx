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

  const [snake, setSnake] = useState([[10, 10], [10, 11], [10, 12]]);
  const [food, setFood] = useState([5, 5]);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  // Use refs for direction to handle input faster than the tick
  const dirRef = useRef({ x: 0, y: -1 });
  const nextDirRef = useRef({ x: 0, y: -1 });
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
    setFood(newFood);
  }, []);

  const gameOver = useCallback((finalScoreCount) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalScore = finalScoreCount * 15;
    const isNewRecord = saveScore(finalScore);
    setIsHighScore(isNewRecord);
    setPhase('over');
  }, [saveScore]);

  const move = useCallback(() => {
    let collision = false;
    let finalScore = 0;

    setSnake(prevSnake => {
      if (collision) return prevSnake;
      const d = nextDirRef.current;
      dirRef.current = d;

      const head = prevSnake[0];
      const newHead = [head[0] + d.x, head[1] + d.y];

      // Wall collision
      if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
        collision = true;
        finalScore = score;
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
        collision = true;
        finalScore = score;
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead[0] === food[0] && newHead[1] === food[1]) {
        setScore(s => s + 1);
        spawnFood(newSnake);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });

    if (collision) {
      gameOver(finalScore);
    }
  }, [food, score, gameOver, spawnFood]);

  // Adjust speed based on score
  useEffect(() => {
    if (phase === 'playing') {
      const newSpeed = Math.max(60, INITIAL_SPEED - score * SPEED_INC);
      setSpeed(newSpeed);
    }
  }, [score, phase]);

  // Game loop
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(move, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, move, speed]);

  const start = () => {
    setSnake([[10, 10], [10, 11], [10, 12]]);
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setPhase('playing');
    setIsHighScore(false);
    spawnFood([[10, 10], [10, 11], [10, 12]]);
  };

  useEffect(() => {
    const handleKey = (e) => {
      const d = dirRef.current;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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
          const isFood = food[0] === x && food[1] === y;
          const segIdx = snake.findIndex(s => s[0] === x && s[1] === y);
          const isSnake = segIdx !== -1;
          const isHead = segIdx === 0;

          return (
            <div key={i} style={{
              width: cellSize, height: cellSize,
              background: isHead ? C_HEAD : isSnake ? C_SNAKE : isFood ? C_FOOD : 'transparent',
              borderRadius: isFood ? '50%' : isSnake ? 2 : 0,
              boxShadow: isHead ? `0 0 10px ${C_HEAD}` : isFood ? `0 0 12px ${C_FOOD}` : 'none',
              opacity: isSnake && !isHead ? 0.8 : 1
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
                  <div style={{ fontSize: 18, color: '#fff' }}>Score: {score * 15}</div>
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
