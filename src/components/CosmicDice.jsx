/**
 * CosmicDice.jsx
 * Elige ALTO (4-6) o BAJO (1-3). Lanza el dado. Gana x2.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const gold = '#f5c518';

function DiceGame({ bet, balance, finishGame }) {
  const [choice, setChoice] = useState(null); // 'high' | 'low'
  const [rolling, setRolling] = useState(false);
  const [diceFrame, setDiceFrame] = useState(0);
  const [finalVal, setFinalVal] = useState(null);

  const roll = () => {
    if (!choice || rolling) return;
    setRolling(true);
    setFinalVal(null);

    let ticks = 0;
    const maxTicks = 18;
    const interval = setInterval(() => {
      setDiceFrame(Math.floor(Math.random() * 6));
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        const result = Math.floor(Math.random() * 6) + 1;
        setDiceFrame(result - 1);
        setFinalVal(result);
        setRolling(false);
        const isHigh = result >= 4;
        const won = (choice === 'high' && isHigh) || (choice === 'low' && !isHigh);
        setTimeout(() => finishGame(won ? 2 : 0, won ? `¡${result}! Adivinaste ${choice === 'high' ? 'ALTO' : 'BAJO'}` : `${result} — la suerte no estuvo de tu lado`), 600);
      }
    }, 80);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 60, textAlign: 'center' }}>
        <h2 style={{ color: gold, fontWeight: 900, margin: '0 0 6px' }}>COSMIC DICE</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.85rem' }}>¿Saldrá ALTO (4-6) o BAJO (1-3)?</p>
      </div>

      {/* Dado */}
      <motion.div
        animate={rolling ? { rotate: [0, 360], scale: [1, 1.15, 1] } : {}}
        transition={{ repeat: rolling ? Infinity : 0, duration: 0.5 }}
        style={{ fontSize: 96, lineHeight: 1, filter: finalVal ? `drop-shadow(0 0 24px ${finalVal >= 4 ? '#00e676' : '#ff4466'})` : 'none' }}
      >
        {FACES[diceFrame]}
      </motion.div>

      {/* Elección */}
      {!rolling && !finalVal && (
        <div style={{ display: 'flex', gap: 16 }}>
          {['low', 'high'].map(c => (
            <motion.button
              key={c}
              whileTap={{ scale: 0.94 }}
              onClick={() => setChoice(c)}
              style={{
                padding: '14px 28px', borderRadius: 14, border: `2px solid`,
                borderColor: choice === c ? gold : 'rgba(255,255,255,0.15)',
                background: choice === c ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.05)',
                color: choice === c ? gold : 'rgba(255,255,255,0.6)',
                fontSize: '1rem', fontWeight: 900, cursor: 'pointer', letterSpacing: 1,
                transition: 'all 0.2s',
              }}
            >
              {c === 'low' ? '⬇ BAJO\n1-3' : '⬆ ALTO\n4-6'}
            </motion.button>
          ))}
        </div>
      )}

      {choice && !rolling && !finalVal && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={roll}
          style={{
            background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000',
            border: 'none', borderRadius: 14, padding: '14px 48px',
            fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', letterSpacing: 1,
          }}
        >🎲 LANZAR</motion.button>
      )}

      {rolling && (
        <p style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: 3, animation: 'none' }}>LANZANDO...</p>
      )}
    </div>
  );
}

export default function CosmicDice() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('cosmic-dice', 'Cosmic Dice');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Cosmic Dice" icon="🎲"
            description="Predice si el dado caerá ALTO o BAJO. Gana x2."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <DiceGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
