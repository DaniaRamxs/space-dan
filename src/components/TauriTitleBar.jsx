import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function TauriTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const appWindowRef = useRef(null);

  useEffect(() => {
    let unlisten = null;

    const setup = async () => {
      const tauriDetected =
        (window).__TAURI_INTERNALS__ !== undefined ||
        (window).__TAURI__ !== undefined ||
        window.location.hostname === 'tauri.localhost' ||
        window.location.protocol === 'tauri:';

      if (!tauriDetected) return;
      setIsTauri(true);

      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const appWindow = getCurrentWindow();
      appWindowRef.current = appWindow;

      setIsMaximized(await appWindow.isMaximized());
      unlisten = await appWindow.onResized(async () => {
        setIsMaximized(await appWindow.isMaximized());
      });
      document.body.style.paddingTop = '36px';
    };

    setup();

    return () => {
      if (unlisten) unlisten();
      document.body.style.paddingTop = '';
    };
  }, []);

  const WinBtn = ({ onClick, children, danger }) => (
    <button
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#c42b1c' : 'rgba(255,255,255,0.09)';
        e.currentTarget.style.color = '#fff';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
      }}
      style={{
        width: 46, height: 36,
        background: 'transparent',
        border: 'none',
        color: 'rgba(255,255,255,0.5)',
        cursor: 'default',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11,
        transition: 'background 0.1s, color 0.1s',
        flexShrink: 0,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {children}
    </button>
  );

  if (!isTauri) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 36,
        background: 'rgba(5,5,16,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'stretch',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 999999,
      }}
    >
      {/* Zona de arrastre — flex-1, nunca superpuesta con los botones */}
      <div
        data-tauri-drag-region
        style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 14, cursor: 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
          <svg
            viewBox="55 30 175 165"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 14, height: 14, overflow: 'visible', filter: 'drop-shadow(0 0 3px rgba(62,217,237,0.4))' }}
          >
            <defs>
              <linearGradient id="iconGradTauri" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#4B76F7" />
                <stop offset="100%" stopColor="#3ED9ED" />
              </linearGradient>
            </defs>
            <g transform="translate(30, 20)">
              <path d="M190 40 L160 160" stroke="#3ED9ED" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
              <path d="M190 40 L90 70" stroke="#3ED9ED" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
              <path d="M160 160 L90 70" stroke="#3ED9ED" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
              <path d="M90 70 L50 110" stroke="#3ED9ED" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
              <path d="M160 160 L50 110" stroke="#3ED9ED" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
              <path d="M22 135 C 25 180, 100 170, 195 45 C 130 110, 50 160, 22 135 Z" fill="url(#iconGradTauri)" />
              <path d="M22 135 C 15 110, 40 100, 65 105" stroke="url(#iconGradTauri)" strokeWidth="4" fill="none" strokeLinecap="round" />
              <circle cx="190" cy="40" r="14" fill="url(#iconGradTauri)" />
              <circle cx="90" cy="70" r="10" fill="url(#iconGradTauri)" />
              <circle cx="160" cy="160" r="11" fill="url(#iconGradTauri)" />
              <circle cx="50" cy="110" r="7" fill="url(#iconGradTauri)" />
            </g>
          </svg>
        </div>
      </div>

      {/* Window controls — elemento hermano del drag region, nunca solapado */}
      <div style={{ display: 'flex' }}>
        <WinBtn onClick={() => appWindowRef.current?.minimize()}>─</WinBtn>
        <WinBtn onClick={() => appWindowRef.current?.toggleMaximize()}>
          {isMaximized ? '❐' : '□'}
        </WinBtn>
        <WinBtn onClick={() => appWindowRef.current?.close()} danger>✕</WinBtn>
      </div>
    </div>,
    document.body
  );
}
