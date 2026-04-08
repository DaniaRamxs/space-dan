import { useEffect, useRef, useState, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const LOGIC_W = 380;
const LOGIC_H = 460;
const DANGER_Y = LOGIC_H - 50;

const C_BG = 'transparent';
const C_CYN = '#00e5ff';
const C_MAG = '#ff00ff';

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
    return { phase: 'playing', words: [], score: 0, lives: 3, combo: 0, frame: 0, nextIn: 80, typed: '' };
}

function TypeBlitzInner() {
    const canvasRef = useRef(null);
    const stateRef = useRef(makeState());
    const rafRef = useRef(null);
    const inputRef = useRef(null);
    const [best, saveScore] = useHighScore('typeblitz');

    const [status, setStatus] = useState('IDLE'); // IDLE | PLAYING | DEAD
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        ctx.clearRect(0, 0, LOGIC_W, LOGIC_H);

        // Danger Line
        ctx.strokeStyle = `${C_MAG}44`;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(0, DANGER_Y); ctx.lineTo(LOGIC_W, DANGER_Y); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = `${C_MAG}66`;
        ctx.font = '700 8px "Inter", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('ZONA DE PELIGRO', LOGIC_W - 10, DANGER_Y - 8);

        // Words
        ctx.font = 'bold 18px "Inter", monospace';
        const typedLc = s.typed.toLowerCase();
        for (const w of s.words) {
            const match = typedLc.length > 0 && w.word.startsWith(typedLc);
            const hi = match ? typedLc.length : 0;
            ctx.textAlign = 'left';

            if (hi > 0) {
                ctx.fillStyle = C_CYN;
                ctx.fillText(w.word.slice(0, hi), w.x, w.y);
                const tw = ctx.measureText(w.word.slice(0, hi)).width;
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.fillText(w.word.slice(hi), w.x + tw, w.y);
            } else {
                const fade = Math.max(0.2, 1 - (w.y / DANGER_Y));
                ctx.fillStyle = `rgba(255,255,255,${fade})`;
                ctx.fillText(w.word, w.x, w.y);
            }
        }
    }, []);

    const tick = useCallback(() => {
        const s = stateRef.current;
        if (status === 'PLAYING') {
            s.frame++;
            s.nextIn--;
            if (s.nextIn <= 0) {
                const level = s.score > 20 ? 'hard' : s.score > 8 ? 'medium' : 'easy';
                const word = pickWord(level);
                const speed = Math.min(0.4 + s.score * 0.012, 2.2);
                s.words.push({ word, x: 20 + Math.random() * (LOGIC_W - 40 - word.length * 12), y: -20, speed });
                s.nextIn = Math.floor(Math.max(30, 85 - s.score * 2) + Math.random() * 40);
            }

            let missed = 0;
            s.words = s.words.filter(w => {
                w.y += w.speed;
                if (w.y >= DANGER_Y) { missed++; return false; }
                return true;
            });

            if (missed > 0) {
                s.lives -= missed;
                setLives(Math.max(0, s.lives));
                triggerHaptic('medium');
                if (s.lives <= 0) {
                    setStatus('DEAD');
                    saveScore(s.score);
                    triggerHaptic('heavy');
                }
            }
        }
        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [status, draw, triggerHaptic, saveScore]);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [tick]);

    const start = () => {
        const s = makeState();
        stateRef.current = s;
        setScore(0);
        setLives(3);
        setStatus('PLAYING');
        triggerHaptic('medium');
        if (inputRef.current) {
            inputRef.current.value = '';
            setTimeout(() => inputRef.current.focus(), 100);
        }
    };

    const handleInput = (e) => {
        const val = e.target.value.toLowerCase().trim();
        const s = stateRef.current;
        if (status !== 'PLAYING') return;

        s.typed = val;
        const idx = s.words.findIndex(w => w.word === val);
        if (idx !== -1) {
            const wordObj = s.words[idx];
            spawnParticles(wordObj.x + 20, wordObj.y, C_CYN, 10);
            triggerFloatingText('+1', wordObj.x, wordObj.y, C_CYN);

            s.words.splice(idx, 1);
            s.score++;
            setScore(s.score);
            animateScore();
            triggerHaptic('light');

            s.typed = '';
            e.target.value = '';
        }
    };

    return (
        <ArcadeShell
            title="Type Blitz"
            score={score}
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Destruye las palabras antes de que toquen tierra."
            gameId="typeblitz"
        >
            <div style={{ position: 'relative', width: '100%', maxWidth: LOGIC_W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* HUD Internal overlay for lives */}
                {status === 'PLAYING' && (
                    <div style={{ position: 'absolute', top: -40, display: 'flex', gap: 8 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} style={{
                                color: i < lives ? C_MAG : 'rgba(255,255,255,0.1)',
                                filter: i < lives ? `drop-shadow(0 0 5px ${C_MAG})` : 'none',
                                fontSize: 18
                            }}>
                                ♥
                            </div>
                        ))}
                    </div>
                )}

                <canvas
                    ref={canvasRef}
                    width={LOGIC_W} height={LOGIC_H}
                    style={{
                        display: 'block',
                        width: '100%',
                        height: 'auto',
                        background: 'rgba(4,4,10,0.8)',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                    }}
                />

                <input
                    ref={inputRef}
                    onChange={handleInput}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={status === 'PLAYING' ? "Tipea rápido..." : ""}
                    style={{
                        marginTop: 20,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 16,
                        padding: '14px 24px',
                        color: '#fff',
                        fontSize: 18,
                        fontFamily: '"Inter", monospace',
                        outline: 'none',
                        width: 'min(300px, 90%)',
                        textAlign: 'center',
                        letterSpacing: 1.5,
                        transition: 'all 0.3s ease',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}
                />
            </div>
        </ArcadeShell>
    );
}

export default function TypeBlitz() {
    return (
        <GameImmersiveLayout>
            <TypeBlitzInner />
        </GameImmersiveLayout>
    );
}
