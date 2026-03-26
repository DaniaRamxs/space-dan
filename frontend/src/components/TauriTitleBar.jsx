import { useEffect, useState, useRef } from 'react';

export default function TauriTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindowRef = useRef(null);

  useEffect(() => {
    let unlisten = null;

    const setup = async () => {
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 36,
        background: 'rgba(5,5,16,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        zIndex: 9999,
      }}
    >
      {/* Zona de arrastre — ocupa todo el espacio menos los botones */}
      <div
        data-tauri-drag-region
        style={{
          position: 'absolute',
          inset: 0,
          right: 138, // 3 botones × 46px
        }}
      />

      {/* Branding */}
      <span
        style={{
          paddingLeft: 14,
          fontSize: '0.6rem',
          fontWeight: 800,
          letterSpacing: 4,
          color: 'rgba(255,110,180,0.7)',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          position: 'relative',
        }}
      >
        SPACELY
      </span>

      {/* Window controls — fuera de la zona de drag */}
      <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
        <WinBtn onClick={() => appWindowRef.current?.minimize()}>─</WinBtn>
        <WinBtn onClick={() => appWindowRef.current?.toggleMaximize()}>
          {isMaximized ? '❐' : '□'}
        </WinBtn>
        <WinBtn onClick={() => appWindowRef.current?.close()} danger>✕</WinBtn>
      </div>
    </div>
  );
}
