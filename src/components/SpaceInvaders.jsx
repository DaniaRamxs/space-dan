import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import useHighScore from '../hooks/useHighScore';

const W = 400;
const H = 500;
const COLORS = {
  bg: 'transparent',
  cyan: '#00e5ff',
  magenta: '#ff00ff',
  white: '#ffffff',
  shield: '#00ff88',
  dim: 'rgba(255,255,255,0.05)'
};

const INVADER_ROWS = 5;
const INVADER_COLS = 8;
const INVADER_W = 28;
const INVADER_H = 24;
const INVADER_PAD = 12;

const SHIP_W = 32;
const SHIP_H = 18;
const SHIP_Y = H - 40;

const BULLET_W = 3;
const BULLET_H = 12;

const SHIELDS = 4;
const SHIELD_Y = H - 100;
const SHIELD_W = 50;
const SHIELD_H = 30;

function makeInvaders(level) {
  const invaders = [];
  for (let r = 0; r < INVADER_ROWS; r++) {
    for (let c = 0; c < INVADER_COLS; c++) {
      invaders.push({
        r, c,
        x: 40 + c * (INVADER_W + INVADER_PAD),
        y: 60 + r * (INVADER_H + INVADER_PAD),
        alive: true,
        type: r === 0 ? '👾' : (r < 3 ? '🛸' : '👽')
      });
    }
  }
  return invaders;
}

function makeShields() {
  const s = [];
  const startX = (W - (SHIELDS * SHIELD_W + (SHIELDS - 1) * 30)) / 2;
  for (let i = 0; i < SHIELDS; i++) {
    s.push({
      x: startX + i * (SHIELD_W + 30),
      y: SHIELD_Y,
      hp: 12
    });
  }
  return s;
}

function SpaceInvadersInner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const frameRef = useRef(0);

  const [best, saveScore] = useHighScore('spaceinvaders');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  function makeState() {
    return {
      phase: 'PLAYING',
      shipX: W / 2 - SHIP_W / 2,
      invaders: makeInvaders(1),
      shields: makeShields(),
      bullets: [],
      enemyBullets: [],
      lives: 3,
      score: 0,
      level: 1,
      invaderDir: 1,
      invaderStep: 10,
      invaderDown: false,
      lastShot: 0,
      lastEnemyShot: 0,
    };
  }

  const drawShip = useCallback((ctx, x, y) => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.cyan;
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.moveTo(x + SHIP_W / 2, y);
    ctx.lineTo(x + SHIP_W, y + SHIP_H);
    ctx.lineTo(x, y + SHIP_H);
    ctx.closePath();
    ctx.fill();

    // Glowing cockpit
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.white + '66';
    ctx.fillRect(x + SHIP_W / 2 - 2, y + 4, 4, 6);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;

    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shields (Glassmorphism look)
    for (const sh of s.shields) {
      if (sh.hp <= 0) continue;
      const alpha = sh.hp / 12;
      ctx.fillStyle = COLORS.shield + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.shadowBlur = 10 * alpha;
      ctx.shadowColor = COLORS.shield;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sh.x, sh.y, SHIELD_W, SHIELD_H, 6);
      else ctx.rect(sh.x, sh.y, SHIELD_W, SHIELD_H);
      ctx.fill();

      // HP bar
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(sh.x, sh.y + SHIELD_H - 4, SHIELD_W * alpha, 4);
    }

    // Invaders with premium glow
    ctx.font = `${INVADER_W}px serif`;
    ctx.shadowBlur = 12;
    for (const inv of s.invaders) {
      if (!inv.alive) continue;
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.fillText(inv.type, inv.x + INVADER_W / 2, inv.y + INVADER_H / 2);
    }
    ctx.shadowBlur = 0;

    // Ship
    drawShip(ctx, s.shipX, SHIP_Y);

    // Bullets (Player)
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLORS.cyan;
    for (const b of s.bullets) {
      ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);
    }

    // Bullets (Enemies)
    ctx.fillStyle = COLORS.magenta;
    ctx.shadowColor = COLORS.magenta;
    for (const b of s.enemyBullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [drawShip]);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    frameRef.current++;

    if (s.phase !== 'PLAYING') {
      draw();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Movement
    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) s.shipX = Math.max(0, s.shipX - 5);
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) s.shipX = Math.min(W - SHIP_W, s.shipX + 5);

    // Shooting
    if ((keysRef.current[' '] || keysRef.current['Shoot']) && frameRef.current - s.lastShot > 30) {
      s.bullets.push({ x: s.shipX + SHIP_W / 2, y: SHIP_Y - BULLET_H });
      s.lastShot = frameRef.current;
      keysRef.current['Shoot'] = false;
      triggerHaptic('light');
    }

    // Bullets (Player)
    s.bullets = s.bullets.filter(b => {
      b.y -= 8;
      // Shield hit
      for (const sh of s.shields) {
        if (sh.hp > 0 && b.x > sh.x && b.x < sh.x + SHIELD_W && b.y > sh.y && b.y < sh.y + SHIELD_H) {
          sh.hp--;
          triggerHaptic('light');
          spawnParticles(`${(b.x / W) * 100}%`, `${(b.y / H) * 100}%`, COLORS.shield, 6);
          return false;
        }
      }
      // Invader hit
      for (const inv of s.invaders) {
        if (inv.alive && b.x > inv.x && b.x < inv.x + INVADER_W && b.y > inv.y && b.y < inv.y + INVADER_H) {
          inv.alive = false;
          s.score += 20 * (5 - inv.r);
          setScore(s.score);
          animateScore();
          triggerHaptic('medium');
          spawnParticles(`${(inv.x / W) * 100}%`, `${(inv.y / H) * 100}%`, COLORS.magenta, 12);
          triggerFloatingText(`+${20 * (5 - inv.r)}`, `${(inv.x / W) * 100}%`, `${(inv.y / H) * 100}%`, COLORS.magenta);
          return false;
        }
      }
      return b.y > 0;
    });

    // Invader movement
    const aliveCount = s.invaders.filter(v => v.alive).length;
    const speed = Math.max(2, Math.floor(aliveCount / 4));
    if (frameRef.current % speed === 0) {
      let hitSide = false;
      for (const inv of s.invaders) {
        if (!inv.alive) continue;
        if (s.invaderDir === 1 && inv.x + INVADER_W + 10 >= W) hitSide = true;
        if (s.invaderDir === -1 && inv.x - 10 <= 0) hitSide = true;
      }

      if (hitSide) {
        s.invaderDir *= -1;
        for (const inv of s.invaders) inv.y += 12;
      } else {
        for (const inv of s.invaders) inv.x += 10 * s.invaderDir;
      }
    }

    // Enemy shooting
    if (frameRef.current - s.lastEnemyShot > Math.max(20, 100 - s.level * 10)) {
      const aliveOnes = s.invaders.filter(v => v.alive);
      if (aliveOnes.length > 0) {
        const shooter = aliveOnes[Math.floor(Math.random() * aliveOnes.length)];
        s.enemyBullets.push({ x: shooter.x + INVADER_W / 2, y: shooter.y + INVADER_H });
        s.lastEnemyShot = frameRef.current;
      }
    }

    // Enemy bullets
    s.enemyBullets = s.enemyBullets.filter(b => {
      b.y += 3 + s.level * 0.5;
      // Shield hit
      for (const sh of s.shields) {
        if (sh.hp > 0 && b.x > sh.x && b.x < sh.x + SHIELD_W && b.y > sh.y && b.y < sh.y + SHIELD_H) {
          sh.hp--;
          triggerHaptic('light');
          spawnParticles(`${(b.x / W) * 100}%`, `${(b.y / H) * 100}%`, COLORS.shield, 6);
          return false;
        }
      }
      // Ship hit
      if (b.x > s.shipX && b.x < s.shipX + SHIP_W && b.y > SHIP_Y && b.y < SHIP_Y + SHIP_H) {
        s.lives--;
        triggerHaptic('heavy');
        spawnParticles(`${(b.x / W) * 100}%`, `${(b.y / H) * 100}%`, COLORS.cyan, 20);
        triggerFloatingText('¡IMPACTO!', '50%', '40%', COLORS.cyan);
        if (s.lives <= 0) {
          s.phase = 'DEAD';
          setStatus('DEAD');
          saveScore(s.score);
          draw();
          return;
        }
        return false;
      }
      return b.y < H;
    });

    // Check Win
    if (aliveCount === 0) {
      s.level++;
      s.invaders = makeInvaders(s.level);
      s.shields = makeShields();
      s.bullets = [];
      s.enemyBullets = [];
      triggerFloatingText(`SISTEMA DESPEJADO - NIVEL ${s.level}`, '50%', '40%', COLORS.cyan);
      animateScore();
      triggerHaptic('medium');
    }

    // Check Loss (invasion)
    for (const inv of s.invaders) {
      if (inv.alive && inv.y + INVADER_H >= SHIP_Y) {
        s.phase = 'DEAD';
        setStatus('DEAD');
        saveScore(s.score);
        return;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, spawnParticles, triggerFloatingText, animateScore, triggerHaptic, saveScore]);

  const start = useCallback(() => {
    stateRef.current = makeState();
    setScore(0);
    setStatus('PLAYING');
    frameRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    triggerHaptic('medium');
  }, [tick, triggerHaptic]);

  useEffect(() => {
    stateRef.current = makeState();
    setStatus('IDLE');
    stateRef.current.phase = 'IDLE';
    draw();

    const onKey = (e) => {
      keysRef.current[e.key] = e.type === 'keydown';
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [draw]);

  return (
    <ArcadeShell
      title="Space Invaders"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Repele la invasión alienígena."
    >
      <div style={{ position: 'relative', width: 'min(50vh, 84vw)', aspectRatio: `${W}/${H}`, background: 'rgba(4,4,10,0.8)', borderRadius: 20, padding: 6, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={() => status !== 'PLAYING' && start()}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            touchAction: 'none',
          }}
        />
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <ControlBtn icon="◀" onDown={() => keysRef.current['ArrowLeft'] = true} onUp={() => keysRef.current['ArrowLeft'] = false} />
          <ControlBtn icon="▶" onDown={() => keysRef.current['ArrowRight'] = true} onUp={() => keysRef.current['ArrowRight'] = false} />
        </div>
        <ControlBtn icon="SHOOT" color={COLORS.magenta} onDown={() => keysRef.current['Shoot'] = true} onUp={() => keysRef.current['Shoot'] = false} />
      </div>

      <div style={{
        marginTop: 20,
        display: 'flex',
        gap: 32,
        fontSize: '0.75rem',
        fontWeight: 800,
        color: 'rgba(255, 255, 255, 0.3)',
        textTransform: 'uppercase',
        letterSpacing: 2
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>VIDAS</span>
          <span style={{ color: COLORS.cyan, fontSize: '1rem' }}>{stateRef.current?.lives || 0}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>NIVEL</span>
          <span style={{ color: COLORS.magenta, fontSize: '1rem' }}>{stateRef.current?.level || 1}</span>
        </div>
      </div>
    </ArcadeShell>
  );
}

function ControlBtn({ icon, onDown, onUp, color = '#00e5ff' }) {
  return (
    <motion.button
      onPointerDown={e => { e.preventDefault(); onDown(); }}
      onPointerUp={e => { e.preventDefault(); onUp(); }}
      onPointerLeave={() => onUp()}
      whileTap={{ scale: 0.87, backgroundColor: 'rgba(255,255,255,0.08)' }}
      style={{
        width: 60, height: 60, borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.04)',
        color, fontSize: icon === 'SHOOT' ? 11 : 22,
        fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        userSelect: 'none', touchAction: 'none',
      }}
    >
      {icon}
    </motion.button>
  );
}

export default function SpaceInvaders() {
  return (
    <GameImmersiveLayout>
      <SpaceInvadersInner />
    </GameImmersiveLayout>
  );
}
