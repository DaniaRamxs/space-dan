import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const COLORS = [
  { name: 'rojo', hex: '#e53935' },
  { name: 'azul', hex: '#1e88e5' },
  { name: 'verde', hex: '#43a047' },
  { name: 'amarillo', hex: '#fdd835' },
  { name: 'naranja', hex: '#fb8c00' },
  { name: 'morado', hex: '#8e24aa' },
  { name: 'rosa', hex: '#e91e8c' },
  { name: 'celeste', hex: '#29b6f6' },
  { name: 'blanco', hex: '#f0f0f0' },
  { name: 'negro', hex: '#1a1a1a' },
  { name: 'gris', hex: '#78909c' },
  { name: 'turquesa', hex: '#00bfa5' },
];

const TOTAL_ROUNDS = 10;
const ADVANCE_CORRECT_MS = 600;
const ADVANCE_WRONG_MS = 1000;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound() {
  const shuffled = shuffle(COLORS);
  const correct = shuffled[0];
  const wrongs = shuffled.slice(1, 4);
  const options = shuffle([correct, ...wrongs]);
  return { correct, options };
}

function ColorMatchInner() {
  const [status, setStatus] = useState('IDLE'); // IDLE | PLAYING | DEAD
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(null);
  const [feedback, setFeedback] = useState(null); // { chosenIndex, correct: bool }
  const [locked, setLocked] = useState(false);
  const advanceTimerRef = useRef(null);
  const [best, saveScore] = useHighScore('color');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const nextOrder = useCallback((roundNumber) => {
    setCurrentRound(buildRound());
    setRound(roundNumber);
    setFeedback(null);
    setLocked(false);
  }, []);

  const start = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    setScore(0);
    setStatus('PLAYING');
    nextOrder(1);
    triggerHaptic('medium');
  }, [nextOrder, triggerHaptic]);

  const handleChoice = useCallback((option, index) => {
    if (locked || status !== 'PLAYING') return;
    setLocked(true);

    const isCorrect = option.name === currentRound.correct.name;
    setFeedback({ chosenIndex: index, correct: isCorrect });

    if (isCorrect) {
      setScore((s) => s + 1);
      animateScore();
      triggerHaptic('light');
      triggerFloatingText('CORRECTO', '50%', '40%', '#00e676');
    } else {
      triggerHaptic('medium');
      triggerFloatingText('INCORRECTO', '50%', '40%', '#ff1744');
    }

    const delay = isCorrect ? ADVANCE_CORRECT_MS : ADVANCE_WRONG_MS;
    advanceTimerRef.current = setTimeout(() => {
      const nextRoundNum = round + 1;
      if (nextRoundNum > TOTAL_ROUNDS) {
        setStatus('DEAD');
        saveScore(score * 10);
      } else {
        nextOrder(nextRoundNum);
      }
    }, delay);
  }, [locked, status, currentRound, round, nextOrder, triggerHaptic, animateScore, triggerFloatingText, saveScore, score]);

  useEffect(() => {
    return () => clearTimeout(advanceTimerRef.current);
  }, []);

  const getOptionStyle = (index) => {
    let borderColor = 'rgba(255,255,255,0.1)';
    let bgColor = 'rgba(255,255,255,0.03)';
    let textColor = 'rgba(255,255,255,0.6)';
    let boxShadow = 'none';

    if (feedback) {
      if (feedback.chosenIndex === index) {
        if (feedback.correct) {
          borderColor = '#00e676';
          bgColor = 'rgba(0, 230, 118, 0.1)';
          textColor = '#00e676';
          boxShadow = '0 0 15px rgba(0, 230, 118, 0.3)';
        } else {
          borderColor = '#ff1744';
          bgColor = 'rgba(255, 23, 68, 0.1)';
          textColor = '#ff1744';
          boxShadow = '0 0 15px rgba(255, 23, 68, 0.3)';
        }
      } else if (
        !feedback.correct &&
        currentRound &&
        currentRound.options[index].name === currentRound.correct.name
      ) {
        borderColor = '#00e676';
        bgColor = 'rgba(0, 230, 118, 0.05)';
      }
    }

    return {
      flex: '1 1 calc(50% - 8px)',
      padding: '16px 8px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      color: textColor,
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.85rem',
      fontWeight: '600',
      letterSpacing: '0.05em',
      cursor: locked ? 'default' : 'pointer',
      transition: 'all 0.2s ease',
      boxShadow,
      textTransform: 'uppercase',
    };
  };

  return (
    <ArcadeShell
      title="Color Match"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      timeLeft={status === 'PLAYING' ? round - 1 : null}
      totalTime={TOTAL_ROUNDS}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Identifica el color correcto rápidamente."
      gameId="color"
    >
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 22, width: '100%', maxWidth: 360, padding: 22,
        background: 'rgba(4,4,10,0.75)', borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        {currentRound && (
          <>
            {/* Color Display */}
            <motion.div
              key={round}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                width: '100%',
                aspectRatio: '16/9',
                background: currentRound.correct.hex,
                borderRadius: '16px',
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: `0 10px 30px ${currentRound.correct.hex}33`,
              }}
            />

            {/* Options Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%' }}>
              {currentRound.options.map((option, i) => (
                <motion.button
                  key={`${option.name}-${round}`}
                  whileHover={!locked ? { scale: 1.02, background: 'rgba(255,255,255,0.05)' } : {}}
                  whileTap={!locked ? { scale: 0.98 } : {}}
                  style={getOptionStyle(i)}
                  onPointerDown={() => handleChoice(option, i)}
                >
                  {option.name}
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>
    </ArcadeShell>
  );
}

export default function ColorMatch() {
  return (
    <GameImmersiveLayout>
      <ColorMatchInner />
    </GameImmersiveLayout>
  );
}
