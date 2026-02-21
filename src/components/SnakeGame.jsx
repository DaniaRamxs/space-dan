import { useState, useEffect, useRef } from 'react';
import useHighScore from '../hooks/useHighScore';

const GRID = 20;
const CELL = 16;
const SPEED = 150;

const DIRS = {
  ArrowUp:    [0, -1],
  ArrowDown:  [0,  1],
  ArrowLeft:  [-1, 0],
  ArrowRight: [1,  0],
};

function randomFood(snake) {
  let pos;
  do {
    pos = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)];
  } while (snake.some(([x, y]) => x === pos[0] && y === pos[1]));
  return pos;
}

const INIT_SNAKE = [[10, 10], [9, 10], [8, 10]];
const INIT_DIR   = [1, 0];
const INIT_FOOD  = [15, 10];

export default function SnakeGame() {
  const [best, saveScore]     = useHighScore('snake');
  const [snake, setSnake]     = useState(INIT_SNAKE);
  const [food, setFood]       = useState(INIT_FOOD);
  const [dead, setDead]       = useState(false);
  const [score, setScore]     = useState(0);
  const [started, setStarted] = useState(false);
  const nextDir = useRef(INIT_DIR);

  useEffect(() => {
    if (dead && score > 0) saveScore(score);
  }, [dead]);

  const reset = () => {
    setSnake(INIT_SNAKE);
    nextDir.current = INIT_DIR;
    setFood(INIT_FOOD);
    setDead(false);
    setScore(0);
    setStarted(false);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!DIRS[e.key]) return;
      e.preventDefault();
      const [nx, ny] = DIRS[e.key];
      const [cx, cy] = nextDir.current;
      if (nx + cx === 0 && ny + cy === 0) return;
      nextDir.current = [nx, ny];
      if (!started) setStarted(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  useEffect(() => {
    if (!started || dead) return;
    const id = setInterval(() => {
      setSnake(prev => {
        const [dx, dy] = nextDir.current;
        const head = [prev[0][0] + dx, prev[0][1] + dy];
        if (head[0] < 0 || head[0] >= GRID || head[1] < 0 || head[1] >= GRID) {
          setDead(true); return prev;
        }
        if (prev.some(([x, y]) => x === head[0] && y === head[1])) {
          setDead(true); return prev;
        }
        setFood(f => {
          const ate = head[0] === f[0] && head[1] === f[1];
          if (ate) {
            setScore(s => s + 1);
            const next = [head, ...prev];
            setFood(randomFood(next));
            return randomFood(next);
          }
          return f;
        });
        const next = [head, ...prev];
        // check food again synchronously for tail pop
        const ate = head[0] === food[0] && head[1] === food[1];
        if (!ate) next.pop();
        return next;
      });
    }, SPEED);
    return () => clearInterval(id);
  }, [started, dead, food]);

  // Mobile controls
  const swipe = (dir) => {
    const [nx, ny] = DIRS[dir];
    const [cx, cy] = nextDir.current;
    if (nx + cx === 0 && ny + cy === 0) return;
    nextDir.current = [nx, ny];
    if (!started) setStarted(true);
  };

  const snakeSet = new Set(snake.map(([x, y]) => `${x},${y}`));
  const headKey  = `${snake[0][0]},${snake[0][1]}`;

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, justifyContent: 'center' }}>
        <span>score: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{score}</span></span>
        <span>récord: <span style={{ color: '#ff6eb4', fontWeight: 700 }}>{best}</span></span>
        {!started && !dead && (
          <span style={{ color: 'var(--accent)', fontSize: 11 }}>usa las flechas del teclado</span>
        )}
      </div>

      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${GRID}, ${CELL}px)`,
        gap: 1,
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(0,229,255,0.18)',
        borderRadius: 8,
        padding: 4,
        position: 'relative',
      }}>
        {Array.from({ length: GRID * GRID }).map((_, i) => {
          const x  = i % GRID;
          const y  = Math.floor(i / GRID);
          const k  = `${x},${y}`;
          const isHead = k === headKey;
          const isBody = !isHead && snakeSet.has(k);
          const isFood = food[0] === x && food[1] === y;
          return (
            <div key={i} style={{
              width: CELL, height: CELL,
              borderRadius: isHead ? 4 : isBody ? 3 : 2,
              background: isHead
                ? '#ff00ff'
                : isBody
                ? 'rgba(255,0,255,0.50)'
                : isFood
                ? '#00e5ff'
                : 'transparent',
              boxShadow: isHead
                ? '0 0 8px rgba(255,0,255,0.9)'
                : isFood
                ? '0 0 6px rgba(0,229,255,0.9)'
                : 'none',
            }} />
          );
        })}

        {(dead || !started) && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            borderRadius: 8, gap: 10,
          }}>
            {dead && (
              <div style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>
                game over · {score} pts
              </div>
            )}
            <button onClick={dead ? reset : () => setStarted(true)} style={{
              padding: '7px 20px',
              background: 'rgba(255,0,255,0.12)',
              border: '1px solid rgba(255,0,255,0.45)',
              borderRadius: 999,
              color: '#fff', cursor: 'pointer', fontSize: 12,
              boxShadow: '0 0 10px rgba(255,0,255,0.25)',
            }}>
              {dead ? 'reiniciar' : 'jugar'}
            </button>
          </div>
        )}
      </div>

      {/* Mobile D-pad */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: 4, justifyContent: 'center' }}>
        {[
          [null,         'ArrowUp',    null        ],
          ['ArrowLeft',  null,         'ArrowRight' ],
          [null,         'ArrowDown',  null        ],
        ].map((row, r) => row.map((dir, c) => (
          <button
            key={`${r}-${c}`}
            onClick={() => dir && swipe(dir)}
            style={{
              width: 36, height: 36,
              background: dir ? 'rgba(255,0,255,0.08)' : 'transparent',
              border: dir ? '1px solid rgba(255,0,255,0.25)' : 'none',
              borderRadius: 6,
              color: '#fff', cursor: dir ? 'pointer' : 'default',
              fontSize: 14,
              visibility: dir ? 'visible' : 'hidden',
            }}
          >
            {{ ArrowUp: '▲', ArrowDown: '▼', ArrowLeft: '◀', ArrowRight: '▶' }[dir]}
          </button>
        )))}
      </div>
    </div>
  );
}
