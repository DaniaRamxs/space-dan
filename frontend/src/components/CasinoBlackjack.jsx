/**
 * CasinoBlackjack.jsx
 * Blackjack con apuestas en Starlys.
 * Gana x2. Blackjack natural: x2.5.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED = new Set(['♥', '♦']);

function buildDeck() {
  return SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r, id: Math.random() })));
}
function shuffle(d) {
  const a = [...d];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function cardVal(r) {
  if (['J', 'Q', 'K'].includes(r)) return 10;
  if (r === 'A') return 11;
  return parseInt(r, 10);
}
function total(cards) {
  let t = 0, aces = 0;
  for (const c of cards) {
    if (c.hidden) continue;
    t += cardVal(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (t > 21 && aces > 0) { t -= 10; aces--; }
  return t;
}

function Card({ card, i }) {
  const isRed = RED.has(card.suit);
  const accent = isRed ? '#ff4d8d' : '#00e5ff';
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: i * 0.1, type: 'spring', damping: 14 }}
      style={{
        width: 64, height: 95, borderRadius: 10, flexShrink: 0,
        background: card.hidden ? 'linear-gradient(135deg,#0d0030,#1a004d)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${card.hidden ? '#9000ff44' : 'rgba(255,255,255,0.12)'}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 6, color: accent, boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
      }}
    >
      {!card.hidden ? (
        <>
          <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{card.rank}</div>
          <div style={{ fontSize: '1.8rem', textAlign: 'center' }}>{card.suit}</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{card.rank}</div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>🌌</div>
      )}
    </motion.div>
  );
}

function Hand({ cards, label, score }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', letterSpacing: 2, marginBottom: 6 }}>{label} — {score}</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {cards.map((c, i) => <Card key={c.id} card={c} i={i} />)}
      </div>
    </div>
  );
}

function BlackjackGame({ bet, balance, finishGame }) {
  const [deck, setDeck] = useState(() => shuffle(buildDeck()));
  const [player, setPlayer] = useState([]);
  const [dealer, setDealer] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | playing | done

  const deal = useCallback(() => {
    const d = shuffle(buildDeck());
    const p = [d[0], d[2]];
    const de = [d[1], { ...d[3], hidden: true }];
    setDeck(d.slice(4));
    setPlayer(p);
    setDealer(de);
    setStatus('playing');
  }, []);

  const hit = useCallback(() => {
    setPlayer(prev => {
      const newCard = deck[0];
      setDeck(d => d.slice(1));
      const updated = [...prev, newCard];
      if (total(updated) > 21) {
        setTimeout(() => endGame([...updated], dealer), 300);
      }
      return updated;
    });
  }, [deck, dealer]);

  const stand = useCallback(() => {
    // Reveal dealer card
    const revealedDealer = dealer.map(c => ({ ...c, hidden: false }));
    let d = [...revealedDealer];
    let currentDeck = [...deck];
    while (total(d) < 17) {
      d = [...d, currentDeck[0]];
      currentDeck = currentDeck.slice(1);
    }
    setDealer(d);
    setDeck(currentDeck);
    setStatus('done');
    endGame(player, d);
  }, [dealer, deck, player]);

  const endGame = useCallback((p, d) => {
    const pt = total(p);
    const dt = total(d);
    const isNatural = p.length === 2 && pt === 21;

    if (pt > 21) {
      finishGame(0, 'Te pasaste de 21');
    } else if (dt > 21 || pt > dt) {
      finishGame(isNatural ? 2.5 : 2, isNatural ? '¡Blackjack!' : `Ganaste ${pt} vs ${dt}`);
    } else if (pt === dt) {
      finishGame(1, `Empate ${pt} vs ${dt} — recuperas tu apuesta`);
    } else {
      finishGame(0, `La casa gana ${dt} vs ${pt}`);
    }
  }, [finishGame]);

  const pTotal = total(player);
  const dTotal = total(dealer.map(c => ({ ...c, hidden: false })));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 56 }}>
        <Hand cards={dealer} label="CASA" score={status === 'idle' ? '?' : dTotal} />
      </div>

      {status === 'idle' ? (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={deal}
          style={{
            background: 'linear-gradient(135deg,#f5c518,#e6a800)', color: '#000',
            border: 'none', borderRadius: 14, padding: '14px 40px',
            fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', letterSpacing: 1,
          }}
        >REPARTIR</motion.button>
      ) : status === 'playing' ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={hit}
            style={{ background: '#00e676', color: '#000', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>
            PEDIR
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={stand}
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 28px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>
            PLANTARSE
          </motion.button>
        </div>
      ) : null}

      <Hand cards={player} label="TÚ" score={pTotal} />
    </div>
  );
}

export default function CasinoBlackjack() {
  const casinoBet = useCasinoBet('casino-blackjack', 'Blackjack');
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = casinoBet;

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet"
            bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Blackjack" icon="🃠"
            description="Plántate o pide carta. Gana x2, Blackjack x2.5."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <BlackjackGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
