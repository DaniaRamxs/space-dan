import { useEffect, useRef, useCallback, useState } from 'react';
import useHighScore from '../hooks/useHighScore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const W = 320;
const H = 480;
const BIRD_X = 60;
const BIRD_R = 12;          // circle radius
const GRAVITY = 0.25;
const FLAP_VEL = -5;
const PIPE_W = 40;
const PIPE_GAP = 120;
const PIPE_SPEED = 2;        // px per frame
const PIPE_MIN_INTERVAL = 80;
const PIPE_MAX_INTERVAL = 100;
const CEILING = 0;
const FLOOR = H;

const C_BG = '#111111';
const C_BIRD = '#ff6eb4';    // magenta
const C_PIPE = '#00e5ff';    // cyan
const C_TEXT = '#ffffff';
const C_DIM = 'rgba(255,255,255,0.45)';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns a random integer in [min, max] (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates a new pipe object at the right edge of the canvas.
 * @returns {{ x: number, topH: number, passed: boolean }}
 */
function makePipe() {
  // topH = height of the top pipe section (gap starts below it)
  const topH = randInt(40, H - PIPE_GAP - 40);
  return { x: W, topH, passed: false };
}

/**
 * Checks whether the bird circle overlaps any pipe rectangle.
 * @param {number} birdY
 * @param {{ x: number, topH: number }[]} pipes
 * @returns {boolean}
 */
function checkCollision(birdY, pipes) {
  // floor / ceiling
  if (birdY + BIRD_R >= FLOOR || birdY - BIRD_R <= CEILING) return true;

  for (const pipe of pipes) {
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_W;
    const gapTop = pipe.topH;
    const gapBottom = pipe.topH + PIPE_GAP;

    // Broad-phase: is the bird horizontally near this pipe?
    if (BIRD_X + BIRD_R > pipeLeft && BIRD_X - BIRD_R < pipeRight) {
      // Bird must be within the gap vertically to be safe
      if (birdY - BIRD_R < gapTop || birdY + BIRD_R > gapBottom) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FlappyBird — canvas-based mini-game.
 * Click the canvas or press Space to flap.
 */
export default function FlappyBird() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null); // mutable game state (avoids stale closures)
  const rafRef = useRef(null);
  const [best, saveScore] = useHighScore('flappy');
  // We keep a react-state copy of best so the label re-renders after saveScore
  const [displayBest, setDisplayBest] = useState(best);

  // -------------------------------------------------------------------------
  // Game state factory
  // -------------------------------------------------------------------------
  function makeState() {
    return {
      phase: 'idle',   // 'idle' | 'playing' | 'dead'
      birdY: H / 2,
      velY: 0,
      pipes: [],
      score: 0,
      frame: 0,
      nextPipeIn: randInt(PIPE_MIN_INTERVAL, PIPE_MAX_INTERVAL),
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

    // Pipes
    ctx.fillStyle = C_PIPE;
    for (const pipe of s.pipes) {
      // top pipe
      ctx.fillRect(pipe.x, 0, PIPE_W, pipe.topH);
      // bottom pipe
      const bottomY = pipe.topH + PIPE_GAP;
      ctx.fillRect(pipe.x, bottomY, PIPE_W, H - bottomY);
    }

    // Bird
    ctx.beginPath();
    ctx.arc(BIRD_X, s.birdY, BIRD_R, 0, Math.PI * 2);
    ctx.fillStyle = C_BIRD;
    ctx.fill();

    // Score (top-left)
    ctx.fillStyle = C_TEXT;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(s.score), 10, 28);

    // Overlay text
    if (s.phase === 'idle') {
      ctx.fillStyle = C_DIM;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('click para empezar', W / 2, H / 2);
    }

    if (s.phase === 'dead') {
      ctx.fillStyle = C_DIM;
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('game over — click para reiniciar', W / 2, H / 2 - 16);
      ctx.fillText(`puntuación: ${s.score}`, W / 2, H / 2 + 12);
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

    // Physics
    s.velY += GRAVITY;
    s.birdY += s.velY;
    s.frame++;

    // Spawn pipes
    s.nextPipeIn--;
    if (s.nextPipeIn <= 0) {
      s.pipes.push(makePipe());
      s.nextPipeIn = randInt(PIPE_MIN_INTERVAL, PIPE_MAX_INTERVAL);
    }

    // Move pipes & score
    for (const pipe of s.pipes) {
      pipe.x -= PIPE_SPEED;
      if (!pipe.passed && pipe.x + PIPE_W < BIRD_X) {
        pipe.passed = true;
        s.score++;
      }
    }

    // Cull off-screen pipes
    s.pipes = s.pipes.filter((p) => p.x + PIPE_W > 0);

    // Collision
    if (checkCollision(s.birdY, s.pipes)) {
      s.phase = 'dead';
      const isNew = saveScore(s.score);
      if (isNew) setDisplayBest(s.score);
    }

    draw();

    rafRef.current = requestAnimationFrame(tick);
  }, [draw, saveScore]);

  // -------------------------------------------------------------------------
  // Start / flap handler
  // -------------------------------------------------------------------------
  const handleInteract = useCallback(() => {
    const s = stateRef.current;

    if (s.phase === 'idle' || s.phase === 'dead') {
      // (Re)start
      stateRef.current = makeState();
      stateRef.current.phase = 'playing';
      stateRef.current.velY = FLAP_VEL;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    if (s.phase === 'playing') {
      s.velY = FLAP_VEL;
    }
  }, [tick]);

  // -------------------------------------------------------------------------
  // Keyboard listener
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
  // Mount: init state and draw idle screen
  // -------------------------------------------------------------------------
  useEffect(() => {
    stateRef.current = makeState();
    draw();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch support — passive: false needed to prevent page scroll while playing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onTouch = (e) => { e.preventDefault(); handleInteract(); };
    canvas.addEventListener('touchstart', onTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', onTouch);
  }, [handleInteract]);

  // Keep displayBest in sync when the hook re-reads from localStorage
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
