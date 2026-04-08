import { useState, useEffect, useRef, useCallback, Component } from 'react';
import useHighScore from '../hooks/useHighScore';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { MobileControls } from './MobileControls';
import { useSpacelyMusic } from '../utils/spacelyMusic';
import '../styles/snake-game.css';

const GRID_SIZE = 20;
const INITIAL_SPEED = 140;
const SPEED_INC = 2.5;

// Paleta retro arcade espacial
const C_SNAKE = '#00ff41'; // Verde terminal clásico
const C_HEAD  = '#ffffff'; // Blanco puro
const C_FOOD  = '#ff2200'; // Rojo arcade

// Estrellas generadas una vez a nivel de módulo (evita Math.random en render)
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  x: `${(i * 137.508) % 100}%`,       // distribución determinista (golden angle)
  y: `${(i * 97.381) % 100}%`,
  size: i % 12 === 0 ? 3 : i % 3 === 0 ? 2 : 1,
  dur: `${2 + (i % 5)}s`,
  delay: `${(i % 7) * 0.7}s`,
}));

function SnakeGameInner() {
  const [best, saveScore] = useHighScore('snake');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [snake, setSnake] = useState([[10, 10], [10, 11], [10, 12]]);
  const [food, setFood] = useState([5, 5]);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  
  // Music engine
  const musicEngine = useSpacelyMusic();

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const dirRef = useRef({ x: 0, y: -1 });
  const nextDirRef = useRef({ x: 0, y: -1 });
  const timerRef = useRef(null);
  
  // Refs for game logic
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
    
    // Música: Game over - detener completamente
    musicEngine.stop();
    
    const head = snakeRef.current[0];
    if (head) {
      const cellSize = 100 / GRID_SIZE;
      spawnParticles(`${head[0] * cellSize}%`, `${head[1] * cellSize}%`, C_SNAKE, 25);
    }
    triggerFloatingText('GAME OVER', '50%', '40%', '#ff4444');
  }, [saveScore, triggerHaptic, spawnParticles, triggerFloatingText, musicEngine]);

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
      
      // Música: Comer comida - efecto de volumen
      musicEngine.setVolume(1.0); // Subir volumen momentáneo
      setTimeout(() => musicEngine.setVolume(0.8), 100);
      
      // Música: Aumentar tempo más gradualmente cada 100 puntos
      if (newScore % 100 === 0 && newScore > 0) {
        const tempoIncrease = 0.05; // 5% más rápido cada 100 puntos
        const currentTempoMultiplier = 1 + ((newScore / 100) * tempoIncrease);
        const newTempoMultiplier = Math.min(currentTempoMultiplier, 1.25); // Máximo 25% más rápido
        musicEngine.setTempo(newTempoMultiplier);
        
        // Debug en consola
        console.log(`🎵 Tempo aumentado a ${(newTempoMultiplier * 120).toFixed(0)} BPM (${newScore} puntos)`);
      }
      
      // Accelerate
      const newSpeed = Math.max(70, INITIAL_SPEED - newScore * SPEED_INC);
      setSpeed(newSpeed);
    }
  }, [gameOver, spawnFood, animateScore, triggerHaptic, triggerFloatingText, spawnParticles, musicEngine]);

  useEffect(() => {
    if (status === 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(move, speed);
      
      // Música: Reanudar si está pausada
      if (!musicEngine.isPlaying) {
        musicEngine.resume();
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Música: Pausar si no es game over
      if (status === 'IDLE' || status === 'PAUSED') {
        musicEngine.pause();
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, move, speed, musicEngine]);

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
    
    // Música: Empezar juego - reproducir loop con tempo normal
    musicEngine.setTempo(1.0); // Resetear tempo a normal
    musicEngine.playTrack('snake-loop', { volume: 0.8 });
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

  // Detener música al desmontar el componente
  useEffect(() => {
    return () => {
      musicEngine.stop();
    };
  }, [musicEngine]);

  return (
    <ArcadeShell
      title="SNAKE ESPACIAL"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="NAVEGA EL COSMOS · COME ENERGÍA ESTELAR"
      gameId="snake"
    >
      {/* Estrellas de fondo */}
      {STARS.map(s => (
        <div
          key={s.id}
          className="snake-star"
          style={{ left: s.x, top: s.y, width: s.size, height: s.size, '--dur': s.dur, '--delay': s.delay }}
        />
      ))}

      {/* Tablero retro arcade */}
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
        width: 'min(88vw, 440px)',
        height: 'min(88vw, 440px)',
        background: '#000',
        border: '3px solid #00ff41',
        borderRadius: 4,
        padding: 3,
        overflow: 'hidden',
        boxShadow: `
          0 0 0 1px #000,
          0 0 24px rgba(0,255,65,0.7),
          0 0 60px rgba(0,255,65,0.25),
          inset 0 0 40px rgba(0,0,0,0.95)
        `,
        imageRendering: 'pixelated',
      }}>
        {/* Scanlines CRT */}
        <div className="snake-scanlines" />
        {/* Viñeta CRT */}
        <div className="snake-crt-vignette" />

        {/* Grid de celdas */}
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
          const x = i % GRID_SIZE;
          const y = Math.floor(i / GRID_SIZE);
          const isFood = food[0] === x && food[1] === y;
          const segIdx = snake.findIndex(s => s[0] === x && s[1] === y);
          const isSnake = segIdx !== -1;
          const isHead = segIdx === 0;

          return (
            <div
              key={i}
              className={isHead ? 'snake-cell-head' : isFood ? 'snake-cell-food' : undefined}
              style={{
                background: isHead ? C_HEAD : isSnake ? C_SNAKE : isFood ? C_FOOD : 'transparent',
                borderRadius: 0,
                margin: 1,
                zIndex: 2,
              }}
            />
          );
        })}
      </div>

      {/* Controles espaciales */}
      <MobileControls
        showLeft showRight showUp showDown
        onLeft={() => { 
          if (dirRef.current.x !== 1) { 
            nextDirRef.current = { x: -1, y: 0 }; 
            triggerHaptic('light'); 
          } 
        }}
        onUp={() => { 
          if (dirRef.current.y !== 1) { 
            nextDirRef.current = { x: 0, y: -1 }; 
            triggerHaptic('light'); 
          } 
        }}
        onRight={() => { 
          if (dirRef.current.x !== -1) { 
            nextDirRef.current = { x: 1, y: 0 }; 
            triggerHaptic('light'); 
          } 
        }}
        onDown={() => { 
          if (dirRef.current.y !== -1) { 
            nextDirRef.current = { x: 0, y: 1 }; 
            triggerHaptic('light'); 
          } 
        }}
        style={{
          background: 'rgba(0, 0, 20, 0.8)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
        }}
      />
    </ArcadeShell>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ff4444', textAlign: 'center', padding: 40 }}>
          Error al cargar el juego. Recarga la página.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SnakeGame() {
  return (
    <ErrorBoundary>
      <SnakeGameInner />
    </ErrorBoundary>
  );
}
