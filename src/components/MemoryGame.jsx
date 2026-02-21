import { useState, useEffect } from 'react';

const EMOJIS = ['🌸', '🦋', '🌙', '⭐', '🎀', '🌈', '💎', '🦄'];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeCards() {
  return shuffle([...EMOJIS, ...EMOJIS]).map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  }));
}

export default function MemoryGame() {
  const [cards, setCards]     = useState(makeCards);
  const [selected, setSelected] = useState([]);
  const [moves, setMoves]     = useState(0);
  const [won, setWon]         = useState(false);
  const [locked, setLocked]   = useState(false);

  const reset = () => {
    setCards(makeCards());
    setSelected([]);
    setMoves(0);
    setWon(false);
    setLocked(false);
  };

  const handleFlip = (id) => {
    if (locked) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (selected.length === 1 && selected[0] === id) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
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
      const next = cards.map(c =>
        c.id === a || c.id === b ? { ...c, matched: true } : c
      );
      setCards(next);
      setSelected([]);
      setLocked(false);
      if (next.every(c => c.matched)) setWon(true);
    } else {
      setTimeout(() => {
        setCards(prev => prev.map(c =>
          c.id === a || c.id === b ? { ...c, flipped: false } : c
        ));
        setSelected([]);
        setLocked(false);
      }, 850);
    }
  }, [selected]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
        movimientos: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{moves}</span>
        {' · '}
        encontradas: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>
          {cards.filter(c => c.matched).length / 2}/{EMOJIS.length}
        </span>
      </div>

      {won && (
        <div style={{ marginBottom: 12, color: 'var(--cyan)', fontSize: 13, fontWeight: 700,
          textShadow: '0 0 10px rgba(0,229,255,0.7)' }}>
          ✨ ganaste en {moves} movimientos!
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        maxWidth: 280,
        margin: '0 auto',
      }}>
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            style={{
              width: 60, height: 60,
              borderRadius: 10,
              fontSize: card.flipped || card.matched ? 26 : 18,
              background: card.matched
                ? 'rgba(0,229,255,0.10)'
                : card.flipped
                ? 'rgba(255,0,255,0.10)'
                : 'rgba(255,255,255,0.04)',
              border: card.matched
                ? '1px solid rgba(0,229,255,0.40)'
                : card.flipped
                ? '1px solid rgba(255,0,255,0.40)'
                : '1px solid rgba(255,255,255,0.08)',
              cursor: card.matched || card.flipped ? 'default' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: card.matched
                ? '0 0 10px rgba(0,229,255,0.25)'
                : card.flipped
                ? '0 0 10px rgba(255,0,255,0.25)'
                : 'none',
              color: '#fff',
            }}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>

      <button onClick={reset} style={{
        marginTop: 14,
        padding: '5px 18px',
        background: 'rgba(255,0,255,0.08)',
        border: '1px solid rgba(255,0,255,0.30)',
        borderRadius: 999,
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: 12,
        transition: 'all 0.2s ease',
      }}>
        reiniciar
      </button>
    </div>
  );
}
