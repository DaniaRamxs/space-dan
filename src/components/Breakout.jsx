import { useRef, useEffect, useCallback, useState } from 'react';
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
  dim: 'rgba(255,255,255,0.1)'
};

const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const BALL_R = 7;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 42;
const BRICK_H = 16;
const BRICK_PAD = 4;
const BRICK_TOP = 60;

const ROW_COLORS = ['#ff00ff', '#ff00dd', '#ff00aa', '#00e5ff', '#00ffcc'];
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

function BreakoutInner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const keysRef = useRef({});
  const mouseXRef = useRef(W / 2);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [best, saveScore] = useHighScore('breakout');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  function makeState() {
    return {
      phase: 'PLAYING',
      paddleX: W / 2 - PADDLE_W / 2,
      ball: { x: W / 2, y: PADDLE_Y - BALL_R - 2, vx: 0, vy: 0, attached: true },
      bricks: makeBricks(),
      particles: [],
      lives: 3,
      score: 0,
      level: 1,
      baseSpeed: 5,
      speedTimer: 0,
    };
  }

  const launchBall = useCallback((s) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
    const sp = s.baseSpeed;
    s.ball.vx = sp * Math.cos(angle);
    s.ball.vy = sp * Math.sin(angle);
    s.ball.attached = false;
    triggerHaptic('medium');
  }, [triggerHaptic]);

  const internalParticles = useCallback((x, y, color) => {
    const s = stateRef.current;
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.03 + Math.random() * 0.03,
        color,
        r: 1.5 + Math.random() * 1.5,
      });
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;

    ctx.clearRect(0, 0, W, H);

    // Bricks with improved glow and depth
    for (const b of s.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = b.color;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4);
      else ctx.rect(b.x, b.y, BRICK_W, BRICK_H);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 2, b.y + 2, BRICK_W - 4, 3);
    }

    // Internal particles
    ctx.globalCompositeOperation = 'lighter';
    for (const p of s.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Paddle
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.cyan;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 6);
    else ctx.rect(s.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.fill();

    // Paddle reflection
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.white + '44';
    ctx.fillRect(s.paddleX + 10, PADDLE_Y + 2, PADDLE_W - 20, 2);

    // Ball
    ctx.fillStyle = COLORS.white;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.white;
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  }, []);

  const tick = useCallback((timestamp) => {
    const s = stateRef.current;
    if (!s) return;
    frameRef.current++;

    const dt = lastTimeRef.current ? Math.min((timestamp - lastTimeRef.current) / (16.67), 3) : 1;
    lastTimeRef.current = timestamp;

    if (s.phase !== 'PLAYING') {
      draw();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Paddle movement
    if (keysRef.current['ArrowLeft'] || keysRef.current['a']) s.paddleX = Math.max(0, s.paddleX - 7 * dt);
    if (keysRef.current['ArrowRight'] || keysRef.current['d']) s.paddleX = Math.min(W - PADDLE_W, s.paddleX + 7 * dt);

    if (!keysRef.current['ArrowLeft'] && !keysRef.current['ArrowRight'] && !keysRef.current['a'] && !keysRef.current['d']) {
      const target = mouseXRef.current - PADDLE_W / 2;
      const diff = target - s.paddleX;
      s.paddleX += Math.sign(diff) * Math.min(Math.abs(diff), 10 * dt);
      s.paddleX = Math.max(0, Math.min(W - PADDLE_W, s.paddleX));
    }

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

    s.speedTimer += dt;
    if (s.speedTimer >= 500) {
      s.speedTimer = 0;
      const spd = Math.hypot(s.ball.vx, s.ball.vy);
      const newSpd = Math.min(spd + 0.1, 12);
      s.ball.vx = (s.ball.vx / spd) * newSpd;
      s.ball.vy = (s.ball.vy / spd) * newSpd;
    }

    s.ball.x += s.ball.vx * dt;
    s.ball.y += s.ball.vy * dt;

    if (s.ball.x - BALL_R <= 0) { s.ball.x = BALL_R; s.ball.vx = Math.abs(s.ball.vx); triggerHaptic('light'); }
    if (s.ball.x + BALL_R >= W) { s.ball.x = W - BALL_R; s.ball.vx = -Math.abs(s.ball.vx); triggerHaptic('light'); }
    if (s.ball.y - BALL_R <= 0) { s.ball.y = BALL_R; s.ball.vy = Math.abs(s.ball.vy); triggerHaptic('light'); }

    // Paddle collision
    if (s.ball.vy > 0 && s.ball.y + BALL_R >= PADDLE_Y && s.ball.y < PADDLE_Y + PADDLE_H && s.ball.x >= s.paddleX && s.ball.x <= s.paddleX + PADDLE_W) {
      const rel = (s.ball.x - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = rel * (Math.PI / 3);
      const spd = Math.hypot(s.ball.vx, s.ball.vy);
      s.ball.vx = spd * Math.sin(angle);
      s.ball.vy = -spd * Math.cos(angle);
      s.ball.y = PADDLE_Y - BALL_R;
      triggerHaptic('medium');
    }

    if (s.ball.y - BALL_R > H) {
      s.lives--;
      triggerHaptic('heavy');
      triggerFloatingText('¡VIDA PERDIDA!', '50%', '40%', '#ff0000');
      if (s.lives <= 0) {
        s.phase = 'DEAD';
        setStatus('DEAD');
        saveScore(s.score);
        draw();
        return;
      }
      s.ball.attached = true;
    }

    // Brick collisions
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (s.ball.x + BALL_R > b.x && s.ball.x - BALL_R < b.x + BRICK_W && s.ball.y + BALL_R > b.y && s.ball.y - BALL_R < b.y + BRICK_H) {
        b.alive = false;
        const pts = b.points;
        s.score += pts;
        setScore(s.score);
        animateScore();

        internalParticles(b.x + BRICK_W / 2, b.y + BRICK_H / 2, b.color);
        spawnParticles(`${(b.x / W) * 100}%`, `${(b.y / H) * 100}%`, b.color, 12);
        triggerFloatingText(`+${pts}`, `${(b.x / W) * 100}%`, `${(b.y / H) * 100}%`, b.color);
        triggerHaptic('light');

        if (Math.abs(s.ball.x - (b.x + BRICK_W / 2)) / BRICK_W > Math.abs(s.ball.y - (b.y + BRICK_H / 2)) / BRICK_H) {
          s.ball.vx *= -1;
        } else {
          s.ball.vy *= -1;
        }
        break;
      }
    }

    if (s.bricks.filter(b => b.alive).length === 0) {
      s.level++;
      s.baseSpeed = Math.min(s.baseSpeed + 0.8, 10);
      s.bricks = makeBricks();
      s.ball.attached = true;
      triggerFloatingText(`SALA DESPEJADA - NIVEL ${s.level}`, '50%', '40%', COLORS.cyan);
      animateScore();
      triggerHaptic('medium');
    }

    s.particles = s.particles.filter(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.05 * dt; p.life -= p.decay * dt;
      return p.life > 0;
    });

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, launchBall, internalParticles, spawnParticles, triggerFloatingText, animateScore, triggerHaptic, saveScore]);

  const start = useCallback(() => {
    stateRef.current = makeState();
    setScore(0);
    setStatus('PLAYING');
    frameRef.current = 0;
    lastTimeRef.current = 0;
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
    const onMouse = (e) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseXRef.current = (e.clientX - rect.left) * (W / rect.width);
    };

    const canvas = canvasRef.current;
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    canvas.addEventListener('mousemove', onMouse);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      canvas.removeEventListener('mousemove', onMouse);
    };
  }, [draw]);

  return (
    <ArcadeShell
      title="Breakout"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Destruye el muro de energía."
    >
      <div style={{ position: 'relative', width: 'min(70vh, 90vw)', aspectRatio: `${W}/${H}`, background: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 8, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={(e) => {
            if (status !== 'PLAYING') start();
            else keysRef.current['launch'] = true;
          }}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            mouseXRef.current = (e.clientX - rect.left) * (W / rect.width);
          }}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            cursor: 'none',
            touchAction: 'none',
          }}
        />
      </div>

      <div style={{
        marginTop: 24,
        display: 'flex',
        gap: 32,
        fontSize: '0.75rem',
        fontWeight: 800,
        color: 'rgba(255, 255, 255, 0.3)',
        textTransform: 'uppercase',
        letterSpacing: 2
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>INTENTOS</span>
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

export default function Breakout() {
  return (
    <GameImmersiveLayout>
      <BreakoutInner />
    </GameImmersiveLayout>
  );
}
