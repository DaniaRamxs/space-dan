/**
 * CosmicWheel.jsx — Rueda de 20 sectores. Gira y gana según donde caiga.
 * 12 vacíos · 5 x2 · 2 x5 · 1 x20
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';

// 20 sectores - base definitions (order will be randomized per component instance)
const BASE_SECTORS = [
  ...Array(12).fill({ multi: 0, label: '❌', color: '#1a1a2e' }),
  ...Array(5).fill({ multi: 2, label: 'x2', color: '#00408a' }),
  ...Array(2).fill({ multi: 5, label: 'x5', color: '#4a0080' }),
  { multi: 20, label: 'x20', color: '#8a6000' },
];

const SECTOR_ANGLE = 360 / BASE_SECTORS.length;

// Fisher-Yates shuffle with seed for deterministic randomness
function seededShuffle(array, seed) {
  let currentIndex = array.length, randomIndex;
  let s = seed;
  const result = [...array];
  
  // Simple seeded random generator
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  
  while (currentIndex != 0) {
    randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
  }
  
  return result;
}

function WheelGame({ bet, balance, finishGame }) {
  // Create randomized sectors once per component mount using seeded shuffle
  const [SECTORS] = useState(() => seededShuffle(BASE_SECTORS, Date.now()));
  
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const spins = 5 + Math.random() * 5;
    const finalAngle = spins * 360 + Math.random() * 360;
    setRotation(r => r + finalAngle);

    setTimeout(() => {
      // Which sector is at top (pointer at 270deg = top)
      const normalized = ((rotation + finalAngle) % 360 + 360) % 360;
      const idx = Math.floor(((360 - normalized + 90) % 360) / SECTOR_ANGLE) % SECTORS.length;
      const sector = SECTORS[idx];
      setResult(sector);
      setSpinning(false);
      setTimeout(() => finishGame(sector.multi, sector.multi > 0 ? `🎡 ${sector.label}!` : '❌ Sector vacío'), 700);
    }, 4000);
  }, [spinning, rotation, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      {/* Puntero */}
      <div style={{ marginTop: 56, position: 'relative', width: 220, height: 220 }}>
        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: '1.5rem', zIndex: 10 }}>▼</div>

        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.15, 1, 0.25, 1] }}
          style={{
            width: 220, height: 220, borderRadius: '50%',
            position: 'relative', overflow: 'hidden',
            border: `5px solid ${gold}`,
            boxShadow: `0 0 30px rgba(245,197,24,0.3)`,
          }}
        >
          {SECTORS.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', top: 0, left: '50%',
                width: 0, height: '50%',
                transformOrigin: 'bottom center',
                transform: `rotate(${i * SECTOR_ANGLE}deg)`,
                borderLeft: `${Math.tan(SECTOR_ANGLE * Math.PI / 180 / 2) * 110}px solid transparent`,
                borderRight: `${Math.tan(SECTOR_ANGLE * Math.PI / 180 / 2) * 110}px solid transparent`,
                borderBottom: `110px solid ${s.color}`,
              }}
            />
          ))}
          {/* Centro */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 50, height: 50, borderRadius: '50%',
            background: '#050510', border: `3px solid ${gold}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', zIndex: 5,
          }}>🌌</div>
        </motion.div>
      </div>

      {/* Info sectores */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[{ color: '#1a1a2e', label: '12× vacío' }, { color: '#00408a', label: '5× x2' }, { color: '#4a0080', label: '2× x5' }, { color: '#8a6000', label: '1× x20' }].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, border: '1px solid rgba(255,255,255,0.2)' }} />
            {s.label}
          </div>
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.96 }} onClick={spin} disabled={spinning}
        style={{
          background: spinning ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg,${gold},#e6a800)`,
          color: spinning ? 'rgba(255,255,255,0.4)' : '#000',
          border: 'none', borderRadius: 14, padding: '14px 48px',
          fontSize: '1.1rem', fontWeight: 900, cursor: spinning ? 'not-allowed' : 'pointer',
        }}>
        {spinning ? '🌀 GIRANDO...' : '🎡 GIRAR LA RUEDA'}
      </motion.button>
    </div>
  );
}

export default function CosmicWheel() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('cosmic-wheel', 'Cosmic Wheel');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Cosmic Wheel" icon="🎪" description="Rueda de 20 sectores. x2 · x5 · x20 o vacío." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><WheelGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
