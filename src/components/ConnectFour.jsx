import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { useGameCore } from '../core/useGameCore';
import { ArcadeShell } from './ArcadeShell';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { connect4Engine } from '../engine/connect4Engine';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const COLS = 7;
const ROWS = 6;

const COLORS = {
  P1: '#ff00ff',
  P2: '#00e5ff',
  empty: 'rgba(255, 255, 255, 0.03)',
  winningLine: '#ffffff'
};

function ConnectFourInner() {
  const [best, saveScore] = useHighScore('connectfour');
  const [wins, setWins] = useState(0);
  const [hoveredCol, setHoveredCol] = useState(null);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const coreConfig = useMemo(() => ({
    gameId: 'c4-match',
    gameType: 'connect4',
    hasAI: true,
    hasTimer: true,
    aiLevel: 'hard',
    mode: 'single'
  }), []);

  const core = useGameCore(connect4Engine, coreConfig);
  const { state, status, currentPlayer, winner, winningCells, makeMove, resetGame } = core;

  const isFinished = status === 'FINISHED';

  useEffect(() => {
    if (isFinished && winner) {
      if (winner === 'P1') {
        const newWins = wins + 1;
        setWins(newWins);
        saveScore(newWins * 100);
        triggerFloatingText('¡VICTORIA!', '50%', '40%', COLORS.P1);
        spawnParticles('50%', '40%', COLORS.P1, 30);
      } else if (winner === 'P2') {
        triggerFloatingText('IA GANA', '50%', '40%', COLORS.P2);
      } else {
        triggerFloatingText('EMPATE', '50%', '40%', '#fff');
      }
      triggerHaptic('heavy');
    }
  }, [isFinished, winner, saveScore, triggerHaptic, triggerFloatingText, spawnParticles, animateScore]);

  const handleColumnClick = (col) => {
    if (currentPlayer === 'P1' && status === 'PLAYING') {
      const row = findDropRow(col);
      if (row !== -1) {
        triggerHaptic('light');
        spawnParticles(`${(col / (COLS - 1)) * 100}%`, `0%`, COLORS.P1, 5);
        makeMove(col);
      }
    }
  };

  const findDropRow = (col) => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (state.board[r][col] === null) return r;
    }
    return -1;
  };

  const isWinnerCell = (r, c) =>
    winningCells?.some(cell => cell.r === r && cell.c === c);

  return (
    <ArcadeShell
      title="Connect 4"
      score={wins * 100}
      bestScore={best}
      status={status}
      onRetry={resetGame}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      turn={currentPlayer === 'P1' ? 'PLAYER' : 'AI'}
      subTitle="Une cuatro orbes de energía para ganar."
    >
      <div style={{
        position: 'relative',
        padding: '20px 18px',
        background: 'rgba(8,8,16,0.6)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: `
          0 24px 60px rgba(0,0,0,0.7),
          inset 0 0 40px rgba(0,0,0,0.4),
          0 0 24px rgba(255,0,255,0.04)
        `,
        width: 'min(88vw, 420px)',
        aspectRatio: '7/6.8',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>

        {/* Drop Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 6 }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <div
              key={c}
              onMouseEnter={() => setHoveredCol(c)}
              onMouseLeave={() => setHoveredCol(null)}
              onClick={() => handleColumnClick(c)}
              style={{
                height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: currentPlayer === 'P1' && state.board[0][c] === null ? 'pointer' : 'default',
              }}
            >
              <motion.div
                animate={{
                  opacity: hoveredCol === c && currentPlayer === 'P1' ? 1 : 0,
                  y: hoveredCol === c && currentPlayer === 'P1' ? [0, 3, 0] : 0,
                }}
                transition={{ opacity: { duration: 0.15 }, y: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } }}
                style={{
                  width: 10, height: 10,
                  background: COLORS.P1,
                  borderRadius: '50%',
                  boxShadow: `0 0 12px ${COLORS.P1}`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: 6,
        }}>
          {state.board.map((row, r) =>
            row.map((cell, c) => {
              const winning = isWinnerCell(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleColumnClick(c)}
                  onMouseEnter={() => setHoveredCol(c)}
                  onMouseLeave={() => setHoveredCol(null)}
                  style={{
                    position: 'relative',
                    width: '100%', height: '100%',
                    background: 'rgba(255,255,255,0.025)',
                    borderRadius: '50%',
                    border: `1px solid ${winning ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: currentPlayer === 'P1' && !cell ? 'pointer' : 'default',
                  }}
                >
                  {/* Animated Disk — drop from above */}
                  <AnimatePresence>
                    {cell && (
                      <motion.div
                        initial={{ y: -(r + 1) * 52, opacity: 0.6 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 22,
                          mass: 0.8,
                        }}
                        style={{
                          width: '84%', height: '84%',
                          borderRadius: '50%',
                          background: `radial-gradient(circle at 35% 30%, ${COLORS[cell]}ee, ${COLORS[cell]}88)`,
                          boxShadow: winning
                            ? `0 0 28px ${COLORS[cell]}, 0 0 8px ${COLORS[cell]}, inset 0 -4px 10px rgba(0,0,0,0.4)`
                            : `inset 0 -4px 10px rgba(0,0,0,0.4), 0 0 10px ${COLORS[cell]}44`,
                          border: winning ? `2px solid rgba(255,255,255,0.6)` : 'none',
                          position: 'relative',
                        }}
                      >
                        {/* Specular highlight */}
                        <div style={{
                          position: 'absolute', top: '14%', left: '16%',
                          width: '28%', height: '28%',
                          background: 'rgba(255,255,255,0.25)',
                          borderRadius: '50%',
                          filter: 'blur(2px)',
                        }} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hover ghost */}
                  {hoveredCol === c && !cell && currentPlayer === 'P1' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        width: '84%', height: '84%',
                        borderRadius: '50%',
                        border: `2px dashed ${COLORS.P1}44`,
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{
        marginTop: 14,
        display: 'flex',
        gap: 20,
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.45)'
      }}>
        <span>VICTORIAS <span style={{ color: COLORS.P1 }}>{wins}</span></span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span>TURNO <span style={{ color: currentPlayer === 'P1' ? COLORS.P1 : COLORS.P2 }}>{currentPlayer === 'P1' ? 'TÚ' : 'IA'}</span></span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span style={{ opacity: 0.4 }}>DIFÍCIL</span>
      </div>
    </ArcadeShell>
  );
}

export default function ConnectFour() {
  return (
    <GameImmersiveLayout>
      <ConnectFourInner />
    </GameImmersiveLayout>
  );
}
