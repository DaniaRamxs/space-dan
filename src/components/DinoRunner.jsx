import { useEffect, useRef, useCallback, useState } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 380;
const H = 200;

const GROUND_Y = 160;
const DINO_W = 30;
const DINO_H = 40;
const DINO_X = 40;
const DINO_GROUND_Y = GROUND_Y - DINO_H;

const JUMP_VEL = -11;
const GRAVITY = 0.5;

const SPEED_INIT = 4.5;
const SPEED_INC = 0.0015;

const OBS_MIN_W = 20;
const OBS_MAX_W = 35;
const OBS_MIN_H = 30;
const OBS_MAX_H = 55;
const OBS_MIN_GAP = 55;
const OBS_MAX_GAP = 110;

const C_DINO = '#ff6eb4';
const C_OBS = '#00e5ff';
const C_GROUND = 'rgba(255,255,255,0.1)';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawDino(ctx, x, y, frame, onGround) {
  ctx.fillStyle = C_DINO;
  ctx.shadowColor = C_DINO;
  ctx.shadowBlur = 15;

  // Body
  ctx.fillRect(x + 1, y + 14, 19, 13);
  // Neck
  ctx.fillRect(x + 16, y + 8, 7, 10);
  // Head
  ctx.fillRect(x + 14, y + 2, 16, 11);
  // Lower jaw
  ctx.fillRect(x + 22, y + 11, 8, 4);

  // Tail
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 15);
  ctx.lineTo(x, y + 22);
  ctx.lineTo(x + 2, y + 27);
  ctx.lineTo(x + 7, y + 24);
  ctx.lineTo(x + 5, y + 15);
  ctx.fill();

  // Arm
  ctx.fillRect(x + 19, y + 20, 5, 3);

  // Legs cycle
  const step = onGround ? (Math.floor(frame / 5) % 2) : 0;
  if (step === 0) {
    ctx.fillRect(x + 15, y + 27, 5, 13);
    ctx.fillRect(x + 8, y + 27, 4, 9);
  } else {
    ctx.fillRect(x + 13, y + 27, 4, 9);
    ctx.fillRect(x + 9, y + 27, 5, 13);
  }

  // Eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b0b1a';
  ctx.beginPath();
  ctx.arc(x + 25, y + 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function makeObstacle() {
  const w = randInt(OBS_MIN_W, OBS_MAX_W);
  const h = randInt(OBS_MIN_H, OBS_MAX_H);
  return { x: W, w, h };
}

function collides(dinoY, obs) {
  const dinoLeft = DINO_X + 6;
  const dinoRight = DINO_X + DINO_W - 6;
  const dinoTop = dinoY + 6;
  const dinoBottom = dinoY + DINO_H;

  const obsLeft = obs.x;
  const obsRight = obs.x + obs.w;
  const obsTop = GROUND_Y - obs.h;
  const obsBottom = GROUND_Y;

  return (
    dinoRight > obsLeft &&
    dinoLeft < obsRight &&
    dinoBottom > obsTop &&
    dinoTop < obsBottom
  );
}

function DinoRunnerInner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [best, saveScore] = useHighScore('dino');
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('IDLE');

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  function makeState() {
    return {
      phase: 'IDLE',
      dinoY: DINO_GROUND_Y,
      velY: 0,
      onGround: true,
      obstacles: [],
      frame: 0,
      speed: SPEED_INIT,
      score: 0,
      nextObsIn: randInt(OBS_MIN_GAP, OBS_MAX_GAP),
    };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);

    // Ground line with subtle glow
    ctx.strokeStyle = C_GROUND;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    // Obstacles with glow
    ctx.fillStyle = C_OBS;
    ctx.shadowBlur = 10;
    ctx.shadowColor = C_OBS;
    for (const obs of s.obstacles) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(obs.x, GROUND_Y - obs.h, obs.w, obs.h, 4);
      else ctx.rect(obs.x, GROUND_Y - obs.h, obs.w, obs.h);
      ctx.fill();
    }

    // Dino
    drawDino(ctx, DINO_X, s.dinoY, s.frame, s.onGround);

    ctx.shadowBlur = 0;
  }, []);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'PLAYING') {
      draw();
      return;
    }

    s.frame++;
    s.speed = SPEED_INIT + s.frame * SPEED_INC;
    const newScore = Math.floor(s.frame / 5);

    if (newScore > s.score) {
      s.score = newScore;
      setScore(s.score);
      if (s.score % 100 === 0) {
        animateScore();
        triggerHaptic('medium');
        triggerFloatingText('¡100 PTS!', DINO_X, s.dinoY - 20, C_DINO);
      }
    }

    if (!s.onGround) {
      s.velY += GRAVITY;
      s.dinoY += s.velY;
    }

    if (s.dinoY >= DINO_GROUND_Y) {
      s.dinoY = DINO_GROUND_Y;
      s.velY = 0;
      s.onGround = true;
    }

    s.nextObsIn--;
    if (s.nextObsIn <= 0) {
      s.obstacles.push(makeObstacle());
      s.nextObsIn = randInt(OBS_MIN_GAP, OBS_MAX_GAP);
    }

    for (const obs of s.obstacles) {
      obs.x -= s.speed;
    }

    s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);

    for (const obs of s.obstacles) {
      if (collides(s.dinoY, obs)) {
        s.phase = 'DEAD';
        setStatus('DEAD');
        triggerHaptic('heavy');
        spawnParticles(DINO_X + DINO_W / 2, s.dinoY + DINO_H / 2, C_DINO, 25);

        saveScore(s.score);
        draw();
        return;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, saveScore, animateScore, triggerHaptic, spawnParticles, triggerFloatingText]);

  const handleInteract = useCallback(() => {
    const s = stateRef.current;

    if (s.phase === 'IDLE' || s.phase === 'DEAD') {
      stateRef.current = makeState();
      stateRef.current.phase = 'PLAYING';
      stateRef.current.velY = JUMP_VEL;
      stateRef.current.onGround = false;
      setScore(0);
      setStatus('PLAYING');
      triggerHaptic('medium');
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (s.phase === 'PLAYING' && s.onGround) {
      s.velY = JUMP_VEL;
      s.onGround = false;
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
      title="Dino Neon"
      score={score}
      bestScore={best}
      status={status}
      onRetry={handleInteract}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Salta sobre los obstáculos de neón."
    >
      <div style={{ position: 'relative', width: 'min(90vw, 340px)', aspectRatio: `${W}/${H}`, background: 'rgba(4,4,10,0.8)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
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
    </ArcadeShell>
  );
}

export default function DinoRunner() {
  return (
    <GameImmersiveLayout>
      <DinoRunnerInner />
    </GameImmersiveLayout>
  );
}
