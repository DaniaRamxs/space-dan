/**
 * NebulaSniper.jsx — Elige 1-10. Exacto=x10, diff1=x2, diff2=x1.2
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';

function SniperGame({ bet, balance, finishGame }) {
  const [choice, setChoice] = useState(null);
  const [revealed, setRevealed] = useState(null);
  const [shooting, setShooting] = useState(false);

  const shoot = useCallback(() => {
    if (choice === null || shooting) return;
    setShooting(true);
    setTimeout(() => {
      const target = Math.floor(Math.random() * 10) + 1;
      setRevealed(target);
      const diff = Math.abs(choice - target);
      let multi = 0, msg = '';
      if (diff === 0) { multi = 10; msg = `🎯 ¡Exacto! Número ${target}`; }
      else if (diff === 1) { multi = 2; msg = `💫 Cerca! Salió ${target}, elegiste ${choice}`; }
      else if (diff === 2) { multi = 1.2; msg = `🌟 Casi. Salió ${target}, elegiste ${choice}`; }
      else { msg = `❌ Salió ${target}, elegiste ${choice}`; }
      setTimeout(() => finishGame(multi, msg), 700);
    }, 1200);
  }, [choice, shooting, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <div style={{ fontSize: 64 }}>🎯</div>
        <h2 style={{ color: gold, fontWeight: 900, margin: '8px 0 4px' }}>NEBULA SNIPER</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
          Exacto=x10 · ±1=x2 · ±2=x1.2
        </p>
      </div>

      {/* Número revelado */}
      {revealed !== null ? (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
          style={{ fontSize: '5rem', fontWeight: 900, color: revealed === choice ? '#00e676' : gold }}>
          {revealed}
        </motion.div>
      ) : shooting ? (
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.5 }}
          style={{ fontSize: '4rem' }}>🔮</motion.div>
      ) : (
        <div style={{ fontSize: '5rem', opacity: 0.15 }}>?</div>
      )}

      {/* Selector 1-10 */}
      {!shooting && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, width: '100%', maxWidth: 320 }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => setChoice(n)}
              style={{
                aspectRatio: '1', borderRadius: 12, border: `2px solid ${choice === n ? gold : 'rgba(255,255,255,0.1)'}`,
                background: choice === n ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
                color: choice === n ? gold : '#fff', fontSize: '1.3rem', fontWeight: 900, cursor: 'pointer',
              }}>{n}</motion.button>
          ))}
        </div>
      )}

      {choice !== null && !shooting && (
        <motion.button whileTap={{ scale: 0.96 }} onClick={shoot}
          style={{
            background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000',
            border: 'none', borderRadius: 14, padding: '14px 48px',
            fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
          }}>🎯 DISPARAR #{choice}</motion.button>
      )}
    </div>
  );
}

export default function NebulaSniper() {
  const casinoBet = useCasinoBet('nebula-sniper', 'Nebula Sniper');
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = casinoBet;
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Nebula Sniper" icon="🎯" description="Elige un número del 1-10. Exacto=x10, cerca=x2." />}
        {phase === 'playing' && <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}><SniperGame bet={bet} balance={balance} finishGame={finishGame} /></motion.div>}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
