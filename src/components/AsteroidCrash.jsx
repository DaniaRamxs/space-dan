/**
 * AsteroidCrash.jsx
 * Crash game espacial. El multiplicador sube. Retira antes de que explote.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

// Genera un crash point con house edge ~5%
function genCrashPoint() {
  const r = Math.random();
  if (r < 0.33) return 1.0 + Math.random() * 0.5; // crash early 33%
  if (r < 0.6) return 1.5 + Math.random() * 1.5;
  if (r < 0.8) return 3 + Math.random() * 3;
  if (r < 0.93) return 6 + Math.random() * 10;
  return 15 + Math.random() * 35;
}

function CrashGame({ bet, balance, finishGame }) {
  const [multiplier, setMultiplier] = useState(1.0);
  const [state, setState] = useState('waiting'); // waiting | running | crashed | cashed
  const crashPoint = useRef(genCrashPoint());
  const intervalRef = useRef(null);
  const multRef = useRef(1.0);

  const startRound = useCallback(() => {
    setState('running');
    crashPoint.current = genCrashPoint();
    multRef.current = 1.0;
    setMultiplier(1.0);

    intervalRef.current = setInterval(() => {
      multRef.current = +(multRef.current + multRef.current * 0.02).toFixed(2);
      setMultiplier(multRef.current);

      if (multRef.current >= crashPoint.current) {
        clearInterval(intervalRef.current);
        setState('crashed');
        setTimeout(() => finishGame(0, `💥 Explotó en x${crashPoint.current.toFixed(2)}`), 800);
      }
    }, 100);
  }, [finishGame]);

  const cashOut = useCallback(() => {
    if (state !== 'running') return;
    clearInterval(intervalRef.current);
    setState('cashed');
    const m = multRef.current;
    setTimeout(() => finishGame(m, `✅ Retiraste en x${m.toFixed(2)}`), 400);
  }, [state, finishGame]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const color = state === 'crashed' ? red : state === 'cashed' ? green : multiplier >= 3 ? green : gold;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      {/* Cohete / multiplicador */}
      <div style={{ marginTop: 60, textAlign: 'center', position: 'relative' }}>
        <motion.div
          animate={state === 'running' ? { y: [-4, 4, -4] } : {}}
          transition={{ repeat: Infinity, duration: 0.6 }}
          style={{ fontSize: 72 }}
        >
          {state === 'crashed' ? '💥' : state === 'cashed' ? '🎯' : '🚀'}
        </motion.div>

        <motion.div
          key={state}
          animate={{ scale: state === 'crashed' ? [1, 1.3, 1] : 1 }}
          style={{
            fontSize: '3.5rem', fontWeight: 900, color,
            textShadow: `0 0 30px ${color}`,
            fontFamily: 'monospace', letterSpacing: -1,
          }}
        >
          x{multiplier.toFixed(2)}
        </motion.div>

        {state === 'running' && (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>el cohete puede explotar en cualquier momento...</div>
        )}
      </div>

      {/* Botones */}
      {state === 'waiting' && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={startRound}
          style={{
            background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000',
            border: 'none', borderRadius: 14, padding: '14px 48px',
            fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
          }}
        >🚀 DESPEGAR</motion.button>
      )}

      {state === 'running' && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={cashOut}
          style={{
            background: `linear-gradient(135deg,${green},#00c853)`, color: '#000',
            border: 'none', borderRadius: 14, padding: '16px 56px',
            fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer',
            boxShadow: `0 0 30px rgba(0,230,118,0.5)`,
            animation: 'pulse 1s infinite',
          }}
        >💰 RETIRAR x{multiplier.toFixed(2)}</motion.button>
      )}

      {state === 'crashed' && (
        <div style={{ color: red, fontSize: '1.1rem', fontWeight: 700, letterSpacing: 1 }}>¡BOOM! El cohete explotó</div>
      )}
      {state === 'cashed' && (
        <div style={{ color: green, fontSize: '1.1rem', fontWeight: 700 }}>¡Retiraste a tiempo!</div>
      )}

      {/* Historial pequeño de crash points */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', opacity: 0.4 }}>
        {[1.2, 1.8, 4.3, 1.1, 2.7, 1.5].map((v, i) => (
          <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 6, background: v < 2 ? 'rgba(255,23,68,0.3)' : 'rgba(0,230,118,0.2)', color: '#fff' }}>x{v}</span>
        ))}
      </div>
    </div>
  );
}

export default function AsteroidCrash() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('asteroid-crash', 'Asteroid Crash');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Asteroid Crash" icon="🚀"
            description="El multiplicador sube. Retira antes de que explote."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <CrashGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
