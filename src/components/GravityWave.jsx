/**
 * GravityWave.jsx — Ola sinusoidal. Toca en el pico para ganar más.
 * Pico = x5 | Cerca = x2 | Mediano = x1.3 | Lejos = x0
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

const W = 300;
const H = 120;
const SPEED = 0.04; // radians per tick

function getMulti(sinVal) {
  // sinVal in [-1, 1], 1 = pico
  if (sinVal >= 0.85) return { multi: 5, label: '🎯 PICO PERFECTO', color: gold };
  if (sinVal >= 0.55) return { multi: 2, label: '✅ Cerca del pico', color: green };
  if (sinVal >= 0.15) return { multi: 1.3, label: '👍 Zona media', color: '#00bcd4' };
  return { multi: 0, label: '❌ Demasiado lejos', color: red };
}

function WaveCanvas({ phase, tapSin }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Draw wave
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(245,197,24,0.6)';
    ctx.lineWidth = 2.5;
    for (let x = 0; x <= W; x++) {
      const angle = phase + (x / W) * Math.PI * 4;
      const y = H / 2 - Math.sin(angle) * (H / 2 - 10);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw ball
    const ballAngle = phase;
    const ballY = H / 2 - Math.sin(ballAngle) * (H / 2 - 10);
    const ballX = W / 2;

    // Glow
    const gradient = ctx.createRadialGradient(ballX, ballY, 0, ballX, ballY, 16);
    gradient.addColorStop(0, 'rgba(245,197,24,0.8)');
    gradient.addColorStop(1, 'rgba(245,197,24,0)');
    ctx.beginPath();
    ctx.arc(ballX, ballY, 16, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Ball core
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();

    // Peak zone indicator (top band)
    ctx.fillStyle = 'rgba(245,197,24,0.08)';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = 'rgba(245,197,24,0.4)';
    ctx.font = '9px monospace';
    ctx.fillText('ZONA PICO  x5', 8, 12);

    // Tap indicator line
    if (tapSin !== null) {
      const tapY = H / 2 - tapSin * (H / 2 - 10);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, tapY);
      ctx.lineTo(W, tapY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [phase, tapSin]);

  return <canvas ref={canvasRef} width={W} height={H} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }} />;
}

function WaveGame({ bet, balance, finishGame }) {
  const [phase, setPhase] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [tapSin, setTapSin] = useState(null);
  const [tapResult, setTapResult] = useState(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (tapped) return;
    let last = null;
    const tick = (ts) => {
      if (last !== null) {
        const dt = Math.min(ts - last, 50);
        phaseRef.current += SPEED * (dt / 16);
      }
      last = ts;
      setPhase(phaseRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tapped]);

  const tap = useCallback(() => {
    if (tapped) return;
    setTapped(true);
    cancelAnimationFrame(rafRef.current);
    const sv = Math.sin(phaseRef.current);
    setTapSin(sv);
    const result = getMulti(sv);
    setTapResult(result);
    setTimeout(() => finishGame(result.multi, result.label), 1000);
  }, [tapped, finishGame]);

  const currentSin = Math.sin(phase);
  const ballY_pct = 1 - (currentSin + 1) / 2; // 0=bottom, 1=top

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '20px 16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} />
      <div style={{ marginTop: 56, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🌊</div>
        <h2 style={{ color: gold, fontWeight: 900, margin: '8px 0 4px' }}>GRAVITY WAVE</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>Toca cuando la bola esté en el pico para x5</p>
      </div>

      <WaveCanvas phase={phase} tapSin={tapSin} />

      {/* Live multiplier preview */}
      {!tapped && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', letterSpacing: 2 }}>POSICIÓN ACTUAL</div>
          <div style={{ color: getMulti(currentSin).color, fontSize: '1.4rem', fontWeight: 900, transition: 'color 0.1s' }}>
            {getMulti(currentSin).multi > 0 ? `x${getMulti(currentSin).multi}` : '❌ ZONA BAJA'}
          </div>
        </div>
      )}

      {tapResult && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ color: tapResult.color, fontSize: '1.3rem', fontWeight: 900, textAlign: 'center' }}
        >
          {tapResult.label}
          {tapResult.multi > 0 && <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>x{tapResult.multi}</div>}
        </motion.div>
      )}

      {!tapped && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={tap}
          style={{
            background: `linear-gradient(135deg,${gold},#e6a800)`,
            color: '#000', border: 'none', borderRadius: 14,
            padding: '18px 64px', fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer',
            boxShadow: `0 0 32px rgba(245,197,24,0.4)`,
          }}
        >
          🌊 ¡TOCAR!
        </motion.button>
      )}

      {/* Payouts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', opacity: 0.5 }}>
        {[{ label: '🎯 Pico', val: 'x5' }, { label: '✅ Cerca', val: 'x2' }, { label: '👍 Medio', val: 'x1.3' }, { label: '❌ Bajo', val: 'x0' }].map(p => (
          <span key={p.label} style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.07)', color: '#fff' }}>
            {p.label} → {p.val}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function GravityWave() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP } = useCasinoBet('gravity-wave', 'Gravity Wave');
  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance} onPlay={placeBet} isLoading={isLoading} isVIP={isVIP} title="Gravity Wave" icon="🌊" description="Ola sinusoidal. Toca en el pico para x5. Timing lo es todo." />}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <WaveGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
