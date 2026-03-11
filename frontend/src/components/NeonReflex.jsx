import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useHighScore from '../hooks/useHighScore';
import { GameImmersiveLayout } from '../core/GameImmersiveLayout';
import { ArcadeShell } from './ArcadeShell';
import { useArcadeSystems } from '../hooks/useArcadeSystems';

const GAME_TIME = 60;
const TYPES = {
    NORMAL: { color: '#00e5ff', icon: '', pts: 1, duration: 1500 }, // +1, cyan
    MULTI: { color: '#ff00ff', icon: 'x2', pts: 0, duration: 1200 }, // x2 multiplier
    BOMB: { color: '#ff1744', icon: '💣', pts: 0, duration: 2000 },  // -5s time
    BURST: { color: '#ffea00', icon: '⚡', pts: 1, duration: 1000 }  // instant 3 nodes
};

function NeonReflexInner() {
    const [status, setStatus] = useState('IDLE');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [nodes, setNodes] = useState([]);
    const [isMulti, setIsMulti] = useState(false);
    const [best, saveScore] = useHighScore('reflex');

    const statusRef = useRef('IDLE');
    const scoreRef = useRef(0);
    const nodesRef = useRef([]);
    const startTimeRef = useRef(0);
    const nextSpawnRef = useRef(0);
    const multiEndRef = useRef(0);
    const rafRef = useRef(null);
    const lastTimeRef = useRef(GAME_TIME);

    const {
        particles, floatingTexts, scoreControls,
        triggerHaptic, spawnParticles, triggerFloatingText, animateScore
    } = useArcadeSystems();

    const spawnNode = useCallback((typeOverride, timeNow) => {
        const r = Math.random();
        let type = 'NORMAL';
        if (!typeOverride) {
            if (r < 0.1) type = 'MULTI';
            else if (r < 0.25) type = 'BOMB';
            else if (r < 0.3) type = 'BURST';
        } else {
            type = typeOverride;
        }

        const tDef = TYPES[type];
        nodesRef.current.push({
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: 10 + Math.random() * 80,
            y: 10 + Math.random() * 80,
            expiresAt: timeNow + tDef.duration,
            def: tDef
        });
    }, []);

    const endGame = useCallback(() => {
        statusRef.current = 'DEAD';
        setStatus('DEAD');
        nodesRef.current = [];
        setNodes([]);
        saveScore(scoreRef.current);
        triggerHaptic('heavy');
        triggerFloatingText('TIEMPO', '50%', '40%', '#ff1744');
    }, [saveScore, triggerHaptic, triggerFloatingText]);

    const tick = useCallback((time) => {
        if (statusRef.current !== 'PLAYING') return;

        const now = Date.now();
        const elapsedRaw = now - startTimeRef.current;
        const remaining = Math.max(0, GAME_TIME - elapsedRaw / 1000);

        if (Math.ceil(remaining) !== lastTimeRef.current) {
            lastTimeRef.current = Math.ceil(remaining);
            setTimeLeft(lastTimeRef.current);
        }

        if (remaining <= 0) {
            endGame();
            return;
        }

        const multiActive = now < multiEndRef.current;
        setIsMulti(prev => {
            if (prev !== multiActive) return multiActive;
            return prev;
        });

        let len = nodesRef.current.length;
        nodesRef.current = nodesRef.current.filter(n => now < n.expiresAt);
        let changed = nodesRef.current.length !== len;

        if (now >= nextSpawnRef.current) {
            spawnNode(null, now);
            const speedFactor = remaining / GAME_TIME; // 1 -> 0
            const delay = 350 + speedFactor * 500; // Fastens as time goes down
            nextSpawnRef.current = now + delay;
            changed = true;
        }

        if (changed) {
            setNodes([...nodesRef.current]);
        }

        rafRef.current = requestAnimationFrame(tick);
    }, [endGame, spawnNode]);

    const start = useCallback(() => {
        statusRef.current = 'PLAYING';
        setStatus('PLAYING');
        scoreRef.current = 0;
        setScore(0);
        setTimeLeft(GAME_TIME);
        lastTimeRef.current = GAME_TIME;
        nodesRef.current = [];
        setNodes([]);
        multiEndRef.current = 0;
        setIsMulti(false);

        const now = Date.now();
        startTimeRef.current = now;
        nextSpawnRef.current = now + 500;

        triggerHaptic('medium');
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    }, [tick, triggerHaptic]);

    const handleTap = (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (statusRef.current !== 'PLAYING') return;

        const idx = nodesRef.current.findIndex(n => n.id === id);
        if (idx === -1) return;

        const node = nodesRef.current[idx];
        nodesRef.current.splice(idx, 1);
        setNodes([...nodesRef.current]);

        const multiActive = Date.now() < multiEndRef.current;

        const px = e.clientX + 'px';
        const py = e.clientY + 'px';

        if (node.type === 'NORMAL') {
            const pts = multiActive ? 2 : 1;
            scoreRef.current += pts;
            setScore(scoreRef.current);
            animateScore();
            triggerHaptic('light');
            spawnParticles(px, py, node.def.color, 8);
            triggerFloatingText(`+${pts}`, px, py, node.def.color);
        } else if (node.type === 'MULTI') {
            multiEndRef.current = Date.now() + 5000;
            triggerHaptic('medium');
            spawnParticles(px, py, node.def.color, 15);
            triggerFloatingText('¡x2!', px, py, node.def.color);
        } else if (node.type === 'BOMB') {
            startTimeRef.current -= 5000; // Directly removes 5 seconds
            triggerHaptic('heavy');
            spawnParticles(px, py, node.def.color, 25);
            triggerFloatingText('-5s', px, py, node.def.color);
        } else if (node.type === 'BURST') {
            const pts = multiActive ? 2 : 1;
            scoreRef.current += pts;
            setScore(scoreRef.current);
            animateScore();
            triggerHaptic('medium');
            spawnParticles(px, py, node.def.color, 12);
            triggerFloatingText('¡RÁFAGA!', px, py, node.def.color);

            const now = Date.now();
            spawnNode('NORMAL', now);
            spawnNode('NORMAL', now);
            spawnNode('NORMAL', now);
            setNodes([...nodesRef.current]);
        }
    };

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <ArcadeShell
            title="Neon Reflex"
            score={score}
            bestScore={best}
            status={status}
            onRetry={start}
            timeLeft={timeLeft}
            totalTime={GAME_TIME}
            scoreControls={scoreControls}
            particles={particles}
            floatingTexts={floatingTexts}
            subTitle="Destruye los nodos antes de que expiren."
            gameId="reflex"
        >
            <div
                style={{
                    position: 'relative',
                    width: 'min(92vw, 480px)',
                    aspectRatio: '3/4',
                    background: 'rgba(4,4,10,0.8)',
                    borderRadius: 24,
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(8px)',
                    touchAction: 'none'
                }}
                onClick={() => {
                    if (status === 'IDLE') start();
                }}
            >
                {isMulti && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'absolute', inset: 0,
                            border: '4px solid rgba(255,0,255,0.3)',
                            borderRadius: 24,
                            boxShadow: 'inset 0 0 40px rgba(255,0,255,0.1)',
                            pointerEvents: 'none',
                            zIndex: 20
                        }}
                    />
                )}

                {status === 'IDLE' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.4)', zIndex: 30 }}>
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

                <AnimatePresence>
                    {nodes.map(n => (
                        <motion.button
                            key={n.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.15, type: 'spring', stiffness: 400, damping: 25 }}
                            onPointerDown={(e) => handleTap(n.id, e)}
                            style={{
                                position: 'absolute',
                                left: `${n.x}%`,
                                top: `${n.y}%`,
                                width: 65,
                                height: 65,
                                marginLeft: -32.5,
                                marginTop: -32.5,
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, ${n.def.color} 50%, rgba(0,0,0,0.8) 100%)`,
                                border: `2px solid ${n.def.color}`,
                                boxShadow: `0 0 20px ${n.def.color}66, inset 0 0 10px rgba(255,255,255,0.5)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent',
                                outline: 'none',
                                zIndex: 10
                            }}
                        >
                            {n.def.icon && <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>{n.def.icon}</span>}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>
        </ArcadeShell>
    );
}

export default function NeonReflex() {
    return (
        <GameImmersiveLayout>
            <NeonReflexInner />
        </GameImmersiveLayout>
    );
}
