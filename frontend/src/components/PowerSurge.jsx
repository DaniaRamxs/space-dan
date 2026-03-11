/**
 * PowerSurge.jsx — Barra que sube. Detente en la zona dorada.
 * Zona dorada aleatoria. Perfecto=x5, dentro=x2, cerca=x1.3, fuera=x0.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

function SurgeGame({ bet, balance, finishGame }) {
  // Zona dorada: de goldenStart a goldenEnd (0-100)
  const [goldenStart] = useState(() => 30 + Math.random() * 40); // 30-70
  const [goldenEnd] = useState((start => Math.min(95, start + 8 + Math.random() * 12))(30 + Math.random() * 40));
  const [power, setPower] = useState(0);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const powerRef = useRef(0);
  const intervalRef = useRef(null);

  const [gs, ge] = [goldenStart, Math.min(95, goldenStart + 8 + Math.random() * 12)];

  const start = useCallback(() => {
    setRunning(true);
    powerRef.current = 0;
    setPower(0);
    intervalRef.current = setInterval(() => {
      powerRef.current = Math.min(100, powerRef.current + 1.2);
      setPower(Math.round(powerRef.current));
      if (powerRef.current >= 100) {
        clearInterval(intervalRef.current);
        setRunning(false);
        setStopped(true);
        setTimeout(() => finishGame(0, '⚡ ¡Sobrecarga! Fuera de la zona'), 300);
      }
    }, 40);
  }, [finishGame]);

  const stop = useCallback(() => {
    if (!running) return;
    clearInterval(intervalRef.current);
    setRunning(false);
    setStopped(true);
    const p = powerRef.current;
    let multi = 0, msg = '';
    const center = (gs + ge) / 2;
    const dist = Math.abs(p - center);
    const halfWidth = (ge - gs) / 2;
    if (p >= gs && p <= ge) {
      if (dist <= halfWidth * 0.2) { multi = 5; msg = `⚡ ¡Zona perfecta! ${p}%`; }
      else { multi = 2; msg = `✅ Dentro de la zona: ${p}%`; }
    } else if (Math.abs(p - gs) <= 5 || Math.abs(p - ge) <= 5) {
      multi = 1.3; msg = `💫 Cerca de la zona: ${p}%`;
    } else {
      msg = `❌ Fuera de zona: ${p}% (zona: ${Math.round(gs)}-${Math.round(ge)}%)`;
    }
    setTimeout(() => finishGame(multi, msg), 400);
  }, [running, gs, ge, finishGame]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const inZone = power >= gs && power <= ge;
  const barColor = inZone ? green : power > ge ? red : '#00b8ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>⚡</div>
        <h2 style={{ color: gold, fontWeight: 900, margin: '8px 0 4px' }}>POWER SURGE</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>Para en la zona dorada. Perfecto=x5, zona=x2, cerca=x1.3</p>
      </div>

      {/* Barra vertical */}
      <div style={{ position: 'relative', width: 60, height: 280, background: 'rgba(255,255,255,0.06)', borderRadius: 30, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Zona dorada */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          bottom: `${gs}%`, height: `${ge - gs}%`,
          background: 'rgba(245,197,24,0.3)', border: `1px solid ${gold}`,
        }} />
        {/* Barra de poder */}
        <motion.div
          animate={{ height: `${power}%` }}
          transition={{ duration: 0.04 }}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: `linear-gradient(0deg, ${barColor}, ${barColor}88)`,
            boxShadow: `0 0 20px ${barColor}66`,
            borderRadius: 30,
          }}
        />
        {/* Indicador % */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', fontWeight: 900, fontSize: '0.9rem', zIndex: 2 }}>
          {power}%
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
        Zona dorada: {Math.round(gs)}-{Math.round(ge)}%
      </div>

      {!running && !stopped && (
        <motion.button whileTap={{ scale: 0.96 }} onClick={start}
          style={{ background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000', border: 'none', borderRadius: 14, padding: '14px 48px', fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer' }}>
          ⚡ ACTIVAR
        </motion.button>
      )}
      {running && (
        <motion.button whileTap={{ scale: 0.92 }} onClick={stop}
          animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 0.3 }}
          style={{
            background: inZone ? `linear-gradient(135deg,${green},#00c853)` : `linear-gradient(135deg,#0088ff,#0055bb)`,
            color: '#fff', border: 'none', borderRadius: 14, padding: '16px 56px',
            fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer',
            boxShadow: inZone ? `0 0 30px rgba(0,230,118,0.6)` : 'none',
          }}>
          {inZone ? '⚡ ¡AHORA!' : '⏹ STOP'}
        </motion.button>
      )}
    </div>
  );
}

export default function PowerSurge() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('power-surge', 'Power Surge');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Power Surge" icon="⚡" description="Para la barra en la zona dorada. Perfecto=x5, zona=x2, cerca=x1.3." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><SurgeGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
