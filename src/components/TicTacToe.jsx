import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { GameShell } from '../core/GameShell';
import useHighScore from '../hooks/useHighScore';
import Confetti from 'react-confetti';
import { useSpacelyGame } from '../hooks/useSpacelyGame';
import { tictactoeEngine } from '../engine/tictactoeEngine';

// --- Assets and Config ---
const C_X = '#00e5ff';
const C_O = '#ff00ff';
const C_BG = 'rgba(10, 10, 18, 0.4)';

const playTone = (freq, type = 'sine', duration = 0.1) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* silent fail */ }
};

function TicTacToeInner() {
  const [difficulty, setDifficulty] = useState('hard'); // easy | hard
  const [streak, setStreak] = useState(0);
  const [best, saveScore] = useHighScore('ttt');

  // Game Configuration for Framework Hook
  const gameConfig = useMemo(() => ({
    gameId: 'tictactoe-match',
    gameType: 'tictactoe',
    players: [
      { id: 'X', isAI: false, name: 'Jugador 1' },
      { id: 'O', isAI: true, name: 'HyperBot' }
    ],
    timerConfig: { softLimit: 5000, hardLimit: 15000, tickInterval: 100, autoStart: true }
  }), []);

  // Consumimos el orquestador global
  const {
    status,
    context,
    engineState,
    timerState,
    makeMove,
    resetGame
  } = useSpacelyGame(tictactoeEngine, gameConfig);

  const { board, turn } = engineState;
  const winner = context.winner;
  const isFinished = status === 'FINISHED';

  // Handling Win Event locally for Audio/Confetti since GameEngine doesn't do side effects
  const [prevFinished, setPrevFinished] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  if (isFinished && !prevFinished) {
    setPrevFinished(true);
    if (winner === 'X') {
      const newStreak = streak + 1;
      setStreak(newStreak);
      saveScore((difficulty === 'hard' ? 100 : 20) + (newStreak * 10));
      setShowConfetti(true);
      playTone(600, 'sine', 0.3);
    } else if (winner === 'O') {
      setStreak(0);
      playTone(150, 'sawtooth', 0.4);
    }
  }

  // Handle Local Restart
  const onRestart = () => {
    setPrevFinished(false);
    setShowConfetti(false);
    resetGame();
  };

  const handleDifficultyChange = (d) => {
    setDifficulty(d);
    setStreak(0);
    onRestart();
  };

  const onCellClick = (idx) => {
    // Orquestador ya valida si status === 'PLAYING' y tictactoeEngine valida huecos, pero doble check
    if (board[idx] !== null || isFinished) return;

    // Play sound and delegate to core
    playTone(440, 'sine');
    makeMove(idx);
  };

  const cellSize = 'min(85px, 24vw)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 10, position: 'relative' }}>
      {showConfetti && <Confetti numberOfPieces={150} recycle={false} style={{ pointerEvents: 'none' }} />}

      {/* Difficulty Switcher */}
      <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
        {['easy', 'hard'].map(d => (
          <button
            key={d}
            onClick={() => handleDifficultyChange(d)}
            style={{
              padding: '4px 12px', borderRadius: 8, border: 'none', fontSize: 10, fontWeight: 900,
              textTransform: 'uppercase', cursor: 'pointer', letterSpacing: 1,
              background: difficulty === d ? (d === 'hard' ? C_O : C_X) : 'transparent',
              color: difficulty === d ? '#fff' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.2s'
            }}
          >
            {d === 'easy' ? 'Noob' : 'Pro'}
          </button>
        ))}
      </div>

      {/* Stats HUD */}
      <div style={{ display: 'flex', gap: 20, fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
        <div>Streak: <span style={{ color: C_X }}>{streak}</span></div>
        <div style={{ color: C_O }}>Record: {best}</div>
      </div>

      {/* Central Board */}
      <div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          background: C_BG, padding: 10, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {board.map((val, i) => {
            const isClickable = !isFinished && status === 'PLAYING' && context.currentTurn.id === 'X' && val === null;
            return (
              <motion.div
                key={i}
                whileHover={{ scale: isClickable ? 1.05 : 1 }}
                whileTap={{ scale: isClickable ? 0.95 : 1 }}
                onClick={() => isClickable && onCellClick(i)}
                style={{
                  width: cellSize, height: cellSize, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: `2px solid rgba(255,255,255,0.03)`,
                  borderRadius: 14, cursor: isClickable ? 'pointer' : 'default',
                  fontSize: 40, fontWeight: 900, transition: 'all 0.2s'
                }}
              >
                <AnimatePresence>
                  {val && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0, rotate: -90 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      style={{ color: val === 'X' ? C_X : C_O, textShadow: `0 0 15px ${val === 'X' ? C_X : C_O}aa` }}
                    >
                      {val}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Status Footer */}
      <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'FINISHED' ? (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 20, fontWeight: 900, letterSpacing: 1,
              color: winner === 'X' ? C_X : winner === 'O' ? C_O : '#fff',
              textShadow: winner === 'draw' ? 'none' : `0 0 10px ${winner === 'X' ? C_X : C_O}aa`
            }}>
              {winner === 'draw' ? '¡CASI!' : winner === 'X' ? '¡VICTORIA!' : '¡DERROTA!'}
            </div>
            <button onClick={onRestart} style={{
              marginTop: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', padding: '6px 24px', borderRadius: 999, cursor: 'pointer', fontSize: 10,
              fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1
            }}>REVANCHA</button>
          </motion.div>
        ) : (
          <div style={{ fontSize: 11, color: context.currentTurn?.id === 'X' ? C_X : C_O, fontWeight: 900, letterSpacing: 2 }}>
            {status !== 'PLAYING'
              ? '...'
              : context.currentTurn?.id === 'X'
                ? 'TU TURNO (X)'
                : 'IA PENSANDO...'
            }
          </div>
        )}
      </div>

      {status === 'PLAYING' && timerState.isRunning && (
        <div style={{ fontSize: 9, opacity: 0.15, color: '#fff' }}>Tiempo: {Math.ceil(timerState.remainingHard / 1000)}s</div>
      )}
    </div>
  );
}

export default function TicTacToe() {
  return (
    <GameImmersiveLayout>
      <GameShell title="Tic Tac Toe">
        <TicTacToeInner />
      </GameShell>
    </GameImmersiveLayout>
  );
}
