import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';

const CANVAS_W  = 320;
const CANVAS_H  = 400;
const BASKET_W  = 60;
const BASKET_H  = 12;
const BASKET_Y  = CANVAS_H - 28;
const BASKET_SPD = 5;
const BALL_R    = 8;

/** @returns {string} a random neon color */
function randomNeon() {
  const colors = ['#ff6eb4', '#00e5ff', '#39ff14', '#bf5fff', '#ff9500', '#ff3131'];
  return colors[Math.floor(Math.random() * colors.length)];
}

/** @returns {{ x: number, y: number, vy: number, color: string, id: number }} */
let uid = 0;
function spawnBall(score) {
  const baseSpeed = 1.5 + score * 0.08;
  const speed = Math.min(baseSpeed, 6);
  return {
    x: BALL_R + Math.random() * (CANVAS_W - BALL_R * 2),
    y: -BALL_R,
    vy: speed,
    color: randomNeon(),
    id: uid++,
  };
}

const STYLES = {
  wrapper: {
    maxWidth: '420px',
    margin: '0 auto',
    background: '#111',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    fontFamily: 'monospace',
    color: '#00e5ff',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '13px',
    letterSpacing: '3px',
    color: '#ff6eb4',
    marginBottom: '12px',
  },
  canvas: {
    display: 'block',
    cursor: 'pointer',
    border: '1px solid rgba(255,110,180,0.3)',
  },
  record: {
    marginTop: '10px',
    fontSize: '11px',
    color: 'rgba(255,110,180,0.6)',
    letterSpacing: '1px',
  },
};

/**
 * CatchGame — catch falling balls with the basket.
 * @returns {JSX.Element}
 */
export default function CatchGame() {
  const [best, saveScore] = useHighScore('catch');

  const canvasRef  = useRef(null);
  const stateRef   = useRef({
    phase:    'idle',   // 'idle' | 'playing' | 'over'
    score:    0,
    lives:    3,
    basketX:  CANVAS_W / 2 - BASKET_W / 2,
    balls:    [],
    keys:     {},
    lastSpawn: 0,
    spawnInterval: 1200, // ms between spawns
    animId:   null,
  });

  // Expose for score display after game over
  const [displayScore, setDisplayScore] = useState(0);

  // Draw everything on canvas
  const draw = useCallback((ctx, s) => {
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (s.phase === 'idle') {
      ctx.fillStyle = '#00e5ff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('click para empezar', CANVAS_W / 2, CANVAS_H / 2);
      return;
    }

    if (s.phase === 'over') {
      ctx.fillStyle = '#ff6eb4';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('game over', CANVAS_W / 2, CANVAS_H / 2 - 20);
      ctx.fillStyle = '#00e5ff';
      ctx.font = '13px monospace';
      ctx.fillText(`puntos: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 8);
      ctx.fillStyle = 'rgba(255,110,180,0.6)';
      ctx.font = '11px monospace';
      ctx.fillText('click para reiniciar', CANVAS_W / 2, CANVAS_H / 2 + 32);
      return;
    }

    // Balls
    s.balls.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Basket
    const bx = s.basketX;
    ctx.fillStyle = '#ff6eb4';
    ctx.shadowColor = '#ff6eb4';
    ctx.shadowBlur = 10;
    ctx.fillRect(bx, BASKET_Y, BASKET_W, BASKET_H);
    ctx.shadowBlur = 0;

    // HUD — score
    ctx.fillStyle = '#00e5ff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`puntos: ${s.score}`, 10, 20);

    // HUD — lives as hearts
    ctx.textAlign = 'right';
    const hearts = '❤️'.repeat(s.lives) || '';
    ctx.font = '13px monospace';
    ctx.fillText(hearts, CANVAS_W - 8, 20);
  }, []);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.phase         = 'playing';
    s.score         = 0;
    s.lives         = 3;
    s.basketX       = CANVAS_W / 2 - BASKET_W / 2;
    s.balls         = [];
    s.keys          = {};
    s.lastSpawn     = performance.now();
    s.spawnInterval = 1200;
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s   = stateRef.current;
    let running = true;

    const loop = (now) => {
      if (!running) return;
      const state = stateRef.current;

      if (state.phase === 'playing') {
        // Move basket
        if (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']) {
          state.basketX = Math.max(0, state.basketX - BASKET_SPD);
        }
        if (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']) {
          state.basketX = Math.min(CANVAS_W - BASKET_W, state.basketX + BASKET_SPD);
        }

        // Spawn balls
        if (now - state.lastSpawn > state.spawnInterval) {
          state.balls.push(spawnBall(state.score));
          state.lastSpawn = now;
          // Increase difficulty
          state.spawnInterval = Math.max(400, state.spawnInterval - 15);
        }

        // Move & check balls
        const remaining = [];
        for (const b of state.balls) {
          b.y += b.vy;
          if (b.y - BALL_R > CANVAS_H) {
            // Missed
            state.lives -= 1;
            if (state.lives <= 0) {
              state.phase = 'over';
              saveScore(state.score);
              setDisplayScore(state.score);
              break;
            }
          } else {
            // Check catch
            const caught =
              b.y + BALL_R >= BASKET_Y &&
              b.y - BALL_R <= BASKET_Y + BASKET_H &&
              b.x + BALL_R >= state.basketX &&
              b.x - BALL_R <= state.basketX + BASKET_W;
            if (!caught) remaining.push(b);
            else state.score += 1;
          }
        }
        if (state.phase === 'playing') state.balls = remaining;
      }

      draw(ctx, state);
      state.animId = requestAnimationFrame(loop);
    };

    s.animId = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (s.animId) cancelAnimationFrame(s.animId);
    };
  }, [draw, saveScore]);

  // Key listeners
  useEffect(() => {
    const down = (e) => {
      stateRef.current.keys[e.key] = true;
      if (['ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    };
    const up = (e) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  // Touch: drag finger to move basket
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const getCanvasX = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (CANVAS_W / rect.width);
    };
    const onTouchStart = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.phase === 'idle' || s.phase === 'over') { startGame(); return; }
      const tx = getCanvasX(e.touches[0].clientX);
      s.basketX = Math.max(0, Math.min(CANVAS_W - BASKET_W, tx - BASKET_W / 2));
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s.phase !== 'playing') return;
      const tx = getCanvasX(e.touches[0].clientX);
      s.basketX = Math.max(0, Math.min(CANVAS_W - BASKET_W, tx - BASKET_W / 2));
    };
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
    };
  }, [startGame]);

  const handleCanvasClick = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'idle' || s.phase === 'over') {
      startGame();
    }
  }, [startGame]);

  return (
    <div style={STYLES.wrapper}>
      <p style={STYLES.title}>atrapa</p>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={STYLES.canvas}
        onClick={handleCanvasClick}
        aria-label="juego de atrapar — haz click para empezar, usa flechas o A/D para mover la cesta"
      />
      {best > 0 && (
        <p style={STYLES.record}>record: {best} puntos</p>
      )}
    </div>
  );
}
