import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';

const HOLES = 9;
const GAME_TIME = 20;
const C_ACC = '#ff00ff';
const C_CYN = '#00e5ff';

export default function WhackAMole() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [active, setActive] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | playing | over
  const [whacked, setWhacked] = useState(null);
  const [best, saveScore] = useHighScore('whack');

  const timerRef = useRef(null);
  const moleRef = useRef(null);

  const spawn = useCallback(() => {
    let next;
    do { next = Math.floor(Math.random() * HOLES); } while (next === active);
    setActive(next);

    // Hide mole after random time
    const duration = Math.max(400, 1000 - score * 20);
    if (moleRef.current) clearTimeout(moleRef.current);
    moleRef.current = setTimeout(() => {
      setActive(null);
    }, duration);
  }, [active, score]);

  const end = useCallback(() => {
    setPhase('over');
    setActive(null);
    saveScore(score * 25);
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleRef.current) clearTimeout(moleRef.current);
  }, [score, saveScore]);

  useEffect(() => {
    if (phase === 'playing' && active === null) {
      const delay = Math.max(100, 500 - score * 10);
      const t = setTimeout(spawn, delay);
      return () => clearTimeout(t);
    }
  }, [phase, active, spawn, score]);

  const start = () => {
    setScore(0);
    setTimeLeft(GAME_TIME);
    setPhase('playing');
    setActive(null);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { end(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const whack = (i) => {
    if (phase !== 'playing' || active !== i) return;
    setScore(s => s + 1);
    setActive(null);
    setWhacked(i);
    setTimeout(() => setWhacked(null), 200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, userSelect: 'none' }}>
      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 280, fontSize: 12, fontWeight: 900 }}>
        <div style={{ color: C_CYN }}>TIME: {timeLeft}s</div>
        <div style={{ color: C_ACC }}>SCORE: {score}</div>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}>BEST: {best}</div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        background: 'rgba(10,10,18,0.4)', padding: 16, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)'
      }}>
        {Array.from({ length: HOLES }).map((_, i) => (
          <div key={i} onClick={() => whack(i)} style={{
            width: 'min(80px, 22vw)', aspectRatio: '1', borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.05)',
            position: 'relative', overflow: 'hidden', cursor: phase === 'playing' ? 'pointer' : 'default',
            boxShadow: whacked === i ? `inset 0 0 20px ${C_CYN}` : 'none'
          }}>
            <AnimatePresence>
              {active === i && (
                <motion.div
                  initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, textShadow: `0 0 10px ${C_ACC}`
                  }}
                >
                  👾
                </motion.div>
              )}
              {whacked === i && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 40, color: C_CYN, pointerEvents: 'none'
                  }}
                >
                  💥
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {phase !== 'playing' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20
            }}
          >
            <h2 style={{ fontSize: 32, fontWeight: 900, color: C_ACC, textShadow: `0 0 20px ${C_ACC}` }}>
              {phase === 'idle' ? 'CYBER WHACK' : 'TIME OVER'}
            </h2>
            {phase === 'over' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: C_CYN }}>{score}</div>
                <div style={{ fontSize: 12, opacity: 0.5 }}>MOLES WHACKED</div>
              </div>
            )}
            <button onClick={start} style={{
              padding: '12px 40px', background: 'transparent', border: `2px solid ${C_CYN}`,
              borderRadius: 999, color: C_CYN, fontWeight: 900, fontSize: 14, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: 2
            }}>
              {phase === 'idle' ? 'Empezar' : 'Reiniciar'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
