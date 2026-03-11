/**
 * AsteroidBattleGame.jsx
 * Juego de batalla de asteroides multijugador (hasta 4) — Colyseus ("asteroid-battle").
 *
 * Arquitectura de render:
 *   - El estado del juego (posición de naves, asteroides, balas) se dibuja
 *     en un <canvas> via `requestAnimationFrame`, no con React DOM.
 *     Esto permite 60fps sin depender del ciclo de re-render de React.
 *   - El HUD (timer, score, vidas) sí es React y se actualiza con `setState`.
 *
 * Inputs:
 *   - PC: WASD para mover, ratón para apuntar, clic para disparar
 *   - Móvil: joystick táctil (izquierda) + botón de disparo (derecha)
 *
 * Anti-patrón evitado:
 *   - El intervalo de envío de inputs usaba [room, state, myId] como deps,
 *     lo que lo recreaba en cada tick del servidor (~33ms). Ahora usa
 *     `stateRef` para leer el estado sin reinscribirse.
 */

import React, { useEffect, useRef, useState } from 'react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crosshair, Trophy, Zap, X, Rocket, Timer, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getLeaderboard } from '../../services/supabaseScores';

// Dimensiones del mundo de juego (coordenadas del servidor)
const WORLD_WIDTH  = 1200;
const WORLD_HEIGHT = 700;

// Estilos CSS globales para animaciones del canvas/HUD
const INLINE_STYLES = `
    .ab-spin-slow  { animation: ab-spin  12s linear      infinite; }
    .ab-float      { animation: ab-float  4s ease-in-out  infinite; }
    @keyframes ab-spin  { from { transform: rotate(0deg);   } to { transform: rotate(360deg); } }
    @keyframes ab-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
`;

export default function AsteroidBattleGame({ roomName, onClose }) {
    const { user, profile } = useAuthContext();

    const canvasRef    = useRef(null);
    const stateRef     = useRef(null); // espejo ref del estado — para el loop de inputs
    const keysRef      = useRef({ w: false, a: false, s: false, d: false });
    const mouseRef     = useRef({ x: 0, y: 0 });
    const joystickRef  = useRef({ active: false, x: 0, y: 0 });

    const [room,                  setRoom]                  = useState(null);
    const [state,                 setState]                 = useState(null);
    const [myId,                  setMyId]                  = useState(null);
    const [connecting,            setConnecting]            = useState(true);
    const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
    const [lbTab,                 setLbTab]                 = useState('match'); // 'match' | 'global'
    const [globalLevels,          setGlobalLevels]          = useState([]);

    // Mantener ref sincronizada con el estado para el loop de inputs
    useEffect(() => { stateRef.current = state; }, [state]);

    // ── Conexión a Colyseus ───────────────────────────────────────────────────
    useEffect(() => {
        let activeRoom = null;

        const connect = async () => {
            try {
                activeRoom = await client.joinOrCreate('asteroid-battle', {
                    roomName,
                    userId:   user?.id,
                    username: profile?.username || user?.user_metadata?.username || 'Pilot',
                    avatar:   profile?.avatar_url || '/default-avatar.png',
                    color:    profile?.accent_color || '#0ea5e9',
                });

                setRoom(activeRoom);
                setMyId(activeRoom.sessionId);
                setConnecting(false);

                // Spread para que React detecte el nuevo objeto y actualice el HUD
                activeRoom.onStateChange((s) => setState({ ...s }));

            } catch (err) {
                console.error('[AsteroidBattle] Error al conectar:', err?.message);
                toast.error('Error al conectar al campo de batalla');
            }
        };

        connect();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, []); // Conexión única al montar

    // ── Leaderboard global — carga inicial y al finalizar partida ─────────────
    useEffect(() => {
        const fetchGlobal = async () => {
            const data = await getLeaderboard('asteroid_battle', 10);
            setGlobalLevels(data);
        };
        fetchGlobal();
    }, []);

    useEffect(() => {
        if (state?.phase === 'finished') {
            getLeaderboard('asteroid_battle', 10).then(setGlobalLevels);
        }
    }, [state?.phase]);

    // ── Loop de envío de inputs al servidor (32ms ≈ 30Hz) ────────────────────
    // Deps: solo [room, myId] — el estado se lee via stateRef sin causar
    // que el intervalo se recree en cada tick del servidor.
    useEffect(() => {
        if (!room) return;

        const interval = setInterval(() => {
            const s = stateRef.current;
            const playersArr = Array.from(s?.players?.values() || []);
            const myPlayer = playersArr.find(p => p.sessionId === myId);
            if (!myPlayer) return;

            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvasRef.current.getBoundingClientRect();

            // Calcular ángulo de rotación hacia el cursor (PC) o joystick (móvil)
            let rotation = myPlayer.rotation;
            if (!joystickRef.current.active) {
                const relX = mouseRef.current.x - rect.left;
                const relY = mouseRef.current.y - rect.top;
                const scaleX = WORLD_WIDTH  / rect.width;
                const scaleY = WORLD_HEIGHT / rect.height;
                rotation = Math.atan2(relY * scaleY - myPlayer.y, relX * scaleX - myPlayer.x);
            } else {
                const { x, y } = joystickRef.current;
                if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
                    rotation = Math.atan2(y, x);
                }
            }

            // Combinar teclas y joystick
            const keys = { ...keysRef.current };
            if (joystickRef.current.active) {
                const { x, y } = joystickRef.current;
                keys.w = y < -0.3;
                keys.s = y >  0.3;
                keys.a = x < -0.3;
                keys.d = x >  0.3;
            }

            room.send('input', { keys, rotation });
        }, 32);

        return () => clearInterval(interval);
    }, [room, myId]);

    // ── Listeners de teclado y ratón ──────────────────────────────────────────
    useEffect(() => {
        if (!room) return;

        const onKeyDown  = (e) => { if (['w','a','s','d'].includes(e.key.toLowerCase())) keysRef.current[e.key.toLowerCase()] = true; };
        const onKeyUp    = (e) => { if (['w','a','s','d'].includes(e.key.toLowerCase())) keysRef.current[e.key.toLowerCase()] = false; };
        const onMouseMove = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
        const onMouseDown = (e) => {
            // Ignorar clics sobre botones de UI
            if (e.target.closest('button')) return;
            room.send('shoot');
        };

        window.addEventListener('keydown',   onKeyDown);
        window.addEventListener('keyup',     onKeyUp);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        return () => {
            window.removeEventListener('keydown',   onKeyDown);
            window.removeEventListener('keyup',     onKeyUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
        };
    }, [room]);

    // ── Render en Canvas (requestAnimationFrame) ──────────────────────────────
    // Este efecto corre su propio RAF loop. Solo se recrea cuando `state`
    // cambia (nueva referencia de objeto tras el spread en onStateChange).
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !state) return;

        const ctx = canvas.getContext('2d');
        let frame;

        const render = () => {
            // Fondo
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

            // Cuadrícula decorativa
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)';
            ctx.lineWidth = 1;
            for (let x = 0; x < WORLD_WIDTH; x += 100) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
            }
            for (let y = 0; y < WORLD_HEIGHT; y += 100) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
            }

            // Balas
            Array.from(state.bullets || []).forEach(b => {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // Asteroides — forma poligonal irregular determinista basada en el id
            Array.from(state.asteroids?.values() || []).forEach(ast => {
                ctx.save();
                ctx.translate(ast.x, ast.y);
                ctx.strokeStyle = '#64748b';
                ctx.fillStyle   = 'rgba(15, 23, 42, 0.95)';
                ctx.lineWidth   = 2;

                const r = ast.size * 20;
                const sides = 8;
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    // Variación de radio determinista basada en el id del asteroide
                    const seed = (parseInt(ast.id.slice(-4), 10) || 0) + i;
                    const d = r * (0.8 + (seed % 5) / 10);
                    const px = Math.cos(angle) * d;
                    const py = Math.sin(angle) * d;
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Grieta visual cuando el asteroide tiene poco HP
                if (ast.hp < 40) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.stroke();
                }
                ctx.restore();
            });

            // Naves de jugadores
            Array.from(state.players?.values() || []).forEach(p => {
                if (p.hp <= 0 || p.lives <= 0 || !p.isParticipating) return;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);

                // Cuerpo de la nave (triángulo apuntando a la derecha)
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(-12, 14);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-12, -14);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();

                // Nombre del piloto encima de la nave
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(p.username || 'Piloto', p.x, p.y - 32);

                // Barra de HP
                const barW = 40;
                const barH = 4;
                const barX = p.x - barW / 2;
                const barY = p.y - 24;
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = p.hp > 30 ? p.color : '#ef4444';
                ctx.fillRect(barX, barY, barW * (p.hp / 100), barH);
            });

            frame = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(frame);
    }, [state]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleJoystick = (e) => {
        const touch = e.touches[0];
        const rect  = e.currentTarget.getBoundingClientRect();
        const cx    = rect.width  / 2;
        const cy    = rect.height / 2;
        const dx    = (touch.clientX - rect.left) - cx;
        const dy    = (touch.clientY - rect.top)  - cy;
        joystickRef.current = { active: true, x: dx / cx, y: dy / cy };
    };

    const handleJoin = () => {
        if (!room) return;
        room.send('join_game', {
            username: profile?.username || user?.user_metadata?.username || 'Pilot',
            color:    profile?.accent_color || '#0ea5e9',
        });
    };

    // ── Estado de carga ───────────────────────────────────────────────────────
    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020617]">
                <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-6" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-400">
                    Sincronizando Órbita...
                </p>
            </div>
        );
    }

    // ── Datos derivados ───────────────────────────────────────────────────────
    const playersArr          = Array.from(state?.players?.values() || []);
    const myPlayer            = playersArr.find(p => p.sessionId === myId);
    const sortedPlayers       = [...playersArr].filter(p => p.isParticipating).sort((a, b) => b.score - a.score);
    const isSpectating        = !myPlayer || !myPlayer.isParticipating;
    const currentParticipants = playersArr.filter(p => p.isParticipating);
    const canJoin             = isSpectating && currentParticipants.length < 4;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col bg-[#02020a] h-full overflow-hidden relative font-sans select-none">
            <style>{INLINE_STYLES}</style>

            {/* ── Overlays: espectador / muerto / fin de partida ────────────── */}
            <AnimatePresence>
                {(isSpectating || state?.phase === 'finished' || (myPlayer && myPlayer.lives <= 0)) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
                    >
                        <div className="bg-[#050518]/90 border border-white/10 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl flex flex-col items-center max-w-sm w-full text-center relative overflow-hidden">
                            {/* Línea decorativa en la parte superior */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

                            {state?.phase === 'finished' ? (
                                /* Fin de partida */
                                <>
                                    <Trophy size={48} className="text-amber-400 mb-6" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Batalla Finalizada</h3>
                                    <div className="w-full bg-white/5 rounded-2xl p-4 mb-6">
                                        <p className="text-[14px] font-black text-white">{sortedPlayers[0]?.username || 'Nadie'}</p>
                                        <p className="text-[10px] text-amber-500 font-bold uppercase">{sortedPlayers[0]?.score || 0} PTS</p>
                                    </div>
                                    <button onClick={handleJoin} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl hover:scale-[1.02] transition-transform">
                                        Revancha
                                    </button>
                                </>
                            ) : myPlayer && myPlayer.lives <= 0 ? (
                                /* Sin vidas */
                                <>
                                    <X size={48} className="text-rose-500 mb-6" />
                                    <h3 className="text-xl font-black text-rose-500 uppercase tracking-widest mb-2">Misión Fallida</h3>
                                    <p className="text-[9px] text-white/40 uppercase mb-6">Unidades agotadas</p>
                                    <button onClick={handleJoin} className="w-full py-4 bg-rose-600 text-white font-black uppercase rounded-xl hover:scale-[1.02] transition-transform">
                                        Intentar de nuevo
                                    </button>
                                </>
                            ) : (
                                /* Espectador esperando unirse */
                                <>
                                    <Rocket size={48} className="text-cyan-400 mb-6 ab-float" />
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Arena Estelar</h3>
                                    <p className="text-[9px] text-white/30 uppercase mb-8">Sobrevive y destruye los asteroides</p>
                                    {canJoin && (
                                        <button onClick={handleJoin} className="w-full py-4 bg-cyan-600 text-black font-black uppercase rounded-xl active:scale-95 transition-transform">
                                            Iniciar Despegue
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Header HUD (timer + botones) ─────────────────────────────── */}
            <div className="absolute top-4 left-0 w-full px-4 sm:px-6 flex justify-between items-center z-40 pointer-events-none">
                {/* Timer */}
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
                    <Timer size={14} className="text-cyan-400" />
                    <span className="text-lg font-black text-white font-mono">{formatTime(state?.timeLeft || 0)}</span>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                        aria-label="Clasificación"
                        onClick={() => setShowMobileLeaderboard(v => !v)}
                        className="lg:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-cyan-400 flex items-center justify-center backdrop-blur-xl"
                    >
                        <Users size={18} />
                    </button>
                    <button
                        aria-label="Salir del juego"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center backdrop-blur-xl hover:bg-rose-500/20 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── HUD de jugador (score + HP + vidas) ──────────────────────── */}
            {!isSpectating && (
                <div className="absolute bottom-44 left-4 lg:top-24 lg:left-6 flex flex-col gap-3 z-30 pointer-events-none max-w-[200px]">
                    {/* Score */}
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Zap size={16} className="text-cyan-400" />
                        </div>
                        <span className="text-lg font-black text-white">{myPlayer?.score || 0}</span>
                    </div>

                    {/* HP + vidas */}
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl space-y-2">
                        <div className="flex justify-between text-[8px] font-black uppercase text-white/40">
                            <span>Integridad</span>
                            <span>{Math.ceil(myPlayer?.hp || 0)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <motion.div
                                animate={{ width: `${myPlayer?.hp || 0}%` }}
                                className={`h-full ${(myPlayer?.hp || 0) > 30 ? 'bg-cyan-500' : 'bg-rose-500'}`}
                            />
                        </div>
                        {/* Íconos de vidas */}
                        <div className="flex gap-1 pt-1 opacity-60">
                            {[...Array(3)].map((_, i) => (
                                <Rocket
                                    key={i}
                                    size={10}
                                    className={i < (myPlayer?.lives || 0) ? 'text-cyan-400' : 'text-white/10'}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Leaderboard (desktop sidebar / mobile overlay) ────────────── */}
            <AnimatePresence>
                {/* Backdrop del overlay móvil */}
                {showMobileLeaderboard && (
                    <motion.div
                        key="lb-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowMobileLeaderboard(false)}
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                    />
                )}
            </AnimatePresence>

            {/* Contenedor del leaderboard — siempre visible en desktop, condicional en móvil */}
            <div className={`
                fixed lg:absolute top-0 right-0 h-full lg:h-auto lg:top-24 lg:right-6 lg:w-64
                z-[60] lg:z-30 p-6 pt-24 lg:p-0
                ${showMobileLeaderboard ? 'w-[280px] bg-[#050518] border-l border-white/10' : 'hidden lg:block'}
            `}>
                <div className="bg-black/40 lg:bg-black/60 lg:backdrop-blur-xl lg:border border-white/10 rounded-3xl lg:p-6 space-y-4 relative">
                    {/* Botón de cierre en móvil */}
                    {showMobileLeaderboard && (
                        <button
                            aria-label="Cerrar clasificación"
                            onClick={() => setShowMobileLeaderboard(false)}
                            className="absolute top-2 right-2 p-2 text-white/40 hover:text-white lg:hidden"
                        >
                            <X size={16} />
                        </button>
                    )}

                    {/* Título */}
                    <div className="flex items-center gap-2 text-amber-400 pb-2 border-b border-white/5">
                        <Trophy size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Líderes Galácticos</span>
                    </div>

                    {/* Tabs Partida / Global */}
                    <div className="flex border-b border-white/5 pb-2">
                        <button
                            onClick={() => setLbTab('match')}
                            className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1 transition-colors ${lbTab === 'match' ? 'text-cyan-400' : 'text-white/40'}`}
                        >
                            Partida
                        </button>
                        <button
                            onClick={() => setLbTab('global')}
                            className={`flex-1 text-[9px] font-black uppercase tracking-widest py-1 transition-colors ${lbTab === 'global' ? 'text-amber-400' : 'text-white/40'}`}
                        >
                            Global
                        </button>
                    </div>

                    {/* Filas del leaderboard */}
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                        {lbTab === 'match' ? (
                            sortedPlayers.map((p, i) => (
                                <div key={p.sessionId} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase ${p.sessionId === myId ? 'text-cyan-400' : 'text-white'}`}>
                                            {i + 1}. {p.username || 'Piloto'}
                                        </span>
                                        <div className="flex gap-1 mt-1 opacity-40">
                                            {[...Array(p.lives || 0)].map((_, j) => (
                                                <div key={j} className="w-1 h-1 bg-white rounded-full" />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-amber-500">{p.score}</span>
                                </div>
                            ))
                        ) : (
                            globalLevels.map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <img src={p.avatar_url || '/default-avatar.png'} className="w-6 h-6 rounded-lg bg-white/10" alt="" />
                                        <span className={`text-[10px] font-black uppercase ${p.user_id === user?.id ? 'text-amber-400' : 'text-white'}`}>
                                            {i + 1}. {p.username || 'Piloto'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-black text-amber-500">{p.max_score}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Canvas y controles móviles ─────────────────────────────────── */}
            <div className="flex-1 relative overflow-hidden touch-none">
                <canvas
                    ref={canvasRef}
                    width={WORLD_WIDTH}
                    height={WORLD_HEIGHT}
                    className="w-full h-full object-contain"
                />

                {/* Joystick + botón de disparo (solo móvil, solo si está jugando) */}
                {!isSpectating && myPlayer?.lives > 0 && (
                    <div className="absolute inset-0 z-20 pointer-events-none lg:hidden">
                        {/* Joystick táctil */}
                        <div
                            className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-white/5 border border-white/10 backdrop-blur-md pointer-events-auto flex items-center justify-center"
                            onTouchMove={handleJoystick}
                            onTouchEnd={() => { joystickRef.current = { active: false, x: 0, y: 0 }; }}
                        >
                            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]" />
                        </div>

                        {/* Botón de disparo */}
                        <button
                            aria-label="Disparar"
                            onPointerDown={() => room?.send('shoot')}
                            className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500/40 backdrop-blur-xl pointer-events-auto flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_40px_rgba(244,63,94,0.2)]"
                        >
                            <Zap size={32} className="text-white fill-current" />
                        </button>
                    </div>
                )}

                {/* Mira del cursor (solo desktop, solo si está jugando) */}
                {!isSpectating && (
                    <div
                        className="fixed pointer-events-none z-50 text-cyan-400 -translate-x-1/2 -translate-y-1/2 hidden lg:block"
                        style={{ left: mouseRef.current.x, top: mouseRef.current.y }}
                    >
                        <Crosshair size={40} strokeWidth={1.5} className="ab-spin-slow opacity-50" />
                    </div>
                )}
            </div>
        </div>
    );
}
