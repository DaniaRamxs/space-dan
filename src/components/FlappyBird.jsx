import { useEffect, useRef, useCallback, useState } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';
import { MobileControls } from './MobileControls';

const W = 320;
const H = 480;
const BIRD_X = 60;
const BIRD_R = 14;
const GRAVITY = 0.25;
const FLAP_VEL = -5.5;
const PIPE_W = 50;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.8;
const PIPE_MIN_INTERVAL = 70;
const PIPE_MAX_INTERVAL = 95;

const C_BIRD = '#ff6eb4';
const C_PIPE = '#00e5ff';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makePipe() {
  const topH = randInt(50, H - PIPE_GAP - 50);
  return { x: W, topH, passed: false };
}

function checkCollision(birdY, pipes) {
  if (birdY + BIRD_R >= H || birdY - BIRD_R <= 0) return true;

  for (const pipe of pipes) {
    if (BIRD_X + BIRD_R > pipe.x && BIRD_X - BIRD_R < pipe.x + PIPE_W) {
      if (birdY - BIRD_R < pipe.topH || birdY + BIRD_R > pipe.topH + PIPE_GAP) {
        return true;
      }
    }
  }
  return false;
}

function FlappyBirdInner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [best, saveScore] = useHighScore('flappy');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  function makeState() {
    return {
      phase: 'IDLE',
      birdY: H / 2,
      velY: 0,
      pipes: [],
      score: 0,
      frame: 0,
      nextPipeIn: randInt(PIPE_MIN_INTERVAL, PIPE_MAX_INTERVAL),
    };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);

    // Pipes with premium glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = C_PIPE;
    ctx.fillStyle = C_PIPE;
    for (const pipe of s.pipes) {
      // Top Pipe
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pipe.x, -10, PIPE_W, pipe.topH + 10, 8);
      else ctx.rect(pipe.x, -10, PIPE_W, pipe.topH + 10);
      ctx.fill();

      // Bottom Pipe
      const bottomY = pipe.topH + PIPE_GAP;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pipe.x, bottomY, PIPE_W, H - bottomY + 10, 8);
      else ctx.rect(pipe.x, bottomY, PIPE_W, H - bottomY + 10);
      ctx.fill();
    }

    // Bird with vibrant glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = C_BIRD;
    ctx.fillStyle = C_BIRD;
    ctx.beginPath();
    ctx.arc(BIRD_X, s.birdY, BIRD_R, 0, Math.PI * 2);
    ctx.fill();

    // Bird Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b0b1a';
    ctx.beginPath();
    ctx.arc(BIRD_X + 6, s.birdY - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'PLAYING') {
      draw();
      return;
    }

    s.velY += GRAVITY;
    s.birdY += s.velY;
    s.frame++;

    s.nextPipeIn--;
    if (s.nextPipeIn <= 0) {
      s.pipes.push(makePipe());
      s.nextPipeIn = randInt(PIPE_MIN_INTERVAL, PIPE_MAX_INTERVAL);
    }

    for (const pipe of s.pipes) {
      pipe.x -= PIPE_SPEED;
      if (!pipe.passed && pipe.x + PIPE_W < BIRD_X) {
        pipe.passed = true;
        s.score++;
        setScore(s.score);
        animateScore();
        triggerFloatingText('+1', BIRD_X, s.birdY - 20, C_PIPE);
        triggerHaptic('light');
      }
    }

    s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -20);

    if (checkCollision(s.birdY, s.pipes)) {
      s.phase = 'DEAD';
      setStatus('DEAD');
      triggerHaptic('heavy');
      spawnParticles(BIRD_X, s.birdY, C_BIRD, 20);

      saveScore(s.score);
      draw();
      return;
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, saveScore, animateScore, triggerFloatingText, triggerHaptic, spawnParticles]);

  const handleInteract = useCallback(() => {
    const s = stateRef.current;

    if (s.phase === 'IDLE' || s.phase === 'DEAD') {
      stateRef.current = makeState();
      stateRef.current.phase = 'PLAYING';
      stateRef.current.velY = FLAP_VEL;
      setScore(0);
      setStatus('PLAYING');
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
      triggerHaptic('medium');
      return;
    }

    if (s.phase === 'PLAYING') {
      s.velY = FLAP_VEL;
      triggerHaptic('light');
    }
  }, [tick, triggerHaptic]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInteract();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInteract]);

  useEffect(() => {
    stateRef.current = makeState();
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <ArcadeShell
      title="Flappy Neon"
      score={score}
      bestScore={best}
      status={status}
      onRetry={handleInteract}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Vuela a través de los portales de energía."
      gameId="flappy"
    >
      <div style={{ position: 'relative', width: 'min(86vw, 300px)', aspectRatio: `${W}/${H}`, background: 'rgba(4,4,10,0.8)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onClick={handleInteract}
          style={{
            display: 'block',
            cursor: 'pointer',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>

      <MobileControls
        actionALabel="FLAP"
        actionA={handleInteract}
        actionAColor={C_PIPE}
      />
    </ArcadeShell>
  );
}

export default function FlappyBird() {
  return (
    <GameImmersiveLayout>
      <FlappyBirdInner />
    </GameImmersiveLayout>
  );
}
