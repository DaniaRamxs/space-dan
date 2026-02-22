import { useEffect } from 'react';

const CURSOR_PALETTES = {
  default:        () => Math.random() > 0.5 ? '#00e5ff' : '#ff00ff',
  cursor_cyan:    () => Math.random() > 0.4 ? '#00e5ff' : '#00bcd4',
  cursor_green:   () => Math.random() > 0.4 ? '#39ff14' : '#00ff88',
  cursor_gold:    () => Math.random() > 0.4 ? '#ffd700' : '#ffaa00',
  cursor_rainbow: () => `hsl(${Math.random() * 360},100%,60%)`,
};

function getColor() {
  try {
    const equipped  = JSON.parse(localStorage.getItem('space-dan-shop-equipped') || '{}');
    const purchased = JSON.parse(localStorage.getItem('space-dan-shop-purchased') || '[]');
    const theme = equipped.cursor;
    if (theme && purchased.includes(theme) && CURSOR_PALETTES[theme]) {
      return CURSOR_PALETTES[theme]();
    }
  } catch {}
  return CURSOR_PALETTES.default();
}

export default function CursorTrail() {
  useEffect(() => {
    let last = 0;

    const onMove = (e) => {
      const now = Date.now();
      if (now - last < 25) return; // ~40 particles/sec max
      last = now;

      const size  = 5 + Math.random() * 7;
      const color = getColor();
      const tx = (Math.random() - 0.5) * 20;
      const ty = -(8 + Math.random() * 14);

      const el = document.createElement('span');
      Object.assign(el.style, {
        position:      'fixed',
        pointerEvents: 'none',
        zIndex:        '9997',
        width:         `${size}px`,
        height:        `${size}px`,
        borderRadius:  '50%',
        background:    color,
        boxShadow:     `0 0 ${size + 5}px ${color}`,
        left:          `${e.clientX - size / 2}px`,
        top:           `${e.clientY - size / 2}px`,
        opacity:       '0.9',
        transition:    'opacity 0.5s ease, transform 0.5s ease',
        transform:     'scale(1) translate(0,0)',
      });

      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.style.opacity   = '0';
        el.style.transform = `scale(0.1) translate(${tx}px, ${ty}px)`;
      });

      setTimeout(() => el.remove(), 520);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return null;
}
