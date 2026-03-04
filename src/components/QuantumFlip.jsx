/**
 * QuantumFlip.jsx
 * Cara o Cruz. Elige. Puedes duplicar la apuesta tras cada victoria.
 * Si pierdes, pierdes todo lo acumulado.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

function FlipGame({ bet, balance, finishGame }) {
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState(null); // 'heads' | 'tails'
  const [streak, setStreak] = useState(0);
  const [currentMulti, setCurrentMulti] = useState(1);
  const [history, setHistory] = useState([]);

  const flip = useCallback((choice) => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);

    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(outcome);
      setFlipping(false);

      const won = choice === outcome;
      setHistory(h => [...h.slice(-5), won ? '✅' : '❌']);

      if (won) {
        const newMulti = +(currentMulti * 2).toFixed(1);
        setCurrentMulti(newMulti);
        setStreak(s => s + 1);
      } else {
        setTimeout(() => finishGame(0, `${outcome === 'heads' ? '⭕ Cara' : '✖ Cruz'} — perdiste con x${currentMulti}`), 500);
      }
    }, 1000);
  }, [flipping, currentMulti, finishGame]);

  const cashOut = useCallback(() => {
    finishGame(currentMulti, `✅ Retiraste con multiplicador x${currentMulti}`);
  }, [currentMulti, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} label="POTENCIAL" />

      {/* Moneda */}
      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <motion.div
          animate={flipping ? { rotateY: [0, 180, 360, 540, 720], scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 1 }}
          style={{ fontSize: 80, lineHeight: 1 }}
        >
          {flipping ? '🔮' : result === 'heads' ? '⭕' : result === 'tails' ? '✖' : '🪙'}
        </motion.div>

        <div style={{ marginTop: 8 }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: 2 }}>MULTIPLICADOR</div>
          <div style={{ color: gold, fontSize: '2.5rem', fontWeight: 900 }}>x{currentMulti}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
            Ganarías ◈ {Math.floor(bet * currentMulti)} · Racha: {streak}
          </div>
        </div>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>{history.map((h, i) => <span key={i} style={{ fontSize: '1.2rem' }}>{h}</span>)}</div>
      )}

      {/* Botones de elección */}
      {!flipping && (
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => flip('heads')}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
            }}
          >⭕ CARA</motion.button>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => flip('tails')}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: '#fff',
              fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
            }}
          >✖ CRUZ</motion.button>
        </div>
      )}

      {flipping && (
        <div style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 3, fontSize: '0.9rem' }}>LANZANDO...</div>
      )}

      {/* Cashout solo si hay ganancias */}
      {streak > 0 && !flipping && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={cashOut}
          style={{
            background: `linear-gradient(135deg,${green},#00c853)`, color: '#000',
            border: 'none', borderRadius: 12, padding: '12px 32px',
            fontSize: '1rem', fontWeight: 900, cursor: 'pointer',
            boxShadow: `0 0 20px rgba(0,230,118,0.35)`,
          }}
        >💰 COBRAR x{currentMulti} (◈ {Math.floor(bet * currentMulti)})</motion.button>
      )}
    </div>
  );
}

export default function QuantumFlip() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('quantum-flip', 'Quantum Flip');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Quantum Flip" icon="🪙"
            description="Cara o Cruz. Gana y duplica. Si pierdes, pierdes todo."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <FlipGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
