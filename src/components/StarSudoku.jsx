/**
 * StarSudoku.jsx — Mini cuadrado latino 4x4 en 45 segundos.
 * Cada fila y columna debe tener los números 1-4 exactamente una vez.
 * Resolverlo completo = x4. Parcial = x0. Ayuda: celdas pre-rellenadas.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';
const TIME_LIMIT = 45;

// Generate a valid 4x4 Latin square
function generateBoard() {
  // Fixed valid solutions (shuffled rows/cols for variety)
  const solutions = [
    [[1,2,3,4],[2,1,4,3],[3,4,1,2],[4,3,2,1]],
    [[1,3,2,4],[2,4,1,3],[3,1,4,2],[4,2,3,1]],
    [[1,4,2,3],[2,3,1,4],[3,2,4,1],[4,1,3,2]],
    [[2,1,4,3],[1,2,3,4],[4,3,2,1],[3,4,1,2]],
  ];
  const solution = solutions[Math.floor(Math.random() * solutions.length)];

  // Reveal 6-8 cells (easy enough to be fun, hard enough to require thought)
  const revealCount = 6 + Math.floor(Math.random() * 3);
  const positions = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) positions.push([r, c]);
  const shuffled = positions.sort(() => Math.random() - 0.5);
  const revealed = new Set(shuffled.slice(0, revealCount).map(([r, c]) => `${r},${c}`));

  const board = solution.map((row, r) =>
    row.map((val, c) => ({
      value: revealed.has(`${r},${c}`) ? val : 0,
      fixed: revealed.has(`${r},${c}`),
    }))
  );

  return { board, solution };
}

function isValid(board) {
  for (let r = 0; r < 4; r++) {
    const rowVals = board[r].map(c => c.value);
    if (rowVals.some(v => v === 0)) return false;
    if (new Set(rowVals).size !== 4) return false;
  }
  for (let c = 0; c < 4; c++) {
    const colVals = board.map(row => row[c].value);
    if (new Set(colVals).size !== 4) return false;
  }
  return true;
}

function hasConflict(board, r, c) {
  const val = board[r][c].value;
  if (val === 0) return false;
  for (let i = 0; i < 4; i++) {
    if (i !== c && board[r][i].value === val) return true;
    if (i !== r && board[i][c].value === val) return true;
  }
  return false;
}

function SudokuGame({ bet, balance, finishGame }) {
  const [{ board, solution }, setPuzzle] = useState(() => generateBoard());
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (done) return;
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(iv);
          if (!doneRef.current) {
            doneRef.current = true;
            setDone(true);
            setTimeout(() => finishGame(0, '⏰ Tiempo agotado'), 300);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [done, finishGame]);

  const setCell = useCallback((val) => {
    if (!selected || done) return;
    const [r, c] = selected;
    if (board[r][c].fixed) return;
    const newBoard = board.map((row, ri) =>
      row.map((cell, ci) => ri === r && ci === c ? { ...cell, value: val } : cell)
    );
    setPuzzle(p => ({ ...p, board: newBoard }));

    if (isValid(newBoard)) {
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        setTimeout(() => finishGame(4, '🧩 ¡Sudoku completo! x4'), 400);
      }
    }
  }, [selected, board, done, finishGame]);

  const timerColor = timeLeft <= 10 ? red : timeLeft <= 20 ? '#ff8c00' : green;
  const filledCount = board.flat().filter(c => c.value !== 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} extra={
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: 2 }}>TIEMPO</div>
          <div style={{ color: timerColor, fontWeight: 900, fontSize: '1.1rem' }}>{timeLeft}s</div>
        </div>
      } />

      <div style={{ marginTop: 52, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🧩</div>
        <h2 style={{ color: gold, fontWeight: 900, margin: '6px 0 2px' }}>STAR SUDOKU</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', margin: 0 }}>Cada fila y columna: 1-2-3-4 sin repetir</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 4 }}>
        {Array(16).fill(0).map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: i < filledCount ? gold : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 60px)', gap: 4 }}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const conflict = hasConflict(board, r, c);
            const borderRight = c === 1 ? '2px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)';
            const borderBottom = r === 1 ? '2px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)';
            return (
              <motion.div
                key={`${r}-${c}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => !cell.fixed && !done && setSelected([r, c])}
                style={{
                  width: 60, height: 60, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', fontWeight: 900, cursor: cell.fixed ? 'default' : 'pointer',
                  background: isSelected ? 'rgba(245,197,24,0.2)' : conflict ? 'rgba(255,23,68,0.15)' : cell.fixed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? gold : conflict ? red : 'rgba(255,255,255,0.1)'}`,
                  borderRight, borderBottom,
                  color: cell.fixed ? gold : conflict ? red : '#fff',
                  transition: 'all 0.15s',
                }}
              >
                {cell.value || (isSelected ? <span style={{ opacity: 0.3 }}>?</span> : '')}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Number pad */}
      {!done && (
        <div style={{ display: 'flex', gap: 10 }}>
          {[1, 2, 3, 4].map(n => (
            <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => setCell(n)}
              style={{
                width: 52, height: 52, borderRadius: 10, fontSize: '1.3rem', fontWeight: 900,
                background: 'rgba(245,197,24,0.12)', border: `1px solid rgba(245,197,24,0.3)`,
                color: gold, cursor: 'pointer',
              }}
            >{n}</motion.button>
          ))}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setCell(0)}
            style={{
              width: 52, height: 52, borderRadius: 10, fontSize: '1rem', fontWeight: 700,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}
          >✕</motion.button>
        </div>
      )}

      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', textAlign: 'center' }}>
        Complétalo para ganar x4 • Parcial = x0
      </div>
    </div>
  );
}

export default function StarSudoku() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('star-sudoku', 'Star Sudoku');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Star Sudoku" icon="🧩" description="Mini Sudoku 4×4 en 45 segundos. Completa para x4." />}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <SudokuGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
