import { useEffect, useRef } from 'react';

const STAR_COUNT = 180;

export default function StarfieldBg() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x:       Math.random(),        // normalized 0-1
      y:       Math.random(),
      size:    Math.random() * 1.6 + 0.3,
      speed:   Math.random() * 0.00015 + 0.00005,
      opacity: Math.random() * 0.6 + 0.3,
      phase:   Math.random() * Math.PI * 2,  // twinkle offset
    }));

    let raf;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        // slow drift downward
        s.y += s.speed;
        if (s.y > 1) { s.y = 0; s.x = Math.random(); }

        // subtle twinkle
        const alpha = s.opacity * (0.75 + 0.25 * Math.sin(s.phase + t * 0.018));

        const px = s.x * canvas.width;
        const py = s.y * canvas.height;

        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.fill();
      }

      // occasional neon star (magenta/cyan)
      if (t % 120 === 0) {
        const nx = Math.random() * canvas.width;
        const ny = Math.random() * canvas.height;
        const nc = Math.random() > 0.5 ? '255,0,255' : '0,229,255';
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fillStyle   = `rgba(${nc},0.9)`;
        ctx.shadowColor = `rgba(${nc},0.8)`;
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.shadowBlur  = 0;
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
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
        zIndex:        -1,
        pointerEvents: 'none',
        display:       'block',
      }}
    />
  );
}
