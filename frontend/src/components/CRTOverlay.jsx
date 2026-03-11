import { useState } from 'react';

export default function CRTOverlay() {
  const [on, setOn] = useState(false);

  return (
    <>
      {on && (
        <>
          {/* Scanlines */}
          <div style={{
            position:        'fixed',
            inset:           0,
            zIndex:          9000,
            pointerEvents:   'none',
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 1px, transparent 4px)',
            backgroundSize:  '100% 4px',
          }} />
          {/* Vignette */}
          <div style={{
            position:      'fixed',
            inset:         0,
            zIndex:        9000,
            pointerEvents: 'none',
            background:    'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.55) 100%)',
          }} />
        </>
      )}

      <button
        onClick={() => setOn(o => !o)}
        title="Toggle efecto CRT"
        style={{
          position:     'fixed',
          bottom:       60,
          left:         14,
          zIndex:       9001,
          padding:      '4px 11px',
          background:   on ? 'rgba(0,229,255,0.12)' : 'rgba(0,0,0,0.45)',
          border:       `1px solid ${on ? 'rgba(0,229,255,0.45)' : 'rgba(255,255,255,0.14)'}`,
          borderRadius: 999,
          color:        on ? '#00e5ff' : 'rgba(255,255,255,0.45)',
          fontSize:     10,
          cursor:       'pointer',
          letterSpacing:'0.08em',
          textTransform:'uppercase',
          transition:   'all 0.2s ease',
          boxShadow:    on ? '0 0 8px rgba(0,229,255,0.3)' : 'none',
        }}
      >
        📺 CRT {on ? 'ON' : 'OFF'}
      </button>
    </>
  );
}
