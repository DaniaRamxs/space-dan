import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';

const EMOJIS = ['🚀', '🪐', '👽', '☄️', '🌌', '🔭', '🛰️', '🛸'];
const C_ACC = '#ff00ff';
const C_CYN = '#00e5ff';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function MemoryGame() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);
  const [best, saveScore] = useHighScore('memory');

  const init = useCallback(() => {
    const doubled = [...EMOJIS, ...EMOJIS];
    const shuffled = shuffle(doubled).map((emoji, i) => ({
      id: i, emoji, flipped: false, matched: false
    }));
    setCards(shuffled);
    setSelected([]);
    setMoves(0);
    setWon(false);
    setLocked(false);
  }, []);

  useEffect(() => { init(); }, [init]);

  const handleFlip = (id) => {
    if (locked) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (selected.length === 1 && selected[0] === id) return;

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
  }, [selected, cards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.matched)) {
      setWon(true);
      const score = Math.max(10, 500 - moves * 8);
      saveScore(score);
    }
  }, [cards, moves, saveScore]);

  const size = 'min(64px, 20vw)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Stats */}
      <div style={{
        display: 'flex', gap: 20, fontSize: 11, fontWeight: 900,
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: 1
      }}>
        <div>Moves: <span style={{ color: C_ACC }}>{moves}</span></div>
        <div style={{ color: C_CYN }}>Record: {best}</div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
        background: 'rgba(10,10,18,0.3)', padding: 12, borderRadius: 16
      }}>
        {cards.map(card => (
          <div key={card.id} style={{ width: size, height: size, perspective: 500 }}>
            <motion.div
              style={{
                width: '100%', height: '100%', position: 'relative',
                transformStyle: 'preserve-3d', cursor: card.flipped || card.matched ? 'default' : 'pointer'
              }}
              animate={{ rotateY: (card.flipped || card.matched) ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => handleFlip(card.id)}
            >
              {/* Front (Hidden) */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: 'rgba(255,255,255,0.2)'
              }}>?</div>

              {/* Back (Emoji) */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: card.matched ? 'rgba(0,229,255,0.1)' : 'rgba(255,0,255,0.1)',
                border: `1px solid ${card.matched ? C_CYN : C_ACC}`,
                boxShadow: `0 0 15px ${card.matched ? C_CYN : C_ACC}44`,
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28
              }}>
                {card.emoji}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C_CYN, textShadow: `0 0 10px ${C_CYN}` }}>¡ENCONTRADOS!</div>
            <button onClick={init} style={{
              marginTop: 10, background: 'transparent', border: '1px solid rgba(0,229,255,0.4)',
              color: C_CYN, padding: '6px 20px', borderRadius: 999, cursor: 'pointer',
              fontWeight: 900, fontSize: 11, textTransform: 'uppercase'
            }}>Jugar de nuevo</button>
          </motion.div>
        )}
      </AnimatePresence>

      {!won && (
        <button onClick={init} style={{
          marginTop: 4, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.2)', padding: '4px 16px', borderRadius: 999, cursor: 'pointer', fontSize: 10
        }}>Reiniciar</button>
      )}
    </div>
  );
}
