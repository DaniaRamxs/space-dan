import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const HOLES = 9;
const GAME_TIME = 20;
const C_ACC = '#ff00ff';
const C_CYN = '#00e5ff';

function WhackAMoleInner() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState('IDLE'); // IDLE | PLAYING | DEAD
  const [whacked, setWhacked] = useState(null);
  const [best, saveScore] = useHighScore('whack');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const timerRef = useRef(null);
  const moleRef = useRef(null);

  const spawn = useCallback(() => {
    let next;
    do { next = Math.floor(Math.random() * HOLES); } while (next === active);
    setActive(next);

    const duration = Math.max(400, 1000 - score * 15);
    if (moleRef.current) clearTimeout(moleRef.current);
    moleRef.current = setTimeout(() => {
      setActive(null);
    }, duration);
  }, [active, score]);

  const end = useCallback(() => {
    setStatus('DEAD');
    setActive(null);
    saveScore(score * 25);
    triggerHaptic('heavy');
    if (timerRef.current) clearInterval(timerRef.current);
    if (moleRef.current) clearTimeout(moleRef.current);
  }, [score, saveScore, triggerHaptic]);

  useEffect(() => {
    if (status === 'PLAYING' && active === null) {
      const delay = Math.max(100, 400 - score * 10);
      const t = setTimeout(spawn, delay);
      return () => clearTimeout(t);
    }
  }, [status, active, spawn, score]);

  const start = () => {
    setScore(0);
    setTimeLeft(GAME_TIME);
    setStatus('PLAYING');
    setActive(null);
    triggerHaptic('medium');
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { end(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const whack = (i) => {
    if (status !== 'PLAYING' || active !== i) return;

    setScore(s => s + 1);
    animateScore();
    setActive(null);
    setWhacked(i);
    triggerHaptic('light');
    triggerFloatingText('+1', '50%', '40%', C_CYN);

    // Spawn particles at mole position
    const row = Math.floor(i / 3);
    const col = i % 3;
    spawnParticles(`${20 + col * 30}%`, `${40 + row * 15}%`, C_ACC, 8);

    setTimeout(() => setWhacked(null), 200);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (moleRef.current) clearTimeout(moleRef.current);
    };
  }, []);

  return (
    <ArcadeShell
      title="Cyber Whack"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      timeLeft={timeLeft}
      totalTime={GAME_TIME}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Golpea a los intrusos del sistema."
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        padding: 24,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 32,
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        userSelect: 'none'
      }}>
        {Array.from({ length: HOLES }).map((_, i) => (
          <div key={i} onPointerDown={() => whack(i)} style={{
            width: 'min(90px, 24vw)',
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)',
            border: '2px solid rgba(255,255,255,0.05)',
            position: 'relative',
            overflow: 'hidden',
            cursor: status === 'PLAYING' ? 'pointer' : 'default',
            boxShadow: whacked === i ? `inset 0 0 30px ${C_CYN}` : 'none',
            transition: 'all 0.1s ease',
          }}>
            <AnimatePresence>
              {active === i && (
                <motion.div
                  initial={{ y: 80, scale: 0.5 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 80, scale: 0.5 }}
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.5rem', filter: `drop-shadow(0 0 10px ${C_ACC})`
                  }}
                >
                  👾
                </motion.div>
              )}
              {whacked === i && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '3rem', color: C_CYN, pointerEvents: 'none', zIndex: 10
                  }}
                >
                  💥
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subtle Hole Shadow */}
            <div style={{
              position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 4,
              background: 'rgba(0,0,0,0.4)', borderRadius: '50%', filter: 'blur(2px)'
            }} />
          </div>
        ))}
      </div>
    </ArcadeShell>
  );
}

export default function WhackAMole() {
  return (
    <GameImmersiveLayout>
      <WhackAMoleInner />
    </GameImmersiveLayout>
  );
}
