import { useState, useEffect, useRef, useCallback } from 'react';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const W = 400;
const H = 400;
const FRAME_MS = 1000 / 60;
const TARGET_R = 140;
const MAX_ROUNDS = 10;

function makeState() {
    return {
        round: 1,
        ringR: 0,
        speed: 120, // px/sec
        scores: [], // array of precision percentages
        lastTime: 0,
        targetAlpha: 1, // Fades out
        resultMsg: '',
        resultColor: '#fff',
        diffMs: 0
    };
}

function EchoTimingInner() {
    const [status, setStatus] = useState('IDLE'); // IDLE, PLAYING, RESULT, DONE
    const [best, saveScore] = useHighScore('echotiming');

    // UI state for HUD
    const [currentRound, setCurrentRound] = useState(1);
    const [avgPrecision, setAvgPrecision] = useState(0);

    const statusRef = useRef('IDLE');
    const stateRef = useRef(makeState());

    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const lastFrameRef = useRef(0);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText
    } = useArcadeSystems();

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const s = stateRef.current;
        const CX = W / 2;
        const CY = H / 2;

        // Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, W, H);

        if (statusRef.current === 'PLAYING') {
            // Target Ring (Fades to invisible)
            if (s.targetAlpha > 0) {
                ctx.beginPath();
                ctx.arc(CX, CY, TARGET_R, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 229, 255, ${s.targetAlpha * 0.5})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Expanding Radial Line
            ctx.beginPath();
            ctx.arc(CX, CY, Math.max(0, s.ringR), 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Center dot
            ctx.beginPath();
            ctx.arc(CX, CY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        } else if (statusRef.current === 'RESULT') {
            // Show both so user sees how they did
            ctx.beginPath();
            ctx.arc(CX, CY, TARGET_R, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(CX, CY, Math.max(0, s.ringR), 0, Math.PI * 2);
            ctx.strokeStyle = s.resultColor;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Result Text inside Canvas
            ctx.fillStyle = s.resultColor;
            ctx.font = '900 32px "Outfit"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.resultMsg, CX, CY - 20);

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '600 16px "Outfit"';
            ctx.fillText(`Desfase: ${s.diffMs.toFixed(0)}ms`, CX, CY + 20);
        }

    }, []);

    const tick = useCallback((time) => {
        rafRef.current = requestAnimationFrame(tick);
        if (time - lastFrameRef.current < FRAME_MS) return;
        lastFrameRef.current = time;
        const s = stateRef.current;
        if (!s.lastTime) s.lastTime = time;
        let dt = (time - s.lastTime) / 1000;
        if (dt < 0) dt = 0; // Prevent negative dt
        if (dt > 0.1) dt = 0.1;
        s.lastTime = time;

        if (statusRef.current === 'IDLE' || statusRef.current === 'DONE') {
            draw();
            return;
        }

        if (statusRef.current === 'PLAYING') {
            s.ringR += s.speed * dt;

            // Fade out target quickly
            if (s.targetAlpha > 0) {
                s.targetAlpha -= dt * 1.2; // Fades out in ~0.8s
                if (s.targetAlpha < 0) s.targetAlpha = 0;
            }

            // Auto-miss if it goes too far beyond target
            if (s.ringR > TARGET_R + 100) {
                handleTapMiss();
            }
        }

        draw();
    }, [draw]);

    const nextRound = useCallback(() => {
        const s = stateRef.current;
        if (s.round >= MAX_ROUNDS) {
            statusRef.current = 'DONE';
            setStatus('DONE');

            // Calculate final average precision
            let sum = 0;
            for (let p of s.scores) sum += p;
            const finalAvg = sum / MAX_ROUNDS;
            const finalScore = Math.floor(finalAvg * 100); // Store as integer like 9855 for 98.55%

            setAvgPrecision(finalAvg);
            saveScore(finalScore);

            triggerHaptic('heavy');
            spawnParticles('50%', '50%', '#00e5ff', 50);
            triggerFloatingText(`${finalAvg.toFixed(2)}% GLOBAL`, '50%', '30%', '#39ff14');
            draw();
            return;
        }

        s.round += 1;
        s.ringR = 0;
        s.targetAlpha = 1; // Show target again briefly
        s.speed = 120 + (s.round * 15); // Expands faster each round

        setCurrentRound(s.round);

        // Calculate running avg
        let sum = 0;
        for (let p of s.scores) sum += p;
        setAvgPrecision(sum / s.scores.length);

        statusRef.current = 'PLAYING';
        setStatus('PLAYING');
    }, [saveScore, triggerHaptic, spawnParticles, triggerFloatingText, draw]);

    const handleTapMiss = useCallback(() => {
        const s = stateRef.current;
        statusRef.current = 'RESULT';
        setStatus('RESULT');

        s.scores.push(0); // 0% precision
        s.resultMsg = "ZONA PERDIDA";
        s.resultColor = '#ff1744';
        s.diffMs = 999;

        triggerHaptic('heavy');
        spawnParticles('50%', '50%', '#ff1744', 20);
        setTimeout(nextRound, 1200);
    }, [nextRound, triggerHaptic, spawnParticles]);

    const handleTap = (e) => {
        e.preventDefault();

        if (statusRef.current === 'IDLE' || statusRef.current === 'DONE') {
            start();
            return;
        }

        if (statusRef.current === 'PLAYING') {
            const s = stateRef.current;

            // Calculate timing precision
            const diffPx = Math.abs(s.ringR - TARGET_R);
            const diffMs = (diffPx / s.speed) * 1000;
            s.diffMs = diffMs;

            // Precision window decreases per round
            const baseWindow = 300; // ms
            const currentWindow = Math.max(80, baseWindow - (s.round * 20)); // tighter window

            let precision = 0;
            if (diffMs <= currentWindow) {
                // Percentage based on how close inside the window
                precision = 100 - (diffMs / currentWindow) * 100;
            }

            s.scores.push(Math.max(0, precision));

            statusRef.current = 'RESULT';
            setStatus('RESULT');

            s.resultMsg = `${precision.toFixed(1)}%`;

            if (precision >= 95) {
                s.resultColor = '#00e5ff';
                triggerHaptic('heavy');
            } else if (precision >= 70) {
                s.resultColor = '#39ff14';
                triggerHaptic('medium');
            } else if (precision > 0) {
                s.resultColor = '#ffea00';
                triggerHaptic('light');
            } else {
                s.resultColor = '#ff1744';
                s.resultMsg = "FALLO";
                triggerHaptic('heavy');
            }

            spawnParticles('50%', '50%', s.resultColor, precision >= 90 ? 30 : 10);
            setTimeout(nextRound, 1200);
        }
    };

    const start = useCallback(() => {
        stateRef.current = makeState();
        stateRef.current.lastTime = performance.now();

        setCurrentRound(1);
        setAvgPrecision(0);

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
        draw();

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [draw, tick]);

    // Leaderboard displays highest score (average precision * 100)
    // Here we convert it to display visually
    const displayBest = best ? (best / 100).toFixed(2) + '%' : '0.00%';

    return (
        <ArcadeShell
            title="Echo Timing"
            score={avgPrecision.toFixed(2)}
            scoreLabel="Precisión %"
            bestScore={displayBest}
            status={status}
            onRetry={start}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="El radar emite un eco. Toca cuando golpee el objetivo invisible."
            gameId="echotiming"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>

                {/* HUD Minimal */}
                <div style={{
                    width: 'min(92vw, 400px)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0 16px'
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: 2 }}>RONDA {currentRound}/{MAX_ROUNDS}</span>
                    <span style={{ color: '#00e5ff', fontSize: '0.8rem', fontWeight: 900, letterSpacing: 1 }}>AVG: {avgPrecision.toFixed(1)}%</span>
                </div>

                <div
                    style={{
                        position: 'relative',
                        width: 'min(92vw, 400px)',
                        aspectRatio: '1',
                        background: 'rgba(4,4,10,1)',
                        borderRadius: 24,
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: 'inset 0 0 50px rgba(0,0,0,1)',
                        overflow: 'hidden',
                        touchAction: 'none',
                        cursor: 'pointer'
                    }}
                    onPointerDown={handleTap}
                >
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                    />

                    {status === 'IDLE' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
                            <span style={{
                                color: 'rgba(255,255,255,0.9)',
                                letterSpacing: 2,
                                textTransform: 'uppercase',
                                fontWeight: 900,
                                fontSize: '1.2rem',
                                animation: 'pulse 1.5s infinite'
                            }}>Toca para iniciar</span>
                        </div>
                    )}

                    {status === 'DONE' && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 3, fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>PRECISIÓN FINAL</span>
                            <span style={{ color: avgPrecision >= 90 ? '#00e5ff' : avgPrecision >= 70 ? '#39ff14' : '#ffea00', fontSize: '3rem', fontWeight: 900, textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                                {avgPrecision.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>

                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '80%' }}>
                    El aro objetivo desaparecerá.<br />Calcula la velocidad y toca la pantalla en el milisegundo exacto.
                </p>

            </div>
        </ArcadeShell>
    );
}

export default function EchoTiming() {
    return (
        <GameImmersiveLayout>
            <EchoTimingInner />
        </GameImmersiveLayout>
    );
}
