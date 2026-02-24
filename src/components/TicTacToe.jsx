import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import Confetti from 'react-confetti';

const C_X = '#00e5ff';
const C_O = '#ff00ff';
const C_BG = 'rgba(10, 10, 18, 0.4)';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// Audio helper
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

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState(null);
  const [winLine, setWinLine] = useState([]);
  const [streak, setStreak] = useState(0);
  const [difficulty, setDifficulty] = useState('hard'); // easy | hard
  const [showConfetti, setShowConfetti] = useState(false);
  const [best, saveScore] = useHighScore('ttt');

  const checkWinner = (squares) => {
    for (const [a, b, c] of WIN_LINES) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    if (squares.every(s => s !== null)) return { winner: 'Draw', line: [] };
    return null;
  };

  // Minimax Algorithm for Hard Mode
  const minimax = useCallback((squares, depth, isMax) => {
    const res = checkWinner(squares);
    if (res?.winner === 'O') return 10 - depth;
    if (res?.winner === 'X') return depth - 10;
    if (res?.winner === 'Draw') return 0;

    if (isMax) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = 'O';
          bestScore = Math.max(bestScore, minimax(squares, depth + 1, false));
          squares[i] = null;
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!squares[i]) {
          squares[i] = 'X';
          bestScore = Math.min(bestScore, minimax(squares, depth + 1, true));
          squares[i] = null;
        }
      }
      return bestScore;
    }
  }, []);

  const aiMove = useCallback((currentBoard) => {
    const empty = currentBoard.map((s, i) => (s === null ? i : null)).filter(v => v !== null);

    if (difficulty === 'easy') {
      return empty[Math.floor(Math.random() * empty.length)];
    }

    // Hard Mode - Minimax
    let bestScore = -Infinity;
    let move;
    for (let i = 0; i < 9; i++) {
      if (!currentBoard[i]) {
        currentBoard[i] = 'O';
        const score = minimax(currentBoard, 0, false);
        currentBoard[i] = null;
        if (score > bestScore) {
          bestScore = score;
          move = i;
        }
      }
    }
    return move;
  }, [difficulty, minimax]);

  useEffect(() => {
    if (!isXNext && !winner) {
      const timer = setTimeout(() => {
        const move = aiMove([...board]);
        if (move === undefined) return;

        playTone(300, 'triangle');
        const nextBoard = [...board];
        nextBoard[move] = 'O';
        setBoard(nextBoard);

        const result = checkWinner(nextBoard);
        if (result) {
          setWinner(result.winner);
          setWinLine(result.line);
          if (result.winner === 'X') {
            const currentStreak = streak + 1;
            setStreak(currentStreak);
            const scoreVal = (difficulty === 'hard' ? 100 : 20) + (currentStreak * 10);
            saveScore(scoreVal);
            setShowConfetti(true);
            playTone(600, 'sine', 0.3);
          } else if (result.winner === 'O') {
            setStreak(0);
            playTone(150, 'sawtooth', 0.4);
          }
        } else {
          setIsXNext(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, winner, board, aiMove, saveScore, difficulty, streak]);

  const handleClick = (i) => {
    if (board[i] || winner || !isXNext) return;

    playTone(440, 'sine');
    const nextBoard = [...board];
    nextBoard[i] = 'X';
    setBoard(nextBoard);

    const result = checkWinner(nextBoard);
    if (result) {
      setWinner(result.winner);
      setWinLine(result.line);
      if (result.winner === 'X') {
        const currentStreak = streak + 1;
        setStreak(currentStreak);
        const scoreVal = (difficulty === 'hard' ? 100 : 20) + (currentStreak * 10);
        saveScore(scoreVal);
        setShowConfetti(true);
        playTone(600, 'sine', 0.3);
      } else if (result.winner === 'O') {
        setStreak(0);
        playTone(150, 'sawtooth', 0.4);
      }
    } else {
      setIsXNext(false);
    }
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinLine([]);
    setShowConfetti(false);
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
            onClick={() => { setDifficulty(d); reset(); setStreak(0); }}
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

      {/* Board */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
          background: C_BG, padding: 10, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {board.map((val, i) => {
            const isWin = winLine.includes(i);
            return (
              <motion.div
                key={i}
                whileHover={{ scale: val || winner ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleClick(i)}
                style={{
                  width: cellSize, height: cellSize,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isWin ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${isWin ? (val === 'X' ? C_X : C_O) : 'rgba(255,255,255,0.03)'}`,
                  borderRadius: 14, cursor: val || winner ? 'default' : 'pointer',
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
        {winner ? (
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 20, fontWeight: 900, letterSpacing: 1,
              color: winner === 'X' ? C_X : winner === 'O' ? C_O : '#fff',
              textShadow: winner === 'Draw' ? 'none' : `0 0 10px ${winner === 'X' ? C_X : C_O}aa`
            }}>
              {winner === 'Draw' ? '¡CASI!' : winner === 'X' ? '¡VICTORIA!' : '¡DERROTA!'}
            </div>
            <button onClick={reset} style={{
              marginTop: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', padding: '6px 24px', borderRadius: 999, cursor: 'pointer', fontSize: 10,
              fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1
            }}>REVANCHA</button>
          </motion.div>
        ) : (
          <div style={{ fontSize: 11, color: isXNext ? C_X : C_O, fontWeight: 900, letterSpacing: 2 }}>
            {isXNext ? 'TU TURNO (X)' : 'IA PENSANDO...'}
          </div>
        )}
      </div>

      <div style={{ fontSize: 9, opacity: 0.15, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
        Minimax AI {difficulty === 'hard' ? '(Invincible)' : ''}
      </div>
    </div>
  );
}