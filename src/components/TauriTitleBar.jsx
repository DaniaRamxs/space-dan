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
        <span
          style={{
            fontSize: '0.6rem',
            fontWeight: 800,
            letterSpacing: 4,
            color: 'rgba(255,110,180,0.7)',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          SPACELY
        </span>
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
