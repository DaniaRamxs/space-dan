import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

function DraggableWindow({ title, initialPos, isActive, onFocus, children, onClose }) {
    const [pos, setPos] = useState(initialPos);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        onFocus();

        // Touch or Mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        dragRef.current = {
            x: clientX - pos.x,
            y: clientY - pos.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            let newX = clientX - dragRef.current.x;
            let newY = clientY - dragRef.current.y;

            // Boundaries
            if (newX < 0) newX = 0;
            if (newY < 0) newY = 0;
            if (newX > window.innerWidth - 80) newX = window.innerWidth - 80;
            if (newY > window.innerHeight - 80) newY = window.innerHeight - 80;

            setPos({ x: newX, y: newY });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('touchmove', handleMouseMove, { passive: false });
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            className="osWindow card"
            onClick={onFocus}
            style={{
                left: pos.x,
                top: pos.y,
                position: 'absolute',
                zIndex: isActive ? 100 : 10,
                boxShadow: isActive ? '0 0 20px var(--accent-glow)' : '0 10px 30px rgba(0,0,0,0.5)'
            }}
        >
            <div
                className="osWindowHeader"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    background: isActive ? 'rgba(255, 110, 180, 0.2)' : 'transparent'
                }}
            >
                <span className="osWindowTitle">{title}</span>
                <button
                    className="osWindowClose"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    onTouchEnd={(e) => { e.stopPropagation(); onClose(); }}
                >x</button>
            </div>
            <div className="osWindowContent">
                {children}
            </div>
        </div>
    );
}

export default function DesktopPage() {
    const [windows, setWindows] = useState([
        { id: 'welcome', title: 'README.txt', content: "SYSTEM BOOT SUCCESSFUL...\n\nBienvenido a mi OS personal.\nExplora las carpetas bajo tu propio riesgo.\n\n[Version 0.4.2]", pos: { x: 20, y: 50 } }
    ]);
    const [activeWindow, setActiveWindow] = useState('welcome');

    const openWindow = (id, title, content, pos) => {
        if (!windows.find(w => w.id === id)) {
            // Adaptive positioning for mobile
            const startX = window.innerWidth < 600 ? 10 : pos.x;
            const startY = window.innerWidth < 600 ? 50 + (windows.length * 20) : pos.y;

            setWindows([...windows, { id, title, content, pos: { x: startX, y: startY } }]);
        }
        setActiveWindow(id);
    };

    const closeWindow = (id) => {
        setWindows(windows.filter(w => w.id !== id));
    };

    return (
        <div className="osDesktop">
            <div className="osBackground"></div>

            {/* Iconos del escritorio */}
            <div className="osIcons">
                <div className="osIcon" onClick={() => openWindow('posts', 'Posts.dir', 'Acceso directo a la base de datos de posts.\nEstado: ONLINE\n\nNavega a /posts para el listado completo.', { x: 120, y: 150 })}>
                    <div className="osIconImg">📁</div>
                    <div className="osIconLabel">Mis escritos</div>
                </div>
                <div className="osIcon" onClick={() => openWindow('games', 'Arcade.exe', 'Iniciando emulador retro...\nCargando libreria de juegos...\n\nVe a /games para jugar.', { x: 120, y: 250 })}>
                    <div className="osIconImg">🕹️</div>
                    <div className="osIconLabel">Juegos</div>
                </div>
                <div className="osIcon" onClick={() => openWindow('music', 'WinAmp.m3u', 'Playlist: Cyber-Vibes\n\n- Track 1: Starlight\n- Track 2: Neon Dreams\n- Track 3: Static Night', { x: 120, y: 350 })}>
                    <div className="osIconImg">🎵</div>
                    <div className="osIconLabel">Musica</div>
                </div>
                <div className="osIcon" onClick={() => openWindow('secret', 'CRITICAL_ERROR.log', 'FATAL ERROR: ACCESS DENIED.\n\nUnauthorized entry attempt detected.\nEncryption level: UNBREAKABLE.', { x: 120, y: 450 })}>
                    <div className="osIconImg">🔒</div>
                    <div className="osIconLabel">Top_Secret</div>
                </div>
                <div className="osIcon" onClick={() => openWindow('chat', 'Chat_Messenger.exe', <iframe src="https://www3.cbox.ws/box/?boxid=3551223&boxtag=TAHvLn" title="Shoutbox" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" referrerPolicy="no-referrer" style={{ width: '100%', height: '400px', border: '0' }} />, { x: 120, y: 550 })}>
                    <div className="osIconImg">💬</div>
                    <div className="osIconLabel">Chat</div>
                </div>
            </div>

            {/* Ventanas renderizadas */}
            {windows.map(win => (
                <DraggableWindow
                    key={win.id}
                    title={win.title}
                    initialPos={win.pos}
                    isActive={activeWindow === win.id}
                    onFocus={() => setActiveWindow(win.id)}
                    onClose={() => closeWindow(win.id)}
                >
                    <pre className="osFileContent">{win.content}</pre>
                </DraggableWindow>
            ))}

            {/* Barra de tareas estilo Windows98 pero Neon */}
            <div className="osTaskbar">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link to="/home" className="osStartBtn">
                        START
                    </Link>
                    <div className="osTaskbarOpenApps">
                        {windows.map(w => (
                            <div
                                key={w.id}
                                className={`osTaskItem ${activeWindow === w.id ? 'active' : ''}`}
                                onClick={() => setActiveWindow(w.id)}
                            >
                                {w.title}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="osTime">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>
    );
}
