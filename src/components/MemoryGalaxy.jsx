/**
 * MemoryGalaxy.jsx
 * Juego de memoria con cartas espaciales. Encontrar pares = multiplicador.
 * Algunas cartas son trampas (💣) que terminan la ronda.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

const CARD_SYMBOLS = ['⭐', '🪐', '🌙', '☄️', '🛸', '🌌'];
const TRAP_SYMBOL = '💣';
const TRAP_COUNT = 2;
const PAIR_MULTI = 0.4; // +0.4x por par encontrado

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards() {
  const pairs = CARD_SYMBOLS.map((s, i) => [
    { id: i * 2, symbol: s, matched: false, trap: false },
    { id: i * 2 + 1, symbol: s, matched: false, trap: false },
  ]).flat();
  const traps = Array.from({ length: TRAP_COUNT }, (_, i) => ({
    id: 100 + i, symbol: TRAP_SYMBOL, matched: false, trap: true,
  }));
  return shuffle([...pairs, ...traps]);
}

function MemoryGame({ bet, balance, finishGame }) {
  const [cards, setCards] = useState(buildCards);
  const [flipped, setFlipped] = useState([]); // indices of currently flipped
  const [matched, setMatched] = useState(new Set());
  const [pairsFound, setPairsFound] = useState(0);
  const [multi, setMulti] = useState(1.0);
  const [checking, setChecking] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const clickCard = useCallback((idx) => {
    if (checking || flipped.includes(idx) || matched.has(cards[idx].id)) return;

    // Trap card
    if (cards[idx].trap) {
      setFlipped(f => [...f, idx]);
      setTimeout(() => finishGame(multi > 1 ? multi : 0, `💣 Trampa en carta ${idx + 1}! Ronda terminada.`), 600);
      return;
    }

    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setChecking(true);
      const [a, b] = newFlipped;
      if (cards[a].symbol === cards[b].symbol) {
        // Match!
        timeoutRef.current = setTimeout(() => {
          setMatched(m => {
            const next = new Set([...m, cards[a].id, cards[b].id]);
            const newPairs = pairsFound + 1;
            const newMulti = +(multi + PAIR_MULTI).toFixed(2);
            setPairsFound(newPairs);
            setMulti(newMulti);
            setFlipped([]);
            setChecking(false);
            if (next.size / 2 >= CARD_SYMBOLS.length) {
              // All pairs found
              setTimeout(() => finishGame(newMulti, `🏆 ¡Todos los pares! x${newMulti}`), 400);
            }
            return next;
          });
        }, 600);
      } else {
        // No match
        timeoutRef.current = setTimeout(() => {
          setFlipped([]);
          setChecking(false);
        }, 900);
      }
    }
  }, [checking, flipped, matched, cards, pairsFound, multi, finishGame]);

  const cashOut = useCallback(() => {
    if (pairsFound === 0) return;
    finishGame(multi, `✅ Retiraste con ${pairsFound} pares · x${multi}`);
  }, [pairsFound, multi, finishGame]);

  const totalPairs = CARD_SYMBOLS.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} label="MULTI" />

      <div style={{ marginTop: 52, display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 360, padding: '0 4px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>PARES</div>
          <div style={{ color: '#fff', fontWeight: 900 }}>{pairsFound}/{totalPairs}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>MULTIPLICADOR</div>
          <div style={{ color: gold, fontSize: '1.3rem', fontWeight: 900 }}>x{multi.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>TRAMPAS</div>
          <div style={{ color: red, fontWeight: 900 }}>{TRAP_COUNT}</div>
        </div>
      </div>

      {/* Grid de cartas */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8, width: '100%', maxWidth: 360,
      }}>
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i);
          const isMatched = matched.has(card.id);
          const show = isFlipped || isMatched;

          return (
            <motion.div
              key={card.id}
              onClick={() => clickCard(i)}
              whileTap={{ scale: 0.9 }}
              animate={{ rotateY: show ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              style={{
                aspectRatio: '1', borderRadius: 12, cursor: show ? 'default' : 'pointer',
                background: isMatched ? 'rgba(0,230,118,0.15)' : show ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isMatched ? green : show ? (card.trap ? red : 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem',
                boxShadow: isMatched ? `0 0 12px rgba(0,230,118,0.3)` : 'none',
                transition: 'border 0.2s',
              }}
            >
              {show ? card.symbol : '🌑'}
            </motion.div>
          );
        })}
      </div>

      {pairsFound > 0 && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={cashOut}
          style={{
            background: `linear-gradient(135deg,${green},#00c853)`, color: '#000',
            border: 'none', borderRadius: 12, padding: '12px 32px',
            fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer',
          }}
        >💰 COBRAR x{multi.toFixed(2)} (◈ {Math.floor(bet * multi)})</motion.button>
      )}
    </div>
  );
}

export default function MemoryGalaxy() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('memory-galaxy', 'Memory Galaxy');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Memory Galaxy" icon="🧠"
            description="Encuentra pares espaciales. Evita las trampas 💣. Cada par = +0.4x"
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <MemoryGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
