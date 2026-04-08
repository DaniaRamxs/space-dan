/**
 * AlienInvasion.jsx
 * Golpea aliens en 20s. Cada alien da multiplicador.
 * Golpear un civil (👨‍🚀) rompe el combo y termina.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { useCasinoBet } from '../hooks/useCasinoBet';
import { BettingScreen, ResultScreen, CasinoHUD } from './CasinoBetUI';

const GRID_SIZE = 12;
const GAME_DURATION = 20;
const gold = '#f5c518';
const green = '#00e676';
const red = '#ff1744';

// Multis acumulados por aliens
const MULTI_PER_ALIEN = 0.15; // +0.15x por alien
const CIVIL_CHANCE = 0.2; // 20% de chances que sea civil

function AlienGame({ bet, balance, finishGame }) {
  const [cells, setCells] = useState(() => Array(GRID_SIZE).fill(null));
  const [score, setScore] = useState(0);
  const [multi, setMulti] = useState(1.0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [hitEffect, setHitEffect] = useState(null);
  const intervalRef = useRef(null);
  const spawnRef = useRef(null);
  const scoreRef = useRef(0);
  const multiRef = useRef(1.0);
  const doneRef = useRef(false);

  const endGame = useCallback((reason) => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(intervalRef.current);
    clearInterval(spawnRef.current);
    setRunning(false);
    setGameOver(true);
    const m = multiRef.current;
    setTimeout(() => finishGame(m > 1 ? m : 0, reason), 600);
  }, [finishGame]);

  const start = useCallback(() => {
    doneRef.current = false;
    scoreRef.current = 0;
    multiRef.current = 1.0;
    setRunning(true);
    setScore(0);
    setMulti(1.0);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setCells(Array(GRID_SIZE).fill(null));

    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame(`⏰ Tiempo! Golpeaste ${scoreRef.current} aliens`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    spawnRef.current = setInterval(() => {
      setCells(prev => {
        const next = [...prev];
        // Clear old entries
        next.forEach((v, i) => { if (v) next[i] = null; });
        // Spawn 2-3 new
        const count = 2 + Math.floor(Math.random() * 2);
        const indices = [];
        while (indices.length < count) {
          const idx = Math.floor(Math.random() * GRID_SIZE);
          if (!indices.includes(idx)) indices.push(idx);
        }
        indices.forEach(idx => {
          next[idx] = Math.random() < CIVIL_CHANCE ? 'civil' : 'alien';
        });
        return next;
      });
    }, 900);
  }, [endGame]);

  useEffect(() => () => {
    clearInterval(intervalRef.current);
    clearInterval(spawnRef.current);
  }, []);

  const hit = useCallback((i) => {
    if (!running || !cells[i]) return;
    const type = cells[i];
    setCells(prev => {
      const next = [...prev];
      next[i] = null;
      return next;
    });

    if (type === 'civil') {
      setHitEffect({ i, type: 'civil' });
      setTimeout(() => setHitEffect(null), 600);
      endGame('👨‍🚀 ¡Golpeaste a un civil! Ronda terminada');
    } else {
      scoreRef.current += 1;
      multiRef.current = +(multiRef.current + MULTI_PER_ALIEN).toFixed(2);
      setScore(scoreRef.current);
      setMulti(multiRef.current);
      setHitEffect({ i, type: 'alien' });
      setTimeout(() => setHitEffect(null), 300);
    }
  }, [running, cells, endGame]);

  const timerPct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px', width: '100%' }}>
      <CasinoHUD balance={balance} bet={bet} label="MULTI" />

      {!running && !gameOver ? (
        <div style={{ marginTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64 }}>👾</div>
            <h2 style={{ color: gold, margin: '8px 0 4px' }}>ALIEN INVASION</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
              Golpea aliens 👾 · Evita civiles 👨‍🚀<br />Cada alien = +0.15x multiplicador
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={start}
            style={{
              background: `linear-gradient(135deg,${gold},#e6a800)`, color: '#000',
              border: 'none', borderRadius: 14, padding: '14px 48px',
              fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
            }}
          >COMENZAR INVASIÓN</motion.button>
        </div>
      ) : (
        <>
          {/* HUD del juego */}
          <div style={{ marginTop: 52, width: '100%' }}>
            {/* Timer bar */}
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <motion.div
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 1, ease: 'linear' }}
                style={{ height: '100%', background: timerPct > 30 ? green : red, borderRadius: 3 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>ALIENS</div>
                <div style={{ color: '#fff', fontWeight: 900 }}>{score}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>TIEMPO</div>
                <div style={{ color: timeLeft <= 5 ? red : '#fff', fontWeight: 900 }}>{timeLeft}s</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>MULTI</div>
                <div style={{ color: gold, fontWeight: 900 }}>x{multi.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%', maxWidth: 340 }}>
            {cells.map((cell, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={() => hit(i)}
                animate={{
                  scale: hitEffect?.i === i ? [1, 1.3, 0.8, 1] : 1,
                  background: hitEffect?.i === i
                    ? (hitEffect.type === 'alien' ? [green, 'rgba(255,255,255,0.05)'] : [red, 'rgba(255,255,255,0.05)'])
                    : 'rgba(255,255,255,0.05)',
                }}
                style={{
                  aspectRatio: '1', borderRadius: 12, border: `1px solid rgba(255,255,255,${cell ? 0.2 : 0.06})`,
                  cursor: cell ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem',
                  transition: 'background 0.15s',
                }}
              >
                {cell === 'alien' ? '👾' : cell === 'civil' ? '👨‍🚀' : ''}
              </motion.button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AlienInvasion() {
  const { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading } = useCasinoBet('alien-invasion', 'Alien Invasion');

  return (
    <GameImmersiveLayout>
      <AnimatePresence mode="wait">
        {phase === 'betting' && (
          <BettingScreen key="bet" bet={bet} setBet={setBet} balance={balance}
            onPlay={placeBet} isLoading={isLoading}
            title="Alien Invasion" icon="👾"
            description="Golpea aliens en 20s. Evita civiles. Cada alien suma multiplicador."
          />
        )}
        {phase === 'playing' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
            <AlienGame bet={bet} balance={balance} finishGame={finishGame} />
          </motion.div>
        )}
        {phase === 'result' && (
          <ResultScreen key="result" result={result} bet={bet} onPlayAgain={reset} onClose={() => window.history.back()} />
        )}
      </AnimatePresence>
    </GameImmersiveLayout>
  );
}
