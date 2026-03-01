import { useEffect, useRef } from 'react';

const isMobile = () => window.innerWidth < 768 || ('ontouchstart' in window);
const STAR_COUNT = isMobile() ? 60 : 120;
const NEBULA_COUNT = isMobile() ? 1 : 3;
const FRAME_INTERVAL = isMobile() ? 1000 / 30 : 0; // 30fps móvil, sin límite PC

const STAR_THEMES = {
  default: { r: 255, g: 255, b: 255, nebula: 'rgba(139, 92, 246, 0.03)' },
  stars_blue: { r: 0, g: 191, b: 255, nebula: 'rgba(6, 182, 212, 0.03)' },
  stars_green: { r: 57, g: 255, b: 20, nebula: 'rgba(16, 185, 129, 0.03)' },
  stars_red: { r: 255, g: 50, b: 50, nebula: 'rgba(244, 63, 94, 0.03)' },
  stars_purple: { r: 191, g: 0, b: 255, nebula: 'rgba(168, 85, 247, 0.03)' },
};

function getStarTheme() {
  try {
    const equipped = JSON.parse(localStorage.getItem('space-dan-shop-equipped') || '{}');
    const pick = equipped.stars;
    if (pick && STAR_THEMES[pick]) return STAR_THEMES[pick];
  } catch { }
  return STAR_THEMES.default;
}

export default function StarfieldBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let theme = getStarTheme();

    const onThemeChange = (e) => {
      if (!e.detail || e.detail.category === 'stars') {
        theme = getStarTheme();
      }
    };
    window.addEventListener('dan:item-equipped', onThemeChange);

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.2 + 0.2,
      speed: Math.random() * 0.00008 + 0.00002,
      opacity: Math.random() * 0.4 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));

    const nebulas = Array.from({ length: NEBULA_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      rad: Math.random() * 400 + 200,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.0005 + 0.0002
    }));

    let raf;
    let t = 0;
    let lastFrameTime = 0;
    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };
    // Cached dimensions para evitar layout thrashing en draw loop
    let W = window.innerWidth;
    let H = window.innerHeight;
    const mobile = isMobile();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    };

    const onMouseMove = (e) => {
      targetMouse.x = e.clientX / W;
      targetMouse.y = e.clientY / H;
    };

    const draw = (timestamp) => {
      raf = requestAnimationFrame(draw);

      // Throttle FPS en móvil
      if (FRAME_INTERVAL > 0 && timestamp - lastFrameTime < FRAME_INTERVAL) return;
      lastFrameTime = timestamp;

      t += 1;
      // En móvil no hay mouse parallax, skip la interpolación
      if (!mobile) {
        mouse.x += (targetMouse.x - mouse.x) * 0.03;
        mouse.y += (targetMouse.y - mouse.y) * 0.03;
      }

      ctx.clearRect(0, 0, W, H);

      // 1. Subtle Nebulas (Atmosphere)
      for (const n of nebulas) {
        const nx = (n.x * W) + (mouse.x - 0.5) * 50;
        const ny = (n.y * H) + (mouse.y - 0.5) * 50;
        const drift = Math.sin(n.phase + t * n.speed) * 20;

        const grad = ctx.createRadialGradient(nx + drift, ny + drift, 0, nx + drift, ny + drift, n.rad);
        grad.addColorStop(0, theme.nebula);
        grad.addColorStop(0.5, theme.nebula.replace('0.03', '0.01'));
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Elegant Stars — sin shadowBlur (muy costoso en GPU)
      ctx.shadowBlur = 0;
      for (const s of stars) {
        s.y -= s.speed;
        if (s.y < 0) { s.y = 1; s.x = Math.random(); }

        const alpha = s.opacity * (0.6 + 0.4 * Math.sin(s.phase + t * 0.012));

        const offsetX = mobile ? 0 : (mouse.x - 0.5) * s.size * 30;
        const offsetY = mobile ? 0 : (mouse.y - 0.5) * s.size * 30;

        const px = s.x * W + offsetX;
        const py = s.y * H + offsetY;

        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${theme.r},${theme.g},${theme.b},${alpha.toFixed(2)})`;
        ctx.fill();
      }
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (!mobile) window.addEventListener('mousemove', onMouseMove, { passive: true });
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (!mobile) window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('dan:item-equipped', onThemeChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -2, // Lower than potential content backgrounds
        pointerEvents: 'none',
        display: 'block',
        backgroundColor: '#030308', // True deep space
      }}
    />
  );
}
