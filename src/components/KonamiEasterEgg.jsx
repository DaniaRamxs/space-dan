import { useEffect, useState } from 'react';

const SEQUENCE = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'b','a',
];

export default function KonamiEasterEgg() {
  const [active, setActive] = useState(false);
  const buf = [];

  useEffect(() => {
    const onKey = (e) => {
      buf.push(e.key);
      if (buf.length > SEQUENCE.length) buf.shift();
      if (buf.join(',') === SEQUENCE.join(',')) {
        setActive(true);
        setTimeout(() => setActive(false), 5000);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!active) return null;

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         99999,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.88)',
      animation:      'konamiFade 5s ease forwards',
      pointerEvents:  'none',
    }}>
      <style>{`
        @keyframes konamiFade {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes konamiFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes konamiGlitch {
          0%, 92%, 100% { text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff; }
          93% { text-shadow: 4px 0 0 #00e5ff, -4px 0 0 #ff00ff; transform: skewX(-8deg); }
          95% { text-shadow: -4px 0 0 #00e5ff, 4px 0 0 #ff00ff; transform: skewX(4deg); }
        }
      `}</style>

      <div style={{ fontSize: 72, animation: 'konamiFloat 1.2s ease-in-out infinite' }}>
        🦀
      </div>

      <div style={{
        marginTop:      20,
        fontSize:       26,
        fontWeight:     900,
        letterSpacing:  6,
        textTransform:  'uppercase',
        background:     'linear-gradient(90deg, #ff00ff, #00e5ff, #ff00ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor:  'transparent',
        backgroundSize: '200% auto',
        animation:      'logoShimmer 1s linear infinite, konamiGlitch 3s ease-in-out infinite',
      }}>
        konami code!
      </div>

      <div style={{
        marginTop:  12,
        fontSize:   13,
        color:      'rgba(255,255,255,0.55)',
        letterSpacing: 2,
      }}>
        encontraste el código secreto :3
      </div>
    </div>
  );
}
