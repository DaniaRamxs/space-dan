import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

const CURSOR_PALETTES = {
  default: () => Math.random() > 0.5 ? '#00e5ff' : '#ff00ff',
  cursor_cyan: () => Math.random() > 0.4 ? '#00e5ff' : '#00bcd4',
  cursor_green: () => Math.random() > 0.4 ? '#39ff14' : '#00ff88',
  cursor_gold: () => Math.random() > 0.4 ? '#ffd700' : '#ffaa00',
  cursor_rainbow: () => `hsl(${Math.random() * 360},100%,60%)`,
  cursor_pink: () => Math.random() > 0.4 ? '#ff69b4' : '#ff1493',
  cursor_white: () => Math.random() > 0.4 ? '#f0f0f0' : '#c0c0c0',
};

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export default function CursorTrail() {
  const { profile, user } = useAuthContext();

  // En móvil/touch no hay cursor, no tiene sentido el trail
  if (isTouch) return null;
  const [equippedItem, setEquippedItem] = useState('default');
  const equippedRef = useRef('default');

  // Función para obtener el color actual basado en el item equipado
  const getParticleColor = useCallback(() => {
    const theme = equippedRef.current;
    if (theme && CURSOR_PALETTES[theme]) {
      return CURSOR_PALETTES[theme]();
    }
    return CURSOR_PALETTES.default();
  }, []);

  // Sincronizar item equipado (DB o LocalStorage)
  useEffect(() => {
    const syncCursor = () => {
      const dbCursor = profile?.equipped_items?.cursor;
      const localEquipped = JSON.parse(localStorage.getItem('space-dan-shop-equipped') || '{}');
      const finalId = dbCursor || localEquipped.cursor || 'default';
      setEquippedItem(finalId);
      equippedRef.current = finalId;
    };

    syncCursor();

    // Escuchar cambios manuales desde la tienda
    window.addEventListener('dan:item-equipped', syncCursor);
    return () => window.removeEventListener('dan:item-equipped', syncCursor);
  }, [profile, user]);

  useEffect(() => {
    let last = 0;

    const onMove = (e) => {
      const now = Date.now();
      if (now - last < 25) return; // ~40 particles/sec max
      last = now;

      const size = 5 + Math.random() * 7;
      const color = getParticleColor();
      const tx = (Math.random() - 0.5) * 20;
      const ty = -(8 + Math.random() * 14);

      const el = document.createElement('span');
      Object.assign(el.style, {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: '9997',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size + 5}px ${color}`,
        left: `${e.clientX - size / 2}px`,
        top: `${e.clientY - size / 2}px`,
        opacity: '0.9',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        transform: 'scale(1) translate(0,0)',
      });

      document.body.appendChild(el);

      requestAnimationFrame(() => {
        el.style.opacity = '0';
        el.style.transform = `scale(0.1) translate(${tx}px, ${ty}px)`;
      });

      setTimeout(() => el.remove(), 520);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [getParticleColor]);

  return null;
}
