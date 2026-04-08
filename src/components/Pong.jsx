import { useRef, useEffect, useCallback, useState } from 'react';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import useHighScore from '../hooks/useHighScore';

const W = 600;
const H = 400;
const FRAME_MS = 1000 / 60;
const COLORS = {
  bg: 'transparent',
  cyan: '#00e5ff',
  magenta: '#ff00ff',
  white: '#ffffff',
  dim: 'rgba(255, 255, 255, 0.05)',
};

const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL_SIZE = 8;
const TRAIL_LENGTH = 12;

function PongInner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef(H / 2);
  const lastFrameRef = useRef(0);

  const [best, saveScore] = useHighScore('pong');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [aiScore, setAiScore] = useState(0);
  const [gameLevel, setGameLevel] = useState(1);

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  function makeState() {
    return {
      phase: 'PLAYING',
      playerY: H / 2 - PADDLE_H / 2,
      aiY: H / 2 - PADDLE_H / 2,
      ball: { x: W / 2, y: H / 2, vx: 5, vy: 3, trail: [] },
      score: 0,
      aiScore: 0,
      level: 1,
    };
  }

  const BALL_R_VAL = BALL_SIZE / 2 + 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    if (!s) return;

    ctx.clearRect(0, 0, W, H);

    // Center Line
    ctx.setLineDash([10, 15]);
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ball Trail
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < s.ball.trail.length; i++) {
      const p = s.ball.trail[i];
      const alpha = (i / s.ball.trail.length) * 0.4;
      ctx.fillStyle = COLORS.cyan + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(p.x, p.y, BALL_SIZE * (i / s.ball.trail.length) / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ball
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, BALL_R_VAL, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Player Paddle
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(10, s.playerY, PADDLE_W, PADDLE_H);

    // AI Paddle
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(W - 10 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);
  }, [BALL_R_VAL]);

  const tick = useCallback((now) => {
    rafRef.current = requestAnimationFrame(tick);
    if (now - lastFrameRef.current < FRAME_MS) return;
    lastFrameRef.current = now;

    const s = stateRef.current;
    if (!s) return;

    if (s.phase !== 'PLAYING') {
      draw();
      return;
    }

    // Player Movement
    const targetY = mouseRef.current - PADDLE_H / 2;
    s.playerY += (targetY - s.playerY) * 0.2;
    s.playerY = Math.max(0, Math.min(H - PADDLE_H, s.playerY));

    // AI Movement
    const aiTarget = s.ball.y - PADDLE_H / 2;
    const aiSpeed = 3.5 + s.level * 0.5;
    if (Math.abs(aiTarget - s.aiY) > 5) {
      s.aiY += (aiTarget - s.aiY) * 0.08 * (1 + s.level * 0.1);
    }
    s.aiY = Math.max(0, Math.min(H - PADDLE_H, s.aiY));

    // Ball Trail
    s.ball.trail.push({ x: s.ball.x, y: s.ball.y });
    if (s.ball.trail.length > TRAIL_LENGTH) s.ball.trail.shift();

    // Ball Physics
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    // Wall bounce
    if (s.ball.y - BALL_R_VAL <= 0) {
      s.ball.y = BALL_R_VAL;
      s.ball.vy *= -1;
      triggerHaptic('light');
    } else if (s.ball.y + BALL_R_VAL >= H) {
      s.ball.y = H - BALL_R_VAL;
      s.ball.vy *= -1;
      triggerHaptic('light');
    }

    // Paddle Collisions
    // Player
    if (s.ball.vx < 0 && s.ball.x - BALL_R_VAL <= 20 && s.ball.y >= s.playerY && s.ball.y <= s.playerY + PADDLE_H) {
      s.ball.vx = Math.abs(s.ball.vx) + 0.2;
      const relY = (s.ball.y - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      s.ball.vy = relY * 5;
      triggerHaptic('medium');
      spawnParticles('20px', `${(s.ball.y / H) * 100}%`, COLORS.cyan, 8);
    }

    // AI
    if (s.ball.vx > 0 && s.ball.x + BALL_R_VAL >= W - 20 && s.ball.y >= s.aiY && s.ball.y <= s.aiY + PADDLE_H) {
      s.ball.vx = -Math.abs(s.ball.vx) - 0.2;
      const relY = (s.ball.y - (s.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      s.ball.vy = relY * 5;
      triggerHaptic('medium');
      spawnParticles(`${W - 20}px`, `${(s.ball.y / H) * 100}%`, COLORS.magenta, 8);
    }

    // Goals
    if (s.ball.x < 0) {
      s.aiScore++;
      setAiScore(s.aiScore);
      triggerHaptic('heavy');
      triggerFloatingText('IA ANOTA', '30%', '50%', COLORS.magenta);
      resetBall(s, 1);
    } else if (s.ball.x > W) {
      s.score++;
      setScore(s.score);
      animateScore();
      triggerHaptic('heavy');
      triggerFloatingText('¡PUNTO!', '70%', '50%', COLORS.cyan);
      resetBall(s, -1);
      if (s.score % 5 === 0) { s.level++; setGameLevel(s.level); }
    }

    draw();
  }, [draw, triggerHaptic, spawnParticles, triggerFloatingText, animateScore, BALL_R_VAL]);

  const resetBall = (s, dir) => {
    s.ball.x = W / 2;
    s.ball.y = H / 2;
    const speed = 5 + s.level * 0.5;
    s.ball.vx = speed * dir;
    s.ball.vy = (Math.random() - 0.5) * 6;
    s.ball.trail = [];
  };

  const start = useCallback(() => {
    stateRef.current = makeState();
    setScore(0);
    setAiScore(0);
    setGameLevel(1);
    setStatus('PLAYING');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    triggerHaptic('medium');
  }, [tick, triggerHaptic]);

  useEffect(() => {
    stateRef.current = makeState();
    setStatus('IDLE');
    draw();

    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <ArcadeShell
      title="Pong Retro"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="El duelo clásico de paletas y reflejos."
      gameId="pong"
    >
      <div style={{ position: 'relative', width: 'min(52vh, 88vw)', height: 'min(35vh, 59vw)', background: 'rgba(4,4,10,0.8)', borderRadius: 20, padding: 6, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)', overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            mouseRef.current = (e.clientY - rect.top) * (H / rect.height);
          }}
          onClick={() => status !== 'PLAYING' && start()}
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
        marginTop: 20,
        display: 'flex',
        gap: 32,
        fontSize: '0.75rem',
        fontWeight: 800,
        color: 'rgba(255, 255, 255, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: 2
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>IA</span>
          <span style={{ color: COLORS.magenta, fontSize: '1rem' }}>{aiScore}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', opacity: 0.6, marginBottom: 4 }}>NIVEL</span>
          <span style={{ color: COLORS.white, fontSize: '1rem' }}>{gameLevel}</span>
        </div>
      </div>
    </ArcadeShell>
  );
}

export default function Pong() {
  return (
    <GameImmersiveLayout>
      <PongInner />
    </GameImmersiveLayout>
  );
}
