/**
 * SnakeDuelGame.jsx
 * Juego Snake 1v1 conectado a un servidor Colyseus ("snake").
 *
 * Arquitectura:
 *   - `activeRoom` (variable local en el efecto) evita el stale closure
 *     del cleanup — misma solución que en MultiplayerRoomLauncher.
 *   - El teclado se registra en un efecto separado que depende de
 *     [room, state?.phase], reinscribiéndose solo cuando cambia la sala
 *     o la fase.
 *   - El color de la serpiente se basa en `state.p1` / `state.p2`
 *     (asignación del servidor), no en el índice del array de jugadores.
 *
 * Grid: GRID_SIZE × GRID_SIZE celdas.
 * Posición de cada segmento: left = (x / GRID_SIZE) * 100%
 *                             top  = (y / GRID_SIZE) * 100%
 * Opacidad de cada segmento: decrece de 1 (cabeza) → 0.4 (cola),
 *   dando un efecto de "trail" visual sin necesidad de textura.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, RotateCcw, User, Zap, Tv2, Info,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Crown
} from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Tamaño del grid en celdas — debe coincidir con el valor del servidor
const GRID_SIZE = 40;

export default function SnakeDuelGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const [room,       setRoom]       = useState(null);
    const [state,      setState]      = useState(null);
    const [connecting, setConnecting] = useState(true);

    // ── Conexión a la sala de Colyseus ────────────────────────────────────────
    // `activeRoom` es la referencia local del efecto — necesaria porque `room`
    // (estado React) puede ser null cuando se ejecuta el cleanup por stale closure.
    useEffect(() => {
        let activeRoom = null;

        const joinGame = async () => {
            try {
                activeRoom = await client.joinOrCreate("snake", {
                    userId:   user?.id,
                    name:     profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar:   profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });

                setRoom(activeRoom);

                // Snapshot inicial del estado
                const s = activeRoom.state;
                setState({
                    phase:     s.phase,
                    countdown: s.countdown,
                    winner:    s.winner,
                    apple:     s.apple,
                    hostId:    s.hostId,
                    p1:        s.p1,
                    p2:        s.p2,
                    players:   s.players ? Array.from(s.players.values()) : [],
                });
                setConnecting(false);

                // Suscribirse a actualizaciones del servidor
                activeRoom.onStateChange((newState) => {
                    setState({
                        phase:     newState.phase,
                        countdown: newState.countdown,
                        winner:    newState.winner,
                        apple:     newState.apple,
                        hostId:    newState.hostId,
                        p1:        newState.p1,
                        p2:        newState.p2,
                        // Spread explícito del array para garantizar re-render
                        players:   Array.from(newState.players.values()),
                    });
                });

            } catch (err) {
                console.error('[SnakeDuel] Error al conectar:', err?.message);
                toast.error('Error conectando al servidor de combate');
                onClose();
            }
        };

        joinGame();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, []); // Sin dependencias — la conexión es única al montar

    // ── Enviar dirección al servidor ──────────────────────────────────────────
    const handleInput = (direction) => {
        // Solo enviar input si estamos en el juego y es nuestro turno
        if (!room || !state || state.phase !== 'playing') return;
        if (!isMeInGame) return; // Solo jugadores pueden enviar inputs
        
        room.send('input', { direction });
    };

    // ── Teclado (WASD + flechas) ──────────────────────────────────────────────
    // El efecto se reinscribe cuando `room` o `state.phase` cambian para
    // que `handleInput` tenga siempre los valores actuales.
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowUp':    case 'w': case 'W': handleInput('UP');    break;
                case 'ArrowDown':  case 's': case 'S': handleInput('DOWN');  break;
                case 'ArrowLeft':  case 'a': case 'A': handleInput('LEFT');  break;
                case 'ArrowRight': case 'd': case 'D': handleInput('RIGHT'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [room, state?.phase]);

    // ── Estado de carga ───────────────────────────────────────────────────────
    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Cargando Arena de Combate...
                </p>
            </div>
        );
    }

    // ── Datos derivados del estado ────────────────────────────────────────────
    const isInSlot1   = room.sessionId === state.p1;
    const isInSlot2   = room.sessionId === state.p2;
    const isSpectator = !isInSlot1 && !isInSlot2;
    const isMeInGame  = isInSlot1 || isInSlot2;

    const handleJoin = (slot) => {
        if (!isSpectator) { toast.error('Ya estás en una posición'); return; }
        room.send('join_slot', {
            slot,
            name:   profile?.username || 'Piloto',
            avatar: profile?.avatar_url,
        });
    };

    const handleLeaveSlot = () => {
        if (isSpectator) { toast.error('No estás en ninguna posición'); return; }
        room.send('leave_slot');
    };

    const handleSpectate = () => {
        // El usuario ya es espectador, no necesita hacer nada especial
        // Solo mostrar mensaje informativo
        toast.success('Modo espectador activado', {
            icon: '👁️',
            style: { background: '#020617', color: '#fff', border: '1px solid #334155' },
        });
    };

    const handleRematch = () => room.send('rematch');

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col relative bg-[#050510] overflow-hidden text-white font-sans">
            {/* Halos de fondo */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/5 blur-[120px] rounded-full -z-10" />

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Zap size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Snake Duel</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-wider">Resistencia Máxima</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onToggleTheater}
                        className="p-2.5 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all border border-white/5 hover:bg-white/10"
                        aria-label="Modo teatro"
                    >
                        <Tv2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 group"
                        aria-label="Salir del juego"
                    >
                        <X size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* ── Contenido principal ───────────────────────────────────────── */}
            <div className={`flex-1 flex ${isTheater ? 'flex-col lg:flex-row' : 'flex-col'} overflow-hidden relative`}>

                {/* Panel lateral de jugadores */}
                <div className={`
                    ${isTheater
                        ? 'w-full lg:w-64 border-b lg:border-b-0 lg:border-r h-auto lg:h-full'
                        : 'w-full border-b h-auto'
                    } flex-shrink-0 border-white/5 bg-black/20 p-4 sm:p-6
                    flex ${isTheater ? 'flex-row lg:flex-col' : 'flex-row justify-center'}
                    gap-4 sm:gap-6 items-center overflow-x-auto no-scrollbar
                `}>
                    {/* Slot 1 = Piloto 1 (rose), Slot 2 = Piloto 2 (emerald) */}
                    {[1, 2].map(slot => {
                        const slotSessionId = slot === 1 ? state.p1 : state.p2;
                        const player = Array.from(state.players.values()).find(p => p.sessionId === slotSessionId);
                        
                        return (
                            <PlayerCard
                                key={slot}
                                slot={slot}
                                player={player}
                                isMe={room.sessionId === slotSessionId}
                                isHost={slotSessionId === state.hostId}
                                onJoin={() => handleJoin(slot)}
                                onLeave={() => handleLeaveSlot()}
                                onSpectate={handleSpectate}
                                phase={state.phase}
                                canJoin={isSpectator} // Permitir unirse si eres espectador (sin importar si hay otros)
                                compact={!isTheater}
                                isSpectator={isSpectator}
                                state={state}
                            />
                        );
                    })}
                </div>

                {/* ── Arena de juego ─────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">

                    {/* Leyenda de serpientes sobre el tablero */}
                    {(state.phase === 'playing' || state.phase === 'countdown') && (
                        <div className="flex items-center gap-6 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400/80 truncate max-w-[80px]">
                                    {(state.players && Array.from(state.players.values()).find(p => p.sessionId === state.p1)?.name) || (state.players && Array.from(state.players.values()).find(p => p.sessionId === state.p1)?.username) || 'P1'}
                                </span>
                            </div>
                            <span className="text-[8px] text-white/20 font-black">VS</span>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80 truncate max-w-[80px]">
                                    {(state.players && Array.from(state.players.values()).find(p => p.sessionId === state.p2)?.name) || (state.players && Array.from(state.players.values()).find(p => p.sessionId === state.p2)?.username) || 'P2'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Contenedor cuadrado del tablero */}
                    <div className="relative" style={{ width: 'min(76vw, 76vh, 480px)', aspectRatio: '1 / 1' }}>

                        {/* Tablero con fondo y cuadrícula decorativa */}
                        <div className="absolute inset-0 bg-emerald-950/20 rounded-[2rem] border-4 border-white/5 shadow-2xl backdrop-blur-sm overflow-hidden">

                            {/* Líneas de cuadrícula (decorativas, opacity baja) */}
                            <svg
                                className="absolute inset-0 w-full h-full opacity-[0.04]"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => {
                                    const pct = `${(i / GRID_SIZE) * 100}%`;
                                    return (
                                        <g key={i}>
                                            <line x1={pct} y1="0" x2={pct} y2="100%" stroke="white" strokeWidth="0.5" />
                                            <line x1="0" y1={pct} x2="100%" y2={pct} stroke="white" strokeWidth="0.5" />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Serpientes y manzana */}
                            <div className="absolute inset-0">

                                {/* Manzana animada */}
                                {state.apple && (
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute bg-yellow-400 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.6)] z-10"
                                        style={{
                                            left:   `${Math.max(0, Math.min(GRID_SIZE-1, state.apple.x)) / GRID_SIZE * 100}%`,
                                            top:    `${Math.max(0, Math.min(GRID_SIZE-1, state.apple.y)) / GRID_SIZE * 100}%`,
                                            width:  `${100 / GRID_SIZE}%`,
                                            height: `${100 / GRID_SIZE}%`,
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white/40 rounded-lg" />
                                        {/* Debug info - remover en producción */}
                                        {/* <div className="absolute -top-6 left-0 text-[8px] text-yellow-300 font-mono">
                                            ({state.apple.x},{state.apple.y})
                                        </div> */}
                                    </motion.div>
                                )}

                                {/* Segmentos de cada serpiente
                                  * Color determinado por slot (p1/p2), no por índice en array.
                                  * Opacidad: 1 en cabeza (i=0) → 0.4 en la cola (trail effect). */}
                                {state.players && state.players.map(p => {
                                    const isP1 = p.sessionId === state.p1;
                                    const colorClass = isP1
                                        ? 'bg-rose-500 shadow-rose-500/40'
                                        : 'bg-emerald-500 shadow-emerald-500/40';

                                    return p.segments?.map((seg, i) => (
                                        <div
                                            key={`${p.sessionId}-${i}`}
                                            className={`absolute rounded-sm shadow-[0_0_10px_rgba(0,0,0,0.4)] ${colorClass}`}
                                            style={{
                                                left:    `${(seg.x / GRID_SIZE) * 100}%`,
                                                top:     `${(seg.y / GRID_SIZE) * 100}%`,
                                                width:   `${100 / GRID_SIZE}%`,
                                                height:  `${100 / GRID_SIZE}%`,
                                                // Trail: el segmento 0 (cabeza) es totalmente opaco;
                                                // la cola desvanece hasta el 40% de opacidad
                                                opacity: 1 - (i / (p.segments?.length || 1)) * 0.6,
                                            }}
                                        />
                                    ));
                                })}
                            </div>
                        </div>

                        {/* ── Overlays de countdown y fin de partida ─────────── */}
                        <AnimatePresence>
                            {/* Lobby: instrucciones cuando no hay jugadores */}
                            {state.phase === 'waiting' && !state.p1 && !state.p2 && (
                                <motion.div
                                    key="lobby"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                                >
                                    <div className="text-center space-y-3">
                                        <Zap size={32} className="text-emerald-400 mx-auto opacity-40" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none text-white/30">Elige una posición</p>
                                        <p className="text-[8px] text-white/20 uppercase tracking-wider">en el panel de la izquierda</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Countdown numérico */}
                            {state.countdown > 0 && (
                                <motion.div
                                    key="countdown"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1,   opacity: 1 }}
                                    exit={{ scale: 1.5,   opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                                >
                                    <span className="text-8xl font-black italic text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                                        {state.countdown}
                                    </span>
                                </motion.div>
                            )}

                            {/* Pantalla de resultado */}
                            {state.phase === 'finished' && (
                                <motion.div
                                    key="finished"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-[#050510]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 rounded-[2rem] z-50 text-center"
                                >
                                    <Trophy
                                        size={60}
                                        className={`mb-6 p-4 rounded-3xl bg-white/5 ${
                                            state.winner === 'draw' ? 'text-white/20' : 'text-emerald-500'
                                        }`}
                                    />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">
                                        Combate Finalizado
                                    </h3>
                                    <p className="text-2xl font-black uppercase tracking-widest text-white mb-8">
                                        {state.winner === 'draw'
                                            ? (state.phase === 'finished' && (!state.p1 || !state.p2) 
                                                ? 'JUEGO CANCELADO'
                                                : 'EMPATE TÉCNICO')
                                            : state.winner === 'head_collision'
                                                ? 'COLISIÓN FRONTAL'
                                                : `@${(state.players && Array.from(state.players.values()).find(p => p.userId === state.winner)?.username) || 'Piloto'} GANA`
                                        }
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={handleRematch}
                                            className="px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
                                        >
                                            Revancha
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px]"
                                        >
                                            Salir
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* D-Pad táctil (solo mobile, solo si el jugador está en partida) */}
                    {state.phase === 'playing' && isMeInGame && (
                        <div className="mt-8 grid grid-cols-3 gap-2 sm:hidden" aria-label="Control de dirección">
                            <div />
                            <DPadBtn icon={ChevronUp}    label="Arriba"    onClick={() => handleInput('UP')} />
                            <div />
                            <DPadBtn icon={ChevronLeft}  label="Izquierda" onClick={() => handleInput('LEFT')} />
                            <DPadBtn icon={ChevronDown}  label="Abajo"     onClick={() => handleInput('DOWN')} />
                            <DPadBtn icon={ChevronRight} label="Derecha"   onClick={() => handleInput('RIGHT')} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer con estado de la partida ──────────────────────────── */}
            <div className="flex-shrink-0 px-6 py-4 bg-black/40 border-t border-white/5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center">
                    <Info size={14} className="text-white/20 mr-3 flex-shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {state.phase === 'waiting'  && 'Esperando rivales...'}
                        {state.phase === 'countdown' && '¡Prepárate!'}
                        {state.phase === 'playing'  && 'Duelo de Resistencia en curso'}
                        {state.phase === 'finished' && 'Partida finalizada'}
                    </span>
                </div>
                
                {/* Botón de salir para espectadores */}
                {isSpectator && (state.phase === 'waiting' || state.phase === 'lobby') && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                    >
                        Salir como espectador
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Sub-componente: tarjeta de jugador ──────────────────────────────────────

function PlayerCard({ slot, player, isMe, isHost, onJoin, onLeave, onSpectate, canJoin, compact, phase, isSpectator, state }) {
    const isP1 = slot === 1;

    // Paleta de colores según slot (rose para P1, emerald para P2)
    const styles = isP1 ? {
        borderActive: 'border-rose-500 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        borderInner:  'border-rose-500',
        textAccent:   'text-rose-400',
        btn:          'bg-rose-500 text-white hover:bg-rose-400',
    } : {
        borderActive: 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.15)]',
        borderInner:  'border-emerald-500',
        textAccent:   'text-emerald-400',
        btn:          'bg-emerald-500 text-white hover:bg-emerald-400',
    };

    return (
        <div className={`
            relative flex lg:flex-col items-center p-2 sm:p-3 rounded-2xl sm:rounded-3xl
            transition-all duration-500 border-2
            ${player ? styles.borderActive : 'border-white/5 bg-white/5'}
            ${compact ? 'flex-row gap-3 min-w-0 flex-1 lg:flex-none' : 'flex-col sm:flex-row lg:flex-col gap-3 min-w-[120px]'}
        `}>
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className={`
                    w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2
                    transition-all duration-500
                    ${player ? styles.borderInner : 'border-white/10 opacity-40 grayscale'}
                `}>
                    {player
                        ? <img src={player.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-white/5 flex items-center justify-center"><User size={18} className="text-white/10" /></div>
                    }
                </div>
                {/* Indicador "Tú" */}
                {isMe && player && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-black rounded-full" />
                    </div>
                )}
            </div>

            {/* Nombre y badge de host */}
            <div className="text-left lg:text-center flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em] ${player ? styles.textAccent : 'text-white/20'}`}>
                        PILOTO {slot}
                    </p>
                    {isHost && player && <Crown size={9} className="text-amber-400 flex-shrink-0" />}
                </div>
                <p className={`text-[10px] sm:text-[11px] font-black uppercase truncate ${player ? 'text-white' : 'text-white/20'}`}>
                    {player?.username || player?.name || 'VACÍO'}
                </p>
            </div>

            {/* Botones de acción */}
            {(phase === 'lobby' || phase === 'waiting' || phase === 'playing') && (
                <div className="flex gap-2 lg:w-full lg:mt-2">
                    {!player && canJoin ? (
                        <button
                            onClick={onJoin}
                            className={`px-3 lg:w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${styles.btn}`}
                        >
                            Unirse
                        </button>
                    ) : !player && !canJoin ? (
                        <div className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase text-white/20 border border-white/5">
                            Libre
                        </div>
                    ) : isMe ? (
                        <button
                            onClick={onLeave}
                            className="px-3 lg:w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 border border-white/10 text-white/50 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20 active:scale-95"
                        >
                            Salir
                        </button>
                    ) : !isSpectator && state.p1 && state.p2 ? (
                        // Sala llena - mostrar botón de espectar
                        <button
                            onClick={onSpectate}
                            className="px-3 lg:w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95"
                        >
                            Espectar
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}

// ─── Sub-componente: botón del D-Pad táctil ───────────────────────────────────

/**
 * `onPointerDown` con `e.preventDefault()` evita que el browser
 * dispare también un `click` y duplice la entrada en dispositivos táctiles.
 * `touch-none` desactiva el scroll mientras se usa el D-Pad.
 */
function DPadBtn({ icon: IconComponent, label, onClick }) {
    return (
        <button
            aria-label={label}
            onPointerDown={(e) => { e.preventDefault(); onClick(); }}
            className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:bg-emerald-500 active:text-black transition-all touch-none"
        >
            <IconComponent size={24} />
        </button>
    );
}
