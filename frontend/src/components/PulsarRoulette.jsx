/**
 * PulsarRoulette.jsx — Ruleta espacial 0-12.
 * Apuesta: Número exacto (x12) | Rojo/Negro (x2) | Par/Impar (x1.9)
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

// 0 = negro, impar = rojo, par (sin 0) = negro
const RED_NUMS = new Set([1,3,5,7,9,11]);
const isRed = n => RED_NUMS.has(n);

const BET_TYPES = [
  { id: 'red', label: '🔴 Rojo', multi: 2, check: n => n > 0 && isRed(n) },
  { id: 'black', label: '⚫ Negro', multi: 2, check: n => n === 0 || !isRed(n) },
  { id: 'odd', label: '🔢 Impar', multi: 1.9, check: n => n > 0 && n % 2 === 1 },
  { id: 'even', label: '🔢 Par', multi: 1.9, check: n => n > 0 && n % 2 === 0 },
];

function RouletteGame({ bet, balance, finishGame }) {
  const [betType, setBetType] = useState(null);
  const [exactNum, setExactNum] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [angle, setAngle] = useState(0);

  const spin = useCallback(() => {
    if ((!betType && exactNum === null) || spinning) return;
    setSpinning(true);
    const totalAngle = 1440 + Math.random() * 360;
    setAngle(a => a + totalAngle);

    setTimeout(() => {
      const num = Math.floor(Math.random() * 13); // 0-12
      setResult(num);
      setSpinning(false);

      let multi = 0, msg = '';
      if (exactNum !== null) {
        if (num === exactNum) { multi = 12; msg = `🎯 ¡Exacto! Salió el ${num}`; }
        else msg = `❌ Salió el ${num}, apostaste al ${exactNum}`;
      } else {
        const bt = BET_TYPES.find(b => b.id === betType);
        if (bt?.check(num)) { multi = bt.multi; msg = `✅ ${num} — ${bt.label} ¡Ganaste!`; }
        else msg = `❌ ${num} — no coincide con ${bt?.label}`;
      }
      setTimeout(() => finishGame(multi, msg), 600);
    }, 2500);
  }, [betType, exactNum, spinning, finishGame]);

  const canSpin = (betType || exactNum !== null) && !spinning;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      {/* Rueda */}
      <div style={{ marginTop: 52, position: 'relative', width: 140, height: 140 }}>
        <motion.div
          animate={{ rotate: angle }}
          transition={{ duration: 2.5, ease: [0.2, 1, 0.3, 1] }}
          style={{
            width: 140, height: 140, borderRadius: '50%',
            background: 'conic-gradient(#1a1a2e 0deg, #ff4466 30deg, #1a1a2e 60deg, #ff4466 90deg, #1a1a2e 120deg, #ff4466 150deg, #1a1a2e 180deg, #ff4466 210deg, #1a1a2e 240deg, #ff4466 270deg, #1a1a2e 300deg, #ff4466 330deg, #1a1a2e 360deg)',
            border: `4px solid ${gold}`,
            boxShadow: `0 0 30px rgba(245,197,24,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: '#050510', border: `2px solid ${gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', fontWeight: 900, color: result !== null ? gold : 'transparent',
          }}>
            {result !== null ? result : '?'}
          </div>
        </motion.div>
        {/* Puntero */}
        <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', fontSize: '1.2rem' }}>▼</div>
      </div>

      {/* Tipo de apuesta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 340 }}>
        {BET_TYPES.map(bt => (
          <button key={bt.id} onClick={() => { setBetType(bt.id); setExactNum(null); }}
            style={{
              padding: '10px', borderRadius: 10, border: `1px solid ${betType === bt.id ? gold : 'rgba(255,255,255,0.1)'}`,
              background: betType === bt.id ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.05)',
              color: betType === bt.id ? gold : 'rgba(255,255,255,0.7)',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}>
            {bt.label} <span style={{ opacity: 0.6 }}>x{bt.multi}</span>
          </button>
        ))}
      </div>

      {/* Número exacto */}
      <div style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', letterSpacing: 2, marginBottom: 6, textAlign: 'center' }}>NÚMERO EXACTO (x12)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Array.from({ length: 13 }, (_, i) => (
            <button key={i} onClick={() => { setExactNum(i); setBetType(null); }}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: `1px solid ${exactNum === i ? gold : 'rgba(255,255,255,0.1)'}`,
                background: i === 0 ? 'rgba(0,0,0,0.5)' : isRed(i) ? 'rgba(255,68,102,0.15)' : 'rgba(30,30,60,0.6)',
                color: exactNum === i ? gold : '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              }}>{i}</button>
          ))}
        </div>
      </div>

      <motion.button whileTap={{ scale: 0.96 }} onClick={spin} disabled={!canSpin}
        style={{
          background: canSpin ? `linear-gradient(135deg,${gold},#e6a800)` : 'rgba(255,255,255,0.1)',
          color: canSpin ? '#000' : 'rgba(255,255,255,0.3)',
          border: 'none', borderRadius: 14, padding: '13px 40px',
          fontSize: '1rem', fontWeight: 900, cursor: canSpin ? 'pointer' : 'not-allowed',
        }}>
        {spinning ? '🌀 GIRANDO...' : '🎡 GIRAR'}
      </motion.button>
    </div>
  );
}

export default function PulsarRoulette() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('pulsar-roulette', 'Pulsar Roulette');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Pulsar Roulette" icon="🎡" description="Rojo/Negro x2 · Par/Impar x1.9 · Número exacto x12" />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative', overflowY: 'auto', maxHeight: '90dvh' }}><RouletteGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
