import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';

const GRID_SIZE = 20;
const INITIAL_SPEED = 140;
const SPEED_INC = 2.5;

const C_SNAKE = '#ff00ff';
const C_HEAD = '#ffffff';
const C_FOOD = '#00e5ff';

function SnakeGameInner() {
  const [best, saveScore] = useHighScore('snake');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [snake, setSnake] = useState([[10, 10], [10, 11], [10, 12]]);
  const [food, setFood] = useState([5, 5]);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

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
    saveScore(finalScoreCount);
    setStatus('DEAD');
    triggerHaptic('heavy');
    const head = snake[0];
    const cellSize = 100 / GRID_SIZE;
    spawnParticles(`${head[0] * cellSize}%`, `${head[1] * cellSize}%`, C_SNAKE, 25);
    triggerFloatingText('GAME OVER', '50%', '40%', '#ff0000');
  }, [saveScore, triggerHaptic, spawnParticles, snake, triggerFloatingText]);

  const move = useCallback(() => {
    let collision = false;
    let currentScore = 0;

    setSnake(prevSnake => {
      if (collision) return prevSnake;
      const d = nextDirRef.current;
      dirRef.current = d;

      const head = prevSnake[0];
      const newHead = [head[0] + d.x, head[1] + d.y];

      if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
        collision = true;
        currentScore = score;
        return prevSnake;
      }

      if (prevSnake.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
        collision = true;
        currentScore = score;
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      if (newHead[0] === food[0] && newHead[1] === food[1]) {
        const newScoreVal = score + 1;
        setScore(newScoreVal);
        animateScore();
        triggerHaptic('medium');
        triggerFloatingText('+1', '50%', '40%', C_FOOD);

        const cellSize = 100 / GRID_SIZE;
        spawnParticles(`${food[0] * cellSize}%`, `${food[1] * cellSize}%`, C_FOOD, 10);
        spawnFood(newSnake);
      } else {
        newSnake.pop();
      }

      return newSnake;
    });

    if (collision) {
      gameOver(score);
    }
  }, [food, score, gameOver, spawnFood, animateScore, triggerHaptic, triggerFloatingText, spawnParticles]);

  useEffect(() => {
    if (status === 'PLAYING') {
      const newSpeed = Math.max(70, INITIAL_SPEED - score * SPEED_INC);
      setSpeed(newSpeed);
    }
  }, [score, status]);

  useEffect(() => {
    if (status === 'PLAYING') {
      timerRef.current = setInterval(move, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, move, speed]);

  const start = () => {
    setSnake([[10, 10], [10, 11], [10, 12]]);
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setStatus('PLAYING');
    spawnFood([[10, 10], [10, 11], [10, 12]]);
    triggerHaptic('medium');
  };

  useEffect(() => {
    const handleKey = (e) => {
      const d = dirRef.current;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (status !== 'PLAYING') return;
      if (e.key === 'ArrowUp' && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status]);

  return (
    <ArcadeShell
      title="Snake Neon"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Recopila datos de energía para crecer."
    >
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        width: 'min(70vh, 85vw)',
        height: 'min(70vh, 85vw)',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 8,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)'
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
              background: isHead ? C_HEAD : isSnake ? C_SNAKE : isFood ? C_FOOD : 'transparent',
              borderRadius: isFood ? '50%' : isSnake ? 6 : 0,
              boxShadow: isHead ? `0 0 20px ${C_HEAD}` : isFood ? `0 0 20px ${C_FOOD}` : isSnake ? `0 0 8px ${C_SNAKE}aa` : 'none',
              transform: isFood ? 'scale(0.85)' : 'scale(1)',
              opacity: isSnake || isFood ? 1 : 0.1,
              border: isSnake || isFood ? 'none' : '1px solid rgba(255,255,255,0.02)'
            }} />
          );
        })}
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 16, alignItems: 'center' }}>
        <Btn onClick={() => { if (dirRef.current.x !== 1) { nextDirRef.current = { x: -1, y: 0 }; triggerHaptic('light'); } }}>◀</Btn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Btn onClick={() => { if (dirRef.current.y !== 1) { nextDirRef.current = { x: 0, y: -1 }; triggerHaptic('light'); } }}>▲</Btn>
          <Btn onClick={() => { if (dirRef.current.y !== -1) { nextDirRef.current = { x: 0, y: 1 }; triggerHaptic('light'); } }}>▼</Btn>
        </div>
        <Btn onClick={() => { if (dirRef.current.x !== -1) { nextDirRef.current = { x: 1, y: 0 }; triggerHaptic('light'); } }}>▶</Btn>
      </div>
    </ArcadeShell>
  );
}

function Btn({ children, onClick }) {
  return (
    <button
      onPointerDown={e => { e.preventDefault(); onClick(); }}
      style={{
        width: 64, height: 64, borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        color: '#fff', fontSize: 24, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.15s'
      }}
      className="active:scale-95 active:bg-white/10 active:border-white/20"
    >
      {children}
    </button>
  );
}

export default function SnakeGame() {
  return (
    <GameImmersiveLayout>
      <SnakeGameInner />
    </GameImmersiveLayout>
  );
}
