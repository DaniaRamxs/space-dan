import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import useHighScore from '../hooks/useHighScore';

const W = 400;
const H = 400;
const COLORS = {
  bg: 'transparent',
  cyan: '#00e5ff',
  magenta: '#ff00ff',
  white: '#ffffff',
  dim: 'rgba(255,255,255,0.15)',
  yellow: '#ffee00'
};

const SHIP_SIZE = 14;
const BULLET_SPEED = 8;
const BULLET_LIFE = 55;
const THRUST = 0.2;
const MAX_SPEED = 8;
const FRICTION = 0.985;
const ROT_SPEED = 0.07;
const INVINCIBLE_FRAMES = 120;

const ASTEROID_SIZES = { large: 40, medium: 22, small: 12 };

function makeAsteroid(x, y, size, level) {
  const numVerts = 8 + Math.floor(Math.random() * 4);
  const verts = [];
  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2;
    const r = ASTEROID_SIZES[size] * (0.7 + Math.random() * 0.4);
    verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  const speed = (0.6 + Math.random() * 1.2) * (1 + level * 0.1);
  const angle = Math.random() * Math.PI * 2;
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.05,
    verts,
    size,
    alive: true,
  };
}

function spawnAsteroids(count, level) {
  const asteroids = [];
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = Math.random() * W;
      y = Math.random() * H;
    } while (Math.hypot(x - W / 2, y - H / 2) < 100);
    asteroids.push(makeAsteroid(x, y, 'large', level));
  }
  return asteroids;
}

function AsteroidsInner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const frameRef = useRef(0);

  const [best, saveScore] = useHighScore('asteroids');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  function makeState() {
    return {
      phase: 'PLAYING',
      ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, alive: true, invincible: INVINCIBLE_FRAMES },
      bullets: [],
      asteroids: spawnAsteroids(4, 1),
      particles: [],
      thrustParticles: [],
      lives: 3,
      score: 0,
      level: 1,
      lastShot: 0,
    };
  }

  const drawPolygon = useCallback((ctx, verts, x, y, angle, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.stroke();

    // Inner fill for glassmorphism effect
    ctx.fillStyle = color + '11';
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }, []);

  const drawShip = useCallback((ctx, ship) => {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
    ctx.lineTo(-SHIP_SIZE * 0.4, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
    ctx.closePath();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = COLORS.white + '33';
    ctx.fillRect(-2, -2, 4, 4);

    ctx.restore();
    ctx.shadowBlur = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // Thrust particles
    for (const p of s.thrustParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Internal game particles
    for (const p of s.particles) {
      ctx.globalAlpha = p.life;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Asteroids
    for (const ast of s.asteroids) {
      if (!ast.alive) continue;
      drawPolygon(ctx, ast.verts, ast.x, ast.y, ast.rot, COLORS.magenta);
    }

    // Bullets
    ctx.strokeStyle = COLORS.yellow;
    ctx.shadowColor = COLORS.yellow;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    for (const b of s.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.globalCompositeOperation = 'source-over';

    // Ship
    if (s.ship.alive) {
      if (s.ship.invincible <= 0 || frameRef.current % 10 < 5) {
        drawShip(ctx, s.ship);
      }
    }
  }, [drawShip, drawPolygon]);

  const internalExplosion = useCallback((x, y, color, count = 10) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        color,
      });
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    frameRef.current++;

    if (s.phase !== 'PLAYING') {
      draw();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ship = s.ship;
    const keys = keysRef.current;

    if (keys['ArrowLeft'] || keys['a']) ship.angle -= ROT_SPEED;
    if (keys['ArrowRight'] || keys['d']) ship.angle += ROT_SPEED;

    if ((keys['ArrowUp'] || keys['w']) && ship.alive) {
      ship.vx += Math.cos(ship.angle) * THRUST;
      ship.vy += Math.sin(ship.angle) * THRUST;
      const spd = Math.hypot(ship.vx, ship.vy);
      if (spd > MAX_SPEED) { ship.vx = (ship.vx / spd) * MAX_SPEED; ship.vy = (ship.vy / spd) * MAX_SPEED; }

      if (frameRef.current % 3 === 0) {
        const rearAngle = ship.angle + Math.PI;
        s.thrustParticles.push({
          x: ship.x + Math.cos(rearAngle) * SHIP_SIZE * 0.5,
          y: ship.y + Math.sin(rearAngle) * SHIP_SIZE * 0.5,
          vx: Math.cos(rearAngle + (Math.random() - 0.5) * 0.5) * 2,
          vy: Math.sin(rearAngle + (Math.random() - 0.5) * 0.5) * 2,
          life: 1,
          decay: 0.08 + Math.random() * 0.06,
          color: Math.random() < 0.5 ? '#ff8800' : COLORS.yellow,
          r: 1 + Math.random() * 2,
        });
      }
    }

    ship.vx *= FRICTION;
    ship.vy *= FRICTION;

    if (ship.alive) {
      ship.x = (ship.x + ship.vx + W) % W;
      ship.y = (ship.y + ship.vy + H) % H;
    }

    if (ship.invincible > 0) ship.invincible--;

    if ((keys[' '] || keys['Shoot']) && ship.alive && frameRef.current - s.lastShot > 15) {
      s.bullets.push({
        x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
        y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
        vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx,
        vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy,
        life: BULLET_LIFE,
      });
      s.lastShot = frameRef.current;
      keysRef.current['Shoot'] = false;
      triggerHaptic('light');
    }

    s.bullets = s.bullets.filter(b => {
      b.x = (b.x + b.vx + W) % W;
      b.y = (b.y + b.vy + H) % H;
      b.life--;
      return b.life > 0;
    });

    for (const ast of s.asteroids) {
      if (!ast.alive) continue;
      ast.x = (ast.x + ast.vx + W) % W;
      ast.y = (ast.y + ast.vy + H) % H;
      ast.rot += ast.rotSpeed;
    }

    // Collisions
    for (const b of s.bullets) {
      if (b.life <= 0) continue;
      for (const ast of s.asteroids) {
        if (!ast.alive) continue;
        const radius = ASTEROID_SIZES[ast.size];
        if (Math.hypot(b.x - ast.x, b.y - ast.y) < radius) {
          ast.alive = false;
          b.life = 0;
          internalExplosion(ast.x, ast.y, COLORS.magenta, 12);
          spawnParticles(`${(ast.x / W) * 100}%`, `${(ast.y / H) * 100}%`, COLORS.magenta, 15);

          const pts = { large: 25, medium: 50, small: 100 }[ast.size];
          s.score += pts;
          setScore(s.score);
          animateScore();
          triggerFloatingText(`+${pts}`, `${(ast.x / W) * 100}%`, `${(ast.y / H) * 100}%`, COLORS.magenta);
          triggerHaptic('medium');

          if (ast.size === 'large') {
            for (let i = 0; i < 2; i++) s.asteroids.push(makeAsteroid(ast.x, ast.y, 'medium', s.level));
          } else if (ast.size === 'medium') {
            for (let i = 0; i < 2; i++) s.asteroids.push(makeAsteroid(ast.x, ast.y, 'small', s.level));
          }
          break;
        }
      }
    }

    if (ship.alive && ship.invincible <= 0) {
      for (const ast of s.asteroids) {
        if (!ast.alive) continue;
        const radius = ASTEROID_SIZES[ast.size] * 0.8;
        if (Math.hypot(ship.x - ast.x, ship.y - ast.y) < radius + SHIP_SIZE * 0.6) {
          internalExplosion(ship.x, ship.y, COLORS.cyan, 25);
          spawnParticles(`${(ship.x / W) * 100}%`, `${(ship.y / H) * 100}%`, COLORS.cyan, 40);
          triggerHaptic('heavy');
          triggerFloatingText('¡IMPACTO!', '50%', '40%', COLORS.cyan);
          s.lives--;
          if (s.lives <= 0) {
            ship.alive = false;
            s.phase = 'DEAD';
            setStatus('DEAD');
            saveScore(s.score);
            draw();
            return;
          }
          ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0;
          ship.angle = -Math.PI / 2; ship.invincible = INVINCIBLE_FRAMES;
          break;
        }
      }
    }

    if (s.asteroids.filter(a => a.alive).length === 0) {
      s.level++;
      s.asteroids = spawnAsteroids(Math.min(4 + s.level, 10), s.level);
      ship.invincible = INVINCIBLE_FRAMES;
      triggerFloatingText(`SISTEMA DESPEJADO - NIVEL ${s.level}`, '50%', '40%', COLORS.cyan);
      animateScore();
      triggerHaptic('medium');
    }

    s.particles = s.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.life -= p.decay; return p.life > 0; });
    s.thrustParticles = s.thrustParticles.filter(p => { p.x += p.vx; p.y += p.vy; p.life -= p.decay; return p.life > 0; });

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, internalExplosion, animateScore, triggerHaptic, triggerFloatingText, spawnParticles, saveScore]);

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
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'w', 'a', 'd'].includes(e.key)) e.preventDefault();
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
      title="Asteroids"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Destruye los fragmentos en órbita."
    >
      <div style={{ position: 'relative', width: 'min(42vh, 74vw)', height: 'min(42vh, 74vw)', background: 'rgba(4,4,10,0.8)', borderRadius: 20, padding: 6, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={() => status !== 'PLAYING' && start()}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
            touchAction: 'none',
          }}
        />
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <ControlBtn icon="◀" onDown={() => keysRef.current['ArrowLeft'] = true} onUp={() => keysRef.current['ArrowLeft'] = false} />
        <ControlBtn icon="▲" onDown={() => keysRef.current['ArrowUp'] = true} onUp={() => keysRef.current['ArrowUp'] = false} />
        <ControlBtn icon="▶" onDown={() => keysRef.current['ArrowRight'] = true} onUp={() => keysRef.current['ArrowRight'] = false} />
        <ControlBtn icon="FIRE" color={COLORS.magenta} onDown={() => keysRef.current['Shoot'] = true} onUp={() => keysRef.current['Shoot'] = false} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>VIDAS <span style={{ color: COLORS.cyan }}>{stateRef.current?.lives ?? 3}</span></span>
          <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>NIVEL <span style={{ color: COLORS.magenta }}>{stateRef.current?.level ?? 1}</span></span>
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
        color, fontSize: icon === 'FIRE' ? 11 : 22,
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

export default function Asteroids() {
  return (
    <GameImmersiveLayout>
      <AsteroidsInner />
    </GameImmersiveLayout>
  );
}
