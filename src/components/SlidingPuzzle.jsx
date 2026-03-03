import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { motion, AnimatePresence } from 'framer-motion';

const GRID = 3;
const TILE_COUNT = GRID * GRID;
const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];

function isSolvable(tiles) {
  const flat = tiles.filter(t => t !== 0);
  let inversions = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  return inversions % 2 === 0;
}

function generateSolvable() {
  let tiles;
  do {
    tiles = [...GOAL].sort(() => Math.random() - 0.5);
  } while (!isSolvable(tiles) || isSolved(tiles));
  return tiles;
}

function isSolved(tiles) {
  return tiles.every((v, i) => v === GOAL[i]);
}

function getAdjacent(emptyIndex) {
  const row = Math.floor(emptyIndex / GRID);
  const col = emptyIndex % GRID;
  const adj = [];
  if (row > 0) adj.push(emptyIndex - GRID);
  if (row < GRID - 1) adj.push(emptyIndex + GRID);
  if (col > 0) adj.push(emptyIndex - 1);
  if (col < GRID - 1) adj.push(emptyIndex + 1);
  return adj;
}

const C_CYN = '#00e5ff';
const C_MAG = '#ff00ff';

function SlidingPuzzleInner() {
  const [tiles, setTiles] = useState(() => generateSolvable());
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState('IDLE'); // IDLE | PLAYING | WIN
  const [best, saveScore] = useHighScore('puzzle');
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const emptyIndex = tiles.indexOf(0);
  const adjacentToEmpty = getAdjacent(emptyIndex);

  const moveTile = (idx) => {
    if (status === 'WIN') return;
    if (!adjacentToEmpty.includes(idx)) return;

    const newTiles = [...tiles];
    [newTiles[idx], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[idx]];
    const newMoves = moves + 1;

    setTiles(newTiles);
    setMoves(newMoves);

    if (status === 'IDLE') setStatus('PLAYING');

    triggerHaptic('light');
    animateScore();

    if (isSolved(newTiles)) {
      setStatus('WIN');
      saveScore(Math.max(1, 1000 - newMoves * 5));
      triggerHaptic('heavy');
      spawnParticles('50%', '50%', C_CYN, 40);
      triggerFloatingText('¡RESUELTO!', '50%', '40%', C_CYN);
    }
  };

  const start = () => {
    setTiles(generateSolvable());
    setMoves(0);
    setStatus('PLAYING');
    triggerHaptic('medium');
  };

  const tileSize = 'min(90px, 25dvw)';

  return (
    <ArcadeShell
      title="Sliding Puzzle"
      score={moves}
      scoreLabel="Movimientos"
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Ordena los números del 1 al 8."
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID}, 1fr)`,
        gap: 12,
        background: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)'
      }}>
        {tiles.map((value, idx) => {
          const isEmpty = value === 0;
          const isAdjacent = adjacentToEmpty.includes(idx);
          const isHovered = hoveredIdx === idx && isAdjacent && status !== 'WIN';

          return (
            <motion.div
              key={`${idx}-${value}`}
              layoutId={`tile-${value}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                border: isHovered ? `2px solid ${C_MAG}` : `1px solid rgba(255,255,255,${isEmpty ? 0.05 : 0.1})`,
                boxShadow: isHovered ? `0 0 20px ${C_MAG}44` : 'none',
              }}
              whileHover={isAdjacent && status !== 'WIN' ? { scale: 1.05, y: -2 } : {}}
              onClick={() => moveTile(idx)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: tileSize,
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                background: isEmpty ? 'transparent' : 'rgba(255,255,255,0.05)',
                color: isHovered ? C_MAG : status === 'WIN' ? C_CYN : '#fff',
                fontSize: 28,
                fontWeight: 800,
                cursor: isAdjacent && status !== 'WIN' ? 'pointer' : 'default',
                transition: 'color 0.2s ease, background 0.2s ease',
                backdropFilter: 'blur(8px)',
                position: 'relative',
              }}
            >
              {value !== 0 ? value : (
                <div style={{
                  width: '40%', height: '40%',
                  border: '2px dashed rgba(255,255,255,0.05)',
                  borderRadius: '50%'
                }} />
              )}
            </motion.div>
          );
        })}
      </div>

      <div style={{
        marginTop: 24,
        fontSize: 11,
        color: 'rgba(255,255,255,0.25)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: 600
      }}>
        {status === 'WIN' ? '¡LO LOGRASTE!' : 'Haz clic para mover las piezas'}
      </div>
    </ArcadeShell>
  );
}

export default function SlidingPuzzle() {
  return (
    <GameImmersiveLayout>
      <SlidingPuzzleInner />
    </GameImmersiveLayout>
  );
}
