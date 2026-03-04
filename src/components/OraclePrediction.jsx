/**
 * OraclePrediction.jsx — Predice 🔴 o 🔵 en secuencia de 8.
 * Cada acierto acumula multiplicador. Error termina.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';

const MULTI_TABLE = [1, 1.3, 1.7, 2.2, 3.0, 4.2, 6.0, 9.0, 14.0];

function OracleGame({ bet, balance, finishGame }) {
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState([]);
  const [predicting, setPredicting] = useState(false);

  const predict = useCallback((color) => {
    if (predicting) return;
    setPredicting(true);
    setTimeout(() => {
      const outcome = Math.random() < 0.5 ? 'red' : 'blue';
      const won = color === outcome;
      setHistory(h => [...h, { guess: color, outcome, won }]);
      setPredicting(false);

      if (won) {
        const newStep = step + 1;
        setStep(newStep);
        if (newStep >= 8) {
          setTimeout(() => finishGame(MULTI_TABLE[8], '🏆 ¡8 aciertos perfectos!'), 400);
        }
      } else {
        setTimeout(() => finishGame(0, `❌ ${outcome === 'red' ? '🔴' : '🔵'} en el paso ${step + 1}`), 400);
      }
    }, 800);
  }, [predicting, step, finishGame]);

  const cashOut = useCallback(() => {
    if (step === 0) return;
    finishGame(MULTI_TABLE[step], `✅ Retiraste con ${step} aciertos · x${MULTI_TABLE[step]}`);
  }, [step, finishGame]);

  const currentMulti = MULTI_TABLE[step];
  const nextMulti = MULTI_TABLE[Math.min(step + 1, 8)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🔮</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: 2 }}>PASO {step}/8 · MULTIPLICADOR</div>
        <div style={{ color: gold, fontSize: '2rem', fontWeight: 900 }}>x{currentMulti}</div>
      </div>

      {/* Progreso */}
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: 8 }, (_, i) => {
          const h = history[i];
          return (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 8,
              background: h ? (h.won ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)') : i === step ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${h ? (h.won ? green : '#ff1744') : i === step ? gold : 'rgba(255,255,255,0.1)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
            }}>
              {h ? (h.won ? '✓' : '✗') : i === step ? '?' : ''}
            </div>
          );
        })}
      </div>

      {/* Historial de colores */}
      <div style={{ display: 'flex', gap: 6 }}>
        {history.map((h, i) => (
          <span key={i} style={{ fontSize: '1.2rem' }}>{h.outcome === 'red' ? '🔴' : '🔵'}</span>
        ))}
        {predicting && <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.5 }}>⚫</motion.span>}
      </div>

      {/* Botones de predicción */}
      {!predicting && (
        <div style={{ display: 'flex', gap: 16 }}>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => predict('red')}
            style={{ padding: '16px 32px', borderRadius: 14, border: '1px solid rgba(255,68,102,0.3)', background: 'rgba(255,68,102,0.15)', color: '#fff', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>
            🔴 ROJO
          </motion.button>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => predict('blue')}
            style={{ padding: '16px 32px', borderRadius: 14, border: '1px solid rgba(0,100,255,0.3)', background: 'rgba(0,100,255,0.15)', color: '#fff', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>
            🔵 AZUL
          </motion.button>
        </div>
      )}

      {predicting && <div style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 3 }}>REVELANDO...</div>}

      {step > 0 && !predicting && (
        <motion.button whileTap={{ scale: 0.96 }} onClick={cashOut}
          style={{ background: `linear-gradient(135deg,${green},#00c853)`, color: '#000', border: 'none', borderRadius: 12, padding: '11px 28px', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' }}>
          💰 COBRAR x{currentMulti} (próximo x{nextMulti})
        </motion.button>
      )}
    </div>
  );
}

export default function OraclePrediction() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('oracle-prediction', 'Oracle Prediction');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Oracle Prediction" icon="🔮" description="Predice 🔴 o 🔵 en 8 rondas. Cada acierto suma multiplicador." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><OracleGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
