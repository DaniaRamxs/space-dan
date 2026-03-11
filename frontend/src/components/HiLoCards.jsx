/**
 * HiLoCards.jsx — Carta visible. ¿La siguiente es mayor o menor?
 * Acierta 5 seguidas para cobrar x8. Retírate en cualquier momento.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['♠','♣','♥','♦'];
const RED_SUITS = new Set(['♥','♦']);

function randCard() {
  return { rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: SUITS[Math.floor(Math.random() * SUITS.length)] };
}
function rankVal(r) { return RANKS.indexOf(r); }

// Multi por nivel de aciertos
const MULTI_TABLE = [1, 1.3, 1.7, 2.3, 3.2, 8];

function CardDisplay({ card }) {
  const isRed = RED_SUITS.has(card.suit);
  const accent = isRed ? '#ff4d8d' : '#00e5ff';
  return (
    <div style={{
      width: 80, height: 116, borderRadius: 12, flexShrink: 0,
      background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.15)`,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 8, color: accent,
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{card.rank}</div>
      <div style={{ fontSize: '2rem', textAlign: 'center' }}>{card.suit}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 900, alignSelf: 'flex-end', transform: 'rotate(180deg)' }}>{card.rank}</div>
    </div>
  );
}

function HiLoGame({ bet, balance, finishGame }) {
  const [current, setCurrent] = useState(randCard);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState([]);
  const [flipping, setFlipping] = useState(false);

  const currentMulti = MULTI_TABLE[Math.min(streak, MULTI_TABLE.length - 1)];
  const nextMulti = MULTI_TABLE[Math.min(streak + 1, MULTI_TABLE.length - 1)];

  const guess = useCallback((isHigher) => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      const next = randCard();
      const currentVal = rankVal(current.rank);
      const nextVal = rankVal(next.rank);
      let won;
      if (nextVal === currentVal) won = true; // empate = ganas (ventaja jugador)
      else won = isHigher ? nextVal > currentVal : nextVal < currentVal;

      setHistory(h => [...h.slice(-4), { card: next, won }]);
      setCurrent(next);
      setFlipping(false);

      if (won) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak >= 5) {
          setTimeout(() => finishGame(8, '🏆 ¡5 aciertos! Máximo multiplicador x8'), 400);
        }
      } else {
        setTimeout(() => finishGame(0, `❌ ${next.rank}${next.suit} — perdiste en acierto ${streak + 1}`), 400);
      }
    }, 600);
  }, [current, streak, flipping, finishGame]);

  const cashOut = useCallback(() => {
    if (streak === 0) return;
    finishGame(currentMulti, `✅ Retiraste con ${streak} aciertos · x${currentMulti}`);
  }, [streak, currentMulti, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: 2 }}>ACIERTOS</div>
        <div style={{ color: gold, fontSize: '2rem', fontWeight: 900 }}>{streak}/5 · x{currentMulti}</div>
      </div>

      {/* Historial */}
      <div style={{ display: 'flex', gap: 6, minHeight: 24 }}>
        {history.map((h, i) => (
          <span key={i} style={{ fontSize: '1rem' }}>{h.won ? '✅' : '❌'}</span>
        ))}
      </div>

      {/* Carta actual */}
      <motion.div animate={flipping ? { rotateY: 90 } : { rotateY: 0 }} transition={{ duration: 0.3 }}>
        <CardDisplay card={current} />
      </motion.div>

      {/* Botones */}
      {!flipping && (
        <>
          <div style={{ display: 'flex', gap: 12 }}>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => guess(false)}
              style={{ padding: '12px 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,68,102,0.12)', color: '#fff', fontSize: '1rem', fontWeight: 900, cursor: 'pointer' }}>
              ⬇ MENOR
            </motion.button>
            <motion.button whileTap={{ scale: 0.94 }} onClick={() => guess(true)}
              style={{ padding: '12px 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,230,118,0.12)', color: '#fff', fontSize: '1rem', fontWeight: 900, cursor: 'pointer' }}>
              ⬆ MAYOR
            </motion.button>
          </div>
          {streak > 0 && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={cashOut}
              style={{ background: `linear-gradient(135deg,${green},#00c853)`, color: '#000', border: 'none', borderRadius: 12, padding: '11px 28px', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer' }}>
              💰 COBRAR x{currentMulti} → próximo sería x{nextMulti}
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}

export default function HiLoCards() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('hilo-cards', 'Hi-Lo Cards');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Hi-Lo Cards" icon="🃏" description="Predice si la siguiente carta es mayor o menor. 5 aciertos = x8." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><HiLoGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
