import { useEffect, useRef, useState } from 'react';
import useHighScore from '../hooks/useHighScore';

// ── Dimensiones responsive ───────────────────────────────────────────────────
const LOGIC_W = 380;
const LOGIC_H = 460;
const DANGER_Y = LOGIC_H - 50;

const C_BG = '#090912';
const C_CYN = '#00e5ff';
const C_MAG = '#ff00ff';
const C_WHT = '#ffffff';
const C_DIM = 'rgba(255,255,255,0.3)';

const WORD_BANKS = {
    easy: ['sol', 'luz', 'mar', 'paz', 'rio', 'ola', 'eco', 'neo', 'star', 'dan', 'luna', 'cielo', 'vivo', 'nova', 'kod'],
    medium: ['nebulosa', 'galaxia', 'orbital', 'eclipse', 'quantum', 'vector', 'plasma', 'fusion', 'neutron', 'cosmos', 'danspace'],
    hard: ['supernova', 'horizonte', 'magnetar', 'gravedad', 'singularidad', 'hyperspace', 'antimatter', 'vanguardia'],
};

function pickWord(level) {
    const bank = level === 'easy' ? WORD_BANKS.easy
        : level === 'medium' ? [...WORD_BANKS.easy, ...WORD_BANKS.medium]
            : [...WORD_BANKS.easy, ...WORD_BANKS.medium, ...WORD_BANKS.hard];
    return bank[Math.floor(Math.random() * bank.length)];
}

function makeState() {
    return { phase: 'idle', words: [], score: 0, lives: 3, combo: 0, frame: 0, nextIn: 80, typed: '' };
}

export default function TypeBlitz() {
    const canvasRef = useRef(null);
    const stateRef = useRef(makeState());
    const rafRef = useRef(null);
    const inputRef = useRef(null);
    const [best, saveScore] = useHighScore('typeblitz');
    const [uiPhase, setUiPhase] = useState('idle');
    const [uiScore, setUiScore] = useState(0);
    const [uiLives, setUiLives] = useState(3);

    // ── Escala canvas al contenedor ─────────────────────────────────────────
    function getScale() {
        const canvas = canvasRef.current;
        if (!canvas) return 1;
        const rect = canvas.parentElement?.getBoundingClientRect();
        const maxW = rect ? rect.width - 8 : LOGIC_W;
        return Math.min(1, maxW / LOGIC_W);
    }

    // ── Draw (lee stateRef, nunca React state) ──────────────────────────────
    function draw() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);

        // Línea de peligro
        ctx.strokeStyle = C_MAG + '50';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(LOGIC_W, DANGER_Y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = C_MAG + '66';
        ctx.font = '7px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('[ DANGER ]', LOGIC_W - 6, DANGER_Y - 5);

        // Palabras
        ctx.font = 'bold 16px monospace';
        const typedLc = s.typed.toLowerCase();
        for (const w of s.words) {
            const match = typedLc.length > 0 && w.word.startsWith(typedLc);
            const hi = match ? typedLc.length : 0;
            ctx.textAlign = 'left';
            if (hi > 0) {
                ctx.fillStyle = C_CYN; ctx.shadowColor = C_CYN; ctx.shadowBlur = 8;
                ctx.fillText(w.word.slice(0, hi), w.x, w.y);
                const tw = ctx.measureText(w.word.slice(0, hi)).width;
                ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.shadowBlur = 0;
                ctx.fillText(w.word.slice(hi), w.x + tw, w.y);
            } else {
                const fade = Math.max(0.2, 1 - w.y / (DANGER_Y + 10));
                ctx.fillStyle = `rgba(255,255,255,${fade})`; ctx.shadowBlur = 0;
                ctx.fillText(w.word, w.x, w.y);
            }
        }
        ctx.shadowBlur = 0;

        // HUD
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = C_CYN;
        ctx.fillText(`SCORE ${s.score}`, 10, 20);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ff6eb4';
        ctx.fillText(`BEST ${best}`, LOGIC_W - 10, 20);

        // Vidas
        ctx.textAlign = 'center'; ctx.fillStyle = C_MAG;
        ctx.shadowColor = C_MAG; ctx.shadowBlur = 6;
        for (let i = 0; i < s.lives; i++) ctx.fillText('♥', LOGIC_W / 2 - 18 + i * 20, 20);
        ctx.shadowBlur = 0;

        // Combo
        if (s.combo >= 3) {
            ctx.fillStyle = '#ffea00'; ctx.textAlign = 'left';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`🔥 COMBO ×${s.combo}`, 10, 38);
        }

        // Overlay idel
        if (s.phase === 'idle') {
            ctx.fillStyle = 'rgba(9,9,18,0.9)';
            ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
            ctx.fillStyle = C_MAG; ctx.shadowColor = C_MAG; ctx.shadowBlur = 20;
            ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
            ctx.fillText('TYPE BLITZ', LOGIC_W / 2, LOGIC_H / 2 - 55);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_WHT; ctx.font = '13px monospace';
            ctx.fillText('Escribe las palabras antes de que', LOGIC_W / 2, LOGIC_H / 2 - 12);
            ctx.fillText('toquen la zona de DANGER.', LOGIC_W / 2, LOGIC_H / 2 + 8);
            ctx.fillStyle = C_CYN; ctx.font = 'bold 11px monospace';
            ctx.fillText('[ TAP / CLICK para empezar ]', LOGIC_W / 2, LOGIC_H / 2 + 46);
        }

        if (s.phase === 'dead') {
            ctx.fillStyle = 'rgba(9,9,18,0.93)';
            ctx.fillRect(0, 0, LOGIC_W, LOGIC_H);
            ctx.fillStyle = C_MAG; ctx.shadowColor = C_MAG; ctx.shadowBlur = 18;
            ctx.font = 'bold 28px monospace'; ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', LOGIC_W / 2, LOGIC_H / 2 - 44);
            ctx.shadowBlur = 0;
            ctx.fillStyle = C_WHT; ctx.font = '16px monospace';
            ctx.fillText(`Score: ${s.score}`, LOGIC_W / 2, LOGIC_H / 2 - 6);
            ctx.fillStyle = '#ff6eb4'; ctx.font = '12px monospace';
            ctx.fillText(`Récord: ${best}`, LOGIC_W / 2, LOGIC_H / 2 + 18);
            ctx.fillStyle = C_CYN; ctx.font = 'bold 11px monospace';
            ctx.fillText('[ TAP / CLICK para reiniciar ]', LOGIC_W / 2, LOGIC_H / 2 + 52);
        }
    }

    // ── Game loop ────────────────────────────────────────────────────────────
    function tick() {
        const s = stateRef.current;
        if (s.phase === 'playing') {
            s.frame++;
            s.nextIn--;
            if (s.nextIn <= 0) {
                const level = s.score > 20 ? 'hard' : s.score > 8 ? 'medium' : 'easy';
                const word = pickWord(level);
                const speed = Math.min(0.38 + s.score * 0.011, 2.1);
                s.words.push({ word, x: 12 + Math.random() * (LOGIC_W - 12 - word.length * 11), y: -18, speed });
                s.nextIn = Math.floor(Math.max(30, 88 - s.score * 2) + Math.random() * 40);
            }
            let lost = 0;
            s.words = s.words.filter(w => { w.y += w.speed; if (w.y >= DANGER_Y) { lost++; return false; } return true; });
            if (lost > 0) {
                s.lives -= lost; s.combo = 0; setUiLives(s.lives);
                if (s.lives <= 0) {
                    s.phase = 'dead';
                    saveScore(s.score);
                    setUiPhase('dead');
                    draw();
                    rafRef.current = requestAnimationFrame(tick);
                    return;
                }
            }
        }
        draw();
        rafRef.current = requestAnimationFrame(tick);
    }

    function startGame() {
        const s = makeState();
        s.phase = 'playing';
        stateRef.current = s;
        setUiPhase('playing'); setUiScore(0); setUiLives(3);
        if (inputRef.current) { inputRef.current.value = ''; inputRef.current.focus(); }
    }

    function handleCanvasClick() {
        const s = stateRef.current;
        if (s.phase !== 'playing') startGame();
    }

    function handleInput(e) {
        const val = e.target.value.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ]/g, '').toLowerCase();
        e.target.value = val;
        const s = stateRef.current;
        if (s.phase !== 'playing') return;
        s.typed = val;
        const idx = s.words.findIndex(w => w.word === val);
        if (idx !== -1) {
            s.words.splice(idx, 1);
            s.score++; s.combo++;
            s.typed = ''; e.target.value = '';
            setUiScore(s.score);
        }
    }

    useEffect(() => {
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const scale = getScale();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace', color: C_WHT, width: '100%' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <canvas
                    ref={canvasRef}
                    width={LOGIC_W} height={LOGIC_H}
                    onClick={handleCanvasClick}
                    style={{
                        display: 'block',
                        width: `min(${LOGIC_W}px, 100%)`,
                        height: 'auto',
                        border: `1px solid ${C_MAG}55`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                    }}
                />
            </div>

            {/* Input */}
            <input
                ref={inputRef}
                onChange={handleInput}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                placeholder="escribe aquí..."
                style={{
                    marginTop: 10,
                    background: 'rgba(255,0,255,0.07)',
                    border: `1px solid ${C_MAG}44`,
                    borderRadius: 14,
                    padding: '10px 18px',
                    color: C_WHT,
                    fontSize: 16,
                    fontFamily: 'monospace',
                    outline: 'none',
                    width: 'min(300px, 90%)',
                    textAlign: 'center',
                    letterSpacing: 2,
                }}
            />
            <p style={{ marginTop: 6, fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, textTransform: 'uppercase' }}>
                tap canvas · tipea la palabra · enter / match completo
            </p>
        </div>
    );
}
