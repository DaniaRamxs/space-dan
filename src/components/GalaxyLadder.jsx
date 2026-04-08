/**
 * GalaxyLadder.jsx
 * Escalera de 10 niveles. Sube o retírate. Cada nivel aumenta el multiplicador.
 * 40% de fallo por nivel. Si fallas, pierdes todo.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

const LEVELS = [
  { multi: 1.2, risk: 0.30 },
  { multi: 1.5, risk: 0.32 },
  { multi: 2.0, risk: 0.34 },
  { multi: 2.7, risk: 0.36 },
  { multi: 3.7, risk: 0.38 },
  { multi: 5.0, risk: 0.40 },
  { multi: 7.0, risk: 0.42 },
  { multi: 10.0, risk: 0.44 },
  { multi: 15.0, risk: 0.46 },
  { multi: 25.0, risk: 0.48 },
];

function LadderGame({ bet, balance, finishGame }) {
  const [level, setLevel] = useState(0); // 0 = start, 1-10 = levels
  const [status, setStatus] = useState('idle'); // idle | climbing | failed | cashed
  const [climbing, setClimbing] = useState(false);

  const currentMulti = level === 0 ? 1 : LEVELS[level - 1].multi;
  const nextLevel = LEVELS[level] || null;

  const climb = useCallback(() => {
    if (!nextLevel || climbing) return;
    setClimbing(true);

    setTimeout(() => {
      const failed = Math.random() < nextLevel.risk;
      if (failed) {
        setStatus('failed');
        setTimeout(() => finishGame(0, `💥 Fallaste en el nivel ${level + 1}`), 500);
      } else {
        setLevel(l => l + 1);
        if (level + 1 >= LEVELS.length) {
          setStatus('cashed');
          setTimeout(() => finishGame(LEVELS[LEVELS.length - 1].multi, '🏆 ¡Llegaste al nivel máximo!'), 400);
        }
      }
      setClimbing(false);
    }, 800);
  }, [nextLevel, climbing, level, finishGame]);

  const cashOut = useCallback(() => {
    if (level === 0 || status !== 'idle') return;
    setStatus('cashed');
    finishGame(currentMulti, `✅ Retiraste en nivel ${level} con x${currentMulti}`);
  }, [level, status, currentMulti, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '16px', width: '100%', maxWidth: 380 }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 52, width: '100%' }}>
        {/* Escalera (de abajo a arriba) */}
        {[...LEVELS].reverse().map((l, ri) => {
          const i = LEVELS.length - 1 - ri;
          const isActive = level === i + 1;
          const isPassed = level > i + 1;
          const isNext = level === i;
          return (
            <motion.div
              key={i}
              animate={{ scale: isActive ? [1, 1.04, 1] : 1 }}
              transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', borderRadius: 10, marginBottom: 5,
                background: isActive ? 'rgba(245,197,24,0.15)' : isPassed ? 'rgba(0,230,118,0.1)' : isNext ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? gold : isPassed ? green : isNext ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                transition: 'all 0.3s',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>
                {isPassed ? '✅' : isActive ? '🚀' : isNext ? '⬆' : '⬜'}
              </span>
              <span style={{ color: isPassed ? green : isActive ? gold : 'rgba(255,255,255,0.6)', fontWeight: isPassed || isActive ? 700 : 400, fontSize: '0.9rem', flex: 1 }}>
                Nivel {i + 1}
              </span>
              <span style={{ color: isActive ? gold : 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 700 }}>
                x{l.multi}
              </span>
              <span style={{ color: 'rgba(255,100,100,0.6)', fontSize: '0.7rem' }}>
                {Math.round(l.risk * 100)}% riesgo
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Acciones */}
      {status === 'idle' && !climbing && (
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {level > 0 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={cashOut}
              style={{
                flex: 1, background: `linear-gradient(135deg,${green},#00c853)`, color: '#000',
                border: 'none', borderRadius: 12, padding: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem',
              }}
            >💰 COBRAR x{currentMulti}</motion.button>
          )}
          {nextLevel && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={climb}
              style={{
                flex: 1, background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000',
                border: 'none', borderRadius: 12, padding: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem',
              }}
            >⬆ SUBIR ({Math.round(nextLevel.risk * 100)}% riesgo)</motion.button>
          )}
        </div>
      )}

      {climbing && (
        <motion.div
          animate={{ y: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 0.4 }}
          style={{ color: gold, fontWeight: 700, letterSpacing: 2 }}
        >SUBIENDO...</motion.div>
      )}
    </div>
  );
}

export default function GalaxyLadder() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('galaxy-ladder', 'Galaxy Ladder');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Galaxy Ladder" icon="🪜"
            description="Sube la escalera. Más alto = más riesgo. Retírate cuando quieras."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', position: 'relative', overflowY: 'auto', maxHeight: '90dvh' }}>
            <LadderGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
