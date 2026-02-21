import { useRef, useEffect, useCallback } from 'react';

const W = 400;
const H = 500;
const COLORS = { bg: '#0b0b10', cyan: '#00e5ff', magenta: '#ff00ff', white: '#ffffff', dim: 'rgba(255,255,255,0.15)' };

const PADDLE_W = 70;
const PADDLE_H = 10;
const PADDLE_Y = H - 30;
const BALL_R = 7;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 42;
const BRICK_H = 16;
const BRICK_PAD = 4;
const BRICK_TOP = 60;

const ROW_COLORS = ['#ff00ff', '#ff44aa', '#ff8800', '#ffee00', '#00e5ff'];
const ROW_POINTS = [50, 40, 30, 20, 10];

function makeBricks() {
  const bricks = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const x = 14 + c * (BRICK_W + BRICK_PAD);
      const y = BRICK_TOP + r * (BRICK_H + BRICK_PAD);
      bricks.push({ r, c, x, y, alive: true, color: ROW_COLORS[r], points: ROW_POINTS[r] });
    }
  }
  return bricks;
}

function makeState() {
  return {
    phase: 'idle',
    paddleX: W / 2 - PADDLE_W / 2,
    ball: { x: W / 2, y: PADDLE_Y - BALL_R - 2, vx: 0, vy: 0, attached: true },
    bricks: makeBricks(),
    particles: [],
    lives: 3,
    score: 0,
    level: 1,
    baseSpeed: 4.5,
    speedTimer: 0,
  };
}

function launchBall(s) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
  const sp = s.baseSpeed;
  s.ball.vx = sp * Math.cos(angle);
  s.ball.vy = sp * Math.sin(angle);
  s.ball.attached = false;
}

function spawnParticles(particles, x, y, color) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.04 + Math.random() * 0.04,
      color,
      r: 2 + Math.random() * 2,
    });
  }
}

export default function Breakout() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeState());
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const mouseXRef = useRef(W / 2);
  const frameRef = useRef(0);

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
    // Lives as dots
    ctx.fillStyle = COLORS.magenta;
    ctx.shadowColor = COLORS.magenta;
    ctx.shadowBlur = 6;
    for (let i = 0; i < s.lives; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - 16 + i * 16, 14, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Bricks
    for (const b of s.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 4);
    }
    ctx.shadowBlur = 0;

    // Particles
    for (const p of s.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Paddle
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = COLORS.white;
    ctx.shadowColor = COLORS.white;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Overlays
    if (s.phase === 'idle') {
      ctx.fillStyle = 'rgba(11,11,16,0.82)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = 16;
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BREAKOUT', W / 2, H / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '14px monospace';
      ctx.fillText('Click o Espacio para jugar', W / 2, H / 2);
      ctx.fillStyle = COLORS.dim;
      ctx.font = '11px monospace';
      ctx.fillText('Mouse o Flechas para mover la paleta', W / 2, H / 2 + 24);
    }

    if (s.phase === 'over') {
      ctx.fillStyle = 'rgba(11,11,16,0.85)';
      ctx.fillRect(0, 0, W, H);
      const color = s.lives > 0 ? COLORS.cyan : COLORS.magenta;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.lives > 0 ? '¡GANASTE!' : 'GAME OVER', W / 2, H / 2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 4);
      ctx.font = '13px monospace';
      ctx.fillText('Click para reiniciar', W / 2, H / 2 + 30);
    }

    if (s.phase === 'levelup') {
      ctx.fillStyle = 'rgba(11,11,16,0.8)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COLORS.cyan;
      ctx.shadowColor = COLORS.cyan;
      ctx.shadowBlur = 18;
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NIVEL ${s.level}`, W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.white;
      ctx.font = '13px monospace';
      ctx.fillText('Click o Espacio para continuar', W / 2, H / 2 + 14);
    }
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    frameRef.current++;

    if (s.phase !== 'playing') { draw(); rafRef.current = requestAnimationFrame(tick); return; }

    // Paddle control
    if (keysRef.current['ArrowLeft']) s.paddleX = Math.max(0, s.paddleX - 6);
    if (keysRef.current['ArrowRight']) s.paddleX = Math.min(W - PADDLE_W, s.paddleX + 6);
    if (!keysRef.current['ArrowLeft'] && !keysRef.current['ArrowRight']) {
      const target = mouseXRef.current - PADDLE_W / 2;
      const diff = target - s.paddleX;
      s.paddleX += Math.sign(diff) * Math.min(Math.abs(diff), 9);
      s.paddleX = Math.max(0, Math.min(W - PADDLE_W, s.paddleX));
    }

    // Attached ball follows paddle
    if (s.ball.attached) {
      s.ball.x = s.paddleX + PADDLE_W / 2;
      s.ball.y = PADDLE_Y - BALL_R - 1;
      if (keysRef.current[' '] || keysRef.current['launch']) {
        launchBall(s);
        keysRef.current['launch'] = false;
      }
      draw();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Speed increases over time
    s.speedTimer++;
    if (s.speedTimer % 600 === 0) {
      const spd = Math.sqrt(s.ball.vx ** 2 + s.ball.vy ** 2);
      const newSpd = Math.min(spd + 0.3, 12);
      s.ball.vx = (s.ball.vx / spd) * newSpd;
      s.ball.vy = (s.ball.vy / spd) * newSpd;
    }

    // Ball movement
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Wall bounces
    if (s.ball.x - BALL_R <= 0) { s.ball.x = BALL_R; s.ball.vx = Math.abs(s.ball.vx); }
    if (s.ball.x + BALL_R >= W) { s.ball.x = W - BALL_R; s.ball.vx = -Math.abs(s.ball.vx); }
    if (s.ball.y - BALL_R <= 0) { s.ball.y = BALL_R; s.ball.vy = Math.abs(s.ball.vy); }

    // Paddle bounce
    if (
      s.ball.vy > 0 &&
      s.ball.y + BALL_R >= PADDLE_Y &&
      s.ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
      s.ball.x >= s.paddleX &&
      s.ball.x <= s.paddleX + PADDLE_W
    ) {
      const rel = (s.ball.x - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = rel * (Math.PI / 3);
      const spd = Math.sqrt(s.ball.vx ** 2 + s.ball.vy ** 2);
      s.ball.vx = spd * Math.sin(angle);
      s.ball.vy = -spd * Math.cos(angle);
      s.ball.y = PADDLE_Y - BALL_R;
    }

    // Ball lost
    if (s.ball.y - BALL_R > H) {
      s.lives--;
      if (s.lives <= 0) {
        s.phase = 'over';
        draw();
        return;
      }
      s.ball.attached = true;
      s.ball.x = s.paddleX + PADDLE_W / 2;
      s.ball.y = PADDLE_Y - BALL_R - 1;
    }

    // Brick collisions
    for (const b of s.bricks) {
      if (!b.alive) continue;
      const bx = b.x, by = b.y;
      if (
        s.ball.x + BALL_R > bx && s.ball.x - BALL_R < bx + BRICK_W &&
        s.ball.y + BALL_R > by && s.ball.y - BALL_R < by + BRICK_H
      ) {
        b.alive = false;
        s.score += b.points;
        spawnParticles(s.particles, b.x + BRICK_W / 2, b.y + BRICK_H / 2, b.color);

        // Determine bounce direction
        const overlapLeft = (s.ball.x + BALL_R) - bx;
        const overlapRight = (bx + BRICK_W) - (s.ball.x - BALL_R);
        const overlapTop = (s.ball.y + BALL_R) - by;
        const overlapBottom = (by + BRICK_H) - (s.ball.y - BALL_R);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        if (minOverlap === overlapTop || minOverlap === overlapBottom) {
          s.ball.vy *= -1;
        } else {
          s.ball.vx *= -1;
        }
        break;
      }
    }

    // Check all bricks cleared
    const alive = s.bricks.filter(b => b.alive);
    if (alive.length === 0) {
      s.level++;
      s.baseSpeed = Math.min(s.baseSpeed + 1, 11);
      s.bricks = makeBricks();
      s.ball.attached = true;
      s.speedTimer = 0;
      s.phase = 'levelup';
      draw();
      return;
    }

    // Update particles
    s.particles = s.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= p.decay;
      return p.life > 0;
    });

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const startGame = useCallback((fromLevelUp = false) => {
    if (fromLevelUp) {
      const s = stateRef.current;
      s.phase = 'playing';
      s.ball.attached = true;
    } else {
      const fresh = makeState();
      fresh.phase = 'playing';
      stateRef.current = fresh;
    }
    frameRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const onKey = (e) => {
      keysRef.current[e.key] = e.type === 'keydown';
      if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    const onMouse = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = (e.clientX - rect.left) * (W / rect.width);
    };
    const onClick = () => {
      const s = stateRef.current;
      if (s.phase === 'idle' || s.phase === 'over') { startGame(false); return; }
      if (s.phase === 'levelup') { startGame(true); return; }
      if (s.phase === 'playing') { keysRef.current['launch'] = true; }
    };

    const canvas = canvasRef.current;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    canvas.addEventListener('mousemove', onMouse);
    canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      canvas.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('click', onClick);
    };
  }, [draw, tick, startGame]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    if (t) mouseXRef.current = (t.clientX - rect.left) * (W / rect.width);
  }, []);

  const handleTouchStart = useCallback((e) => {
    const s = stateRef.current;
    if (s.phase === 'idle' || s.phase === 'over') { startGame(false); return; }
    if (s.phase === 'levelup') { startGame(true); return; }
    keysRef.current['launch'] = true;
    handleTouchMove(e);
  }, [startGame, handleTouchMove]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: COLORS.bg, padding: '12px' }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={{
          display: 'block',
          maxWidth: '100%',
          border: `1px solid ${COLORS.magenta}`,
          boxShadow: `0 0 18px ${COLORS.magenta}44`,
          cursor: 'none',
          touchAction: 'none',
        }}
      />
      <div style={{ marginTop: 8, color: COLORS.dim, fontFamily: 'monospace', fontSize: 11 }}>
        Mouse o &larr;&rarr; para mover &nbsp;|&nbsp; Espacio o Click para lanzar
      </div>
    </div>
  );
}
