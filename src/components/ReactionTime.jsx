import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';

const C_ACC = '#ff00ff';
const C_CYN = '#00e5ff';
const C_RED = '#ff3333';
const C_GRN = '#00e676';

export default function ReactionTime() {
  const [phase, setPhase] = useState('waiting'); // waiting | ready | go | result | toosoon
  const [ms, setMs] = useState(null);
  const [best, saveScore] = useHighScore('reaction');
  const timerRef = useRef(null);
  const startRef = useRef(0);

  const handleClick = () => {
    if (phase === 'waiting' || phase === 'result' || phase === 'toosoon') {
      setPhase('ready');
      const delay = 1500 + Math.random() * 2500;
      timerRef.current = setTimeout(() => {
        setPhase('go');
        startRef.current = performance.now();
      }, delay);
      return;
    }

    if (phase === 'ready') {
      clearTimeout(timerRef.current);
      setPhase('toosoon');
      return;
    }

    if (phase === 'go') {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      setPhase('result');
      // Score calculation: faster is better
      const score = Math.max(1, 1000 - elapsed);
      saveScore(score);
    }
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const getPhaseData = () => {
    switch (phase) {
      case 'ready': return { bg: 'rgba(255,255,0,0.1)', border: '#ffea00', text: 'ESPERA AL COLOR...', sub: 'no hagas click todavía' };
      case 'go': return { bg: `${C_CYN}22`, border: C_CYN, text: '¡AHORA!', sub: '¡CLICK RÁPIDO!', glow: true };
      case 'toosoon': return { bg: `${C_RED}22`, border: C_RED, text: 'MUY PRONTO', sub: 'haz click para reintentar' };
      case 'result': return { bg: `${C_GRN}22`, border: C_GRN, text: `${ms}ms`, sub: 'haz click para reintentar' };
      default: return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: 'REACTION TEST', sub: 'click para empezar' };
    }
  };

  const data = getPhaseData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* HUD */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
        Record Score: <span style={{ color: C_CYN }}>{best}</span>
      </div>

      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        animate={{
          backgroundColor: data.bg,
          borderColor: data.border,
          boxShadow: data.glow ? `0 0 40px ${C_CYN}44` : 'none'
        }}
        style={{
          width: 'min(320px, 90vw)', height: 200, borderRadius: 24, border: '2px solid',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', textAlign: 'center', transition: 'box-shadow 0.1s'
        }}
      >
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 32, fontWeight: 900, color: data.border, letterSpacing: 2 }}
        >
          {data.text}
        </motion.div>
        <div style={{ fontSize: 10, opacity: 0.5, color: '#fff', marginTop: 8, textTransform: 'uppercase' }}>
          {data.sub}
        </div>
      </motion.div>

      <p style={{ fontSize: 9, opacity: 0.2, color: '#fff', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>
        mide tus reflejos · el score se basa en la velocidad
      </p>
    </div>
  );
}
