/**
 * OrbitalSlots.jsx
 * Tragamonedas de 3 símbolos espaciales.
 * Combinaciones ganadoras multiplican la apuesta.
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';

const SYMBOLS = ['⭐', '🪐', '🌙', '☄️', '🛸', '🌌'];
const WEIGHTS = [30, 25, 20, 15, 7, 3]; // % probabilidad
const PAYOUT = {
  '⭐⭐⭐': 5,
  '🪐🪐🪐': 4,
  '🌙🌙🌙': 3.5,
  '☄️☄️☄️': 8,
  '🛸🛸🛸': 15,
  '🌌🌌🌌': 50,
};

function weightedRandom() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[0];
}

function getResult(reels) {
  const key = reels.join('');
  if (PAYOUT[key]) return PAYOUT[key];
  // Two matching = 0.5x
  const counts = {};
  reels.forEach(r => counts[r] = (counts[r] || 0) + 1);
  if (Object.values(counts).some(v => v >= 2)) return 0.5;
  return 0;
}

function Reel({ symbol, spinning, delay }) {
  return (
    <div style={{
      width: 80, height: 90, background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
    }}>
      {spinning ? (
        <motion.div
          animate={{ y: [0, -400] }}
          transition={{ duration: 0.5, delay, ease: 'linear', repeat: 1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          {SYMBOLS.map((s, i) => <div key={i} style={{ fontSize: '2rem', textAlign: 'center', padding: '12px 0' }}>{s}</div>)}
        </motion.div>
      ) : (
        <motion.div
          key={symbol}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ fontSize: '2.5rem' }}
        >{symbol}</motion.div>
      )}
    </div>
  );
}

function SlotsGame({ bet, balance, finishGame }) {
  const [reels, setReels] = useState(['⭐', '🪐', '🌙']);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [spins, setSpins] = useState(0);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setLastResult(null);

    setTimeout(() => {
      const newReels = [weightedRandom(), weightedRandom(), weightedRandom()];
      setReels(newReels);
      setSpinning(false);

      const multi = getResult(newReels);
      setLastResult(multi);
      setSpins(s => s + 1);

      if (multi > 0) {
        setTimeout(() => finishGame(multi, `${newReels.join('')} — x${multi}!`), 800);
      } else {
        setTimeout(() => finishGame(0, `${newReels.join('')} — sin coincidencias`), 800);
      }
    }, 1400);
  }, [spinning, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <h2 style={{ color: gold, fontWeight: 900, margin: '0 0 4px' }}>ORBITAL SLOTS</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: 0 }}>
          🌌🌌🌌 = x50 · 🛸🛸🛸 = x15 · ☄️☄️☄️ = x8
        </p>
      </div>

      {/* Reels */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {reels.map((s, i) => <Reel key={i} symbol={s} spinning={spinning} delay={i * 0.15} />)}
      </div>

      {/* Paylines visual */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        opacity: 0.45, maxWidth: 340,
      }}>
        {Object.entries(PAYOUT).map(([k, v]) => (
          <span key={k} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: '#fff' }}>
            {k} → x{v}
          </span>
        ))}
        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: '#fff' }}>par → x0.5</span>
      </div>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={spin}
        disabled={spinning}
        style={{
          background: spinning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${gold},#e6a800)`,
          color: spinning ? 'rgba(255,255,255,0.4)' : '#000',
          border: 'none', borderRadius: 14, padding: '14px 48px',
          fontSize: '1.1rem', fontWeight: 900, cursor: spinning ? 'not-allowed' : 'pointer',
          boxShadow: spinning ? 'none' : `0 0 24px rgba(245,197,24,0.35)`,
          transition: 'all 0.2s',
        }}
      >
        {spinning ? '🌀 GIRANDO...' : '🎰 GIRAR'}
      </motion.button>
    </div>
  );
}

export default function OrbitalSlots() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('orbital-slots', 'Orbital Slots');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Orbital Slots" icon="🎰"
            description="3 símbolos espaciales. Combina para multiplicar tu apuesta."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <SlotsGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
