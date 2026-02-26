import { useEffect, useRef } from 'react';

const STAR_COUNT = 180;

const STAR_THEMES = {
  default: { r: 255, g: 255, b: 255, neon: ['255,0,255', '0,229,255'] },
  stars_blue: { r: 0, g: 191, b: 255, neon: ['0,255,255', '0,100,255'] },
  stars_green: { r: 57, g: 255, b: 20, neon: ['0,255,0', '0,180,100'] },
  stars_red: { r: 255, g: 50, b: 50, neon: ['255,0,0', '255,160,0'] },
  stars_purple: { r: 191, g: 0, b: 255, neon: ['255,0,255', '150,0,255'] },
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
      // If the event specifically mentions stars, or it's a general equip, we update
      if (!e.detail || e.detail.category === 'stars') {
        theme = getStarTheme();
      }
    };
    window.addEventListener('dan:item-equipped', onThemeChange);

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2.0 + 0.5, // Increased size slightly
      speed: Math.random() * 0.00015 + 0.00005,
      opacity: Math.random() * 0.7 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf;
    let t = 0;
    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const onMouseMove = (e) => {
      targetMouse.x = e.clientX / window.innerWidth;
      targetMouse.y = e.clientY / window.innerHeight;
    };

    const draw = () => {
      t += 1;
      // Smooth interpolation for mouse
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.y += s.speed;
        if (s.y > 1) { s.y = 0; s.x = Math.random(); }

        const alpha = s.opacity * (0.75 + 0.25 * Math.sin(s.phase + t * 0.018));

        // Parallax offset
        const offsetX = (mouse.x - 0.5) * s.size * 20;
        const offsetY = (mouse.y - 0.5) * s.size * 20;

        const px = s.x * canvas.width + offsetX;
        const py = s.y * canvas.height + offsetY;

        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${theme.r},${theme.g},${theme.b},${alpha.toFixed(2)})`;
        ctx.fill();
      }

      // occasional neon accent star
      if (t % 120 === 0) {
        const nx = Math.random() * canvas.width;
        const ny = Math.random() * canvas.height;
        const nc = theme.neon[Math.random() > 0.5 ? 0 : 1];
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nc},0.9)`;
        ctx.shadowColor = `rgba(${nc},0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
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
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
