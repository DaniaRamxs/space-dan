import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const SIZE = 15;
const START = { row: 1, col: 1 };
const GOAL = { row: 13, col: 13 };

function generateMaze() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

  function carve(r, c) {
    visited[r][c] = true;
    grid[r][c] = 0;
    const dirs = [[-2, 0], [2, 0], [0, -2], [0, 2]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 1 && nr < SIZE - 1 && nc >= 1 && nc < SIZE - 1 && !visited[nr][nc]) {
        grid[r + dr / 2][c + dc / 2] = 0;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);
  return grid;
}

function MazeGameInner() {
  const [best, saveScore] = useHighScore('maze');
  const [maze, setMaze] = useState(generateMaze);
  const [player, setPlayer] = useState(START);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('PLAYING');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  // Timer logic
  useEffect(() => {
    if (status !== 'PLAYING') return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Win Check
  useEffect(() => {
    if (player.row === GOAL.row && player.col === GOAL.col && status === 'PLAYING') {
      setStatus('FINISHED');
      const score = Math.max(1200 - seconds * 15, 100);
      saveScore(score);
      triggerHaptic('heavy');
      spawnParticles('85%', '85%', '#00e5ff', 30);
      triggerFloatingText('¡OBJETIVO ALCANZADO!', '50%', '40%', '#00e5ff');
    }
  }, [player, status, seconds, saveScore, triggerHaptic, spawnParticles, triggerFloatingText]);

  const move = useCallback((dr, dc) => {
    if (status !== 'PLAYING') return;

    setPlayer(p => {
      const nr = p.row + dr;
      const nc = p.col + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || maze[nr][nc] === 1) {
        triggerHaptic('light');
        return p;
      }
      return { row: nr, col: nc };
    });
  }, [status, maze, triggerHaptic]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] };
      if (dirs[e.key]) {
        e.preventDefault();
        move(...dirs[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  const restart = useCallback(() => {
    setMaze(generateMaze());
    setPlayer(START);
    setSeconds(0);
    setStatus('PLAYING');
    triggerHaptic('medium');
  }, [triggerHaptic]);

  const cellSize = 24;

  return (
    <ArcadeShell
      title="Neon Maze"
      score={seconds}
      bestScore={best}
      status={status === 'FINISHED' ? 'WIN' : 'PLAYING'}
      onRetry={() => restart()}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Encuentra la salida en la oscuridad del vacío."
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        {/* Maze Container */}
        <div style={{
          position: 'relative',
          width: SIZE * cellSize + 16,
          height: SIZE * cellSize + 16,
          padding: 8,
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Fog of War Layer */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            background: `radial-gradient(circle 80px at ${(player.col * cellSize + cellSize / 2 + 8)}px ${(player.row * cellSize + cellSize / 2 + 8)}px, transparent 0%, rgba(5,5,8,0.95) 100%)`
          }} />

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${SIZE}, ${cellSize}px)`,
          }}>
            {maze.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`} style={{
                width: cellSize,
                height: cellSize,
                background: cell === 1 ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: cell === 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
                boxShadow: cell === 1 ? 'inset 0 0 10px rgba(255,255,255,0.02)' : 'none',
                position: 'relative'
              }}>
                {r === player.row && c === player.col && (
                  <motion.div
                    layoutId="player"
                    style={{
                      width: '60%', height: '60%',
                      margin: '20%', background: '#ff00ff',
                      borderRadius: '50%', boxShadow: '0 0 15px #ff00ff, 0 0 25px rgba(255,0,255,0.5)',
                      zIndex: 3, position: 'relative'
                    }}
                  />
                )}
                {r === GOAL.row && c === GOAL.col && (
                  <div style={{
                    width: '60%', height: '60%',
                    margin: '20%', background: '#00e5ff',
                    borderRadius: '50%', boxShadow: '0 0 15px #00e5ff',
                    filter: 'blur(1px)'
                  }} />
                )}
              </div>
            )))}
          </div>
        </div>

        {/* D-Pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 50px)', gap: 10 }}>
          <div />
          <ControlBtn icon="▲" onClick={() => move(-1, 0)} />
          <div />
          <ControlBtn icon="◀" onClick={() => move(0, -1)} />
          <ControlBtn icon="▼" onClick={() => move(1, 0)} />
          <ControlBtn icon="▶" onClick={() => move(0, 1)} />
        </div>

        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>
          Usa las flechas o los controles táctiles
        </div>
      </div>
    </ArcadeShell>
  );
}

function ControlBtn({ icon, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.1)' }}
      whileTap={{ scale: 0.9 }}
      onPointerDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        width: 50, height: 50, background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
        color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      {icon}
    </motion.button>
  );
}

export default function MazeGame() {
  return (
    <GameImmersiveLayout>
      <MazeGameInner />
    </GameImmersiveLayout>
  );
}
