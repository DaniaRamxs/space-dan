import { useEffect, useRef, useCallback, useState } from 'react';
import useHighScore from '../hooks/useHighScore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const W = 380;
const H = 160;

const GROUND_Y = 120;           // y of the top of the ground line

const DINO_W = 30;
const DINO_H = 40;
const DINO_X = 40;              // fixed horizontal position
const DINO_GROUND_Y = GROUND_Y - DINO_H; // y of dino top when standing

const JUMP_VEL = -10;
const GRAVITY = 0.45;

const SPEED_INIT = 3;
const SPEED_INC = 0.001;        // px/frame per frame

const OBS_MIN_W = 20;
const OBS_MAX_W = 30;
const OBS_MIN_H = 30;
const OBS_MAX_H = 50;
const OBS_MIN_GAP = 60;        // minimum frames between obstacles
const OBS_MAX_GAP = 140;

const C_BG = '#111111';
const C_DINO = '#ff6eb4';       // magenta
const C_OBS = '#00e5ff';        // cyan
const C_GROUND = '#444444';
const C_TEXT = '#ffffff';
const C_DIM = 'rgba(255,255,255,0.45)';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Draw a T-Rex style dinosaur using canvas paths.
 * Bounding box: x, y, DINO_W × DINO_H (30 × 40 px), facing right.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} frame  — used for leg animation
 * @param {boolean} onGround
 */
function drawDino(ctx, x, y, frame, onGround) {
  ctx.fillStyle = C_DINO;
  ctx.shadowColor = C_DINO;
  ctx.shadowBlur = 10;

  // Body
  ctx.fillRect(x + 1, y + 14, 19, 13);

  // Neck
  ctx.fillRect(x + 16, y + 8, 7, 10);

  // Head (jutting right)
  ctx.fillRect(x + 14, y + 2, 16, 11);

  // Lower jaw / snout
  ctx.fillRect(x + 22, y + 11, 8, 4);

  // Tail (left side, tapers to a point)
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 15);
  ctx.lineTo(x,     y + 22);
  ctx.lineTo(x + 2, y + 27);
  ctx.lineTo(x + 7, y + 24);
  ctx.lineTo(x + 5, y + 15);
  ctx.fill();

  // Tiny arm
  ctx.fillRect(x + 19, y + 20, 5, 3);

  // Legs — alternate position based on frame for running cycle
  const step = onGround ? (Math.floor(frame / 7) % 2) : 0;
  if (step === 0) {
    ctx.fillRect(x + 15, y + 27, 5, 13); // front leg extended down
    ctx.fillRect(x + 8,  y + 27, 4,  9); // back leg pulled up
  } else {
    ctx.fillRect(x + 13, y + 27, 4,  9); // front leg pulled up
    ctx.fillRect(x + 9,  y + 27, 5, 13); // back leg extended down
  }

  // Eye
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b0b1a';
  ctx.beginPath();
  ctx.arc(x + 25, y + 6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.arc(x + 26, y + 5, 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

/**
 * Creates a new obstacle at the right edge.
 * @param {number} currentSpeed - current scroll speed (for proportional gap)
 * @returns {{ x: number, w: number, h: number }}
 */
function makeObstacle() {
  const w = randInt(OBS_MIN_W, OBS_MAX_W);
  const h = randInt(OBS_MIN_H, OBS_MAX_H);
  return { x: W, w, h };
}

/**
 * AABB collision check between dino and an obstacle.
 * @param {number} dinoY - top of dino rect
 * @param {{ x: number, w: number, h: number }} obs
 * @returns {boolean}
 */
function collides(dinoY, obs) {
  const dinoLeft = DINO_X;
  const dinoRight = DINO_X + DINO_W;
  const dinoTop = dinoY;
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DinoRunner — endless side-scroller mini-game.
 * Press Space or click the canvas to jump / start / restart.
 */
export default function DinoRunner() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [best, saveScore] = useHighScore('dino');
  const [displayBest, setDisplayBest] = useState(best);

  // -------------------------------------------------------------------------
  // State factory
  // -------------------------------------------------------------------------
  function makeState() {
    return {
      phase: 'idle',          // 'idle' | 'playing' | 'dead'
      dinoY: DINO_GROUND_Y,  // top-left y of dino
      velY: 0,
      onGround: true,
      obstacles: [],
      frame: 0,
      speed: SPEED_INIT,
      score: 0,
      nextObsIn: randInt(OBS_MIN_GAP, OBS_MAX_GAP),
    };
  }

  // -------------------------------------------------------------------------
  // Draw
  // -------------------------------------------------------------------------
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // Background
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.strokeStyle = C_GROUND;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    // Obstacles
    ctx.fillStyle = C_OBS;
    for (const obs of s.obstacles) {
      ctx.fillRect(obs.x, GROUND_Y - obs.h, obs.w, obs.h);
    }

    // Dino
    drawDino(ctx, DINO_X, s.dinoY, s.frame, s.onGround);

    // Score (top-right)
    ctx.fillStyle = C_TEXT;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(s.score), W - 10, 22);

    // Overlay text
    if (s.phase === 'idle') {
      ctx.fillStyle = C_DIM;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('espacio para empezar', W / 2, H / 2);
    }

    if (s.phase === 'dead') {
      ctx.fillStyle = C_DIM;
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('game over — espacio para reiniciar', W / 2, H / 2 - 12);
      ctx.fillText(`puntuación: ${s.score}`, W / 2, H / 2 + 8);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Game loop tick
  // -------------------------------------------------------------------------
  const tick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing') {
      draw();
      return;
    }

    s.frame++;
    s.speed = SPEED_INIT + s.frame * SPEED_INC;
    s.score = Math.floor(s.frame / 5);

    // Dino physics
    if (!s.onGround) {
      s.velY += GRAVITY;
      s.dinoY += s.velY;
    }

    // Land
    if (s.dinoY >= DINO_GROUND_Y) {
      s.dinoY = DINO_GROUND_Y;
      s.velY = 0;
      s.onGround = true;
    }

    // Spawn obstacle
    s.nextObsIn--;
    if (s.nextObsIn <= 0) {
      s.obstacles.push(makeObstacle());
      s.nextObsIn = randInt(OBS_MIN_GAP, OBS_MAX_GAP);
    }

    // Move obstacles
    for (const obs of s.obstacles) {
      obs.x -= s.speed;
    }

    // Cull
    s.obstacles = s.obstacles.filter((o) => o.x + o.w > 0);

    // Collision
    for (const obs of s.obstacles) {
      if (collides(s.dinoY, obs)) {
        s.phase = 'dead';
        const isNew = saveScore(s.score);
        if (isNew) setDisplayBest(s.score);
        draw();
        return;
      }
    }

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, saveScore]);

  // -------------------------------------------------------------------------
  // Jump / start / restart
  // -------------------------------------------------------------------------
  const handleInteract = useCallback(() => {
    const s = stateRef.current;

    if (s.phase === 'idle' || s.phase === 'dead') {
      stateRef.current = makeState();
      stateRef.current.phase = 'playing';
      // Give immediate jump feel on start
      stateRef.current.velY = JUMP_VEL;
      stateRef.current.onGround = false;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (s.phase === 'playing' && s.onGround) {
      s.velY = JUMP_VEL;
      s.onGround = false;
    }
  }, [tick]);

  // -------------------------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInteract();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInteract]);

  // -------------------------------------------------------------------------
  // Mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    stateRef.current = makeState();
    draw();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouch = (e) => { e.preventDefault(); handleInteract(); };
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', onTouch);
  }, [handleInteract]);

  useEffect(() => {
    setDisplayBest(best);
  }, [best]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: 420,
        margin: '0 auto',
        fontFamily: 'monospace',
        color: '#ffffff',
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleInteract}
        style={{
          display: 'block',
          background: C_BG,
          cursor: 'pointer',
          border: '1px solid #ff6eb4',
          borderRadius: 4,
        }}
      />
      <p
        style={{
          marginTop: 10,
          fontSize: 13,
          color: '#ff6eb4',
          letterSpacing: '0.05em',
        }}
      >
        récord: {displayBest}
      </p>
    </div>
  );
}
