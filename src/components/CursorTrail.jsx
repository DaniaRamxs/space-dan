import { useEffect, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

const CURSOR_PALETTES = {
  default:        () => Math.random() > 0.5 ? [0,229,255]   : [255,0,255],
  cursor_cyan:    () => Math.random() > 0.4 ? [0,229,255]   : [0,188,212],
  cursor_green:   () => Math.random() > 0.4 ? [57,255,20]   : [0,255,136],
  cursor_gold:    () => Math.random() > 0.4 ? [255,215,0]   : [255,170,0],
  cursor_rainbow: () => hslToRgb(Math.random() * 360, 100, 60),
  cursor_pink:    () => Math.random() > 0.4 ? [255,105,180] : [255,20,147],
  cursor_white:   () => Math.random() > 0.4 ? [240,240,240] : [192,192,192],
};

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const isTouch = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export default function CursorTrail() {
  const { profile, user } = useAuthContext();

  if (isTouch) return null;

  const canvasRef   = useRef(null);
  const equippedRef = useRef('default');

  // Sincronizar paleta equipada (sin re-render)
  useEffect(() => {
    const sync = () => {
      const dbCursor = profile?.equipped_items?.cursor;
      const local    = JSON.parse(localStorage.getItem('space-dan-shop-equipped') || '{}');
      equippedRef.current = dbCursor || local.cursor || 'default';
    };
    sync();
    window.addEventListener('dan:item-equipped', sync);
    return () => window.removeEventListener('dan:item-equipped', sync);
  }, [profile, user]);

  // Canvas: un único RAF loop, sin DOM por partícula
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let raf;
    let lastSpawn = 0;
    const particles = []; // { x,y,r,g,b,size,alpha,tx,ty,life,maxLife }

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const onMove = (e) => {
      const now = Date.now();
      if (now - lastSpawn < 40) return; // ~25/seg
      lastSpawn = now;

      const palette  = CURSOR_PALETTES[equippedRef.current] ?? CURSOR_PALETTES.default;
      const [r, g, b] = palette();
      const maxLife  = 450;
      particles.push({
        x: e.clientX,
        y: e.clientY,
        r, g, b,
        size:    4 + Math.random() * 5,
        alpha:   0.85,
        tx:      (Math.random() - 0.5) * 20,
        ty:      -(8 + Math.random() * 14),
        life:    maxLife,
        maxLife,
      });
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 16;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const t     = 1 - p.life / p.maxLife;   // 0→1
        const alpha = p.alpha * (1 - t);
        const x     = p.x + p.tx * t;
        const y     = p.y + p.ty * t;
        const size  = Math.max(p.size * (1 - t * 0.9), 0.5);

        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(2)})`;
        ctx.fill();
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      particles.length = 0;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        9997,
      }}
    />
  );
}
