import { useRef, useEffect, useCallback } from 'react';

const W = 400;
const H = 400;
const COLORS = { bg: '#0b0b10', cyan: '#00e5ff', magenta: '#ff00ff', white: '#ffffff', dim: 'rgba(255,255,255,0.15)', yellow: '#ffee00' };

const SHIP_SIZE = 14;
const BULLET_SPEED = 8;
const BULLET_LIFE = 55;
const THRUST = 0.18;
const MAX_SPEED = 7;
const FRICTION = 0.985;
const ROT_SPEED = 0.065;
const INVINCIBLE_FRAMES = 180;

const ASTEROID_SIZES = { large: 40, medium: 22, small: 12 };

function randRange(a, b) { return a + Math.random() * (b - a); }

function makeAsteroid(x, y, size, level) {
  const numVerts = 7 + Math.floor(Math.random() * 5);
  const verts = [];
  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2;
    const r = ASTEROID_SIZES[size] * (0.6 + Math.random() * 0.5);
    verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  const speed = (0.5 + Math.random() * 1.0) * (1 + level * 0.12);
  const angle = Math.random() * Math.PI * 2;
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.04,
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
    } while (Math.hypot(x - W / 2, y - H / 2) < 80);
    asteroids.push(makeAsteroid(x, y, 'large', level));
  }
  return asteroids;
}

function makeState() {
  return {
    phase: 'idle',
    ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, alive: true, invincible: 0 },
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

export default function Asteroids() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeState());
  const rafRef = useRef(null);
  const firedRef = useRef(false);
  const keysRef = useRef({});
  const frameRef = useRef(0);

  const drawPolygon = useCallback((ctx, verts, x, y, angle, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }, []);

  const drawShip = useCallback((ctx, ship) => {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
    ctx.lineTo(-SHIP_SIZE * 0.4, 0);
    ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    // HUD
    ctx.fillStyle = COLORS.cyan;
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${s.score}`, 10, 22);
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL: ${s.level}`, W - 10, 22);
    ctx.textAlign = 'center';
    // Lives
    ctx.strokeStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < s.lives; i++) {
      const lx = W / 2 - 20 + i * 18;
      const ly = 14;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // Thrust particles
    for (const p of s.thrustParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Explosion particles
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
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    for (const b of s.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Ship
    if (s.ship.alive) {
      if (s.ship.invincible <= 0 || frameRef.current % 6 < 3) {
        drawShip(ctx, s.ship);
      }
    }

    // Overlays
    if (s.phase === 'idle') {
      ctx.fillStyle = 'rgba(11,11,16,0.82)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 16;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ASTEROIDS', W / 2, H / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '14px monospace';
      ctx.fillText('Click para jugar', W / 2, H / 2);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '11px monospace';
      ctx.fillText('Flechas: rotar/empujar | Espacio: disparar', W / 2, H / 2 + 24);
    }

    if (s.phase === 'over') {
      ctx.fillStyle = 'rgba(11,11,16,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = 20;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 4);
      ctx.font = '13px monospace';
      ctx.fillText('Click para reiniciar', W / 2, H / 2 + 30);
    }
  }, [drawShip, drawPolygon]);

  const spawnExplosion = useCallback((particles, x, y, color, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.025 + Math.random() * 0.04,
        color,
        r: 1.5 + Math.random() * 2,
      });
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    frameRef.current++;

    if (s.phase !== 'playing') { draw(); rafRef.current = requestAnimationFrame(tick); return; }

    const ship = s.ship;
    const keys = keysRef.current;

    // Rotation
    if (keys['ArrowLeft']) ship.angle -= ROT_SPEED;
    if (keys['ArrowRight']) ship.angle += ROT_SPEED;

    // Thrust
    if (keys['ArrowUp'] && ship.alive) {
      ship.vx += Math.cos(ship.angle) * THRUST;
      ship.vy += Math.sin(ship.angle) * THRUST;
      // Clamp speed
      const spd = Math.hypot(ship.vx, ship.vy);
      if (spd > MAX_SPEED) { ship.vx = (ship.vx / spd) * MAX_SPEED; ship.vy = (ship.vy / spd) * MAX_SPEED; }
      // Thrust particles (flame)
      if (frameRef.current % 3 === 0) {
        const rearAngle = ship.angle + Math.PI;
        const spread = (Math.random() - 0.5) * 0.5;
        s.thrustParticles.push({
          x: ship.x + Math.cos(rearAngle) * SHIP_SIZE * 0.5,
          y: ship.y + Math.sin(rearAngle) * SHIP_SIZE * 0.5,
          vx: Math.cos(rearAngle + spread) * (1.5 + Math.random() * 2),
          vy: Math.sin(rearAngle + spread) * (1.5 + Math.random() * 2),
          life: 1,
          decay: 0.08 + Math.random() * 0.06,
          color: Math.random() < 0.5 ? '#ff8800' : '#ffee00',
          r: 1.5 + Math.random() * 2,
        });
      }
    }

    // Friction
    ship.vx *= FRICTION;
    ship.vy *= FRICTION;

    // Move ship
    if (ship.alive) {
      ship.x = (ship.x + ship.vx + W) % W;
      ship.y = (ship.y + ship.vy + H) % H;
    }

    // Ship invincibility
    if (ship.invincible > 0) ship.invincible--;

    // Shoot
    if (keys[' '] && ship.alive && frameRef.current - s.lastShot > 18) {
      s.bullets.push({
        x: ship.x + Math.cos(ship.angle) * SHIP_SIZE,
        y: ship.y + Math.sin(ship.angle) * SHIP_SIZE,
        vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx,
        vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy,
        life: BULLET_LIFE,
      });
      s.lastShot = frameRef.current;
    }

    // Bullets
    s.bullets = s.bullets.filter(b => {
      b.x = (b.x + b.vx + W) % W;
      b.y = (b.y + b.vy + H) % H;
      b.life--;
      return b.life > 0;
    });

    // Asteroids move
    for (const ast of s.asteroids) {
      if (!ast.alive) continue;
      ast.x = (ast.x + ast.vx + W) % W;
      ast.y = (ast.y + ast.vy + H) % H;
      ast.rot += ast.rotSpeed;
    }

    // Bullet-asteroid collision
    for (const b of s.bullets) {
      if (b.life <= 0) continue;
      for (const ast of s.asteroids) {
        if (!ast.alive) continue;
        const radius = ASTEROID_SIZES[ast.size];
        if (Math.hypot(b.x - ast.x, b.y - ast.y) < radius) {
          ast.alive = false;
          b.life = 0;
          spawnExplosion(s.particles, ast.x, ast.y, COLORS.magenta, 14);
          // Score
          const pts = { large: 20, medium: 50, small: 100 };
          s.score += pts[ast.size];
          // Split
          if (ast.size === 'large') {
            for (let i = 0; i < 2; i++) s.asteroids.push(makeAsteroid(ast.x, ast.y, 'medium', s.level));
          } else if (ast.size === 'medium') {
            for (let i = 0; i < 2; i++) s.asteroids.push(makeAsteroid(ast.x, ast.y, 'small', s.level));
          }
          break;
        }
      }
    }

    // Ship-asteroid collision
    if (ship.alive && ship.invincible <= 0) {
      for (const ast of s.asteroids) {
        if (!ast.alive) continue;
        const radius = ASTEROID_SIZES[ast.size] * 0.75;
        if (Math.hypot(ship.x - ast.x, ship.y - ast.y) < radius + SHIP_SIZE * 0.7) {
          // Hit!
          spawnExplosion(s.particles, ship.x, ship.y, COLORS.cyan, 16);
          s.lives--;
          if (s.lives <= 0) {
            ship.alive = false;
            s.phase = 'over';
            if (!firedRef.current) { firedRef.current = true; window.dispatchEvent(new CustomEvent('dan:game-score', { detail: { gameId: 'asteroids', score: s.score, isHighScore: false } })); }
            draw();
            return;
          }
          // Respawn
          ship.x = W / 2;
          ship.y = H / 2;
          ship.vx = 0;
          ship.vy = 0;
          ship.angle = -Math.PI / 2;
          ship.invincible = INVINCIBLE_FRAMES;
          break;
        }
      }
    }

    // All asteroids cleared
    const alive = s.asteroids.filter(a => a.alive);
    if (alive.length === 0) {
      s.level++;
      const count = Math.min(4 + s.level, 10);
      s.asteroids = spawnAsteroids(count, s.level);
      ship.x = W / 2;
      ship.y = H / 2;
      ship.vx = 0;
      ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.invincible = INVINCIBLE_FRAMES;
    }

    // Update particles
    s.particles = s.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      return p.life > 0;
    });
    s.thrustParticles = s.thrustParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      return p.life > 0;
    });

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, spawnExplosion]);

  const startGame = useCallback(() => {
    const fresh = makeState();
    fresh.phase = 'playing';
    stateRef.current = fresh;
    frameRef.current = 0;
    firedRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const onKey = (e) => {
      keysRef.current[e.key] = e.type === 'keydown';
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(e.key)) e.preventDefault();
    };
    const onClick = () => {
      const s = stateRef.current;
      if (s.phase === 'idle' || s.phase === 'over') startGame();
    };

    const canvas = canvasRef.current;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      canvas.removeEventListener('click', onClick);
    };
  }, [draw, tick, startGame]);

  // Mobile: virtual joystick buttons
  const btnStyle = (color) => ({
    width: 52,
    height: 52,
    borderRadius: 8,
    background: 'rgba(11,11,16,0.85)',
    border: `2px solid ${color}`,
    color,
    fontFamily: 'monospace',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    boxShadow: `0 0 10px ${color}55`,
  });

  const holdKey = (key, pressed) => {
    keysRef.current[key] = pressed;
  };

  const touchBtn = (key) => ({
    onTouchStart: (e) => { e.preventDefault(); holdKey(key, true); },
    onTouchEnd: (e) => { e.preventDefault(); holdKey(key, false); },
    onMouseDown: () => holdKey(key, true),
    onMouseUp: () => holdKey(key, false),
    onMouseLeave: () => holdKey(key, false),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: COLORS.bg, padding: '12px' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          display: 'block',
          maxWidth: '100%',
          border: `1px solid ${COLORS.cyan}`,
          boxShadow: `0 0 18px ${COLORS.cyan}44`,
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      />
      {/* Mobile controls */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={btnStyle(COLORS.cyan)} {...touchBtn('ArrowUp')}>&#9650;</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={btnStyle(COLORS.cyan)} {...touchBtn('ArrowLeft')}>&#9664;</div>
            <div style={{ width: 52, height: 52 }} />
            <div style={btnStyle(COLORS.cyan)} {...touchBtn('ArrowRight')}>&#9654;</div>
          </div>
        </div>
        <div style={{ marginLeft: 20 }}>
          <div style={btnStyle(COLORS.magenta)} {...touchBtn(' ')}>FIRE</div>
        </div>
      </div>
      <div style={{ marginTop: 8, color: COLORS.dim, fontFamily: 'monospace', fontSize: 11 }}>
        &larr;&rarr; rotar &nbsp;|&nbsp; &uarr; empujar &nbsp;|&nbsp; Espacio disparar
      </div>
    </div>
  );
}
