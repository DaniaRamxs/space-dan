/**
 * CosmicDraw.jsx
 * Juego cooperativo de dibujo y adivinanza (Pictionary espacial).
 *
 * Arquitectura:
 *   - Sincronización via Supabase Realtime Broadcast (sin base de datos).
 *   - El "host" (participante con identity más baja alfabéticamente) es el
 *     único que ejecuta el temporizador y verifica los intentos de respuesta.
 *   - Para evitar que el canal se destruya/recree en cada cambio de estado,
 *     los valores que el handler de `guess_attempt` necesita leer se
 *     espejean en refs (`isHostRef`, `gameStateRef`, `currentWordRef`).
 *
 * Flujo:
 *   1. Host inicia ronda → broadcast `game_state_update` con estado, palabra, etc.
 *   2. Dibujante traza líneas → broadcast `draw_line` a todos.
 *   3. Adivinador envía `guess_attempt` → host valida → broadcast `claim_reward`.
 *   4. Si el tiempo expira, host llama `endRound(null)`.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eraser, Pen, Clock, Play, Trophy } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';

const COLORS = ['#fff', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];
const WORDS  = [
    'Astronauta', 'Agujero Negro', 'Satélite', 'Extraterrestre', 'Supernova',
    'Cohete', 'Meteorito', 'Estrellas', 'Tierra', 'Marte', 'Robot', 'Ovni',
    'Luna', 'Cometa', 'Galaxia', 'Telescopio', 'Traje Espacial', 'Gravedad',
    'Platillo Volador',
];

export default function CosmicDraw({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const { awardCoins }    = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants         = useParticipants();

    // ── Estado del juego ──────────────────────────────────────────────────────
    const [gameState,       setGameState]       = useState('lobby'); // lobby | playing | finished
    const [timeLeft,        setTimeLeft]        = useState(60);
    const [currentDrawerId, setCurrentDrawerId] = useState(null);
    const [currentWord,     setCurrentWord]     = useState('');
    const [guessInput,      setGuessInput]      = useState('');
    const [winner,          setWinner]          = useState(null);
    const [color,           setColor]           = useState(COLORS[0]);
    const [lineWidth,       setLineWidth]       = useState(3);

    // ── Refs — espejo del estado para handlers estables ───────────────────────
    // Necesarios para que los broadcast handlers de Supabase (registrados
    // una sola vez) lean siempre los valores actuales sin stale closures.
    const canvasRef      = useRef(null);
    const channelRef     = useRef(null);
    const isDrawingRef   = useRef(false);
    const lastPos        = useRef({ x: 0, y: 0 });
    const isHostRef      = useRef(false);
    const gameStateRef   = useRef('lobby');
    const currentWordRef = useRef('');

    // ── Determinación de host (líder = menor identity alfabética) ─────────────
    const allParticipants = useMemo(() => {
        if (!localParticipant) return participants;
        return [localParticipant, ...participants];
    }, [localParticipant, participants]);

    const sortedParticipants = useMemo(
        () => [...allParticipants].sort((a, b) => (a.identity || '').localeCompare(b.identity || '')),
        [allParticipants]
    );

    const leaderIdentity = useMemo(() => sortedParticipants[0]?.identity, [sortedParticipants]);
    const isHost   = localParticipant?.identity === leaderIdentity;
    const isMyTurn = currentDrawerId === localParticipant?.identity
                  || (gameState === 'playing' && !currentDrawerId && isHost);

    // Mantener refs sincronizadas con el estado
    useEffect(() => { isHostRef.current      = isHost;      }, [isHost]);
    useEffect(() => { gameStateRef.current   = gameState;   }, [gameState]);
    useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);

    // ── Canal de Supabase Realtime ────────────────────────────────────────────
    // Se crea UNA SOLA VEZ (deps: [roomName, user]).
    // Los handlers usan refs para evitar que el canal se destruya en cada
    // cambio de estado del juego.
    useEffect(() => {
        if (!roomName || !user) return;

        const channelName = `cosmic-draw-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'draw_line' }, ({ payload }) => {
                receiveDrawLine(payload);
            })
            .on('broadcast', { event: 'clear_canvas' }, () => {
                internalClearCanvas();
            })
            .on('broadcast', { event: 'game_state_update' }, ({ payload }) => {
                setGameState(payload.state);
                if (payload.timeLeft  !== undefined) setTimeLeft(payload.timeLeft);
                if (payload.drawerId  !== undefined) setCurrentDrawerId(payload.drawerId);
                if (payload.word      !== undefined) setCurrentWord(payload.word);
                if (payload.winner    !== undefined) setWinner(payload.winner);
                // Limpiar canvas al iniciar nueva ronda
                if (payload.state === 'playing' && payload.timeLeft === 60) internalClearCanvas();
            })
            .on('broadcast', { event: 'guess_attempt' }, ({ payload }) => {
                // Solo el host valida — leyendo refs para evitar stale closure
                if (
                    isHostRef.current
                    && gameStateRef.current === 'playing'
                    && currentWordRef.current
                    && payload.guess.toLowerCase() === currentWordRef.current.toLowerCase()
                    && payload.guesserId !== localParticipant?.identity
                ) {
                    handleCorrectGuess(payload.guesserId, payload.guesserName);
                }
            })
            .on('broadcast', { event: 'claim_reward' }, ({ payload }) => {
                // Reclamar premio si yo gané
                if (payload.winnerId === localParticipant?.identity) {
                    awardCoins(payload.amount, 'game_reward', 'cosmic-draw', '¡Adivinaste en Cosmic Draw!');
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomName, user]); // Canal creado una sola vez

    // ── Temporizador (solo el host) ───────────────────────────────────────────
    // Deps: [gameState, isHost] — NO incluye `timeLeft` para evitar recrear
    // el intervalo cada segundo. El tiempo se gestiona con el updater funcional.
    useEffect(() => {
        if (!isHost || gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                // Broadcast cada 5 segundos o al llegar a 0
                if (newTime % 5 === 0 || newTime === 0) {
                    broadcastState({ state: 'playing', timeLeft: newTime });
                }
                if (newTime <= 0) {
                    // Usar setTimeout para salir del updater funcional antes de llamar endRound
                    setTimeout(() => endRound(null), 0);
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState, isHost]);

    // ── Fix para touchmove no-pasivo (Chrome/mobile) ──────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleTouchMove = (e) => {
            if (!isDrawingRef.current) return;
            if (e.cancelable) e.preventDefault();
            draw(e);
        };

        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => canvas.removeEventListener('touchmove', handleTouchMove);
    // Solo re-registrar cuando cambian estas condiciones (infrecuente)
    }, [isMyTurn, gameState]);

    // ── Funciones de lógica de juego ──────────────────────────────────────────

    const broadcastState = (payload) => {
        channelRef.current?.send({ type: 'broadcast', event: 'game_state_update', payload });
    };

    const startGame = () => {
        internalClearCanvas();
        const randWord = WORDS[Math.floor(Math.random() * WORDS.length)];
        const hostId   = localParticipant.identity;

        setGameState('playing');
        setTimeLeft(60);
        setCurrentDrawerId(hostId);
        setCurrentWord(randWord);
        setWinner(null);

        broadcastState({ state: 'playing', timeLeft: 60, drawerId: hostId, word: randWord, winner: null });
    };

    const handleCorrectGuess = async (guesserId, guesserName) => {
        // Evitar doble disparo con ref
        if (gameStateRef.current !== 'playing') return;

        const drawReward  = 50;
        const guessReward = 100;

        endRound({ id: guesserId, name: guesserName, reward: guessReward });

        // Premio al dibujante (host en esta ronda)
        await awardCoins(drawReward, 'game_reward', 'cosmic-draw', 'Buen dibujo adivinado');

        // Notificar al ganador para que reclame su premio
        channelRef.current?.send({
            type: 'broadcast',
            event: 'claim_reward',
            payload: { winnerId: guesserId, amount: guessReward },
        });
    };

    const endRound = (winData) => {
        setGameState('finished');
        const finalWinner = winData ?? { name: 'Nadie', id: 'none' };
        setWinner(finalWinner);
        broadcastState({ state: 'finished', timeLeft: 0, winner: finalWinner });
    };

    const submitGuess = (e) => {
        e.preventDefault();
        const cleanGuess = guessInput.trim();
        if (!cleanGuess || isMyTurn || gameState !== 'playing') return;

        channelRef.current?.send({
            type: 'broadcast',
            event: 'guess_attempt',
            payload: {
                guess:       cleanGuess,
                guesserId:   localParticipant.identity,
                guesserName: profile?.username || 'Tripulante',
            },
        });
        setGuessInput('');
    };

    // ── Funciones del canvas ──────────────────────────────────────────────────

    const sendDrawEvent = (x0, y0, x1, y1, col, lw) => {
        const canvas = canvasRef.current;
        if (!canvas || !channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'draw_line',
            payload: { x0, y0, x1, y1, col, lw, canvasW: canvas.width, canvasH: canvas.height },
        });
    };

    const receiveDrawLine = (payload) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Escalar coordenadas al tamaño actual del canvas
        const scaleX = canvas.width  / payload.canvasW;
        const scaleY = canvas.height / payload.canvasH;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(payload.x0 * scaleX, payload.y0 * scaleY);
        ctx.lineTo(payload.x1 * scaleX, payload.y1 * scaleY);
        ctx.strokeStyle = payload.col;
        ctx.lineWidth   = payload.lw;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.stroke();
        ctx.closePath();
    };

    const getPos = (e) => {
        const rect   = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width  / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const touch  = e.touches?.[0];
        const clientX = touch ? touch.clientX : e.clientX;
        const clientY = touch ? touch.clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top)  * scaleY,
        };
    };

    const startDrawing = (e) => {
        if (!isMyTurn || gameState !== 'playing') return;
        isDrawingRef.current = true;
        lastPos.current = getPos(e.nativeEvent || e);
    };

    const draw = (e) => {
        if (!isDrawingRef.current || !isMyTurn || gameState !== 'playing') return;
        const pos = getPos(e.nativeEvent || e);
        const { x: x0, y: y0 } = lastPos.current;
        const { x: x1, y: y1 } = pos;

        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = color;
        ctx.lineWidth   = lineWidth;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.stroke();
        ctx.closePath();

        sendDrawEvent(x0, y0, x1, y1, color, lineWidth);
        lastPos.current = pos;
    };

    const stopDrawing = () => { isDrawingRef.current = false; };

    const internalClearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    const requestClearCanvas = () => {
        if (!isMyTurn || gameState !== 'playing') return;
        internalClearCanvas();
        channelRef.current?.send({ type: 'broadcast', event: 'clear_canvas', payload: {} });
    };

    // ── Palabra mostrada (ocultar letras para los adivinadores) ──────────────
    const displayWord = isMyTurn || gameState === 'finished'
        ? currentWord
        : currentWord.split('').map((char, i) => char === ' ' ? ' ' : (i % 3 === 0 ? char : '_')).join(' ');

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-[#050518]/95 backdrop-blur border border-cyan-500/20 rounded-[2rem] p-4 sm:p-6 mt-4 relative shadow-[0_30px_60px_rgba(8,145,178,0.2)]"
        >
            {/* Botón de salida */}
            <button
                onClick={onClose}
                aria-label="Salir del juego"
                className="absolute right-4 top-4 text-cyan-500/50 hover:text-cyan-400 bg-cyan-500/10 p-2 rounded-full transition-all z-20"
            >
                <X size={16} />
            </button>

            {/* Header: palabra / timer */}
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2 pr-10">
                <div className={`flex flex-col items-start gap-1 bg-cyan-500/10 px-4 py-2 rounded-2xl border ${
                    isMyTurn && gameState === 'playing'
                        ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                        : 'border-cyan-500/20'
                }`}>
                    {gameState === 'lobby' ? (
                        <span className="text-cyan-400 font-black tracking-widest uppercase text-[10px] w-full text-center">
                            🎨 Cosmic Draw
                        </span>
                    ) : (
                        <>
                            <span className="text-white/60 uppercase tracking-[0.2em] text-[8px]">
                                {isMyTurn ? 'DIBUJA AHORA:' : 'ADIVINA LA PALABRA:'}
                            </span>
                            <span className={`font-black tracking-widest uppercase text-xs sm:text-sm ${
                                isMyTurn ? 'text-amber-400' : 'text-cyan-400 tracking-[0.5em]'
                            }`}>
                                {displayWord}
                            </span>
                        </>
                    )}
                </div>

                {/* Contador de tiempo */}
                <div className={`flex shrink-0 items-center justify-center gap-1.5 px-3 py-2 sm:py-3 rounded-xl border font-black text-xs sm:text-base ${
                    timeLeft < 10 && gameState === 'playing'
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'
                        : 'text-cyan-400 bg-black/40 border-white/10'
                }`}>
                    <Clock size={16} />
                    {gameState === 'playing' ? `${timeLeft}s` : '-'}
                </div>
            </div>

            {/* Canvas de dibujo */}
            <div className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-[#020205] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] touch-none mb-3 ${
                isMyTurn && gameState === 'playing' ? 'border-amber-500/50' : 'border-white/10'
            }`}>
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    style={{ touchAction: 'none' }}
                    className={`w-full h-full object-contain ${
                        isMyTurn && gameState === 'playing' ? 'cursor-crosshair' : 'cursor-not-allowed opacity-90'
                    }`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                />

                {/* ── Overlays ─────────────────────────────────────────────── */}
                <AnimatePresence>
                    {gameState === 'lobby' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10"
                        >
                            <span className="text-6xl mb-4">🎨</span>
                            <h3 className="text-cyan-400 font-black uppercase tracking-widest mb-2">Dibuja y Adivina Multijugador</h3>
                            <p className="text-white/40 text-[10px] uppercase leading-relaxed max-w-xs mb-8">
                                Adivina rápido: 100◈ Starlys. Dibujante: 50◈.
                            </p>
                            {isHost ? (
                                <button
                                    onClick={startGame}
                                    className="flex items-center gap-2 px-8 py-4 rounded-xl bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] hover:bg-cyan-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                                >
                                    <Play size={16} /> Iniciar Duelo
                                </button>
                            ) : (
                                <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest animate-pulse border border-amber-400/20 bg-amber-500/10 px-6 py-3 rounded-xl">
                                    Esperando al host...
                                </p>
                            )}
                        </motion.div>
                    )}

                    {gameState === 'finished' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10"
                        >
                            {winner?.id !== 'none' ? (
                                <>
                                    <Trophy size={60} className="text-amber-400 mb-4" />
                                    <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">¡Adivinador Maestro!</h3>
                                    <p className="text-amber-400 font-black text-2xl mb-6">@{winner?.name}</p>
                                    <div className="text-[10px] font-black tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl mb-8">
                                        +100◈ Recompensa
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4 opacity-50">⏳</div>
                                    <h3 className="text-white/50 font-black uppercase tracking-widest text-sm mb-2">Se acabó el tiempo</h3>
                                    <p className="text-cyan-400 text-xs uppercase tracking-widest mb-8">
                                        Era: <strong className="text-white">{currentWord}</strong>
                                    </p>
                                </>
                            )}

                            {isHost ? (
                                <button
                                    onClick={startGame}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 active:scale-95 transition-all"
                                >
                                    <Play size={14} /> Jugar de Nuevo
                                </button>
                            ) : (
                                <p className="text-white/40 text-[10px] uppercase tracking-widest animate-pulse">
                                    El host está reiniciando...
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Paleta y herramientas (solo para el dibujante activo) */}
            <div className={`transition-all duration-300 ${!isMyTurn || gameState !== 'playing' ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex flex-wrap gap-1.5">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                aria-label={`Color ${c}`}
                                onClick={() => setColor(c)}
                                style={{ backgroundColor: c }}
                                className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 transition-transform shrink-0 ${
                                    color === c
                                        ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                        <button
                            aria-label="Cambiar grosor"
                            onClick={() => setLineWidth(prev => prev === 3 ? 10 : 3)}
                            className={`p-2 sm:p-3 rounded-xl transition-all ${
                                lineWidth > 3
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
                            }`}
                        >
                            <Pen size={16} />
                        </button>
                        <button
                            aria-label="Limpiar canvas"
                            onClick={requestClearCanvas}
                            className="p-2 sm:p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                        >
                            <Eraser size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Campo de respuesta / indicador de turno */}
            {isMyTurn && gameState === 'playing' ? (
                <div className="mt-2 pt-3 border-t border-white/10 flex items-center gap-2">
                    <div className="flex-1 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-400 font-black uppercase tracking-widest text-center">
                        ✏️ Estás dibujando — Los demás adivinan
                    </div>
                </div>
            ) : (
                <form
                    onSubmit={submitGuess}
                    className={`mt-2 pt-3 border-t border-white/10 flex items-center gap-2 transition-all ${
                        gameState !== 'playing' ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                    <input
                        type="text"
                        value={guessInput}
                        onChange={(e) => setGuessInput(e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        autoComplete="off"
                        className="flex-1 bg-white/5 border border-white/20 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 outline-none transition-all focus:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    />
                    <button
                        type="submit"
                        disabled={!guessInput.trim() || gameState !== 'playing'}
                        className="px-5 py-3 rounded-xl bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] disabled:opacity-30 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0"
                    >
                        Adivinar
                    </button>
                </form>
            )}

            {/* Botón "Terminar ronda" para el dibujante */}
            {isMyTurn && gameState === 'playing' && (
                <div className="mt-3 text-center">
                    <button
                        onClick={() => endRound(null)}
                        className="text-[10px] text-white/30 hover:text-rose-400 uppercase font-black tracking-widest px-4 py-2 rounded-lg hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                    >
                        Nadie lo sabe — Terminar ronda
                    </button>
                </div>
            )}
        </motion.div>
    );
}
