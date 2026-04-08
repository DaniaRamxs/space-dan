/**
 * SpaceMiner.jsx
 * Grid 5x5. Destapa cristales (ganas) o agujeros negros (pierdes todo).
 * Cada cristal aumenta el multiplicador. Puedes retirarte en cualquier momento.
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const GRID = 25;
const MINES = 5;
const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

// Multiplicadores por cristal encontrado (tablas de pago)
const MULTI_TABLE = [0, 1.08, 1.22, 1.40, 1.65, 1.95, 2.35, 2.90, 3.65, 4.70, 6.1, 8.0, 10.8, 14.9, 21.0, 30.0, 45.0, 72.0, 120.0, 220.0, 500.0];

function MinerGame({ bet, balance, finishGame }) {
  const mines = useMemo(() => {
    const set = new Set();
    while (set.size < MINES) set.add(Math.floor(Math.random() * GRID));
    return set;
  }, []);

  const [revealed, setRevealed] = useState(new Set());
  const [lost, setLost] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);

  const crystalsFound = [...revealed].filter(i => !mines.has(i)).length;
  const currentMulti = MULTI_TABLE[Math.min(crystalsFound, MULTI_TABLE.length - 1)];

  const reveal = useCallback((i) => {
    if (revealed.has(i) || lost || cashedOut) return;
    if (mines.has(i)) {
      setLost(true);
      setRevealed(prev => new Set([...prev, i]));
      // Show all mines
      setTimeout(() => {
        setRevealed(new Set([...Array(GRID).keys()]));
        setTimeout(() => finishGame(0, `💀 Agujero negro en la casilla ${i + 1}`), 600);
      }, 300);
    } else {
      const next = new Set([...revealed, i]);
      setRevealed(next);
      const newCrystals = [...next].filter(x => !mines.has(x)).length;
      if (newCrystals >= GRID - MINES) {
        // All crystals found!
        setTimeout(() => finishGame(MULTI_TABLE[newCrystals], '🏆 ¡Encontraste todos los cristales!'), 400);
      }
    }
  }, [revealed, mines, lost, cashedOut, finishGame]);

  const cashOut = useCallback(() => {
    if (crystalsFound === 0 || lost || cashedOut) return;
    setCashedOut(true);
    finishGame(currentMulti, `✅ Retiraste con ${crystalsFound} cristales`);
  }, [crystalsFound, currentMulti, lost, cashedOut, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 52, textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', letterSpacing: 2 }}>MULTIPLICADOR</div>
        <div style={{ color: gold, fontSize: '2.2rem', fontWeight: 900 }}>x{currentMulti.toFixed(2)}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          {crystalsFound} cristales · {MINES} minas ocultas
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 6, width: '100%', maxWidth: 320,
      }}>
        {Array.from({ length: GRID }, (_, i) => {
          const isRevealed = revealed.has(i);
          const isMine = isRevealed && mines.has(i);
          const isCrystal = isRevealed && !mines.has(i);
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.92 }}
              onClick={() => reveal(i)}
              disabled={isRevealed || lost || cashedOut}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.01 }}
              style={{
                aspectRatio: '1', borderRadius: 10, cursor: isRevealed ? 'default' : 'pointer',
                background: isMine ? red : isCrystal ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isMine ? red : isCrystal ? green : 'rgba(255,255,255,0.1)'}`,
                fontSize: '1.4rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
                boxShadow: isCrystal ? `0 0 12px rgba(0,230,118,0.4)` : 'none',
              }}
            >
              {isMine ? '🕳️' : isCrystal ? '💎' : ''}
            </motion.button>
          );
        })}
      </div>

      {/* Cashout */}
      {!lost && !cashedOut && crystalsFound > 0 && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={cashOut}
          style={{
            background: `linear-gradient(135deg,${green},#00c853)`, color: '#000',
            border: 'none', borderRadius: 12, padding: '12px 32px',
            fontSize: '1rem', fontWeight: 900, cursor: 'pointer',
            boxShadow: `0 0 20px rgba(0,230,118,0.4)`,
          }}
        >💰 RETIRAR x{currentMulti.toFixed(2)} (◈ {Math.floor(bet * currentMulti)})</motion.button>
      )}
    </div>
  );
}

export default function SpaceMiner() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('space-miner', 'Space Miner');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Space Miner" icon="⛏️"
            description="Destapa cristales. Evita los agujeros negros. Retírate cuando quieras."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <MinerGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
