import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const IDLE_MS = 30_000; // 30 seconds

function getActiveScreensaver() {
  try {
    const equipped = JSON.parse(localStorage.getItem('space-dan-shop-equipped') || '{}');
    const purchased = JSON.parse(localStorage.getItem('space-dan-shop-purchased') || '[]');
    const pick = equipped.screensaver;
    if (pick && purchased.includes(pick)) return pick;
  } catch { }
  return 'starfield'; // default always available
}

// ── Starfield (default) ───────────────────────────────────────────────────────
function StarfieldSaver({ canvas }) {
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');

    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random() * c.width - c.width / 2,
      y: Math.random() * c.height - c.height / 2,
      z: Math.random() * c.width,
    }));

    let raf;
    const draw = () => {
      ctx.fillStyle = 'rgba(5,5,16,0.2)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);

      for (const s of stars) {
        s.z -= 6;
        if (s.z <= 0) { s.z = c.width; s.x = Math.random() * c.width - c.width / 2; s.y = Math.random() * c.height - c.height / 2; }
        const k = 128 / s.z;
        const px = s.x * k; const py = s.y * k;
        const size = Math.max(0.5, (1 - s.z / c.width) * 4);
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${180 + size * 15},${80 + size * 20},${255},${0.7 + size * 0.07})`;
        ctx.fill();
      }
      ctx.restore();

      // "SPACE-DAN" text
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = 'rgba(255,110,180,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('· space-dan ·', c.width / 2, c.height - 30);

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [canvas]);
}

// ── Matrix rain ───────────────────────────────────────────────────────────────
function MatrixSaver({ canvas }) {
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const cols = Math.floor(c.width / 16);
    const drops = Array(cols).fill(1);
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF';
    let raf;
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#39ff14';
      ctx.font = '16px monospace';
      drops.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 16, y * 16);
        if (y * 16 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvas]);
}

// ── DVD bounce ────────────────────────────────────────────────────────────────
function DvdSaver({ canvas }) {
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const colors = ['#ff6eb4', '#00e5ff', '#39ff14', '#ffd700', '#ff5500'];
    let x = 80, y = 80, vx = 2.5, vy = 2, ci = 0;
    const W = 120, H = 40;
    let raf;
    const draw = () => {
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, c.width, c.height);
      if (x + W >= c.width || x <= 0) { vx = -vx; ci = (ci + 1) % colors.length; }
      if (y + H >= c.height || y <= 0) { vy = -vy; ci = (ci + 1) % colors.length; }
      x += vx; y += vy;
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = colors[ci];
      ctx.shadowColor = colors[ci];
      ctx.shadowBlur = 20;
      ctx.fillText('space-dan', x, y + H);
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvas]);
}

// ── Pipes ─────────────────────────────────────────────────────────────────────
function PipesSaver({ canvas }) {
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const GRID = 20;
    const cols = Math.floor(c.width / GRID);
    const rows = Math.floor(c.height / GRID);
    const colors = ['#ff6eb4', '#00e5ff', '#39ff14', '#ffd700', '#ff5500', '#aa00ff'];
    ctx.fillStyle = '#050510'; ctx.fillRect(0, 0, c.width, c.height);

    let pipes = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2), dir: 0, color: colors[0], steps: 0 }];
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let raf, frame = 0;

    const draw = () => {
      frame++;
      for (let p of pipes) {
        const [dx, dy] = dirs[p.dir];
        const nx = p.x + dx, ny = p.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
          p.dir = Math.floor(Math.random() * 4); continue;
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = GRID - 4;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(p.x * GRID + GRID / 2, p.y * GRID + GRID / 2);
        ctx.lineTo(nx * GRID + GRID / 2, ny * GRID + GRID / 2);
        ctx.stroke();
        // elbow dot
        ctx.fillStyle = '#ffffff44';
        ctx.beginPath();
        ctx.arc(p.x * GRID + GRID / 2, p.y * GRID + GRID / 2, GRID / 3, 0, Math.PI * 2);
        ctx.fill();

        p.x = nx; p.y = ny; p.steps++;
        if (Math.random() < 0.15) p.dir = Math.floor(Math.random() * 4);
      }
      if (frame % 80 === 0 && pipes.length < 8) {
        pipes.push({ x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows), dir: Math.floor(Math.random() * 4), color: colors[Math.floor(Math.random() * colors.length)], steps: 0 });
      }
      if (frame % 600 === 0) {
        ctx.fillStyle = 'rgba(5,5,16,0.3)'; ctx.fillRect(0, 0, c.width, c.height);
        pipes = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2), dir: 0, color: colors[Math.floor(Math.random() * colors.length)], steps: 0 }];
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvas]);
}

const SAVERS = {
  starfield: StarfieldSaver,
  saver_matrix: MatrixSaver,
  saver_dvd: DvdSaver,
  saver_pipes: PipesSaver,
};

export default function Screensaver() {
  const [active, setActive] = useState(false);
  const [saverKey, setSaverKey] = useState('starfield');
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const activeRef = useRef(false);
  const location = useLocation();

  // Keep ref in sync so the event handler never has stale closure
  useEffect(() => { activeRef.current = active; }, [active]);

  const reset = useCallback(() => {
    if (activeRef.current) { setActive(false); return; }
    clearTimeout(timerRef.current);

    // No activar screensaver en la sección de juegos o en la cabina (Focus Guard)
    if (location.pathname.startsWith('/games') || location.pathname.startsWith('/cabina')) return;

    timerRef.current = setTimeout(() => {
      setSaverKey(getActiveScreensaver());
      setActive(true);
    }, IDLE_MS);
  }, [location.pathname]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset(); // start idle timer on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timerRef.current);
    };
  }, [reset]); // runs when reset changes

  if (!active) return null;

  const SaverComponent = SAVERS[saverKey] || StarfieldSaver;

  return (
    <div
      className="screensaverOverlay"
      onClick={() => setActive(false)}
      onTouchStart={() => setActive(false)}
      aria-label="Screensaver — toca para salir"
    >
      <canvas ref={canvasRef} className="screensaverCanvas" />
      <SaverComponent canvas={canvasRef} />
      <div className="screensaverHint">Toca o mueve el ratón para salir</div>
    </div>
  );
}
