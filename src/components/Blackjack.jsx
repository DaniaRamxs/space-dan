import { useState, useCallback, useEffect } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { motion, AnimatePresence } from 'framer-motion';

// --- Constants ---
const SUITS = ['♠', '♣', '♥', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RED_SUITS = new Set(['♥', '♦']);

const COLORS = {
  cyan: '#00e5ff',
  magenta: '#ff00ff',
  glass: 'rgba(255, 255, 255, 0.03)',
  border: 'rgba(255, 255, 255, 0.1)',
};

function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: Math.random() });
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
function CardUI({ card, index }) {
  const isRed = RED_SUITS.has(card.suit);
  const accent = isRed ? COLORS.magenta : COLORS.cyan;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0, rotate: -10 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', damping: 15 }}
      style={{
        width: 75, height: 110,
        background: card.hidden ? 'linear-gradient(135deg, #050508 0%, #1a0033 100%)' : 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${card.hidden ? '#ff00ff44' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: card.hidden ? `0 0 15px #ff00ff22` : `0 10px 20px rgba(0,0,0,0.3)`,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 8,
        color: '#fff',
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden'
      }}
    >
      {!card.hidden ? (
        <>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: accent, lineHeight: 1 }}>{card.rank}</div>
          <div style={{ fontSize: '2.2rem', textAlign: 'center', filter: `drop-shadow(0 0 8px ${accent}44)`, color: accent }}>{card.suit}</div>
          <div style={{ fontSize: '1rem', fontWeight: 900, alignSelf: 'flex-end', transform: 'rotate(180deg)', color: accent }}>{card.rank}</div>

          {/* Visual Polish */}
          <div style={{ position: 'absolute', top: -10, left: -20, width: 50, height: 50, background: `${accent}11`, borderRadius: '50%', filter: 'blur(20px)' }} />
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '80%', height: '80%', border: '1px solid #ff00ff22', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#ff00ff', opacity: 0.3 }}>S</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const INITIAL_CHIPS = 500;

function BlackjackInner() {
  const [deck, setDeck] = useState(() => shuffle(buildDeck()));
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [bet, setBet] = useState(0);
  const [status, setStatus] = useState('BETTING'); // BETTING | PLAYING | DEALER | RESULT
  const [best, saveScore] = useHighScore('blackjack');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const drawFrom = useCallback((currentDeck, count = 1) => {
    const drawn = currentDeck.slice(0, count);
    const remaining = currentDeck.slice(count);
    const nextDeck = remaining.length < 15 ? [...remaining, ...shuffle(buildDeck())] : remaining;
    return { drawn, nextDeck };
  }, []);

  const deal = () => {
    if (bet === 0) return;
    triggerHaptic('medium');

    let currentDeck = deck;
    const { drawn: c1, nextDeck: d1 } = drawFrom(currentDeck, 4);
    currentDeck = d1;

    const pHand = [c1[0], c1[2]];
    const dHand = [{ ...c1[1], hidden: true }, c1[3]];

    setDeck(currentDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setChips(prev => prev - bet);
    setStatus('PLAYING');

    if (isBlackjack(pHand)) {
      setTimeout(() => finishHand(pHand, dHand.map(c => ({ ...c, hidden: false })), true), 800);
    }
  };

  const hit = () => {
    triggerHaptic('light');
    const { drawn, nextDeck } = drawFrom(deck);
    const newHand = [...playerHand, drawn[0]];
    setDeck(nextDeck);
    setPlayerHand(newHand);

    if (handTotal(newHand) > 21) {
      setTimeout(() => finishHand(newHand, dealerHand.map(c => ({ ...c, hidden: false }))), 600);
    }
  };

  const stand = () => {
    triggerHaptic('medium');
    setStatus('DEALER');

    let dHand = dealerHand.map(c => ({ ...c, hidden: false }));
    let currentD = deck;

    const dealerTurn = async () => {
      let currentHand = [...dHand];
      while (handTotal(currentHand) < 17) {
        const { drawn, nextDeck } = drawFrom(currentD);
        currentHand.push(drawn[0]);
        currentD = nextDeck;
        setDealerHand([...currentHand]);
        triggerHaptic('light');
        await new Promise(r => setTimeout(r, 600));
      }
      setDeck(currentD);
      finishHand(playerHand, currentHand);
    };

    dealerTurn();
  };

  const finishHand = (pHand, dHand, bjInitial = false) => {
    const pTotal = handTotal(pHand);
    const dTotal = handTotal(dHand);
    let winType = 'LOSS';
    let payout = 0;

    if (pTotal > 21) {
      winType = 'LOSS';
    } else if (dTotal > 21 || pTotal > dTotal) {
      winType = isBlackjack(pHand) ? 'BLACKJACK' : 'WIN';
      payout = winType === 'BLACKJACK' ? Math.floor(bet * 3) : bet * 2;
    } else if (pTotal === dTotal) {
      winType = 'PUSH';
      payout = bet;
    }

    setChips(prev => prev + payout);
    setStatus(winType === 'LOSS' ? 'DEAD' : (winType === 'PUSH' ? 'BETTING' : 'WIN'));

    // Feedback
    if (winType === 'WIN' || winType === 'BLACKJACK') {
      animateScore();
      triggerHaptic('heavy');
      spawnParticles('50%', '50%', COLORS.cyan, 30);
      triggerFloatingText(winType === 'BLACKJACK' ? '¡BLACKJACK!' : '¡GANASTE!', '50%', '40%', COLORS.cyan);
      saveScore(chips + payout);
    } else if (winType === 'LOSS') {
      triggerHaptic('medium');
      triggerFloatingText('TE PASASTE', '50%', '40%', COLORS.magenta);
    } else {
      triggerFloatingText('PUSH (EMPATE)', '50%', '40%', '#ffffff');
    }
  };

  const resetGame = () => {
    setPlayerHand([]);
    setDealerHand([]);
    setBet(0);
    setStatus('BETTING');
    triggerHaptic('light');
  };

  const isBancrupt = chips <= 0 && bet === 0 && (status === 'DEAD' || status === 'BETTING');

  return (
    <ArcadeShell
      title="Galaxy Blackjack"
      score={chips}
      bestScore={best}
      status={(status === 'WIN' || status === 'DEAD') ? status : 'PLAYING'}
      onRetry={() => {
        if (isBancrupt) {
          setChips(INITIAL_CHIPS);
          resetGame();
        } else {
          resetGame();
        }
      }}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Vence a la banca en el rincón más oscuro de la galaxia."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, width: 'min(95vw, 400px)', zIndex: 10 }}>
        {/* Dealer Area */}
        <div style={{ position: 'relative' }}>
          <div style={{
            fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginBottom: 12,
            textTransform: 'uppercase', letterSpacing: 3, fontWeight: 900, textAlign: 'center'
          }}>
            Dealer — {status === 'DEALER' || status === 'WIN' || status === 'DEAD' ? handTotal(dealerHand) : '?'}
          </div>
          <div style={{ display: 'flex', gap: 12, minHeight: 110, justifyContent: 'center' }}>
            {dealerHand.map((c, i) => <CardUI key={i} card={c} index={i} />)}
            {dealerHand.length === 0 && <div style={{ width: 75, height: 110, border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12 }} />}
          </div>
        </div>

        {/* Action Board (Glassmorphism) */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          padding: 24,
          borderRadius: 32,
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.02)'
        }}>
          {/* Player Hand */}
          <div style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 3, fontWeight: 800 }}>Tus Cartas</div>
              {playerHand.length > 0 && (
                <div style={{
                  fontSize: '1rem', color: handTotal(playerHand) > 21 ? COLORS.magenta : COLORS.cyan,
                  fontWeight: 900, textShadow: `0 0 10px ${handTotal(playerHand) > 21 ? COLORS.magenta : COLORS.cyan}44`
                }}>
                  {handTotal(playerHand)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, minHeight: 110, justifyContent: 'center' }}>
              <AnimatePresence>
                {playerHand.map((c, i) => <CardUI key={i} card={c} index={i} />)}
                {playerHand.length === 0 && <div style={{ width: 75, height: 110, border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 12 }} />}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {status === 'BETTING' ? (
              <>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  {[10, 50, 100].map(v => (
                    <motion.button
                      key={v}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setBet(prev => Math.min(chips, prev + v)); triggerHaptic('light'); }}
                      disabled={chips < v}
                      style={{
                        width: 54, height: 54, borderRadius: '50%',
                        border: `2px solid ${chips < v ? 'rgba(255,255,255,0.1)' : COLORS.magenta}`,
                        background: chips < v ? 'transparent' : `${COLORS.magenta}11`,
                        color: chips < v ? 'rgba(255,255,255,0.2)' : COLORS.magenta,
                        fontSize: '0.8rem', fontWeight: 900, cursor: 'pointer',
                        boxShadow: chips < v ? 'none' : `0 0 15px ${COLORS.magenta}33`
                      }}
                    >{v}</motion.button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setBet(0)}
                    style={{
                      flex: 1, padding: '14px', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
                      borderRadius: 12, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase'
                    }}
                  >Reset</button>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${COLORS.cyan}44` }}
                    whileTap={{ scale: 0.98 }}
                    onClick={deal}
                    disabled={bet === 0}
                    style={{
                      flex: 2, padding: '14px',
                      background: bet > 0 ? COLORS.cyan : 'rgba(255,255,255,0.05)',
                      color: bet > 0 ? '#000' : 'rgba(255,255,255,0.2)',
                      borderRadius: 12, fontWeight: 900, fontSize: '0.9rem',
                      textTransform: 'uppercase', letterSpacing: 2, border: 'none'
                    }}
                  >
                    Apostar {bet}
                  </motion.button>
                </div>
              </>
            ) : status === 'PLAYING' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={hit}
                  style={{
                    flex: 1, padding: 18, background: `${COLORS.magenta}22`,
                    border: `1px solid ${COLORS.magenta}`, color: COLORS.magenta,
                    borderRadius: 16, fontWeight: 900, fontSize: '1rem', letterSpacing: 1
                  }}
                >PEDIR</motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={stand}
                  style={{
                    flex: 1, padding: 18, background: `${COLORS.cyan}22`,
                    border: `1px solid ${COLORS.cyan}`, color: COLORS.cyan,
                    borderRadius: 16, fontWeight: 900, fontSize: '1rem', letterSpacing: 1
                  }}
                >PLANTAR</motion.button>
              </div>
            ) : (
              <button
                onClick={resetGame}
                style={{
                  padding: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', borderRadius: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2
                }}
              >Siguiente Mano</button>
            )}
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}

export default function Blackjack() {
  return (
    <GameImmersiveLayout>
      <BlackjackInner />
    </GameImmersiveLayout>
  );
}
