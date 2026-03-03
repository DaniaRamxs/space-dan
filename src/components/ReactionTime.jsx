import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const C_ACC = '#ff00ff';
const C_CYN = '#00e5ff';
const C_RED = '#ff3333';
const C_GRN = '#00e676';

function ReactionTimeInner() {
  const [status, setStatus] = useState('IDLE'); // IDLE | WAITING | READY | GO | DEAD
  const [ms, setMs] = useState(null);
  const [best, saveScore] = useHighScore('reaction');
  const timerRef = useRef(null);
  const startRef = useRef(0);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const start = () => {
    setStatus('READY');
    triggerHaptic('light');
    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      setStatus('GO');
      startRef.current = performance.now();
      triggerHaptic('medium');
    }, delay);
  };

  const handleClick = () => {
    if (status === 'IDLE' || status === 'DEAD') {
      start();
      return;
    }

    if (status === 'READY') {
      clearTimeout(timerRef.current);
      setStatus('DEAD');
      triggerHaptic('heavy');
      triggerFloatingText('MUY PRONTO', '50%', '40%', C_RED);
      return;
    }

    if (status === 'GO') {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      setStatus('DEAD');
      triggerHaptic('success');

      const score = Math.max(1, 1000 - elapsed);
      saveScore(score);
      animateScore();
      triggerFloatingText(`${elapsed}ms`, '50%', '40%', C_GRN);
    }
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const getPhaseData = () => {
    switch (status) {
      case 'READY': return { bg: 'rgba(255,255,0,0.05)', border: '#ffea00', text: 'ESPERA...', sub: 'al cambio de color' };
      case 'GO': return { bg: `${C_GRN}22`, border: C_GRN, text: '¡YA!', sub: '¡TOCA RÁPIDO!', glow: true };
      case 'DEAD': return {
        bg: ms ? `${C_GRN}11` : `${C_RED}11`,
        border: ms ? C_GRN : C_RED,
        text: ms ? `${ms}ms` : 'ERROR',
        sub: 'toca para reintentar'
      };
      default: return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: 'REFLEJOS', sub: 'toca para empezar' };
    }
  };

  const data = getPhaseData();

  return (
    <ArcadeShell
      title="Test de Reflejos"
      score={ms || 0}
      bestScore={best}
      status={status === 'IDLE' ? 'IDLE' : 'PLAYING'}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Mide tu velocidad de reacción en milisegundos."
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <motion.div
          onPointerDown={handleClick}
          animate={{
            backgroundColor: data.bg,
            borderColor: data.border,
            boxShadow: data.glow ? `0 0 50px ${C_GRN}44` : 'none',
            scale: status === 'GO' ? [1, 1.02, 1] : 1
          }}
          transition={{ duration: 0.2 }}
          style={{
            width: 'min(360px, 90vw)', height: 240, borderRadius: 32, border: '2px solid',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', textAlign: 'center', backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: '3rem', fontWeight: 900, color: data.border, letterSpacing: 2 }}
          >
            {data.text}
          </motion.div>
          <div style={{ fontSize: '0.7rem', opacity: 0.5, color: '#fff', marginTop: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
            {data.sub}
          </div>
        </motion.div>

        <p style={{ fontSize: '0.6rem', opacity: 0.2, color: '#fff', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          pulsa la pantalla apenas el color cambie a verde
        </p>
      </div>
    </ArcadeShell>
  );
}

export default function ReactionTime() {
  return (
    <GameImmersiveLayout>
      <ReactionTimeInner />
    </GameImmersiveLayout>
  );
}
