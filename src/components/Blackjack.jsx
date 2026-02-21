import { useState, useCallback } from 'react';

// --- Constants ---
const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const RED_SUITS = new Set(['♥', '♦']);

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank, 10);
}

function handTotal(cards) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.hidden) continue;
    const v = cardValue(card.rank);
    total += v;
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handTotal(cards) === 21;
}

// --- Sub-components ---

function CardFace({ rank, suit }) {
  const isRed = RED_SUITS.has(suit);
  return (
    <div
      style={{
        width: 56,
        height: 80,
        backgroundColor: '#f8f8f0',
        border: '1px solid #ccc',
        borderRadius: 8,
        boxShadow: '2px 2px 6px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4px 5px',
        color: isRed ? '#cc0000' : '#111',
        fontFamily: 'Georgia, serif',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{rank}</div>
      <div style={{ fontSize: 20, textAlign: 'center', lineHeight: 1 }}>{suit}</div>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{rank}</div>
    </div>
  );
}

function CardBack() {
  return (
    <div
      style={{
        width: 56,
        height: 80,
        backgroundColor: '#1a0033',
        border: '1px solid #ff00ff',
        borderRadius: 8,
        boxShadow: '2px 2px 6px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: 'repeating-linear-gradient(45deg, #1a0033, #1a0033 4px, #2a0044 4px, #2a0044 8px)',
      }}
    >
      <span style={{ fontSize: 22, opacity: 0.6 }}>?</span>
    </div>
  );
}

function Hand({ cards, label, total, showTotal }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: 'var(--text-muted, #888)', fontSize: 12, marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}{showTotal && total > 0 ? ` — ${total}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {cards.map((card, i) =>
          card.hidden
            ? <CardBack key={i} />
            : <CardFace key={i} rank={card.rank} suit={card.suit} />
        )}
      </div>
    </div>
  );
}

// --- Chip display ---
function ChipButton({ value, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px dashed #ff00ff',
        backgroundColor: disabled ? '#1a1a2e' : '#0d0d1a',
        color: disabled ? '#444' : '#ff00ff',
        fontSize: 11,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'monospace',
        transition: 'all 0.15s',
        boxShadow: disabled ? 'none' : '0 0 8px rgba(255,0,255,0.3)',
      }}
    >
      +{value}
    </button>
  );
}

// --- Main component ---
const INITIAL_CHIPS = 100;

export default function Blackjack() {
  const [deck, setDeck] = useState(() => shuffle(buildDeck()));
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [bet, setBet] = useState(0);
  const [phase, setPhase] = useState('betting'); // betting | playing | dealer | result
  const [result, setResult] = useState(null); // { message, delta }
  const [gameOver, setGameOver] = useState(false);

  const drawFrom = useCallback((currentDeck, count = 1) => {
    const drawn = currentDeck.slice(0, count);
    const remaining = currentDeck.slice(count);
    // Reshuffle if running low
    const nextDeck = remaining.length < 15 ? [...remaining, ...shuffle(buildDeck())] : remaining;
    return { drawn, nextDeck };
  }, []);

  const addToBet = (amount) => {
    if (phase !== 'betting') return;
    const maxAdd = chips;
    setBet(prev => Math.min(prev + amount, maxAdd));
  };

  const clearBet = () => {
    if (phase !== 'betting') return;
    setBet(0);
  };

  const deal = () => {
    if (bet === 0 || phase !== 'betting') return;

    let currentDeck = deck;

    const { drawn: c1, nextDeck: d1 } = drawFrom(currentDeck, 4);
    currentDeck = d1;

    // p1, dealer1(hidden), p2, dealer2
    const pHand = [c1[0], c1[2]];
    const dHand = [{ ...c1[1], hidden: true }, c1[3]];

    setDeck(currentDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);

    const pTotal = handTotal(pHand);
    const dVisibleTotal = handTotal([dHand[1]]); // only visible card

    if (isBlackjack(pHand)) {
      // Reveal dealer
      const revealedDealer = dHand.map(c => ({ ...c, hidden: false }));
      setDealerHand(revealedDealer);
      if (isBlackjack(revealedDealer)) {
        endGame(0, 'PUSH — ambos tienen Blackjack', chips, bet);
      } else {
        const payout = Math.floor(bet * 1.5);
        endGame(payout, `BLACKJACK! +${payout} fichas`, chips, bet);
      }
      return;
    }

    setChips(prev => prev - bet);
    setPhase('playing');
  };

  const endGame = (delta, message, currentChips, currentBet) => {
    const newChips = currentChips - currentBet + currentBet + delta;
    setChips(newChips <= 0 ? 0 : newChips);
    setResult({ message, delta });
    setPhase('result');
    if (newChips <= 0) setGameOver(true);
  };

  const hit = () => {
    if (phase !== 'playing') return;
    const { drawn, nextDeck } = drawFrom(deck);
    const newHand = [...playerHand, drawn[0]];
    setDeck(nextDeck);
    setPlayerHand(newHand);
    const total = handTotal(newHand);
    if (total > 21) {
      setDealerHand(prev => prev.map(c => ({ ...c, hidden: false })));
      endGame(0, `BUST — perdiste ${bet} fichas`, chips, bet);
    } else if (total === 21) {
      stand(newHand, nextDeck);
    }
  };

  const stand = (pHand = playerHand, currentDeck = deck) => {
    if (phase !== 'playing') return;
    setPhase('dealer');

    let dHand = dealerHand.map(c => ({ ...c, hidden: false }));
    let currentD = currentDeck;

    // Dealer draws until 17+
    while (handTotal(dHand) < 17) {
      const { drawn, nextDeck } = drawFrom(currentD);
      dHand = [...dHand, drawn[0]];
      currentD = nextDeck;
    }

    setDeck(currentD);
    setDealerHand(dHand);

    const pTotal = handTotal(pHand);
    const dTotal = handTotal(dHand);

    let message;
    let delta;

    if (dTotal > 21) {
      delta = bet;
      message = `Dealer bust! +${bet} fichas`;
    } else if (pTotal > dTotal) {
      delta = bet;
      message = `GANAS! +${bet} fichas`;
    } else if (dTotal > pTotal) {
      delta = 0;
      message = `Pierdes. -${bet} fichas`;
    } else {
      delta = bet;
      message = 'PUSH — empate';
    }

    // chips was already deducted on deal
    const newChips = chips + delta;
    setChips(newChips <= 0 ? 0 : newChips);
    setResult({ message, delta });
    setPhase('result');
    if (newChips <= 0) setGameOver(true);
  };

  const doubleDown = () => {
    if (phase !== 'playing' || playerHand.length !== 2) return;
    if (chips < bet) return; // not enough to double
    setChips(prev => prev - bet);
    const newBet = bet * 2;
    setBet(newBet);

    const { drawn, nextDeck } = drawFrom(deck);
    const newHand = [...playerHand, drawn[0]];
    setDeck(nextDeck);
    setPlayerHand(newHand);
    const total = handTotal(newHand);

    if (total > 21) {
      setDealerHand(prev => prev.map(c => ({ ...c, hidden: false })));
      endGame(0, `BUST — perdiste ${newBet} fichas`, chips - bet, newBet);
    } else {
      // Force stand after double
      standWithBet(newHand, nextDeck, newBet, chips - bet);
    }
  };

  const standWithBet = (pHand, currentDeck, currentBet, currentChips) => {
    setPhase('dealer');
    let dHand = dealerHand.map(c => ({ ...c, hidden: false }));
    let currentD = currentDeck;

    while (handTotal(dHand) < 17) {
      const { drawn, nextDeck } = drawFrom(currentD);
      dHand = [...dHand, drawn[0]];
      currentD = nextDeck;
    }

    setDeck(currentD);
    setDealerHand(dHand);

    const pTotal = handTotal(pHand);
    const dTotal = handTotal(dHand);

    let message;
    let delta;

    if (dTotal > 21) {
      delta = currentBet;
      message = `Dealer bust! +${currentBet} fichas`;
    } else if (pTotal > dTotal) {
      delta = currentBet;
      message = `GANAS! +${currentBet} fichas`;
    } else if (dTotal > pTotal) {
      delta = 0;
      message = `Pierdes. -${currentBet} fichas`;
    } else {
      delta = currentBet;
      message = 'PUSH — empate';
    }

    const newChips = currentChips + delta;
    setChips(newChips <= 0 ? 0 : newChips);
    setResult({ message, delta });
    setPhase('result');
    if (newChips <= 0) setGameOver(true);
  };

  const newHand = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setResult(null);
    setPhase('betting');
  };

  const resetGame = () => {
    setChips(INITIAL_CHIPS);
    setDeck(shuffle(buildDeck()));
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setResult(null);
    setPhase('betting');
    setGameOver(false);
  };

  const playerTotal = handTotal(playerHand);
  const dealerVisible = handTotal(dealerHand.filter(c => !c.hidden));
  const canDouble = phase === 'playing' && playerHand.length === 2 && chips >= bet;

  // --- Styles ---
  const containerStyle = {
    backgroundColor: '#0a0a12',
    border: '1px solid #ff00ff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 480,
    margin: '0 auto',
    fontFamily: "'Courier New', Courier, monospace",
    color: '#e0e0e0',
    boxShadow: '0 0 24px rgba(255,0,255,0.15)',
  };

  const titleStyle = {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 700,
    color: '#ff00ff',
    textShadow: '0 0 12px #ff00ff',
    letterSpacing: 4,
    marginBottom: 20,
    textTransform: 'uppercase',
  };

  const chipBarStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d0d1a',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 16,
  };

  const labelStyle = {
    fontSize: 11,
    color: 'var(--text-muted, #888)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  };

  const valueStyle = {
    fontSize: 18,
    fontWeight: 700,
    color: '#00e5ff',
  };

  const actionBtnStyle = (active, color = '#ff00ff') => ({
    padding: '10px 20px',
    backgroundColor: active ? 'transparent' : '#111',
    border: `2px solid ${active ? color : '#333'}`,
    borderRadius: 6,
    color: active ? color : '#555',
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    fontWeight: 700,
    cursor: active ? 'pointer' : 'not-allowed',
    letterSpacing: 1,
    textTransform: 'uppercase',
    transition: 'all 0.15s',
    boxShadow: active ? `0 0 10px ${color}44` : 'none',
  });

  const resultColor = result
    ? result.delta > 0
      ? '#00e5ff'
      : result.delta === 0 && result.message.includes('PUSH')
      ? '#ff00ff'
      : '#ff4444'
    : '#fff';

  // --- Render ---
  if (gameOver) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>Blackjack</div>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>☠</div>
          <div style={{ color: '#ff4444', fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: 2 }}>GAME OVER</div>
          <div style={{ color: 'var(--text-muted, #888)', fontSize: 13, marginBottom: 24 }}>Te quedaste sin fichas.</div>
          <button
            onClick={resetGame}
            style={{ ...actionBtnStyle(true), padding: '12px 32px', fontSize: 14 }}
          >
            Reiniciar (100 fichas)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Blackjack</div>

      {/* Chips & Bet */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ ...chipBarStyle, flex: 1 }}>
          <div style={labelStyle}>Fichas</div>
          <div style={valueStyle}>{chips}</div>
        </div>
        <div style={{ ...chipBarStyle, flex: 1 }}>
          <div style={labelStyle}>Apuesta</div>
          <div style={{ ...valueStyle, color: '#ff00ff' }}>{bet}</div>
        </div>
      </div>

      {/* Betting controls */}
      {phase === 'betting' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Apuesta:</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[5, 10, 25, 50].map(v => (
              <ChipButton key={v} value={v} onClick={() => addToBet(v)} disabled={chips - bet < v} />
            ))}
            <button
              onClick={clearBet}
              style={{ ...actionBtnStyle(bet > 0, '#ff4444'), padding: '8px 14px', fontSize: 11 }}
            >
              Limpiar
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              onClick={deal}
              disabled={bet === 0}
              style={{ ...actionBtnStyle(bet > 0), width: '100%', padding: '12px 0', fontSize: 14 }}
            >
              Repartir
            </button>
          </div>
        </div>
      )}

      {/* Dealer hand */}
      {(phase === 'playing' || phase === 'dealer' || phase === 'result') && (
        <Hand
          cards={dealerHand}
          label="Dealer"
          total={dealerVisible}
          showTotal={phase === 'result' || phase === 'dealer'}
        />
      )}

      {/* Divider */}
      {playerHand.length > 0 && (
        <div style={{ borderTop: '1px solid #222', margin: '12px 0' }} />
      )}

      {/* Player hand */}
      {(phase === 'playing' || phase === 'dealer' || phase === 'result') && (
        <Hand
          cards={playerHand}
          label="Tu mano"
          total={playerTotal}
          showTotal={true}
        />
      )}

      {/* Action buttons */}
      {phase === 'playing' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={hit} style={actionBtnStyle(true)}>Pedir</button>
          <button onClick={() => stand()} style={actionBtnStyle(true, '#00e5ff')}>Plantarse</button>
          <button onClick={doubleDown} disabled={!canDouble} style={actionBtnStyle(canDouble, '#ffcc00')}>
            Doblar
          </button>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && result && (
        <div
          style={{
            marginTop: 16,
            padding: '14px 18px',
            border: `1px solid ${resultColor}`,
            borderRadius: 8,
            textAlign: 'center',
            backgroundColor: '#0d0d1a',
            boxShadow: `0 0 16px ${resultColor}33`,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, color: resultColor, letterSpacing: 2, marginBottom: 12 }}>
            {result.message}
          </div>
          <button
            onClick={newHand}
            style={{ ...actionBtnStyle(true), padding: '10px 28px' }}
          >
            Nueva mano
          </button>
        </div>
      )}
    </div>
  );
}
