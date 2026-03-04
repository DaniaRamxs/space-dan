/**
 * OrbitalSlots.jsx — Tragamonedas con jackpot progresivo.
 * 🌌🌌🌌 = jackpot completo. Resto = multiplicadores fijos.
 */
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';
import { getJackpot, claimJackpot } from '../services/casino';
import { useEconomy } from '../contexts/EconomyContext';

const gold = '#f5c518';

const SYMBOLS = ['⭐', '🪐', '🌙', '☄️', '🛸', '🌌'];
const WEIGHTS  = [30, 25, 20, 15, 7, 3];
const PAYOUT   = {
  '⭐⭐⭐': 5, '🪐🪐🪐': 4, '🌙🌙🌙': 3.5,
  '☄️☄️☄️': 8, '🛸🛸🛸': 15,
};
const JACKPOT_KEY = '🌌🌌🌌';

function weightedRandom() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return SYMBOLS[i]; }
  return SYMBOLS[0];
}

function getMulti(reels) {
  const key = reels.join('');
  if (PAYOUT[key]) return PAYOUT[key];
  const counts = {};
  reels.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  if (Object.values(counts).some(v => v >= 2)) return 0.5;
  return 0;
}

function Reel({ symbol, spinning, delay }) {
  return (
    <div style={{
      width: 80, height: 90, background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
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
        <motion.div key={symbol} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ fontSize: '2.5rem' }}>{symbol}</motion.div>
      )}
    </div>
  );
}

function SlotsGame({ bet, balance, finishGame, jackpotAmount }) {
  const { awardCoins } = useEconomy();
  const [reels, setReels] = useState(['⭐', '🪐', '🌙']);
  const [spinning, setSpinning] = useState(false);

  const spin = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);

    setTimeout(async () => {
      const newReels = [weightedRandom(), weightedRandom(), weightedRandom()];
      setReels(newReels);
      setSpinning(false);
      const key = newReels.join('');

      if (key === JACKPOT_KEY) {
        // JACKPOT: reclamar y premiar por separado, luego llamar finishGame con x50 normal
        const jp = await claimJackpot().catch(() => 50);
        if (jp > 0) awardCoins(jp, 'game_reward', 'orbital-slots', `🌌 JACKPOT: +◈${jp}`);
        setTimeout(() => finishGame(50, `🌌🌌🌌 ¡JACKPOT! +◈${jp} extra!`), 800);
      } else {
        const multi = getMulti(newReels);
        setTimeout(() => {
          if (multi > 0) finishGame(multi, `${key} — x${multi}!`);
          else finishGame(0, `${key} — sin coincidencias`);
        }, 800);
      }
    }, 1400);
  }, [spinning, finishGame, awardCoins]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      {/* Jackpot display */}
      <motion.div
        animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
        style={{
          marginTop: 52, background: 'rgba(245,197,24,0.1)', border: `1px solid rgba(245,197,24,0.3)`,
          borderRadius: 12, padding: '8px 20px', textAlign: 'center',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', letterSpacing: 2 }}>🌌 JACKPOT</div>
        <div style={{ color: gold, fontSize: '1.4rem', fontWeight: 900 }}>◈ {jackpotAmount.toLocaleString()}</div>
      </motion.div>

      <div style={{ display: 'flex', gap: 10 }}>
        {reels.map((s, i) => <Reel key={i} symbol={s} spinning={spinning} delay={i * 0.15} />)}
      </div>

      {/* Paylines */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', opacity: 0.4, maxWidth: 340 }}>
        {Object.entries(PAYOUT).map(([k, v]) => (
          <span key={k} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: '#fff' }}>{k}→x{v}</span>
        ))}
        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: '#fff' }}>par→x0.5</span>
        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(245,197,24,0.15)', color: gold }}>🌌🌌🌌→JACKPOT</span>
      </div>

      <motion.button whileTap={{ scale: 0.94 }} onClick={spin} disabled={spinning}
        style={{
          background: spinning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${gold},#e6a800)`,
          color: spinning ? 'rgba(255,255,255,0.4)' : '#000',
          border: 'none', borderRadius: 14, padding: '14px 48px',
          fontSize: '1.1rem', fontWeight: 900, cursor: spinning ? 'not-allowed' : 'pointer',
          boxShadow: spinning ? 'none' : `0 0 24px rgba(245,197,24,0.35)`,
        }}
      >{spinning ? '🌀 GIRANDO...' : '🎰 GIRAR'}</motion.button>
    </div>
  );
}

export default function OrbitalSlots() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('orbital-slots', 'Orbital Slots');
  const [jackpotAmount, setJackpotAmount] = useState(50);

  useEffect(() => {
    getJackpot().then(setJackpotAmount).catch(() => {});
    const iv = setInterval(() => getJackpot().then(setJackpotAmount).catch(() => {}), 15000);
    return () => clearInterval(iv);
  }, []);

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading} isVIP={isVIP}
            title="Orbital Slots" icon="🎰"
            description="3 símbolos. 🌌🌌🌌 gana el jackpot progresivo."
            jackpot={jackpotAmount}
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <SlotsGame bet={bet} balance={balance} finishGame={finishGame} jackpotAmount={jackpotAmount} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
