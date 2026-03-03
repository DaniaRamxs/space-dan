import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const CANVAS_W = 320;
const CANVAS_H = 400;
const BASKET_W = 60;
const BASKET_H = 12;
const BASKET_Y = CANVAS_H - 40;
const BASKET_SPD = 6;
const BALL_R = 10;

function randomNeon() {
  const colors = ['#ff6eb4', '#00e5ff', '#39ff14', '#bf5fff', '#ff9500', '#ff3131'];
  return colors[Math.floor(Math.random() * colors.length)];
}

let uid = 0;
function spawnBall(score) {
  const baseSpeed = 1.8 + score * 0.1;
  const speed = Math.min(baseSpeed, 6.5);
  return {
    x: BALL_R + Math.random() * (CANVAS_W - BALL_R * 2),
    y: -BALL_R,
    vy: speed,
    color: randomNeon(),
    id: uid++,
  };
}

function CatchGameInner() {
  const [best, saveScore] = useHighScore('catch');
  const [status, setStatus] = useState('IDLE'); // IDLE | PLAYING | DEAD
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const canvasRef = useRef(null);
  const stateRef = useRef({
    basketX: CANVAS_W / 2 - BASKET_W / 2,
    balls: [],
    keys: {},
    lastSpawn: 0,
    spawnInterval: 1200,
  });

  const {
    particles, floatingTexts, scoreControls,
    triggerHaptic, spawnParticles, triggerFloatingText, animateScore
  } = useArcadeSystems();

  const draw = useCallback((ctx) => {
    const s = stateRef.current;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Balls
    s.balls.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Basket
    ctx.fillStyle = '#ff6eb4';
    ctx.shadowColor = '#ff6eb4';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(s.basketX, BASKET_Y, BASKET_W, BASKET_H, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const start = useCallback(() => {
    const s = stateRef.current;
    s.basketX = CANVAS_W / 2 - BASKET_W / 2;
    s.balls = [];
    s.keys = {};
    s.lastSpawn = performance.now();
    s.spawnInterval = 1200;

    setScore(0);
    setLives(3);
    setStatus('PLAYING');
    triggerHaptic('medium');
  }, [triggerHaptic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    const loop = (now) => {
      const s = stateRef.current;
      if (status === 'PLAYING') {
        if (s.keys['ArrowLeft'] || s.keys['a']) s.basketX = Math.max(0, s.basketX - BASKET_SPD);
        if (s.keys['ArrowRight'] || s.keys['d']) s.basketX = Math.min(CANVAS_W - BASKET_W, s.basketX + BASKET_SPD);

        if (now - s.lastSpawn > s.spawnInterval) {
          s.balls.push(spawnBall(score));
          s.lastSpawn = now;
          s.spawnInterval = Math.max(350, s.spawnInterval - 12);
        }

        const remaining = [];
        for (const b of s.balls) {
          b.y += b.vy;
          if (b.y - BALL_R > CANVAS_H) {
            setLives(l => {
              const next = l - 1;
              if (next <= 0) {
                setStatus('DEAD');
                saveScore(score);
                triggerHaptic('heavy');
              } else {
                triggerHaptic('medium');
              }
              return next;
            });
          } else {
            const caught = b.y + BALL_R >= BASKET_Y && b.y - BALL_R <= BASKET_Y + BASKET_H &&
              b.x + BALL_R >= s.basketX && b.x - BALL_R <= s.basketX + BASKET_W;
            if (caught) {
              setScore(sc => {
                const ns = sc + 1;
                animateScore();
                return ns;
              });
              triggerHaptic('light');
              triggerFloatingText('+1', b.x, b.y, b.color);
              spawnParticles(b.x, b.y, b.color, 8);
            } else {
              remaining.push(b);
            }
          }
        }
        s.balls = remaining;
      }
      draw(ctx);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, score, draw, saveScore, triggerHaptic, triggerFloatingText, spawnParticles, animateScore]);

  useEffect(() => {
    const down = (e) => { stateRef.current.keys[e.key] = true; };
    const up = (e) => { stateRef.current.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Touch: drag finger to move basket
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const move = (e) => {
      if (status !== 'PLAYING') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tx = (e.touches[0].clientX - rect.left) * (CANVAS_W / rect.width);
      stateRef.current.basketX = Math.max(0, Math.min(CANVAS_W - BASKET_W, tx - BASKET_W / 2));
    };
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', (e) => e.preventDefault());
      canvas.removeEventListener('touchmove', move);
    };
  }, [status]);

  return (
    <ArcadeShell
      title="Neon Catch"
      score={score}
      bestScore={best}
      status={status}
      onRetry={start}
      scoreControls={scoreControls}
      particles={particles}
      floatingTexts={floatingTexts}
      subTitle="Atrapa todos los núcleos de energía."
    >
      <div style={{ position: 'relative' }}>
        {status === 'PLAYING' && (
          <div style={{ position: 'absolute', top: -40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{
                color: i < lives ? '#ff6eb4' : 'rgba(255,255,255,0.1)',
                filter: i < lives ? 'drop-shadow(0 0 5px #ff6eb4)' : 'none',
                fontSize: 18
              }}>
                ♥
              </div>
            ))}
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            display: 'block',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 24,
            border: '1px solid rgba(255,110,180,0.1)',
            cursor: 'pointer',
            touchAction: 'none'
          }}
          onClick={() => status !== 'PLAYING' && start()}
        />
      </div>
    </ArcadeShell>
  );
}

export default function CatchGame() {
  return (
    <GameImmersiveLayout>
      <CatchGameInner />
    </GameImmersiveLayout>
  );
}
