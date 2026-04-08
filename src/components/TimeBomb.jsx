/**
 * TimeBomb.jsx — Cuenta regresiva de 60 a 0. Pulsa STOP.
 * Más cerca de 0 = mayor multiplicador. Llegar a 0 = pérdida.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

function getMulti(t) {
  if (t <= 0) return 0;
  if (t <= 3) return 8;
  if (t <= 8) return 4;
  if (t <= 15) return 2.5;
  if (t <= 25) return 1.8;
  if (t <= 40) return 1.3;
  return 1.0;
}

function BombGame({ bet, balance, finishGame }) {
  const [time, setTime] = useState(60);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const timeRef = useRef(60);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setRunning(true);
    timeRef.current = 60;
    intervalRef.current = setInterval(() => {
      timeRef.current -= 0.1;
      setTime(+(timeRef.current).toFixed(1));
      if (timeRef.current <= 0) {
        clearInterval(intervalRef.current);
        setRunning(false);
        setStopped(true);
        setTime(0);
        setTimeout(() => finishGame(0, '💥 ¡BOOM! La bomba explotó'), 400);
      }
    }, 100);
  }, [finishGame]);

  const stop = useCallback(() => {
    if (!running) return;
    clearInterval(intervalRef.current);
    setRunning(false);
    setStopped(true);
    const t = timeRef.current;
    const multi = getMulti(t);
    setTimeout(() => finishGame(multi, `⏱ Paraste en ${t.toFixed(1)}s → x${multi}`), 400);
  }, [running, finishGame]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const pct = time / 60;
  const timerColor = time <= 5 ? red : time <= 15 ? '#ff8c00' : green;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      {/* Bomba */}
      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <motion.div animate={running ? { scale: [1, 1.04, 1] } : {}} transition={{ repeat: Infinity, duration: 0.3 }}
          style={{ fontSize: 80 }}>
          {stopped && time <= 0 ? '💥' : '💣'}
        </motion.div>
        <div style={{ fontSize: '3.5rem', fontWeight: 900, fontFamily: 'monospace', color: timerColor, textShadow: `0 0 20px ${timerColor}` }}>
          {time.toFixed(1)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          x{getMulti(time)} si paras ahora
        </div>
      </div>

      {/* Barra */}
      <div style={{ width: '100%', maxWidth: 300, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <motion.div animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.1 }}
          style={{ height: '100%', background: timerColor, borderRadius: 4, transition: 'background 0.3s' }} />
      </div>

      {/* Tabla de multiplicadores */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', opacity: 0.45 }}>
        {[['0-3s', 'x8'], ['3-8s', 'x4'], ['8-15s', 'x2.5'], ['15-25s', 'x1.8'], ['25-40s', 'x1.3'], ['40-60s', 'x1']].map(([r, m]) => (
          <span key={r} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: '#fff' }}>
            {r}={m}
          </span>
        ))}
      </div>

      {!running && !stopped && (
        <motion.button whileTap={{ scale: 0.96 }} onClick={start}
          style={{ background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000', border: 'none', borderRadius: 14, padding: '14px 48px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>
          💣 ENCENDER
        </motion.button>
      )}

      {running && (
        <motion.button whileTap={{ scale: 0.92 }} onClick={stop}
          animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 0.4 }}
          style={{ background: `linear-gradient(135deg,${red},#c62828)`, color: '#fff', border: 'none', borderRadius: 14, padding: '18px 56px', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer', boxShadow: `0 0 30px rgba(255,23,68,0.5)` }}>
          ⏹ STOP!
        </motion.button>
      )}
    </div>
  );
}

export default function TimeBomb() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('time-bomb', 'Time Bomb');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Time Bomb" icon="💣" description="El contador baja de 60 a 0. Para más cerca del 0 para ganar más. Si llega a 0: pierdes." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><BombGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
