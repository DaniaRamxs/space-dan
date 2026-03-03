import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const EMOJIS = ['🚀', '🪐', '👽', '☄️', '🌌', '🔭', '🛰️', '🛸'];
const C_ACC = '#ff00ff';
const C_CYN = '#00e5ff';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function MemoryGameInner() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [locked, setLocked] = useState(false);
  const [best, saveScore] = useHighScore('memory');
  const [score, setScore] = useState(0);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const init = useCallback(() => {
    const doubled = [...EMOJIS, ...EMOJIS];
    const shuffled = shuffle(doubled).map((emoji, i) => ({
      id: i, emoji, flipped: false, matched: false
    }));
    setCards(shuffled);
    setSelected([]);
    setMoves(0);
    setScore(0);
    setStatus('PLAYING');
    setLocked(false);
  }, []);

  const handleFlip = (id) => {
    if (locked || status !== 'PLAYING') return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (selected.length === 1 && selected[0] === id) return;

    triggerHaptic('light');
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    setSelected(prev => [...prev, id]);
  };

  useEffect(() => {
    if (selected.length !== 2) return;
    setLocked(true);
    setMoves(m => m + 1);

    const [a, b] = selected;
    const ca = cards.find(c => c.id === a);
    const cb = cards.find(c => c.id === b);

    if (ca.emoji === cb.emoji) {
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          (c.id === a || c.id === b) ? { ...c, matched: true } : c
        ));

        const pts = Math.max(10, 50 - moves);
        setScore(s => s + pts);
        animateScore();
        triggerHaptic('medium');

        spawnParticles('50%', '50%', C_CYN, 20);
        triggerFloatingText('¡PAREJA!', '50%', '40%', C_CYN);

        setSelected([]);
        setLocked(false);
      }, 500);
    } else {
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          (c.id === a || c.id === b) ? { ...c, flipped: false } : c
        ));
        setSelected([]);
        setLocked(false);
      }, 1000);
    }
  }, [selected, cards, moves, animateScore, triggerHaptic, spawnParticles, triggerFloatingText]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.matched)) {
      setStatus('WIN');
      saveScore(score);
      triggerHaptic('heavy');
      spawnParticles('50%', '50%', C_CYN, 50);
    }
  }, [cards, score, saveScore, triggerHaptic, spawnParticles]);

  const cardSize = 'min(70px, 19vw)';

  return (
    <ArcadeShell
      title="Memory Match"
      score={score}
      bestScore={best}
      status={status}
      onRetry={init}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Encuentra todas las parejas espaciales."
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        background: 'rgba(4,4,10,0.75)',
        padding: 10,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        {cards.map(card => (
          <div key={card.id} style={{ width: cardSize, height: cardSize, perspective: 1000 }}>
            <motion.div
              style={{
                width: '100%', height: '100%', position: 'relative',
                transformStyle: 'preserve-3d', cursor: card.flipped || card.matched ? 'default' : 'pointer'
              }}
              animate={{ rotateY: (card.flipped || card.matched) ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              onClick={() => handleFlip(card.id)}
            >
              {/* Front (Hidden) */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                backdropFilter: 'blur(10px)'
              }}>?</div>

              {/* Back (Emoji) */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: card.matched ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 0, 255, 0.1)',
                border: `2px solid ${card.matched ? C_CYN : C_ACC}`,
                boxShadow: `0 0 20px ${card.matched ? C_CYN : C_ACC}44`,
                borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'min(36px, 9vw)',
                backdropFilter: 'blur(10px)'
              }}>
                {card.emoji}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 24,
        display: 'flex',
        gap: 32,
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: '0.75rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>MOVIMIENTOS</span>
          <span style={{ color: '#fff', fontSize: '1rem' }}>{moves}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>PROGRESO</span>
          <span style={{ color: C_CYN, fontSize: '1rem' }}>{cards.filter(c => c.matched).length / 2} / 8</span>
        </div>
      </div>
    </ArcadeShell>
  );
}

export default function MemoryGame() {
  return (
    <GameImmersiveLayout>
      <MemoryGameInner />
    </GameImmersiveLayout>
  );
}
