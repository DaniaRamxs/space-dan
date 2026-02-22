import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ─── TERMINAL ────────────────────────────────────────────────
function TerminalWindow() {
    const [lines, setLines] = useState([
        '> DAN-OS Terminal v1.0',
        '> Escribe "help" para ver comandos disponibles.',
        '',
    ]);
    const [input, setInput] = useState('');
    const [cmdHistory, setCmdHistory] = useState([]);
    const [histIdx, setHistIdx] = useState(-1);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    const run = (raw) => {
        const cmd = raw.trim();
        const c = cmd.toLowerCase();
        let out = [];

        if (c === 'help') {
            out = [
                '  help       — muestra este mensaje',
                '  ls         — lista archivos del escritorio',
                '  about      — sobre mí',
                '  date       — fecha y hora actual',
                '  whoami     — identidad del usuario',
                '  skills     — stack técnico completo',
                '  projects   — proyectos destacados',
                '  github     — perfil de GitHub',
                '  contact    — cómo contactarme',
                '  clear      — limpia la pantalla',
            ];
        } else if (c === 'ls' || c === 'dir') {
            out = [
                '  README.txt      Posts.dir       Arcade.exe',
                '  WinAmp.m3u      CLASSIFIED.log  Chat.exe',
                '  Guestbook.db    SysInfo.exe     Terminal.exe',
                '  Proyectos.dir   GitHub.lnk',
            ];
        } else if (c === 'about') {
            out = [
                '  Hola! Soy Dan.',
                '  Desarrolladora frontend y creadora de cosas raras.',
                '  Este OS está hecho con React, CSS y mucho café.',
                '  Escribe "skills" o "projects" para ver más.',
            ];
        } else if (c === 'date') {
            out = ['  ' + new Date().toLocaleString('es-PE', { dateStyle: 'full', timeStyle: 'short' })];
        } else if (c === 'whoami') {
            out = ['  dan@space-dan — acceso root concedido.'];
        } else if (c === 'skills') {
            out = [
                '  ── Frontend ──────────────────────────────',
                '  React 19 · Vite 7 · React Router 7',
                '  JavaScript (ES2024) · HTML5 · CSS3',
                '  Tailwind CSS · CSS custom (4200+ líneas)',
                '  Web Audio API · Canvas API · SVG',
                '  ── Backend / DB ──────────────────────────',
                '  Supabase (PostgreSQL + Realtime)',
                '  REST APIs · Fetch · LocalStorage',
                '  ── Tools ─────────────────────────────────',
                '  Git · GitHub · Netlify · Vite · ESLint',
                '  React Lazy · Code Splitting · Suspense',
            ];
        } else if (c === 'projects') {
            out = [
                '  ── Proyectos ─────────────────────────────',
                '  space-dan       → portafolio interactivo Y2K',
                '    Tech: React 19, Vite, Tailwind, Supabase',
                '    Features: 23 juegos, guestbook RT, OS desktop',
                '    GitHub: github.com/DaniaRamxs/space-dan',
                '  ──────────────────────────────────────────',
                '  mini-games-engine → motor de juegos Canvas 2D',
                '    Tech: JavaScript, Canvas API, HTML5',
                '  ──────────────────────────────────────────',
                '  Más en: /proyectos',
            ];
        } else if (c === 'github') {
            out = [
                '  ── GitHub ────────────────────────────────',
                '  Usuario: @DaniaRamxs',
                '  URL:     github.com/DaniaRamxs',
                '  ──────────────────────────────────────────',
                '  Para ver stats completos abre /proyectos',
            ];
        } else if (c === 'contact') {
            out = [
                '  ── Contacto ──────────────────────────────',
                '  GitHub:    github.com/DaniaRamxs',
                '  Guestbook: /guestbook  (deja un mensaje!)',
                '  ──────────────────────────────────────────',
                '  No tengo email público por ahora. 🌸',
            ];
        } else if (c === 'clear') {
            setLines(['> DAN-OS Terminal v1.0', '> Escribe "help" para ver comandos disponibles.', '']);
            setCmdHistory(h => cmd ? [cmd, ...h] : h);
            setHistIdx(-1);
            setInput('');
            return;
        } else if (c === 'sudo rm -rf /' || c === 'sudo rm -rf') {
            out = [
                '  ⚠ eliminando sistema...',
                '  borrando recuerdos...',
                '  ... just kidding lol.',
            ];
        } else if (c === 'sudo' || c.startsWith('sudo ')) {
            out = ['  Este sistema no requiere sudo. Eres dan.'];
        } else if (c === '' ) {
            // silent
        } else {
            out = [`  bash: ${cmd}: command not found. Prueba "help".`];
        }

        setLines(l => [...l, `> ${cmd}`, ...out, '']);
        setCmdHistory(h => cmd ? [cmd, ...h] : h);
        setHistIdx(-1);
        setInput('');
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') {
            run(input);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
            setHistIdx(idx);
            setInput(cmdHistory[idx] ?? '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const idx = Math.max(histIdx - 1, -1);
            setHistIdx(idx);
            setInput(idx === -1 ? '' : cmdHistory[idx]);
        }
    };

    return (
        <div className="osTerminal" onClick={() => inputRef.current?.focus()}>
            <div className="osTermLines">
                {lines.map((l, i) => <div key={i} className="osTermLine">{l || '\u00a0'}</div>)}
                <div ref={bottomRef} />
            </div>
            <div className="osTermInputRow">
                <span className="osTermPrompt">$&nbsp;</span>
                <input
                    ref={inputRef}
                    className="osTermInput"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                />
            </div>
        </div>
    );
}

// ─── ARCHIVO CLASIFICADO ────────────────────────────────────
function SecretWindow() {
    const [input, setInput] = useState('');
    const [attempts, setAttempts] = useState(0);
    const [unlocked, setUnlocked] = useState(false);
    const [msg, setMsg] = useState('');

    const tryPassword = () => {
        const pass = input.toLowerCase().trim();
        if (pass === 'cangrejo' || pass === 'crab') {
            setUnlocked(true);
        } else {
            const next = attempts + 1;
            setAttempts(next);
            setMsg(next >= 3 ? 'pista: piensa en la playa...' : 'ACCESO DENEGADO.');
            setInput('');
        }
    };

    if (unlocked) {
        return (
            <div className="osSecretUnlocked">
                <div className="osSecretOk">✓ ACCESO CONCEDIDO</div>
                <p className="osSecretOkText">sabía que ibas a encontrar esto.</p>
                <Link to="/secret" className="osSecretLink">→ entrar a la zona secreta</Link>
            </div>
        );
    }

    return (
        <div className="osSecretPrompt">
            <div className="osSecretHeader">⚠ ARCHIVO CLASIFICADO</div>
            <div className="osSecretSub">contraseña requerida para continuar</div>
            <div className="osSecretRow">
                <input
                    type="password"
                    className="osTermInput"
                    placeholder="••••••••"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && tryPassword()}
                    autoFocus
                />
                <button className="osSecretBtn" onClick={tryPassword}>OK</button>
            </div>
            {msg && <div className="osSecretMsg">{msg}</div>}
            {attempts > 0 && <div className="osSecretAttempts">{5 - attempts} intentos restantes</div>}
        </div>
    );
}

// ─── SYSINFO ────────────────────────────────────────────────
function SysInfoWindow() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const uptime = Math.floor((now - new Date('2026-01-01')) / 86400000);
    return (
        <pre className="osFileContent">{`DAN-OS System Information
━━━━━━━━━━━━━━━━━━━━━━━━
OS:      DAN-OS v0.4.2 (2026)
Shell:   React 19 + Vite 7
UI:      Tailwind + CSS custom
DB:      Supabase (PostgreSQL)
Router:  React Router v7
Deploy:  Netlify CDN

Uptime:  ${uptime} días
Clock:   ${now.toLocaleTimeString('es-PE')}
Memory:  ∞ creatividad
CPU:     1× cerebro overclocked
Storage: 24 juegos instalados
Build:   ✓ stable`}
        </pre>
    );
}

// ─── WINDOW CONTENT ROUTER ───────────────────────────────────
function WindowContent({ type }) {
    const navigate = useNavigate();

    const NavBtn = ({ to, label }) => (
        <button className="osActionBtn" onClick={() => navigate(to)}>{label}</button>
    );

    switch (type) {
        case 'readme':
            return (
                <pre className="osFileContent">{`SYSTEM BOOT SUCCESSFUL...

DAN-OS v0.4.2 — 2026

Hola, explorador/a.

Este es mi OS personal interactivo.
Hecho con React, CSS y mucho café.

 • Abre los íconos del escritorio
 • Usa el menú START para navegar
 • Abre la Terminal y escribe "help"
 • Encuentra el archivo clasificado

[Modo: Portfolio | Build: stable]`}
                </pre>
            );

        case 'posts':
            return (
                <div className="osWindowBody">
                    <div className="osWinBodyTitle">📁 Posts.dir</div>
                    <p className="osWinBodyDesc">Artículos, reflexiones y notas técnicas.</p>
                    <NavBtn to="/posts" label="Abrir /posts →" />
                </div>
            );

        case 'games':
            return (
                <div className="osWindowBody">
                    <div className="osWinBodyTitle">🕹️ Arcade.exe</div>
                    <p className="osWinBodyDesc">
                        24 juegos implementados desde cero:<br />
                        <span style={{ fontSize: 11, opacity: 0.7 }}>
                            Snake · Tetris · Flappy Bird · Breakout · 2048 · Asteroids · y más.
                        </span>
                    </p>
                    <NavBtn to="/games" label="Abrir Arcade →" />
                </div>
            );

        case 'music':
            return (
                <div className="osWindowBody">
                    <div className="osWinBodyTitle">🎵 WinAmp.m3u</div>
                    <p className="osWinBodyDesc">
                        Playlist curada con lo que suena mientras codifico.
                        <br /><em style={{ fontSize: 11, opacity: 0.6 }}>— próximamente</em>
                    </p>
                    <NavBtn to="/music" label="Abrir Música →" />
                </div>
            );

        case 'terminal':
            return <TerminalWindow />;

        case 'secret':
            return <SecretWindow />;

        case 'chat':
            return (
                <iframe
                    src="https://www3.cbox.ws/box/?boxid=3551223&boxtag=TAHvLn"
                    title="Shoutbox"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '340px', border: 0, display: 'block' }}
                />
            );

        case 'guestbook':
            return (
                <div className="osWindowBody">
                    <div className="osWinBodyTitle">📖 Guestbook.db</div>
                    <p className="osWinBodyDesc">
                        Deja tu mensaje. Guardado en Supabase con actualizaciones en tiempo real.
                    </p>
                    <NavBtn to="/guestbook" label="Abrir Guestbook →" />
                </div>
            );

        case 'sysinfo':
            return <SysInfoWindow />;

        default:
            return <pre className="osFileContent">archivo vacío.</pre>;
    }
}

// ─── DRAGGABLE WINDOW ────────────────────────────────────────
function DraggableWindow({ type, title, icon, initialPos, isActive, isMinimized, onFocus, onClose, onMinimize }) {
    const [pos, setPos] = useState(initialPos);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return;
        setIsDragging(true);
        onFocus();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragRef.current = { x: clientX - pos.x, y: clientY - pos.y };
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            let nx = clientX - dragRef.current.x;
            let ny = clientY - dragRef.current.y;
            nx = Math.max(0, Math.min(nx, window.innerWidth - 80));
            ny = Math.max(0, Math.min(ny, window.innerHeight - 80));
            setPos({ x: nx, y: ny });
        };
        const onUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('mouseup', onUp);
            window.addEventListener('touchend', onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
        };
    }, [isDragging]);

    if (isMinimized) return null;

    const WIN_SIZES = {
        readme: { width: 340, height: 280 },
        terminal: { width: 420, height: 300 },
        chat: { width: 360, height: 400 },
        sysinfo: { width: 320, height: 280 },
        secret: { width: 300, height: 220 },
        default: { width: 300, height: 200 },
    };
    const size = WIN_SIZES[type] || WIN_SIZES.default;

    return (
        <div
            className="osWindow"
            onClick={onFocus}
            style={{
                left: pos.x,
                top: pos.y,
                position: 'absolute',
                zIndex: isActive ? 200 : 10,
                width: size.width,
                minHeight: size.height,
                boxShadow: isActive
                    ? '0 0 0 1px #0000ff, 4px 4px 0 rgba(0,0,0,0.5)'
                    : '2px 2px 0 rgba(0,0,0,0.4)',
            }}
        >
            <div
                className="osWindowHeader"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    background: isActive
                        ? 'linear-gradient(90deg, #000080, #1084d0)'
                        : 'linear-gradient(90deg, #7b7b7b, #ababab)',
                    userSelect: 'none',
                }}
            >
                <span className="osWindowTitle">{icon} {title}</span>
                <div className="osWindowBtns">
                    <button
                        className="osWindowBtn"
                        onClick={(e) => { e.stopPropagation(); onMinimize(); }}
                        title="Minimizar"
                    >─</button>
                    <button
                        className="osWindowBtn osWindowClose"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        title="Cerrar"
                    >✕</button>
                </div>
            </div>
            <div className="osWindowContent">
                <WindowContent type={type} />
            </div>
        </div>
    );
}

// ─── START MENU ──────────────────────────────────────────────
const START_LINKS = [
    { icon: '🏠', label: 'Sobre mí', to: '/home' },
    { icon: '📰', label: 'Noticias', to: '/bulletin' },
    { icon: '✍️', label: 'Posts', to: '/posts' },
    { icon: '🎧', label: 'Música', to: '/music' },
    { icon: '🎮', label: 'Juegos', to: '/games' },
    { icon: '🖼️', label: 'Galería', to: '/galeria' },
    { icon: '📺', label: 'Watchlist', to: '/watchlist' },
    { icon: '⏳', label: 'Time Capsule', to: '/timecapsule' },
    { icon: '📖', label: 'Guestbook', to: '/guestbook' },
    { icon: '💻', label: 'Proyectos', to: '/proyectos' },
    { icon: '🏗️', label: 'Arquitectura', to: '/arquitectura' },
    { icon: '🏆', label: 'Logros', to: '/logros' },
    { icon: '🛍️', label: 'Tienda', to: '/tienda' },
];

function StartMenu({ onClose }) {
    return (
        <>
            <div className="osStartMenuOverlay" onClick={onClose} />
            <div className="osStartMenu">
                <div className="osStartMenuHeader">DAN-OS</div>
                <div className="osStartMenuList">
                    {START_LINKS.map(({ icon, label, to }) => (
                        <Link key={to} to={to} className="osStartMenuItem" onClick={onClose}>
                            <span>{icon}</span>
                            <span>{label}</span>
                        </Link>
                    ))}
                    <div className="osStartMenuDivider" />
                    <Link to="/" className="osStartMenuItem osStartMenuDanger" onClick={onClose}>
                        <span>⏻</span>
                        <span>Salir del OS</span>
                    </Link>
                </div>
            </div>
        </>
    );
}

// ─── CONTEXT MENU ────────────────────────────────────────────
function ContextMenu({ x, y, onClose, onOpen }) {
    return (
        <>
            <div className="osCtxOverlay" onClick={onClose} />
            <div className="osCtxMenu" style={{ left: x, top: y }}>
                <div className="osCtxItem" onClick={() => { onOpen('readme'); onClose(); }}>📄 Abrir README</div>
                <div className="osCtxItem" onClick={() => { onOpen('terminal'); onClose(); }}>⌨️ Abrir Terminal</div>
                <div className="osCtxItem" onClick={() => { onOpen('sysinfo'); onClose(); }}>💻 Info del sistema</div>
                <div className="osCtxDivider" />
                <div className="osCtxItem" onClick={onClose}>✕ Cerrar menú</div>
            </div>
        </>
    );
}

// ─── DESKTOP ICONS ───────────────────────────────────────────
const ICONS = [
    { id: 'readme',    icon: '📄', label: 'README.txt'      },
    { id: 'posts',     icon: '📁', label: 'Mis escritos'    },
    { id: 'games',     icon: '🕹️', label: 'Arcade.exe'      },
    { id: 'music',     icon: '🎵', label: 'WinAmp'          },
    { id: 'terminal',  icon: '⌨️', label: 'Terminal'        },
    { id: 'secret',    icon: '🔒', label: 'CLASSIFIED'      },
    { id: 'chat',      icon: '💬', label: 'Chat.exe'        },
    { id: 'guestbook', icon: '📖', label: 'Guestbook.db'    },
    { id: 'sysinfo',   icon: '💻', label: 'SysInfo.exe'     },
];

const WIN_META = {
    readme:    { title: 'README.txt',       icon: '📄' },
    posts:     { title: 'Posts.dir',        icon: '📁' },
    games:     { title: 'Arcade.exe',       icon: '🕹️' },
    music:     { title: 'WinAmp.m3u',      icon: '🎵' },
    terminal:  { title: 'Terminal.exe',     icon: '⌨️' },
    secret:    { title: 'CLASSIFIED.log',   icon: '🔒' },
    chat:      { title: 'Chat.exe',         icon: '💬' },
    guestbook: { title: 'Guestbook.db',     icon: '📖' },
    sysinfo:   { title: 'SysInfo.exe',      icon: '💻' },
};

const INITIAL_POSITIONS = {
    readme:    { x: 60,  y: 40  },
    posts:     { x: 100, y: 70  },
    games:     { x: 130, y: 100 },
    music:     { x: 160, y: 80  },
    terminal:  { x: 80,  y: 120 },
    secret:    { x: 200, y: 60  },
    chat:      { x: 110, y: 90  },
    guestbook: { x: 90,  y: 110 },
    sysinfo:   { x: 140, y: 50  },
};

// ─── MAIN DESKTOP ────────────────────────────────────────────
export default function DesktopPage() {
    const [windows, setWindows] = useState([
        { id: 'readme', minimized: false },
    ]);
    const [activeWindow, setActiveWindow] = useState('readme');
    const [startOpen, setStartOpen] = useState(false);
    const [ctxMenu, setCtxMenu] = useState(null);
    const [clock, setClock] = useState('');

    // Reloj en tiempo real
    useEffect(() => {
        const update = () =>
            setClock(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, []);

    const openWindow = (id) => {
        setWindows(prev => {
            const exists = prev.find(w => w.id === id);
            if (exists) {
                // Restore if minimized
                return prev.map(w => w.id === id ? { ...w, minimized: false } : w);
            }
            return [...prev, { id, minimized: false }];
        });
        setActiveWindow(id);
        setStartOpen(false);
    };

    const closeWindow = (id) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        setActiveWindow(prev => prev === id ? null : prev);
    };

    const minimizeWindow = (id) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
        setActiveWindow(null);
    };

    const clickTaskbar = (id) => {
        const win = windows.find(w => w.id === id);
        if (!win) return;
        if (win.minimized) {
            setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: false } : w));
            setActiveWindow(id);
        } else if (activeWindow === id) {
            minimizeWindow(id);
        } else {
            setActiveWindow(id);
        }
    };

    const handleContextMenu = (e) => {
        if (e.target.closest('.osWindow') || e.target.closest('.osIcons') || e.target.closest('.osTaskbar')) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
        setStartOpen(false);
    };

    return (
        <div className="osDesktop" onContextMenu={handleContextMenu}>
            <div className="osBackground" />

            {/* Íconos del escritorio */}
            <div className="osIcons">
                {ICONS.map(({ id, icon, label }) => (
                    <div
                        key={id}
                        className="osIcon"
                        onDoubleClick={() => openWindow(id)}
                        onClick={() => {}} // single click selects (visual only)
                        title={`Doble clic para abrir ${label}`}
                    >
                        <div className="osIconImg">{icon}</div>
                        <div className="osIconLabel">{label}</div>
                    </div>
                ))}
            </div>

            {/* Ventanas */}
            {windows.map(win => {
                const meta = WIN_META[win.id];
                return (
                    <DraggableWindow
                        key={win.id}
                        id={win.id}
                        type={win.id}
                        title={meta.title}
                        icon={meta.icon}
                        initialPos={INITIAL_POSITIONS[win.id] || { x: 80, y: 80 }}
                        isActive={activeWindow === win.id}
                        isMinimized={win.minimized}
                        onFocus={() => setActiveWindow(win.id)}
                        onClose={() => closeWindow(win.id)}
                        onMinimize={() => minimizeWindow(win.id)}
                    />
                );
            })}

            {/* Start Menu */}
            {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}

            {/* Context Menu */}
            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    onClose={() => setCtxMenu(null)}
                    onOpen={openWindow}
                />
            )}

            {/* Barra de tareas */}
            <div className="osTaskbar">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                        className={`osStartBtn${startOpen ? ' active' : ''}`}
                        onClick={() => { setStartOpen(o => !o); setCtxMenu(null); }}
                    >
                        ⊞ START
                    </button>
                    <div className="osTaskbarSep" />
                    <div className="osTaskbarOpenApps">
                        {windows.map(w => {
                            const meta = WIN_META[w.id];
                            return (
                                <div
                                    key={w.id}
                                    className={`osTaskItem${activeWindow === w.id && !w.minimized ? ' active' : ''}`}
                                    onClick={() => clickTaskbar(w.id)}
                                    title={meta.title}
                                >
                                    {meta.icon} {meta.title}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="osTaskbarRight">
                    <div className="osTime">{clock}</div>
                </div>
            </div>
        </div>
    );
}
