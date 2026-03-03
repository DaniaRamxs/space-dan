import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const BUTTONS = [0, 1, 2, 3];
const COLORS = {
  0: { base: 'rgba(192, 82, 126, 0.2)', bright: '#ff6eb4', label: 'rosa' },
  1: { base: 'rgba(0, 163, 184, 0.2)', bright: '#00e5ff', label: 'cian' },
  2: { base: 'rgba(34, 153, 26, 0.2)', bright: '#39ff14', label: 'verde' },
  3: { base: 'rgba(184, 112, 48, 0.2)', bright: '#f4a261', label: 'naranja' },
};

const FLASH_ON_MS = 400;
const FLASH_OFF_MS = 100;
const BETWEEN_ROUND_MS = 600;

function randomBtn() {
  return Math.floor(Math.random() * 4);
}

function playTone(btnId, audioCtx) {
  if (!audioCtx) return;
  const freqs = [330, 440, 550, 660];
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = freqs[btnId];
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.35);
}

function SimonSaysInner() {
  const [status, setStatus] = useState('IDLE'); // IDLE | SHOWING | PLAYING | DEAD
  const [sequence, setSequence] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [litBtn, setLitBtn] = useState(null);
  const [best, saveScore] = useHighScore('simon');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const audioRef = useRef(null);
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      try {
        audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch { }
    }
    return audioRef.current;
  }, []);

  const playSequence = useCallback((seq) => {
    setStatus('SHOWING');
    setLitBtn(null);
    let t = 0;
    const timers = [];

    seq.forEach((btnId, i) => {
      timers.push(setTimeout(() => {
        setLitBtn(btnId);
        playTone(btnId, getAudio());
        triggerHaptic('light');
      }, t));
      t += FLASH_ON_MS;
      timers.push(setTimeout(() => setLitBtn(null), t));
      t += FLASH_OFF_MS;
    });

    timers.push(setTimeout(() => {
      setStatus('PLAYING');
      setPlayerIndex(0);
    }, t));

    return () => timers.forEach(clearTimeout);
  }, [getAudio, triggerHaptic]);

  const start = useCallback(() => {
    getAudio();
    const firstSeq = [randomBtn()];
    setSequence(firstSeq);
    setPlayerIndex(0);
    playSequence(firstSeq);
    triggerHaptic('medium');
  }, [getAudio, playSequence, triggerHaptic]);

  const handleButtonPress = useCallback((btnId) => {
    if (status !== 'PLAYING') return;

    setLitBtn(btnId);
    playTone(btnId, getAudio());
    triggerHaptic('light');
    setTimeout(() => setLitBtn(null), FLASH_ON_MS);

    const expected = sequence[playerIndex];
    if (btnId !== expected) {
      setStatus('DEAD');
      saveScore(sequence.length - 1);
      triggerHaptic('heavy');
      triggerFloatingText('ERROR', '50%', '40%', '#ff6eb4');
      return;
    }

    const nextIndex = playerIndex + 1;
    if (nextIndex === sequence.length) {
      setStatus('SHOWING');
      animateScore();
      triggerFloatingText('¡BIEN!', '50%', '40%', '#00e5ff');
      const nextSeq = [...sequence, randomBtn()];
      setSequence(nextSeq);
      setTimeout(() => playSequence(nextSeq), BETWEEN_ROUND_MS);
    } else {
      setPlayerIndex(nextIndex);
    }
  }, [status, sequence, playerIndex, getAudio, triggerHaptic, playSequence, saveScore, animateScore, triggerFloatingText]);

  return (
    <ArcadeShell
      title="Simon Dice"
      score={sequence.length > 0 ? sequence.length - (status === 'DEAD' ? 1 : 0) : 0}
      bestScore={best}
      status={status === 'IDLE' ? 'IDLE' : (status === 'DEAD' ? 'DEAD' : 'PLAYING')}
      onRetry={start}
      turn={status === 'SHOWING' ? 'IA' : (status === 'PLAYING' ? 'TÚ' : null)}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Memoriza y repite la secuencia de luces."
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, padding: 22,
        background: 'rgba(4,4,10,0.75)', borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
      }}>
        {BUTTONS.map((id) => {
          const isLit = litBtn === id;
          const col = COLORS[id];
          return (
            <motion.button
              key={id}
              whileHover={status === 'PLAYING' ? { scale: 1.05 } : {}}
              whileTap={status === 'PLAYING' ? { scale: 0.95 } : {}}
              onPointerDown={() => handleButtonPress(id)}
              style={{
                width: 'min(100px, 28vw)', height: 'min(100px, 28vw)', borderRadius: 16,
                border: `2px solid ${isLit ? col.bright : 'rgba(255,255,255,0.05)'}`,
                background: isLit ? `${col.bright}33` : col.base,
                cursor: status === 'PLAYING' ? 'pointer' : 'default',
                boxShadow: isLit ? `0 0 30px ${col.bright}33` : 'none',
                transition: 'all 0.15s ease',
                backdropFilter: 'blur(8px)',
              }}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 28, alignItems: 'center' }}>
        {sequence.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>RONDA</span>
            <span style={{ fontSize: '1.1rem', color: '#00e5ff', fontWeight: 900 }}>{sequence.length}</span>
          </div>
        )}
        <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
          {status === 'SHOWING' ? 'Observa' : status === 'PLAYING' ? 'Tu turno' : 'Escucha'}
        </p>
      </div>
    </ArcadeShell>
  );
}

export default function SimonSays() {
  return (
    <GameImmersiveLayout>
      <SimonSaysInner />
    </GameImmersiveLayout>
  );
}
