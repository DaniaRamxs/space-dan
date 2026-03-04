import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 400;
const H = 400;
const TARGET_R = 80;
const MAX_ROUNDS = 10;

function makeState() {
    return {
        round: 1,
        ringR: 250,
        speed: 150, // pixels per second
        totalScore: 0,
        combo: 0,
        lastTime: 0,
        message: '',
        messageAlpha: 0,
        flash: 0,
        resultColor: '#00e5ff',
    };
}

function PerfectTapInner() {
    const [status, setStatus] = useState('IDLE'); // IDLE, PLAYING, RESULT, DONE
    const [score, setScore] = useState(0);
    const [roundUI, setRoundUI] = useState(0);
    const [best, saveScore] = useHighScore('perfectap');

    const statusRef = useRef('IDLE');
    const stateRef = useRef(makeState());

    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;
        const CX = W / 2;
        const CY = H / 2;

        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        if (s.flash > 0) {
            ctx.fillStyle = `rgba(${s.resultColor === '#00e5ff' ? '0,229,255' : s.resultColor === '#ffea00' ? '255,234,0' : '255,23,68'}, ${s.flash})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Draw Target Circle (Fixed)
        ctx.beginPath();
        ctx.arc(CX, CY, TARGET_R, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (statusRef.current === 'PLAYING' || statusRef.current === 'RESULT') {
            // Draw Shrinking Ring
            ctx.beginPath();
            ctx.arc(CX, CY, Math.max(0, s.ringR), 0, Math.PI * 2);
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;

            // Subtle glow
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw Message
        if (s.messageAlpha > 0) {
            ctx.fillStyle = `rgba(255,255,255,${s.messageAlpha})`;
            ctx.font = '900 24px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.message, CX, CY);
        }

    }, []);

    const tick = useCallback((time) => {
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        let dt = (time - s.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        s.lastTime = time;

        if (s.flash > 0) s.flash = Math.max(0, s.flash - dt * 2);
        if (s.messageAlpha > 0) s.messageAlpha = Math.max(0, s.messageAlpha - dt * 1.5);

        if (statusRef.current === 'PLAYING') {
            s.ringR -= s.speed * dt;

            // Missed!
            if (s.ringR < TARGET_R - 20) {
                handleTapMiss();
            }
        }

        draw();
        rafRef.current = requestAnimationFrame(tick);
    }, [draw]);

    const nextRound = useCallback(() => {
        const s = stateRef.current;
        if (s.round >= MAX_ROUNDS) {
            statusRef.current = 'DONE';
            setStatus('DONE');
            saveScore(s.totalScore);
            triggerHaptic('heavy');
            spawnParticles('50%', '50%', '#00e5ff', 40);
            triggerFloatingText('¡COMPLETADO!', '50%', '30%', '#00e5ff');
            return;
        }

        s.round += 1;
        s.ringR = 250;
        s.speed = 150 + (s.round * 35) + (Math.random() * 50); // Faster and slightly unpredictable
        setRoundUI(s.round);
        statusRef.current = 'PLAYING';
        setStatus('PLAYING');
    }, [saveScore, triggerHaptic, spawnParticles, triggerFloatingText]);

    const handleTapMiss = useCallback(() => {
        const s = stateRef.current;
        statusRef.current = 'RESULT';
        setStatus('RESULT');
        s.combo = 0;
        s.message = "FALLO";
        s.messageAlpha = 1;
        s.flash = 0.5;
        s.resultColor = '#ff1744';

        triggerHaptic('heavy');
        spawnParticles('50%', '50%', '#ff1744', 20);

        setTimeout(nextRound, 800);
    }, [nextRound, triggerHaptic, spawnParticles]);

    const handleTap = (e) => {
        e.preventDefault();

        if (statusRef.current === 'IDLE' || statusRef.current === 'DONE') {
            start();
            return;
        }

        if (statusRef.current === 'PLAYING') {
            const s = stateRef.current;
            const diff = Math.abs(s.ringR - TARGET_R);

            // Translate pixel diff to ms estimation conceptually, or just use absolute diff.
            // Ring shrinks at s.speed px/s. 
            // Time diff = diff / s.speed seconds = (diff / s.speed) * 1000 ms.
            const diffMs = (diff / s.speed) * 1000;

            let pts = 0;
            let msg = '';
            let col = '';

            if (diffMs <= 30) { // Perfect
                pts = 1000;
                s.combo += 1;
                msg = s.combo > 1 ? `PERFECTO x${s.combo}` : "PERFECTO";
                col = '#00e5ff'; // Cyan
                triggerHaptic('heavy');
            } else if (diffMs <= 100) { // Great
                pts = 500;
                s.combo = 0;
                msg = "GENIAL";
                col = '#ffea00'; // Yellow
                triggerHaptic('medium');
            } else if (diffMs <= 250) { // Good
                pts = 100;
                s.combo = 0;
                msg = "BIEN";
                col = '#ffffff';
                triggerHaptic('light');
            } else { // Miss
                handleTapMiss();
                return;
            }

            pts += s.combo * 100; // Combo bonus

            s.totalScore += pts;
            setScore(s.totalScore);
            animateScore();

            statusRef.current = 'RESULT';
            setStatus('RESULT');

            s.message = `+${pts}`;
            s.messageAlpha = 1;
            s.flash = 0.4;
            s.resultColor = col;

            spawnParticles('50%', '50%', col, pts === 1000 ? 30 : 15);
            triggerFloatingText(msg, '50%', '30%', col);

            setTimeout(nextRound, 800);
        }
    };

    const start = useCallback(() => {
        stateRef.current = makeState();
        stateRef.current.lastTime = performance.now();
        setScore(0);
        setRoundUI(1);
        statusRef.current = 'PLAYING';
        setStatus('PLAYING');
        triggerHaptic('medium');

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [triggerHaptic, tick]);

    useEffect(() => {
        stateRef.current = makeState();
        statusRef.current = 'IDLE';
        setStatus('IDLE');
        setRoundUI(1);
        draw();

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [draw, tick]);

    return (
        <ArcadeShell
            title="Perfect Tap"
            score={score}
            bestScore={best}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Toca cuando los anillos se alineen con precisión."
            gameId="perfectap"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div
                    style={{
                        position: 'relative',
                        width: 'min(92vw, 400px)',
                        aspectRatio: '1',
                        background: 'rgba(4,4,10,0.8)',
                        borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        backdropFilter: 'blur(8px)',
                        touchAction: 'none',
                        cursor: 'pointer'
                    }}
                    onPointerDown={handleTap}
                >
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />

                    {status === 'IDLE' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', borderRadius: '50%' }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.8)',
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                fontWeight: 900,
                                fontSize: '1rem',
                                textShadow: '0 0 10px rgba(0,229,255,0.5)',
                                animation: 'pulse 2s infinite'
                            }}>Toca para iniciar</span>
                        </div>
                    )}
                </div>

                {/* Minimal HUD Rounds */}
                <div style={{
                    width: 'min(92vw, 400px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 8
                }}>
                    {Array.from({ length: MAX_ROUNDS }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 12, height: 12,
                                borderRadius: '50%',
                                background: i < roundUI - 1 ? '#00e5ff' : i === roundUI - 1 ? '#ffffff' : 'rgba(255,255,255,0.1)',
                                boxShadow: i < roundUI - 1 ? '0 0 10px #00e5ff' : i === roundUI - 1 ? '0 0 10px #ffffff' : 'none',
                                transition: 'all 0.3s'
                            }}
                        />
                    ))}
                </div>
            </div>
        </ArcadeShell>
    );
}

export default function PerfectTap() {
    return (
        <GameImmersiveLayout>
            <PerfectTapInner />
        </GameImmersiveLayout>
    );
}
