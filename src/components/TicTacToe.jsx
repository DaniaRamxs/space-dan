import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import useHighScore from '../hooks/useHighScore';
import { useSpacelyGame } from '../hooks/useSpacelyGame';
import { tictactoeEngine } from '../engine/tictactoeEngine';

const C_X = '#00e5ff';
const C_O = '#ff00ff';

function TicTacToeInner() {
  const [difficulty, setDifficulty] = useState('hard');
  const [streak, setStreak] = useState(0);
  const [best, saveScore] = useHighScore('ttt');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const gameConfig = useMemo(() => ({
    gameId: 'tictactoe-match',
    gameType: 'tictactoe',
    players: [
      { id: 'X', isAI: false, name: 'Jugador 1' },
      { id: 'O', isAI: true, name: 'HyperBot' }
    ],
    timerConfig: { softLimit: 5000, hardLimit: 15000, tickInterval: 100, autoStart: true }
  }), []);

  const {
    status: gameStatus,
    context,
    engineState,
    makeMove,
    resetGame
  } = useSpacelyGame(tictactoeEngine, gameConfig);

  const { board } = engineState;
  const winner = context.winner;
  const isFinished = gameStatus === 'FINISHED';

  const [prevGameStatus, setPrevGameStatus] = useState('IDLE');

  useEffect(() => {
    if (isFinished && prevGameStatus !== 'FINISHED') {
      setPrevGameStatus('FINISHED');
      if (winner === 'X') {
        const newStreak = streak + 1;
        setStreak(newStreak);
        const pts = (difficulty === 'hard' ? 100 : 20) + (newStreak * 10);
        animateScore();
        saveScore(pts);
        triggerHaptic('heavy');
        spawnParticles('50%', '50%', C_X, 40);
        triggerFloatingText('¡VICTORIA!', '50%', '40%', C_X);
      } else if (winner === 'O') {
        setStreak(0);
        triggerHaptic('medium');
        triggerFloatingText('DERROTA', '50%', '40%', C_O);
      } else if (winner === 'draw') {
        triggerHaptic('light');
        triggerFloatingText('EMPATE', '50%', '40%', '#fff');
      }
    } else if (!isFinished && prevGameStatus === 'FINISHED') {
      setPrevGameStatus('PLAYING');
    }
  }, [isFinished, winner, streak, difficulty, saveScore, animateScore, triggerHaptic, spawnParticles, triggerFloatingText, prevGameStatus]);

  const onRestart = () => {
    resetGame();
  };

  const handleDifficultyChange = (d) => {
    setDifficulty(d);
    setStreak(0);
    onRestart();
  };

  const onCellClick = (idx) => {
    if (board[idx] !== null || isFinished) return;
    triggerHaptic('light');
    makeMove(idx);

    const row = Math.floor(idx / 3);
    const col = idx % 3;
    spawnParticles(`${(col * 33 + 16.5)}%`, `${(row * 33 + 16.5)}%`, C_X, 8);
  };

  const cellSize = 'min(100px, 26vw)';

  return (
    <ArcadeShell
      title="Tic Tac Toe"
      score={streak * 100}
      scoreLabel="Puntos Racha"
      bestScore={best}
      status={isFinished ? 'FINISHED' : 'PLAYING'}
      onRetry={onRestart}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Vence a la IA en este duelo clásico."
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          {['easy', 'hard'].map(d => (
            <button
              key={d}
              onClick={() => handleDifficultyChange(d)}
              style={{
                padding: '8px 18px', borderRadius: 12, border: 'none', fontSize: 11, fontWeight: 900,
                textTransform: 'uppercase', cursor: 'pointer', letterSpacing: 1.5,
                background: difficulty === d ? (d === 'hard' ? C_O : C_X) : 'transparent',
                color: difficulty === d ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
                boxShadow: difficulty === d ? `0 0 15px ${d === 'hard' ? C_O : C_X}66` : 'none'
              }}
            >
              {d === 'easy' ? 'Noob' : 'Pro'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 32, fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ opacity: 0.5, marginBottom: 4 }}>RACHA</span>
            <span style={{ color: C_X }}>{streak}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ opacity: 0.5, marginBottom: 4 }}>MODO</span>
            <span style={{ color: difficulty === 'hard' ? C_O : C_X }}>{difficulty}</span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          background: 'rgba(6,6,12,0.65)',
          padding: 18,
          borderRadius: 26,
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          {board.map((val, i) => {
            const isClickable = !isFinished && context.currentTurn?.id === 'X' && val === null;
            const color = val === 'X' ? C_X : C_O;
            return (
              <motion.div
                key={i}
                whileHover={isClickable ? { scale: 1.04, y: -2, borderColor: 'rgba(255,255,255,0.12)' } : {}}
                whileTap={isClickable ? { scale: 0.93 } : {}}
                onClick={() => isClickable && onCellClick(i)}
                style={{
                  width: cellSize, height: cellSize,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: val ? `${color}08` : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${val ? `${color}25` : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 16,
                  cursor: isClickable ? 'pointer' : 'default',
                  fontSize: 'min(46px, 11vw)', fontWeight: 900,
                  backdropFilter: 'blur(8px)',
                  boxShadow: val ? `0 0 18px ${color}22, inset 0 0 12px ${color}08` : 'inset 0 0 10px rgba(0,0,0,0.2)',
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                }}
              >
                <AnimatePresence>
                  {val && (
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                      style={{
                        color,
                        textShadow: `0 0 24px ${color}cc, 0 0 8px ${color}66`,
                        display: 'block',
                        lineHeight: 1,
                      }}
                    >
                      {val}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {!isFinished && (
          <div style={{
            height: 30,
            fontSize: '0.8rem',
            color: context.currentTurn?.id === 'X' ? C_X : C_O,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: 'uppercase',
            opacity: 0.8
          }}>
            {context.currentTurn?.id === 'X' ? 'Tu Turno' : 'Hyperbot Pensando...'}
          </div>
        )}
      </div>
    </ArcadeShell>
  );
}

export default function TicTacToe() {
  return (
    <GameImmersiveLayout>
      <TicTacToeInner />
    </GameImmersiveLayout>
  );
}
