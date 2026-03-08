import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { MobileControls } from './MobileControls';

const CANVAS_W = 340;
const CANVAS_H = 420;
const PLAYER_SZ = 18;
const PLAYER_SPD = 4;
const ENEMY_R = 7;
const MAX_ENEMIES = 18;
const SPAWN_MS = 1500;
const FRAME_MS = 1000 / 60; // cap a 60fps

// Pre-render la grilla una sola vez
function buildGridCanvas() {
  const offscreen = document.createElement('canvas');
  offscreen.width = CANVAS_W;
  offscreen.height = CANVAS_H;
  const ctx = offscreen.getContext('2d');
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < CANVAS_W; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke(); }
  for (let i = 0; i < CANVAS_H; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke(); }
  return offscreen;
}
let gridCanvas = null;

function spawnEnemy(px, py, score) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * CANVAS_W; y = -ENEMY_R; }
  else if (edge === 1) { x = CANVAS_W + ENEMY_R; y = Math.random() * CANVAS_H; }
  else if (edge === 2) { x = Math.random() * CANVAS_W; y = CANVAS_H + ENEMY_R; }
  else { x = -ENEMY_R; y = Math.random() * CANVAS_H; }

  const speed = 1.0 + score * 0.05;
  const dx = px - x;
  const dy = py - y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x, y, vx: (dx / dist) * speed, vy: (dy / dist) * speed, trail: [] };
}

function DodgeGameInner() {
  const [best, saveScore] = useHighScore('dodge');
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('PLAYING');
  const [seconds, setSeconds] = useState(0);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const stateRef = useRef({
    px: CANVAS_W / 2, py: CANVAS_H / 2,
    enemies: [], keys: {}, score: 0,
    lastSpawn: 0, lastTick: 0
  });
  const lastFrameRef = useRef(0);

  const collides = (e, px, py) => {
    const nearX = Math.max(px - PLAYER_SZ / 2, Math.min(e.x, px + PLAYER_SZ / 2));
    const nearY = Math.max(py - PLAYER_SZ / 2, Math.min(e.y, py + PLAYER_SZ / 2));
    const dx = e.x - nearX;
    const dy = e.y - nearY;
    return dx * dx + dy * dy < ENEMY_R * ENEMY_R;
  };

  const draw = useCallback((ctx, s) => {
    // Trail effect
    ctx.fillStyle = 'rgba(5, 5, 8, 0.2)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grilla pre-cacheada (sin recalcular cada frame)
    if (!gridCanvas) gridCanvas = buildGridCanvas();
    ctx.drawImage(gridCanvas, 0, 0);

    if (status === 'PLAYING') {
      // Player (sin shadowBlur)
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.roundRect(s.px - PLAYER_SZ / 2, s.py - PLAYER_SZ / 2, PLAYER_SZ, PLAYER_SZ, 4);
      ctx.fill();

      // Enemies (sin shadowBlur)
      ctx.fillStyle = '#00e5ff';
      s.enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, ENEMY_R, 0, Math.PI * 2);
        ctx.fill();

        // Subtle trail lines
        if (e.trail.length > 2) {
          ctx.beginPath();
          ctx.moveTo(e.trail[0].x, e.trail[0].y);
          e.trail.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
          ctx.stroke();
        }
      });
    }
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const loop = (now) => {
      animId = requestAnimationFrame(loop);
      // Cap a 60fps
      if (now - lastFrameRef.current < FRAME_MS) return;
      lastFrameRef.current = now;

      const s = stateRef.current;
      if (status === 'PLAYING') {
        // Player Movement
        if (s.keys['ArrowUp'] || s.keys['w']) s.py = Math.max(PLAYER_SZ / 2, s.py - PLAYER_SPD);
        if (s.keys['ArrowDown'] || s.keys['s']) s.py = Math.min(CANVAS_H - PLAYER_SZ / 2, s.py + PLAYER_SPD);
        if (s.keys['ArrowLeft'] || s.keys['a']) s.px = Math.max(PLAYER_SZ / 2, s.px - PLAYER_SPD);
        if (s.keys['ArrowRight'] || s.keys['d']) s.px = Math.min(CANVAS_W - PLAYER_SZ / 2, s.px + PLAYER_SPD);

        // Score
        if (now - s.lastTick >= 1000) {
          s.score += 1;
          setSeconds(s.score);
          s.lastTick = now;
          animateScore();
        }

        // Spawn
        if (now - s.lastSpawn >= SPAWN_MS && s.enemies.length < MAX_ENEMIES) {
          s.enemies.push(spawnEnemy(s.px, s.py, s.score));
          s.lastSpawn = now;
        }

        // Enemy AI & Trails
        s.enemies.forEach(e => {
          const dx = s.px - e.x, dy = s.py - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
          e.vx = (dx / dist) * speed; e.vy = (dy / dist) * speed;
          e.x += e.vx; e.y += e.vy;

          e.trail.push({ x: e.x, y: e.y });
          if (e.trail.length > 8) e.trail.shift();

          // Collision
          if (collides(e, s.px, s.py)) {
            setStatus('DEAD');
            saveScore(s.score);
            triggerHaptic('heavy');
            spawnParticles(s.px, s.py, '#ff00ff', 40);
            triggerFloatingText(`SOBREVIVISTE ${s.score}s`, '50%', '40%', '#ff00ff');
          }
        });
      }
      draw(ctx, s);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [status, draw, animateScore, saveScore, triggerHaptic, spawnParticles, triggerFloatingText]);

  // Keys
  useEffect(() => {
    const down = (e) => { stateRef.current.keys[e.key] = true; };
    const up = (e) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const dpad = (k, val) => { stateRef.current.keys[k] = val; };

  const restart = () => {
    stateRef.current = { px: CANVAS_W / 2, py: CANVAS_H / 2, enemies: [], keys: {}, score: 0, lastSpawn: 0, lastTick: 0 };
    setSeconds(0);
    setStatus('PLAYING');
    triggerHaptic('medium');
  };

  return (
    <ArcadeShell
      title="Galaxy Dodge"
      score={seconds}
      bestScore={best}
      status={status === 'DEAD' ? 'DEAD' : 'PLAYING'}
      onRetry={restart}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Esquiva los drones de rastreo en el sector prohibido."
      gameId="dodge"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center' }}>
        <div style={{
          position: 'relative',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
          background: 'rgba(4,4,10,0.9)',
          backdropFilter: 'blur(8px)',
        }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'block' }} />
        </div>

        <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(3, 54px)', gap: 12 }}>
          <div />
          <DpadBtn icon="▲" onDown={() => dpad('w', true)} onUp={() => dpad('w', false)} />
          <div />
          <DpadBtn icon="◀" onDown={() => dpad('a', true)} onUp={() => dpad('a', false)} />
          <DpadBtn icon="▼" onDown={() => dpad('s', true)} onUp={() => dpad('s', false)} />
          <DpadBtn icon="▶" onDown={() => dpad('d', true)} onUp={() => dpad('d', false)} />
        </div>

        <MobileControls
          showLeft showRight showUp showDown
          onLeft={() => dpad('a', true)}
          onLeftUp={() => dpad('a', false)}
          onRight={() => dpad('d', true)}
          onRightUp={() => dpad('d', false)}
          onUp={() => dpad('w', true)}
          onUpUp={() => dpad('w', false)}
          onDown={() => dpad('s', true)}
          onDownUp={() => dpad('s', false)}
        />
      </div>
    </ArcadeShell>
  );
}

function DpadBtn({ icon, onDown, onUp }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onUp}
      style={{
        width: 54, height: 54, background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
        color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      {icon}
    </motion.button>
  );
}

export default function DodgeGame() {
  return (
    <GameImmersiveLayout>
      <DodgeGameInner />
    </GameImmersiveLayout>
  );
}
