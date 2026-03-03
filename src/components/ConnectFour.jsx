import { useState, useMemo, useEffect } from 'react';
import useHighScore from '../hooks/useHighScore';
import { useGameCore } from '../core/useGameCore';
import { ArcadeShell } from './ArcadeShell';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { connect4Engine } from '../engine/connect4Engine';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const COLS = 7;
const ROWS = 6;

const COLORS = {
  P1: '#ff00ff', // Magenta
  P2: '#00e5ff', // Cyan
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

  // Scoring / Win Effect
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

  const isWinnerCell = (r, c) => {
    return winningCells?.some(cell => cell.r === r && cell.c === c);
  };

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
        padding: '28px 24px',
        background: 'rgba(255,255,255,0.01)',
        borderRadius: 36,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: `
          0 20px 50px rgba(0,0,0,0.6), 
          inset 0 0 40px rgba(0,0,0,0.5),
          0 0 20px rgba(255,0,255,0.05)
        `,
        width: 'min(90vw, 440px)',
        aspectRatio: '7/6.8',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        backdropFilter: 'blur(10px)'
      }}>
        {/* Drop Indicators */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 8 }}>
          {Array.from({ length: COLS }).map((_, c) => (
            <div
              key={c}
              onMouseEnter={() => setHoveredCol(c)}
              onMouseLeave={() => setHoveredCol(null)}
              onClick={() => handleColumnClick(c)}
              style={{
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentPlayer === 'P1' && state.board[0][c] === null ? 'pointer' : 'default',
                opacity: hoveredCol === c && currentPlayer === 'P1' ? 1 : 0,
                transition: 'opacity 0.2s'
              }}
            >
              <div style={{ width: 12, height: 12, background: COLORS.P1, borderRadius: '50%', boxShadow: `0 0 15px ${COLORS.P1}` }} />
            </div>
          ))}
        </div>

        {/* The Grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: 8,
        }}>
          {state.board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onClick={() => handleColumnClick(c)}
                onMouseEnter={() => setHoveredCol(c)}
                onMouseLeave={() => setHoveredCol(null)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {/* Disk */}
                {cell && (
                  <div style={{
                    width: '85%',
                    height: '85%',
                    borderRadius: '50%',
                    background: COLORS[cell],
                    boxShadow: isWinnerCell(r, c)
                      ? `0 0 25px ${COLORS[cell]}, inset 0 0 10px #fff`
                      : `inset 0 0 20px rgba(0,0,0,0.5), 0 0 10px ${COLORS[cell]}44`,
                    border: isWinnerCell(r, c) ? '2px solid #fff' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}>
                    <div style={{ position: 'absolute', top: '15%', left: '15%', width: '30%', height: '30%', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', filter: 'blur(2px)' }} />
                  </div>
                )}

                {/* Hover Guide */}
                {hoveredCol === c && !cell && currentPlayer === 'P1' && (
                  <div style={{ width: '85%', height: '85%', borderRadius: '50%', border: `2px dashed ${COLORS.P1}33` }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{
        marginTop: 20,
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.3)',
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: 'uppercase'
      }}>
        Nivel: Difícil
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
