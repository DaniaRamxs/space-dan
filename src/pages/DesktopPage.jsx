import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ─── WINAMP PLAYLIST ─────────────────────────────────────────
const WINAMP_PLAYLIST = [
  { id: 1, title: 'lemon boy',  artist: 'cavetown',       src: '/music/lemonboy.mp3',  cover: 'https://i.pinimg.com/originals/61/1e/0a/611e0aad733633587aa5f97a332a0c35.jpg', duration: 272 },
  { id: 2, title: 'mardy bum',  artist: 'arctic monkeys', src: '/music/mardybum.mp3',  cover: 'https://images.genius.com/779b9b4221140a2ffc0b7bc68bb291fd.600x600x1.jpg', duration: 175 },
  { id: 3, title: 'creep',      artist: 'radiohead',      src: '/music/creep.mp3',     cover: 'https://upload.wikimedia.org/wikipedia/en/a/a4/Pablo_Honey.png', duration: 238 },
  { id: 4, title: 'arms tonite',artist: 'mother mother',  src: '/music/armstonite.mp3',cover: 'https://i.scdn.co/image/ab67616d0000b273cf2a0403141b1f4b8488fc3f', duration: 216 },
];

const fmtTime = (s) => isNaN(s) || !s ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
                '  help         — muestra este mensaje',
                '  ls           — lista archivos del escritorio',
                '  ls -la       — listado detallado',
                '  about        — sobre mí',
                '  date         — fecha y hora actual',
                '  time         — hora actual',
                '  whoami       — identidad del usuario',
                '  skills       — stack técnico completo',
                '  projects     — proyectos destacados',
                '  github       — perfil de GitHub',
                '  contact      — cómo contactarme',
                '  history      — historial de comandos',
                '  echo [txt]   — imprime texto',
                '  ping [host]  — simula un ping',
                '  fortune      — cita aleatoria',
                '  neofetch     — info del sistema',
                '  motd         — mensaje de bienvenida',
                '  matrix       — ???',
                '  clear        — limpia la pantalla',
            ];
        } else if (c === 'ls' || c === 'dir') {
            out = [
                '  README.txt      Posts.dir       Arcade.exe',
                '  WinAmp.m3u      CLASSIFIED.log  Chat.exe',
                '  Guestbook.db    SysInfo.exe     Terminal.exe',
                '  Calc.exe        Notepad.exe',
            ];
        } else if (c === 'ls -la' || c === 'ls -al' || c === 'dir /a') {
            out = [
                '  total 48',
                '  -rw-r--r--  README.txt       1.2 KB  2026-01-03',
                '  drwxr-xr-x  Posts.dir        8.4 KB  2026-02-21',
                '  -rwxr-xr-x  Arcade.exe      16.8 KB  2026-02-17',
                '  -rw-r--r--  WinAmp.m3u       0.9 KB  2026-02-21',
                '  -rwx------  CLASSIFIED.log   [ACCESO DENEGADO]',
                '  -rwxr-xr-x  Chat.exe         2.1 KB  2026-02-21',
                '  -rw-r--r--  Guestbook.db    → Supabase',
                '  -rwxr-xr-x  SysInfo.exe      0.5 KB  2026-02-22',
                '  -rwxr-xr-x  Calc.exe         0.3 KB  2026-02-22',
                '  -rw-r--r--  Notepad.exe      0.2 KB  2026-02-22',
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
        } else if (c === 'time' || c === 'clock') {
            out = ['  ' + new Date().toLocaleTimeString('es-PE')];
        } else if (c === 'whoami') {
            out = ['  dan@space-dan — acceso root concedido.'];
        } else if (c === 'skills') {
            out = [
                '  ── Frontend ──────────────────────────────',
                '  React 19 · Vite 7 · React Router 7',
                '  JavaScript (ES2024) · HTML5 · CSS3',
                '  CSS custom (~5300 líneas) · Canvas API',
                '  Web Audio API · SVG · Responsive Design',
                '  ── Backend / DB ──────────────────────────',
                '  Supabase (PostgreSQL + Realtime)',
                '  REST APIs · Fetch · LocalStorage',
                '  GitHub API · Last.fm API',
                '  ── Tools ─────────────────────────────────',
                '  Git · GitHub · Netlify · Vite · ESLint',
                '  React Lazy · Code Splitting · Suspense',
            ];
        } else if (c === 'projects') {
            out = [
                '  ── Proyectos ─────────────────────────────',
                '  space-dan       → portafolio interactivo Y2K',
                '    Tech: React 19, Vite, CSS custom, Supabase',
                '    Features: 24 juegos, guestbook RT, OS desktop',
                '    GitHub: github.com/DaniaRamxs/space-dan',
                '  ──────────────────────────────────────────',
                '  Más en: /proyectos',
            ];
        } else if (c === 'github') {
            out = [
                '  ── GitHub ────────────────────────────────',
                '  Usuario: @DaniaRamxs',
                '  URL:     github.com/DaniaRamxs',
                '  ──────────────────────────────────────────',
                '  Stats en vivo en /proyectos',
            ];
        } else if (c === 'contact') {
            out = [
                '  ── Contacto ──────────────────────────────',
                '  GitHub:    github.com/DaniaRamxs',
                '  Guestbook: /guestbook  (deja un mensaje!)',
            ];
        } else if (c === 'history') {
            out = cmdHistory.length > 0
                ? cmdHistory.map((h, i) => `  ${cmdHistory.length - i}  ${h}`)
                : ['  no hay historial todavía.'];
        } else if (c.startsWith('echo ')) {
            out = ['  ' + cmd.slice(5)];
        } else if (c === 'echo') {
            out = ['  uso: echo [mensaje]'];
        } else if (c.startsWith('ping ')) {
            const host = cmd.slice(5) || 'host';
            out = [
                `  PING ${host}`,
                `  64 bytes de ${host}: tiempo=${Math.floor(Math.random() * 30 + 5)}ms`,
                `  64 bytes de ${host}: tiempo=${Math.floor(Math.random() * 30 + 5)}ms`,
                `  64 bytes de ${host}: tiempo=${Math.floor(Math.random() * 30 + 5)}ms`,
                `  — paquetes: enviados=3, recibidos=3, perdidos=0 (0%)`,
            ];
        } else if (c === 'ping') {
            out = ['  uso: ping [host]'];
        } else if (c === 'fortune') {
            const quotes = [
                '"La computadora fue inventada para resolver problemas que antes no teníamos." — M. Jokinen',
                '"Cualquier tecnología suficientemente avanzada es indistinguible de la magia." — A. Clarke',
                '"Primero resuelve el problema, luego escribe el código." — J. Johnson',
                '"El código es poesía." — WordPress',
                '"Talk is cheap. Show me the code." — L. Torvalds',
                '"El mejor error es aquel que aparece solo en producción." — ley de Murphy',
            ];
            out = ['  ' + quotes[Math.floor(Math.random() * quotes.length)]];
        } else if (c === 'neofetch' || c === 'fetch') {
            const uptime = Math.floor((new Date() - new Date('2026-01-01')) / 86400000);
            out = [
                '           ✦  space-dan ✦',
                '',
                '  ██████   OS:      DAN-OS v0.4.2',
                '  █    █   Shell:   React 19 + Vite 7',
                '  ██████   CPU:     1× cerebro overclocked',
                '  █    █   Memory:  ∞ creatividad',
                '  ██████   Storage: 24 juegos instalados',
                '           Uptime:  ' + uptime + ' días',
                '           User:    dan@space-dan',
                '           Build:   ✓ stable',
            ];
        } else if (c === 'motd' || c === 'welcome') {
            out = [
                '  ╔════════════════════════════════╗',
                '  ║   Bienvenid@ a DAN-OS v0.4    ║',
                '  ║   Escribe "help" para ayuda   ║',
                '  ╚════════════════════════════════╝',
            ];
        } else if (c === 'matrix') {
            out = [
                '  Wake up, dan...',
                '  The Matrix has you...',
                '  Follow the white rabbit.',
                '  — just kidding. o quizás no. 🐇',
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
        } else if (c === '') {
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

// ─── CALCULADORA ─────────────────────────────────────────────
function CalcWindow() {
    const [display, setDisplay] = useState('0');
    const [prev, setPrev]       = useState(null);
    const [op, setOp]           = useState(null);
    const [waitNext, setWait]   = useState(false);

    const input = (val) => {
        if (waitNext) { setDisplay(String(val)); setWait(false); }
        else setDisplay(d => d === '0' ? String(val) : d.length > 10 ? d : d + val);
    };
    const decimal = () => {
        if (waitNext) { setDisplay('0.'); setWait(false); return; }
        if (!display.includes('.')) setDisplay(d => d + '.');
    };
    const clear  = () => { setDisplay('0'); setPrev(null); setOp(null); setWait(false); };
    const sign   = () => setDisplay(d => String(-parseFloat(d)));
    const pct    = () => setDisplay(d => String(parseFloat(d) / 100));

    const handleOp = (operation) => {
        setOp(operation);
        setPrev(parseFloat(display));
        setWait(true);
    };

    const equals = () => {
        if (op === null || prev === null) return;
        const curr = parseFloat(display);
        const ops = { '+': prev + curr, '−': prev - curr, '×': prev * curr, '÷': curr !== 0 ? prev / curr : 'Error' };
        const result = ops[op];
        setDisplay(typeof result === 'number' ? (Math.abs(result) > 1e9 ? result.toExponential(3) : String(+result.toFixed(8))) : 'Error');
        setPrev(null); setOp(null); setWait(true);
    };

    const BTNS = [
        { label: 'C',   action: clear,              type: 'fn'  },
        { label: '+/−', action: sign,               type: 'fn'  },
        { label: '%',   action: pct,                type: 'fn'  },
        { label: '÷',   action: () => handleOp('÷'),type: 'op'  },
        { label: '7',   action: () => input('7')               },
        { label: '8',   action: () => input('8')               },
        { label: '9',   action: () => input('9')               },
        { label: '×',   action: () => handleOp('×'),type: 'op'  },
        { label: '4',   action: () => input('4')               },
        { label: '5',   action: () => input('5')               },
        { label: '6',   action: () => input('6')               },
        { label: '−',   action: () => handleOp('−'),type: 'op'  },
        { label: '1',   action: () => input('1')               },
        { label: '2',   action: () => input('2')               },
        { label: '3',   action: () => input('3')               },
        { label: '+',   action: () => handleOp('+'),type: 'op'  },
        { label: '0',   action: () => input('0'),  wide: true   },
        { label: '.',   action: decimal                         },
        { label: '=',   action: equals,            type: 'eq'  },
    ];

    return (
        <div className="osCalc">
            <div className="osCalcDisplay">
                <div className="osCalcOp">{op ? `${prev} ${op}` : '\u00a0'}</div>
                <div className="osCalcNum">{display}</div>
            </div>
            <div className="osCalcBtns">
                {BTNS.map((b, i) => (
                    <button
                        key={i}
                        className={`osCalcBtn${b.type === 'fn' ? ' fn' : b.type === 'op' ? ' op' : b.type === 'eq' ? ' eq' : ''}${b.wide ? ' wide' : ''}`}
                        onClick={b.action}
                    >
                        {b.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── BLOC DE NOTAS ───────────────────────────────────────────
function NotepadWindow() {
    const [text, setText] = useState('');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return (
        <div className="osNotepad">
            <textarea
                className="osNotepadArea"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="escribe aquí..."
                spellCheck={false}
            />
            <div className="osNotepadStatus">{text.length} chars · {words} palabras</div>
        </div>
    );
}

// ─── WINAMP ──────────────────────────────────────────────────
function WinAmpWindow() {
    const [trackIdx, setTrackIdx] = useState(0);
    const [playing, setPlaying]   = useState(false);
    const [time, setTime]         = useState(0);
    const [dur, setDur]           = useState(0);
    const audioRef = useRef(null);
    const song = WINAMP_PLAYLIST[trackIdx];

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.load();
        setTime(0); setDur(0);
        if (playing) audio.play().catch(() => setPlaying(false));
    }, [trackIdx]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) audio.play().catch(() => setPlaying(false));
        else audio.pause();
    }, [playing]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => setTime(audio.currentTime);
        const onMeta = () => setDur(audio.duration);
        const onEnd  = () => setTrackIdx(t => (t + 1) % WINAMP_PLAYLIST.length);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onMeta);
        audio.addEventListener('ended', onEnd);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeEventListener('ended', onEnd);
        };
    }, [trackIdx]);

    const pct  = dur > 0 ? (time / dur) * 100 : 0;
    const prev = () => setTrackIdx(t => (t - 1 + WINAMP_PLAYLIST.length) % WINAMP_PLAYLIST.length);
    const next = () => setTrackIdx(t => (t + 1) % WINAMP_PLAYLIST.length);

    return (
        <div className="osWinAmp">
            <audio ref={audioRef} preload="metadata">
                <source src={song.src} type="audio/mpeg" />
            </audio>

            {/* Player */}
            <div className="osWinAmpTop">
                <img src={song.cover} alt={song.title} className="osWinAmpCover" />
                <div className="osWinAmpInfo">
                    <div className="osWinAmpTitle">{song.title}</div>
                    <div className="osWinAmpArtist">{song.artist}</div>
                    <div className="osWinAmpBar">
                        <div className="osWinAmpFill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="osWinAmpTime">{fmtTime(time)} / {fmtTime(dur || song.duration)}</div>
                    <div className="osWinAmpControls">
                        <button className="osWinAmpBtn" onClick={prev} title="Anterior">⏮</button>
                        <button className="osWinAmpBtnMain" onClick={() => setPlaying(p => !p)}>
                            {playing ? '⏸' : '▶'}
                        </button>
                        <button className="osWinAmpBtn" onClick={next} title="Siguiente">⏭</button>
                    </div>
                </div>
            </div>

            {/* Playlist */}
            <div className="osWinAmpList">
                {WINAMP_PLAYLIST.map((s, i) => (
                    <div
                        key={s.id}
                        className={`osWinAmpTrack${i === trackIdx ? ' active' : ''}`}
                        onClick={() => { setTrackIdx(i); setPlaying(true); }}
                    >
                        <span className="osWinAmpTrackName">{i + 1}. {s.title} — {s.artist}</span>
                        <span className="osWinAmpTrackDur">{fmtTime(s.duration)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── ARCHIVO CLASIFICADO ────────────────────────────────────
function SecretWindow() {
    const [input, setInput]     = useState('');
    const [attempts, setAttempts] = useState(0);
    const [unlocked, setUnlocked] = useState(false);
    const [msg, setMsg]         = useState('');

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
UI:      CSS custom ~5300 líneas
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
 • Prueba la Calculadora y el Notepad

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
            return <WinAmpWindow />;

        case 'terminal':
            return <TerminalWindow />;

        case 'secret':
            return <SecretWindow />;

        case 'calc':
            return <CalcWindow />;

        case 'notepad':
            return <NotepadWindow />;

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
    const [pos, setPos]           = useState(initialPos);
    const [isDragging, setDragging] = useState(false);
    const dragRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest('button')) return;
        setDragging(true);
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
        const onUp = () => setDragging(false);
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
        readme:    { width: 340, height: 280 },
        terminal:  { width: 420, height: 300 },
        chat:      { width: 360, height: 400 },
        sysinfo:   { width: 320, height: 280 },
        secret:    { width: 300, height: 220 },
        calc:      { width: 260, height: 340 },
        notepad:   { width: 380, height: 280 },
        music:     { width: 320, height: 280 },
        default:   { width: 300, height: 200 },
    };
    const size = WIN_SIZES[type] || WIN_SIZES.default;
    const isMobile = window.innerWidth < 600;
    const effectiveWidth = isMobile ? Math.min(size.width, window.innerWidth - 16) : size.width;

    return (
        <div
            className="osWindow"
            onClick={onFocus}
            style={{
                left: pos.x, top: pos.y,
                position: 'absolute',
                zIndex: isActive ? 200 : 10,
                width: effectiveWidth,
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
                    <button className="osWindowBtn" onClick={(e) => { e.stopPropagation(); onMinimize(); }} title="Minimizar">─</button>
                    <button className="osWindowBtn osWindowClose" onClick={(e) => { e.stopPropagation(); onClose(); }} title="Cerrar">✕</button>
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
    { icon: '🏠', label: 'Sobre mí',     to: '/home'         },
    { icon: '📰', label: 'Noticias',     to: '/bulletin'     },
    { icon: '✍️', label: 'Posts',        to: '/posts'        },
    { icon: '🎧', label: 'Música',       to: '/music'        },
    { icon: '🎮', label: 'Juegos',       to: '/games'        },
    { icon: '🖼️', label: 'Galería',      to: '/galeria'      },
    { icon: '📺', label: 'Watchlist',    to: '/watchlist'    },
    { icon: '⏳', label: 'Time Capsule', to: '/timecapsule'  },
    { icon: '📖', label: 'Guestbook',   to: '/guestbook'    },
    { icon: '💻', label: 'Proyectos',   to: '/proyectos'    },
    { icon: '🏗️', label: 'Arquitectura',to: '/arquitectura' },
    { icon: '🏆', label: 'Logros',      to: '/logros'       },
    { icon: '🛍️', label: 'Tienda',      to: '/tienda'       },
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
                <div className="osCtxItem" onClick={() => { onOpen('readme');   onClose(); }}>📄 Abrir README</div>
                <div className="osCtxItem" onClick={() => { onOpen('terminal'); onClose(); }}>⌨️ Abrir Terminal</div>
                <div className="osCtxItem" onClick={() => { onOpen('notepad');  onClose(); }}>📝 Abrir Notepad</div>
                <div className="osCtxItem" onClick={() => { onOpen('calc');     onClose(); }}>🧮 Abrir Calc</div>
                <div className="osCtxItem" onClick={() => { onOpen('sysinfo');  onClose(); }}>💻 Info del sistema</div>
                <div className="osCtxDivider" />
                <div className="osCtxItem" onClick={onClose}>✕ Cerrar menú</div>
            </div>
        </>
    );
}

// ─── DESKTOP ICONS ───────────────────────────────────────────
const ICONS = [
    { id: 'readme',    icon: '📄', label: 'README.txt'   },
    { id: 'posts',     icon: '📁', label: 'Mis escritos' },
    { id: 'games',     icon: '🕹️', label: 'Arcade.exe'   },
    { id: 'music',     icon: '🎵', label: 'WinAmp'       },
    { id: 'terminal',  icon: '⌨️', label: 'Terminal'     },
    { id: 'secret',    icon: '🔒', label: 'CLASSIFIED'   },
    { id: 'chat',      icon: '💬', label: 'Chat.exe'     },
    { id: 'guestbook', icon: '📖', label: 'Guestbook.db' },
    { id: 'sysinfo',   icon: '💻', label: 'SysInfo.exe'  },
    { id: 'calc',      icon: '🧮', label: 'Calc.exe'     },
    { id: 'notepad',   icon: '📝', label: 'Notepad.exe'  },
];

const WIN_META = {
    readme:    { title: 'README.txt',       icon: '📄' },
    posts:     { title: 'Posts.dir',        icon: '📁' },
    games:     { title: 'Arcade.exe',       icon: '🕹️' },
    music:     { title: 'WinAmp.m3u',       icon: '🎵' },
    terminal:  { title: 'Terminal.exe',     icon: '⌨️' },
    secret:    { title: 'CLASSIFIED.log',   icon: '🔒' },
    chat:      { title: 'Chat.exe',         icon: '💬' },
    guestbook: { title: 'Guestbook.db',     icon: '📖' },
    sysinfo:   { title: 'SysInfo.exe',      icon: '💻' },
    calc:      { title: 'Calc.exe',         icon: '🧮' },
    notepad:   { title: 'Notepad.exe',      icon: '📝' },
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
    calc:      { x: 220, y: 80  },
    notepad:   { x: 170, y: 60  },
};

// ─── MAIN DESKTOP ────────────────────────────────────────────
export default function DesktopPage() {
    const [windows, setWindows]       = useState([{ id: 'readme', minimized: false }]);
    const [activeWindow, setActive]   = useState('readme');
    const [startOpen, setStartOpen]   = useState(false);
    const [ctxMenu, setCtxMenu]       = useState(null);
    const [clock, setClock]           = useState('');
    const lastTap = useRef({});

    // Funciona con doble clic (escritorio) y doble tap (móvil)
    const handleIconActivate = (id) => {
        const now = Date.now();
        const prev = lastTap.current[id] || 0;
        lastTap.current[id] = now;
        if (now - prev < 400) {
            openWindow(id);
            lastTap.current[id] = 0;
        }
    };

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
            if (exists) return prev.map(w => w.id === id ? { ...w, minimized: false } : w);
            return [...prev, { id, minimized: false }];
        });
        setActive(id);
        setStartOpen(false);
    };

    const closeWindow = (id) => {
        setWindows(prev => prev.filter(w => w.id !== id));
        setActive(prev => prev === id ? null : prev);
    };

    const minimizeWindow = (id) => {
        setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w));
        setActive(null);
    };

    const clickTaskbar = (id) => {
        const win = windows.find(w => w.id === id);
        if (!win) return;
        if (win.minimized) {
            setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: false } : w));
            setActive(id);
        } else if (activeWindow === id) {
            minimizeWindow(id);
        } else {
            setActive(id);
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

            <div className="osIcons">
                {ICONS.map(({ id, icon, label }) => (
                    <div
                        key={id}
                        className="osIcon"
                        onClick={() => handleIconActivate(id)}
                        title={`Doble clic / doble tap para abrir ${label}`}
                    >
                        <div className="osIconImg">{icon}</div>
                        <div className="osIconLabel">{label}</div>
                    </div>
                ))}
            </div>

            {windows.map(win => {
                const meta = WIN_META[win.id];
                return (
                    <DraggableWindow
                        key={win.id}
                        type={win.id}
                        title={meta.title}
                        icon={meta.icon}
                        initialPos={
                        window.innerWidth < 600
                            ? { x: 8, y: 8 }
                            : (INITIAL_POSITIONS[win.id] || { x: 80, y: 80 })
                    }
                        isActive={activeWindow === win.id}
                        isMinimized={win.minimized}
                        onFocus={() => setActive(win.id)}
                        onClose={() => closeWindow(win.id)}
                        onMinimize={() => minimizeWindow(win.id)}
                    />
                );
            })}

            {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}

            {ctxMenu && (
                <ContextMenu
                    x={ctxMenu.x}
                    y={ctxMenu.y}
                    onClose={() => setCtxMenu(null)}
                    onOpen={openWindow}
                />
            )}

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
