import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { MobileControls } from './MobileControls';
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
  // Refs for game logic — avoids stale closures in setInterval callbacks
  const snakeRef = useRef([[10, 10], [10, 11], [10, 12]]);
  const foodRef = useRef([5, 5]);
  const scoreRef = useRef(0);
  const statusRef = useRef('IDLE');

  const spawnFood = useCallback((currentSnake) => {
    let newFood;
    do {
      newFood = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE)
      ];
    } while (currentSnake.some(seg => seg[0] === newFood[0] && seg[1] === newFood[1]));
    foodRef.current = newFood;
    setFood(newFood);
  }, []);

  const gameOver = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const finalScore = scoreRef.current;
    saveScore(finalScore);
    statusRef.current = 'DEAD';
    setStatus('DEAD');
    triggerHaptic('heavy');
    const head = snakeRef.current[0];
    if (head) {
      const cellSize = 100 / GRID_SIZE;
      spawnParticles(`${head[0] * cellSize}%`, `${head[1] * cellSize}%`, C_SNAKE, 25);
    }
    triggerFloatingText('GAME OVER', '50%', '40%', '#ff4444');
  }, [saveScore, triggerHaptic, spawnParticles, triggerFloatingText]);

  const move = useCallback(() => {
    if (statusRef.current !== 'PLAYING') return;

    const d = nextDirRef.current;
    dirRef.current = d;
    const currentSnake = snakeRef.current;
    const head = currentSnake[0];

    if (!head) return;

    const newHead = [head[0] + d.x, head[1] + d.y];

    // Wall collision
    if (newHead[0] < 0 || newHead[0] >= GRID_SIZE || newHead[1] < 0 || newHead[1] >= GRID_SIZE) {
      gameOver();
      return;
    }

    // Self collision
    if (currentSnake.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
      gameOver();
      return;
    }

    const currentFood = foodRef.current;
    const ate = newHead[0] === currentFood[0] && newHead[1] === currentFood[1];
    const newSnake = ate
      ? [newHead, ...currentSnake]
      : [newHead, ...currentSnake.slice(0, -1)];

    snakeRef.current = newSnake;
    setSnake(newSnake);

    if (ate) {
      const newScore = scoreRef.current + 10;
      scoreRef.current = newScore;
      setScore(newScore);
      animateScore();
      triggerHaptic('medium');
      const cellSize = 100 / GRID_SIZE;
      spawnParticles(`${newHead[0] * cellSize}%`, `${newHead[1] * cellSize}%`, C_FOOD, 12);
      triggerFloatingText('+10', `${newHead[0] * cellSize}%`, `${newHead[1] * cellSize}%`, C_FOOD);
      spawnFood(newSnake);
      // Accelerate
      const newSpeed = Math.max(70, INITIAL_SPEED - newScore * SPEED_INC);
      setSpeed(newSpeed);
    }
  }, [gameOver, spawnFood, animateScore, triggerHaptic, triggerFloatingText, spawnParticles]);

  useEffect(() => {
    if (status === 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(move, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, move, speed]);

  const start = () => {
    const initSnake = [[10, 10], [10, 11], [10, 12]];
    snakeRef.current = initSnake;
    scoreRef.current = 0;
    statusRef.current = 'PLAYING';
    dirRef.current = { x: 0, y: -1 };
    nextDirRef.current = { x: 0, y: -1 };
    setSnake(initSnake);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setStatus('PLAYING');
    spawnFood(initSnake);
    triggerHaptic('medium');
  };

  useEffect(() => {
    const handleKey = (e) => {
      const d = dirRef.current;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (statusRef.current !== 'PLAYING') return;
      if (e.key === 'ArrowUp' && d.y !== 1) nextDirRef.current = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && d.y !== -1) nextDirRef.current = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && d.x !== 1) nextDirRef.current = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && d.x !== -1) nextDirRef.current = { x: 1, y: 0 };
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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
      gameId="snake"
    >
      {/* Game Board */}
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        width: 'min(92vw, 500px)', // Aumentado para ancho casi completo
        height: 'min(92vw, 500px)',
        background: 'rgba(6,6,12,0.7)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding: 4, // Padding reducido
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
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
              background: isHead ? C_HEAD
                : isSnake ? C_SNAKE
                  : isFood ? C_FOOD
                    : 'transparent',
              borderRadius: isFood ? '50%' : isSnake ? 5 : 2,
              boxShadow: isHead
                ? `0 0 14px ${C_HEAD}, 0 0 28px rgba(255,255,255,0.3)`
                : isFood
                  ? `0 0 14px ${C_FOOD}, 0 0 6px ${C_FOOD}88`
                  : isSnake
                    ? `0 0 6px ${C_SNAKE}88`
                    : 'none',
              transform: isFood ? 'scale(0.82)' : 'scale(1)',
              opacity: isSnake || isFood ? 1 : 0,
              margin: 1,
              transition: 'background 0.05s, transform 0.05s',
            }} />
          );
        })}
      </div>

      {/* Controls will be injected from MobileControls */}
      <MobileControls
        showLeft showRight showUp showDown
        onLeft={() => { if (dirRef.current.x !== 1) { nextDirRef.current = { x: -1, y: 0 }; triggerHaptic('light'); } }}
        onUp={() => { if (dirRef.current.y !== 1) { nextDirRef.current = { x: 0, y: -1 }; triggerHaptic('light'); } }}
        onDown={() => { if (dirRef.current.y !== -1) { nextDirRef.current = { x: 0, y: 1 }; triggerHaptic('light'); } }}
        onRight={() => { if (dirRef.current.x !== -1) { nextDirRef.current = { x: 1, y: 0 }; triggerHaptic('light'); } }}
      />
    </ArcadeShell>
  );
}

export default function SnakeGame() {
  return (
    <GameImmersiveLayout>
      <SnakeGameInner />
    </GameImmersiveLayout>
  );
}
