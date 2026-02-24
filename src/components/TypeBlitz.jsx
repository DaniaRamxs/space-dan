import { useEffect, useRef, useState, useCallback } from 'react';

// ── Constantes ──────────────────────────────────────────────────────────────
const W = 400, H = 480;
const C_BG = '#090912', C_TEXT = '#ffffff', C_CYAN = '#00e5ff', C_MAG = '#ff00ff';
const C_DIM = 'rgba(255,255,255,0.25)';

const WORD_BANKS = {
    easy: ['sol', 'luz', 'mar', 'paz', 'rio', 'ola', 'eco', 'neo', 'dan', 'cosmos', 'espacio', 'estrella', 'luna', 'cielo'],
    medium: ['nebulosa', 'galaxia', 'orbital', 'cuasar', 'eclipse', 'quantum', 'vector', 'plasma', 'fusion', 'neutron'],
    hard: ['supernova', 'agujero', 'horizonte', 'singularidad', 'magnetar', 'antimatter', 'gravitation'],
};

function pickWord(level) {
    const all = level === 'easy' ? WORD_BANKS.easy
        : level === 'medium' ? [...WORD_BANKS.easy, ...WORD_BANKS.medium]
            : [...WORD_BANKS.easy, ...WORD_BANKS.medium, ...WORD_BANKS.hard];
    return all[Math.floor(Math.random() * all.length)];
}

function makeWord(level, score) {
    const word = pickWord(level);
    const speed = 0.4 + score * 0.012;
    return {
        word,
        typed: '',
        x: 20 + Math.random() * (W - 80 - word.length * 10),
        y: -20,
        speed: Math.min(speed, 2.2),
        active: false,
    };
}

export default function TypeBlitz() {
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const rafRef = useRef(null);
    const inputRef = useRef(null);
    const [phase, setPhase] = useState('idle'); // idle|playing|dead
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [typed, setTyped] = useState('');
    const [best, setBest] = useState(() => parseInt(localStorage.getItem('tb-best') || '0'));

    function makeState() {
        return {
            words: [],
            score: 0,
            lives: 3,
            frame: 0,
            nextWordIn: 90,
            level: 'easy',
            combo: 0,
        };
    }

    const getLevel = (sc) => sc > 20 ? 'hard' : sc > 8 ? 'medium' : 'easy';

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, W, H);

        // Línea de muerte
        ctx.strokeStyle = C_MAG + '44';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
        ctx.setLineDash([]);

        // Palabras
        ctx.font = 'bold 15px monospace';
        for (const w of (s?.words || [])) {
            const typed = w.typed || '';
            const rest = w.word.slice(typed.length);
            const alpha = 1 - w.y / (H - 35);

            // Parte ya escrita (cyan)
            ctx.fillStyle = C_CYAN;
            ctx.shadowColor = C_CYAN;
            ctx.shadowBlur = 6;
            ctx.fillText(typed, w.x, w.y);
            const tw = ctx.measureText(typed).width;

            // Parte pendiente
            ctx.fillStyle = `rgba(255,255,255,${Math.max(0.2, alpha)})`;
            ctx.shadowBlur = 0;
            ctx.fillText(rest, w.x + tw, w.y);
        }
        ctx.shadowBlur = 0;

        // HUD
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = C_CYAN;
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${s?.score || 0}`, 10, 22);
        ctx.textAlign = 'right';
        ctx.fillText(`RÉCORD: ${best}`, W - 10, 22);
        ctx.textAlign = 'center';

        // Vidas
        ctx.fillStyle = C_MAG;
        ctx.shadowColor = C_MAG;
        ctx.shadowBlur = 6;
        for (let i = 0; i < (s?.lives || 0); i++) {
            ctx.fillText('♥', W / 2 - 20 + i * 22, 22);
        }
        ctx.shadowBlur = 0;

        // Combo
        if (s?.combo > 2) {
            ctx.fillStyle = '#ffea00';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`🔥 COMBO ×${s.combo}`, 10, 42);
        }

        // Overlay idle
        if (phase === 'idle') {
            ctx.fillStyle = 'rgba(9,9,18,0.88)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = C_MAG;
            ctx.shadowColor = C_MAG; ctx.shadowBlur = 16;
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('TYPE BLITZ', W / 2, H / 2 - 44);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_TEXT;
            ctx.font = '14px monospace';
            ctx.fillText('Escribe las palabras antes de que', W / 2, H / 2 - 8);
            ctx.fillText('toquen la línea de peligro.', W / 2, H / 2 + 12);
            ctx.fillStyle = C_DIM;
            ctx.font = '12px monospace';
            ctx.fillText('[Click para empezar]', W / 2, H / 2 + 48);
        }

        if (phase === 'dead') {
            ctx.fillStyle = 'rgba(9,9,18,0.9)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = C_MAG;
            ctx.shadowColor = C_MAG; ctx.shadowBlur = 18;
            ctx.font = 'bold 26px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 36);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_TEXT;
            ctx.font = '15px monospace';
            ctx.fillText(`Score: ${s?.score || 0}`, W / 2, H / 2);
            ctx.fillStyle = C_DIM;
            ctx.font = '12px monospace';
            ctx.fillText('[Click para reiniciar]', W / 2, H / 2 + 32);
        }
    }, [phase, best]);

    const tick = useCallback(() => {
        const s = stateRef.current;
        if (!s || s.phase !== 'playing') { draw(); return; }

        s.frame++;
        s.nextWordIn--;

        // Spawn
        if (s.nextWordIn <= 0) {
            s.words.push(makeWord(getLevel(s.score), s.score));
            const base = Math.max(30, 90 - s.score * 2);
            s.nextWordIn = Math.floor(base + Math.random() * 40);
        }

        // Mover palabras
        let lost = 0;
        s.words = s.words.filter(w => {
            w.y += w.speed;
            if (w.y >= H - 30) { lost++; return false; }
            return true;
        });

        if (lost > 0) {
            s.lives -= lost;
            s.combo = 0;
            setLives(s.lives);
            if (s.lives <= 0) {
                s.phase = 'dead';
                setPhase('dead');
                if (s.score > best) {
                    setBest(s.score);
                    localStorage.setItem('tb-best', String(s.score));
                }
                window.dispatchEvent(new CustomEvent('dan:game-score', {
                    detail: { gameId: 'typeblitz', score: s.score, isHighScore: s.score > best }
                }));
                draw();
                return;
            }
        }

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw, best]);

    // Match typed word
    const handleInput = useCallback((e) => {
        const val = e.target.value.trim().toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
        setTyped(val);

        const s = stateRef.current;
        if (!s || s.phase !== 'playing') return;

        // Actualizar typed en cada palabra
        for (const w of s.words) {
            if (w.word.startsWith(val)) {
                w.typed = val;
            } else {
                w.typed = '';
            }
        }

        // Check match completo
        const idx = s.words.findIndex(w => w.word === val);
        if (idx !== -1) {
            s.words.splice(idx, 1);
            s.score++;
            s.combo++;
            setScore(s.score);
            if (inputRef.current) inputRef.current.value = '';
            setTyped('');
            // Limpiar typed de las demás
            for (const w of s.words) w.typed = '';
        }
    }, []);

    const startGame = useCallback(() => {
        const s = makeState();
        s.phase = 'playing';
        stateRef.current = s;
        setPhase('playing');
        setScore(0);
        setLives(3);
        setTyped('');
        if (inputRef.current) { inputRef.current.value = ''; inputRef.current.focus(); }
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [tick]);

    useEffect(() => {
        if (!stateRef.current) stateRef.current = { phase: 'idle', words: [], score: 0, lives: 3, frame: 0, nextWordIn: 90, combo: 0 };
        draw();
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace', color: C_TEXT }}>
            <canvas
                ref={canvasRef}
                width={W} height={H}
                onClick={() => { if (phase === 'idle' || phase === 'dead') startGame(); }}
                style={{ display: 'block', maxWidth: '100%', border: `1px solid ${C_MAG}`, borderRadius: 4, cursor: 'pointer' }}
            />
            {phase === 'playing' && (
                <input
                    ref={inputRef}
                    onChange={handleInput}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    style={{
                        marginTop: 10, background: 'rgba(255,0,255,0.08)', border: `1px solid ${C_MAG}55`,
                        borderRadius: 12, padding: '8px 16px', color: C_TEXT, fontSize: 15, fontFamily: 'monospace',
                        outline: 'none', width: '80%', textAlign: 'center', letterSpacing: 2,
                    }}
                    placeholder="escribe aquí..."
                />
            )}
        </div>
    );
}
