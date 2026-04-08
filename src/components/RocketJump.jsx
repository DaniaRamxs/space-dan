/**
 * RocketJump.jsx
 * Un cohete salta entre plataformas. Cada salto = multiplicador mayor.
 * Puedes retirar o seguir arriesgando. El salto puede fallar.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

// Cada plataforma: multiplicador y probabilidad de fallar ese salto
const PLATFORMS = [
  { label: 'P1', multi: 1.3, fail: 0.20 },
  { label: 'P2', multi: 1.7, fail: 0.25 },
  { label: 'P3', multi: 2.3, fail: 0.30 },
  { label: 'P4', multi: 3.2, fail: 0.35 },
  { label: 'P5', multi: 4.5, fail: 0.40 },
  { label: 'P6', multi: 6.5, fail: 0.45 },
  { label: 'P7', multi: 9.5, fail: 0.50 },
  { label: 'P8', multi: 14.0, fail: 0.55 },
];

function JumpGame({ bet, balance, finishGame }) {
  const [platform, setPlatform] = useState(-1); // -1 = inicio
  const [jumping, setJumping] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | failed | cashed
  const [rocketY, setRocketY] = useState(0);

  const currentMulti = platform >= 0 ? PLATFORMS[platform].multi : 1;
  const nextPlatform = PLATFORMS[platform + 1];

  const jump = useCallback(() => {
    if (!nextPlatform || jumping || status !== 'idle') return;
    setJumping(true);

    // Animate rocket up
    setRocketY(-60);
    setTimeout(() => {
      const failed = Math.random() < nextPlatform.fail;
      setRocketY(0);
      setJumping(false);

      if (failed) {
        setStatus('failed');
        setTimeout(() => finishGame(0, `💥 Falló el salto a ${nextPlatform.label}`), 400);
      } else {
        setPlatform(p => p + 1);
        const newP = platform + 1;
        if (newP >= PLATFORMS.length - 1) {
          setStatus('cashed');
          setTimeout(() => finishGame(PLATFORMS[newP].multi, '🏆 ¡Plataforma máxima!'), 400);
        }
      }
    }, 600);
  }, [nextPlatform, jumping, status, platform, finishGame]);

  const cashOut = useCallback(() => {
    if (platform < 0 || status !== 'idle') return;
    setStatus('cashed');
    finishGame(currentMulti, `✅ Retiraste en ${PLATFORMS[platform].label} con x${currentMulti}`);
  }, [platform, status, currentMulti, finishGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '16px', width: '100%', maxWidth: 380 }}>
      <CasinoHUD balance={balance} bet={bet} />

      <div style={{ marginTop: 52, width: '100%' }}>
        {/* Plataformas (de arriba a abajo) */}
        {[...PLATFORMS].reverse().map((p, ri) => {
          const idx = PLATFORMS.length - 1 - ri;
          const isHere = platform === idx;
          const isPassed = platform > idx;
          const isNext = platform + 1 === idx;

          return (
            <div key={idx} style={{ position: 'relative' }}>
              <motion.div
                animate={{ scale: isHere ? [1, 1.03, 1] : 1 }}
                transition={{ repeat: isHere ? Infinity : 0, duration: 1.2 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                  background: isHere ? 'rgba(245,197,24,0.15)' : isPassed ? 'rgba(0,230,118,0.1)' : isNext ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isHere ? gold : isPassed ? green : isNext ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                {/* Cohete en posición actual */}
                {isHere && (
                  <motion.span animate={{ y: jumping ? rocketY : 0 }} style={{ fontSize: '1.4rem' }}>🚀</motion.span>
                )}
                {!isHere && <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>{isPassed ? '✅' : isNext ? '🎯' : '▫️'}</span>}
                <span style={{ color: isHere ? gold : isPassed ? green : 'rgba(255,255,255,0.55)', fontWeight: isHere || isPassed ? 700 : 400, flex: 1, fontSize: '0.9rem' }}>
                  {p.label}
                </span>
                <span style={{ color: isHere ? gold : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: '0.9rem' }}>x{p.multi}</span>
                <span style={{ color: 'rgba(255,100,100,0.55)', fontSize: '0.7rem' }}>{Math.round(p.fail * 100)}%</span>
              </motion.div>
            </div>
          );
        })}

        {/* Base */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
          background: platform === -1 ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${platform === -1 ? gold : 'rgba(255,255,255,0.04)'}`,
        }}>
          {platform === -1 && <span style={{ fontSize: '1.4rem' }}>🚀</span>}
          {platform !== -1 && <span style={{ fontSize: '1.1rem', opacity: 0.4 }}>🛸</span>}
          <span style={{ color: platform === -1 ? gold : 'rgba(255,255,255,0.3)', flex: 1, fontSize: '0.9rem' }}>BASE</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>x1.0</span>
        </div>
      </div>

      {/* Botones */}
      {status === 'idle' && !jumping && (
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 16 }}>
          {platform >= 0 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={cashOut}
              style={{
                flex: 1, background: `linear-gradient(135deg,${green},#00c853)`, color: '#000',
                border: 'none', borderRadius: 12, padding: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem',
              }}
            >💰 COBRAR x{currentMulti}</motion.button>
          )}
          {nextPlatform && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={jump}
              style={{
                flex: 1, background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000',
                border: 'none', borderRadius: 12, padding: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.85rem',
              }}
            >🚀 SALTAR ({Math.round(nextPlatform.fail * 100)}% fallo)</motion.button>
          )}
        </div>
      )}

      {jumping && <div style={{ color: gold, fontWeight: 700, letterSpacing: 2, marginTop: 12 }}>SALTANDO...</div>}
    </div>
  );
}

export default function RocketJump() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('rocket-jump', 'Rocket Jump');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Rocket Jump" icon="🚀"
            description="Salta entre plataformas. Más alto = más riesgo. Retírate cuando quieras."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', position: 'relative', overflowY: 'auto', maxHeight: '90dvh' }}>
            <JumpGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
