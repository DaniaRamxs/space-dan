import { useEffect, useRef, useState } from 'react';

// ── Constantes ──────────────────────────────────────────────────────────────
const W = 380, H = 460;
const C_BG = '#090912';
const C_CYN = '#00e5ff';
const C_MAG = '#ff00ff';
const C_WHT = '#ffffff';
const C_DIM = 'rgba(255,255,255,0.3)';

const WORD_BANKS = {
    easy: ['sol', 'luz', 'mar', 'paz', 'rio', 'ola', 'eco', 'neo', 'star', 'dan', 'luna', 'cielo', 'vivo', 'nova', 'pixel'],
    medium: ['nebulosa', 'galaxia', 'orbital', 'eclipse', 'quantum', 'vector', 'plasma', 'fusion', 'neutron', 'cosmos'],
    hard: ['supernova', 'horizonte', 'magnetar', 'gravedad', 'singularidad', 'antimatter', 'hyperspace'],
};

function pickWord(level) {
    const bank = level === 'easy' ? WORD_BANKS.easy
        : level === 'medium' ? [...WORD_BANKS.easy, ...WORD_BANKS.medium]
            : [...WORD_BANKS.easy, ...WORD_BANKS.medium, ...WORD_BANKS.hard];
    return bank[Math.floor(Math.random() * bank.length)];
}

// ── Estado del juego (mutado directamente, sin React) ─────────────────────
function makeState() {
    return {
        phase: 'idle',    // 'idle' | 'playing' | 'dead'
        words: [],
        score: 0,
        lives: 3,
        combo: 0,
        frame: 0,
        nextIn: 80,
        typedRaw: '',        // lo que el jugador ha escrito
    };
}

export default function TypeBlitz() {
    const canvasRef = useRef(null);
    const stateRef = useRef(makeState());
    const rafRef = useRef(null);
    const inputRef = useRef(null);
    const bestRef = useRef(parseInt(localStorage.getItem('tb-best') || '0'));

    // Solo para forzar re-render del input/best label
    const [uiScore, setUiScore] = useState(0);
    const [uiLives, setUiLives] = useState(3);
    const [uiPhase, setUiPhase] = useState('idle');
    const [uiBest, setUiBest] = useState(bestRef.current);

    // ── Draw completamente basado en stateRef ─────────────────────────────
    function draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        // Fondo
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, W, H);

        // Línea de peligro
        ctx.strokeStyle = C_MAG + '55';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(0, H - 40); ctx.lineTo(W, H - 40); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C_MAG + '33';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('DANGER', W - 6, H - 44);

        // Palabras
        ctx.font = 'bold 15px monospace';
        for (const w of s.words) {
            const typed = s.typedRaw;
            const match = w.word.startsWith(typed.toLowerCase()) && typed.length > 0;
            const hi = match ? typed.length : 0;

            // Parte escrita (mayor si hace match con esta palabra)
            if (hi > 0) {
                ctx.fillStyle = C_CYN;
                ctx.shadowColor = C_CYN;
                ctx.shadowBlur = 8;
                ctx.textAlign = 'left';
                ctx.fillText(w.word.slice(0, hi), w.x, w.y);
                const tw = ctx.measureText(w.word.slice(0, hi)).width;
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.shadowBlur = 0;
                ctx.fillText(w.word.slice(hi), w.x + tw, w.y);
            } else {
                const pct = 1 - w.y / (H - 44);
                ctx.fillStyle = `rgba(255,255,255,${0.25 + pct * 0.7})`;
                ctx.shadowBlur = 0;
                ctx.textAlign = 'left';
                ctx.fillText(w.word, w.x, w.y);
            }
        }
        ctx.shadowBlur = 0;

        // HUD — score
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = C_CYN;
        ctx.fillText(`SCORE: ${s.score}`, 10, 20);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,110,180,0.8)';
        ctx.fillText(`BEST: ${bestRef.current}`, W - 10, 20);

        // Vidas
        ctx.textAlign = 'center';
        ctx.fillStyle = C_MAG;
        ctx.shadowColor = C_MAG; ctx.shadowBlur = 6;
        for (let i = 0; i < s.lives; i++) ctx.fillText('♥', W / 2 - 16 + i * 18, 20);
        ctx.shadowBlur = 0;

        // Combo
        if (s.combo >= 3) {
            ctx.fillStyle = '#ffea00';
            ctx.textAlign = 'left';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`🔥 ×${s.combo}`, 10, 36);
        }

        // ── Overlays (todos leen stateRef, nunca React state) ──
        if (s.phase === 'idle') {
            ctx.fillStyle = 'rgba(9,9,18,0.88)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = C_MAG; ctx.shadowColor = C_MAG; ctx.shadowBlur = 18;
            ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center';
            ctx.fillText('TYPE BLITZ', W / 2, H / 2 - 50);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_WHT; ctx.font = '13px monospace';
            ctx.fillText('Escribe las palabras antes de que', W / 2, H / 2 - 10);
            ctx.fillText('toquen la zona de peligro.', W / 2, H / 2 + 8);
            ctx.fillStyle = C_DIM; ctx.font = '11px monospace';
            ctx.fillText('[ CLICK AQUÍ para empezar ]', W / 2, H / 2 + 44);
        }

        if (s.phase === 'dead') {
            ctx.fillStyle = 'rgba(9,9,18,0.92)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = C_MAG; ctx.shadowColor = C_MAG; ctx.shadowBlur = 16;
            ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 40);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_WHT; ctx.font = '15px monospace';
            ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 - 4);
            ctx.fillStyle = C_CYN; ctx.font = '12px monospace';
            ctx.fillText(`Récord: ${bestRef.current}`, W / 2, H / 2 + 18);
            ctx.fillStyle = C_DIM; ctx.font = '11px monospace';
            ctx.fillText('[ CLICK AQUÍ para reiniciar ]', W / 2, H / 2 + 50);
        }
    }

    // ── Game loop ─────────────────────────────────────────────────────────
    function tick() {
        const s = stateRef.current;

        if (s.phase !== 'playing') {
            draw();
            rafRef.current = requestAnimationFrame(tick); // sigue vivo para detectar click
            return;
        }

        s.frame++;

        // Spawn
        s.nextIn--;
        if (s.nextIn <= 0) {
            const level = s.score > 20 ? 'hard' : s.score > 8 ? 'medium' : 'easy';
            const word = pickWord(level);
            const speed = Math.min(0.4 + s.score * 0.012, 2.0);
            s.words.push({
                word,
                x: 12 + Math.random() * (W - 12 - word.length * 10),
                y: -16,
                speed,
            });
            const base = Math.max(32, 80 - s.score * 2);
            s.nextIn = Math.floor(base + Math.random() * 40);
        }

        // Mover y detectar pérdida
        let lost = 0;
        s.words = s.words.filter(w => {
            w.y += w.speed;
            if (w.y >= H - 40) { lost++; return false; }
            return true;
        });

        if (lost > 0) {
            s.lives -= lost;
            s.combo = 0;
            setUiLives(s.lives);
            if (s.lives <= 0) {
                s.phase = 'dead';
                // Guardar récord
                if (s.score > bestRef.current) {
                    bestRef.current = s.score;
                    localStorage.setItem('tb-best', String(s.score));
                    setUiBest(s.score);
                }
                window.dispatchEvent(new CustomEvent('dan:game-score', {
                    detail: { gameId: 'typeblitz', score: s.score, isHighScore: s.score >= bestRef.current }
                }));
                setUiPhase('dead');
                draw();
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
        }

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }

    // ── Iniciar / reiniciar ───────────────────────────────────────────────
    function startGame() {
        const s = makeState();
        s.phase = 'playing';
        stateRef.current = s;
        setUiPhase('playing');
        setUiScore(0);
        setUiLives(3);
        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.focus();
        }
    }

    function handleCanvasClick() {
        const s = stateRef.current;
        if (s.phase === 'idle' || s.phase === 'dead') startGame();
    }

    // ── Tipeo ─────────────────────────────────────────────────────────────
    function handleInput(e) {
        const val = e.target.value.toLowerCase().replace(/[^a-záéíóúñ]/gi, '');
        e.target.value = val; // limpiar caracteres no válidos

        const s = stateRef.current;
        if (s.phase !== 'playing') return;
        s.typedRaw = val;

        // ¿Alguna palabra coincide completa?
        const idx = s.words.findIndex(w => w.word === val);
        if (idx !== -1) {
            s.words.splice(idx, 1);
            s.score++;
            s.combo++;
            s.typedRaw = '';
            e.target.value = '';
            setUiScore(s.score);
        }
    }

    // ── Mount: arrancar el loop una sola vez ──────────────────────────────
    useEffect(() => {
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace', color: C_WHT }}>
            <canvas
                ref={canvasRef}
                width={W} height={H}
                onClick={handleCanvasClick}
                style={{
                    display: 'block', maxWidth: '100%',
                    border: `1px solid ${C_MAG}55`,
                    borderRadius: 4, cursor: 'pointer',
                }}
            />

            {/* Input visible solo al jugar */}
            <input
                ref={inputRef}
                onChange={handleInput}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={uiPhase === 'playing' ? 'escribe aquí...' : ''}
                style={{
                    marginTop: 8,
                    background: uiPhase === 'playing' ? 'rgba(255,0,255,0.08)' : 'transparent',
                    border: uiPhase === 'playing' ? `1px solid ${C_MAG}55` : '1px solid transparent',
                    borderRadius: 12,
                    padding: '8px 16px',
                    color: C_WHT,
                    fontSize: 15,
                    fontFamily: 'monospace',
                    outline: 'none',
                    width: '75%',
                    textAlign: 'center',
                    letterSpacing: 2,
                    transition: 'all 0.3s',
                    pointerEvents: uiPhase === 'playing' ? 'auto' : 'none',
                }}
            />
            <p style={{ marginTop: 6, fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase' }}>
                Click en el canvas · Tipea para eliminar palabras
            </p>
        </div>
    );
}
