/**
 * BlackHolePull.jsx — Tu nave tiene escudos que se agotan.
 * Aguanta más tiempo = más multiplicador. Sin escudos = pierdes todo.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';
const purple = '#b66cff';

const MAX_SHIELDS = 5;
// Multiplicador por segundo sobrevivido
function calcMulti(seconds) {
  if (seconds < 3) return 1.0;
  if (seconds < 6) return 1.4;
  if (seconds < 10) return 2.0;
  if (seconds < 15) return 3.0;
  if (seconds < 20) return 4.5;
  if (seconds < 25) return 7.0;
  return 10.0;
}

function BlackHoleGame({ bet, balance, finishGame }) {
  const [shields, setShields] = useState(MAX_SHIELDS);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const shieldsRef = useRef(MAX_SHIELDS);
  const secondsRef = useRef(0);
  const intervalRef = useRef(null);
  const hitRef = useRef(null);
  const doneRef = useRef(false);

  const endGame = useCallback((reason) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(intervalRef.current);
    clearInterval(hitRef.current);
    setRunning(false);
    setDone(true);
    const m = calcMulti(secondsRef.current);
    setTimeout(() => finishGame(shieldsRef.current > 0 ? m : 0, reason), 500);
  }, [finishGame]);

  const start = useCallback(() => {
    doneRef.current = false;
    shieldsRef.current = MAX_SHIELDS;
    secondsRef.current = 0;
    setShields(MAX_SHIELDS);
    setSeconds(0);
    setRunning(true);
    setDone(false);

    // Timer
    intervalRef.current = setInterval(() => {
      secondsRef.current++;
      setSeconds(secondsRef.current);
    }, 1000);

    // Daño aleatorio cada 2-4s
    const scheduleDamage = () => {
      const delay = 2000 + Math.random() * 2000;
      hitRef.current = setTimeout(() => {
        if (doneRef.current) return;
        shieldsRef.current--;
        setShields(shieldsRef.current);
        if (shieldsRef.current <= 0) {
          endGame('🕳️ Sin escudos — el agujero negro te atrapó');
        } else {
          scheduleDamage();
        }
      }, delay);
    };
    scheduleDamage();
  }, [endGame]);

  const escape = useCallback(() => {
    if (!running) return;
    endGame(`✅ Escapaste en ${secondsRef.current}s con ${shieldsRef.current} escudos`);
  }, [running, endGame]);

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearTimeout(hitRef.current);
  }, []);

  const multi = calcMulti(seconds);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      {!running && !done ? (
        <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 72 }}>🌀</div>
          <h2 style={{ color: gold, margin: '0 0 4px' }}>BLACK HOLE PULL</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
            Tu nave tiene {MAX_SHIELDS} escudos. El agujero negro los destruye.<br />Aguanta más = más multiplicador. Escapa cuando quieras.
          </p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={start}
            style={{ background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000', border: 'none', borderRadius: 14, padding: '14px 48px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>
            🚀 ENTRAR AL AGUJERO
          </motion.button>
        </div>
      ) : (
        <>
          {/* Agujero negro animado */}
          <motion.div
            animate={{ scale: [1, 1 + (MAX_SHIELDS - shields) * 0.06, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ marginTop: 56, fontSize: `${5 + (MAX_SHIELDS - shields)}rem` }}
          >🌀</motion.div>

          {/* Escudos */}
          <div style={{ display: 'flex', gap: 8 }}>
            {Array.from({ length: MAX_SHIELDS }, (_, i) => (
              <motion.span
                key={i}
                animate={i >= shields ? { opacity: [1, 0, 0.3] } : {}}
                transition={{ duration: 0.4 }}
                style={{ fontSize: '1.6rem', opacity: i < shields ? 1 : 0.2 }}
              >🛡️</motion.span>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>TIEMPO · MULTIPLICADOR</div>
            <div style={{ color: gold, fontSize: '2rem', fontWeight: 900 }}>{seconds}s · x{multi}</div>
          </div>

          {running && (
            <motion.button whileTap={{ scale: 0.94 }} onClick={escape}
              style={{ background: `linear-gradient(135deg,${green},#00c853)`, color: '#000', border: 'none', borderRadius: 14, padding: '14px 40px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', boxShadow: `0 0 20px rgba(0,230,118,0.35)` }}>
              🚀 ESCAPAR x{multi} (◈ {Math.floor(bet * multi)})
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}

export default function BlackHolePull() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('black-hole-pull', 'Black Hole Pull');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Black Hole Pull" icon="🌀" description="Tu nave pierde escudos. Aguanta más tiempo para más multiplicador." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><BlackHoleGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
