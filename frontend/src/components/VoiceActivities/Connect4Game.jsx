/**
 * Connect4Game.jsx
 * Juego Conecta 4 multijugador en tiempo real usando Colyseus.
 *
 * Flujo:
 *   1. Al montar: `client.joinOrCreate("connect4", {...})` → Colyseus asigna P1 o P2
 *   2. Los jugadores eligen su slot con "join_slot"
 *   3. Cuando ambos están listos, el servidor empieza la partida
 *   4. Cada turno: el jugador activo hace click en una columna → "drop" al servidor
 *   5. El servidor valida, actualiza el tablero y cambia el turno
 *   6. Al detectar 4 en raya o tablero lleno, el servidor emite `phase: 'finished'`
 *
 * Datos del tablero:
 *   `state.board` es un array plano de (ROWS × COLS) valores:
 *     0 = vacío, 1 = jugador 1 (rose), 2 = jugador 2 (amber)
 *   Acceso: board[row * COLS + col]
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, Tv2, Smartphone, Gamepad2, Info, Crown, Volume2, VolumeX } from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useGameAudio } from '../../hooks/useGameAudio';
import toast from 'react-hot-toast';

// ─── Dimensiones del tablero (deben coincidir con el servidor) ────────────────
const ROWS = 6;
const COLS = 7;

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Connect4Game({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const audio        = useGameAudio('connect4');
    const prevPhaseRef = useRef(null);

    // ── Conexión a Colyseus ───────────────────────────────────────────────────
    useEffect(() => {
        let activeRoom = null;

        const joinGame = async () => {
            try {
                activeRoom = await client.joinOrCreate('connect4', {
                    userId: user?.id,
                    name: profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });

                setRoom(activeRoom);
                setState({ ...activeRoom.state });
                setConnecting(false);

                // Spread crea nuevo objeto literal en cada cambio → React detecta cambio → re-render
                activeRoom.onStateChange((newState) => {
                    setState({ ...newState });
                });

                activeRoom.onLeave((code) => {
                    console.debug('[Connect4] Salió de la sala, código:', code);
                });

            } catch (err) {
                console.error('[Connect4] Error al conectar:', err?.message);
                toast.error('Error conectando al servidor de juegos');
                onClose();
            }
        };

        joinGame();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, []); // Solo al montar

    // ── Estado de carga ───────────────────────────────────────────────────────
    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Sincronizando Duelo Estelar...
                </p>
            </div>
        );
    }

    // ── Derivados del estado ──────────────────────────────────────────────────
    const isMyTurn = state.currentTurnSid === room.sessionId;
    const isInSlot1 = room.sessionId === state.p1;
    const isInSlot2 = room.sessionId === state.p2;
    const isSpectator = !isInSlot1 && !isInSlot2;

    // ── Mensajes al servidor ──────────────────────────────────────────────────

    const handleJoin = (slot) => {
        // Si ya está en el slot solicitado, no hacer nada
        if ((slot === 1 && isInSlot1) || (slot === 2 && isInSlot2)) {
            return;
        }
        
        // Si está en un slot diferente, salir primero automáticamente
        if (!isSpectator) {
            room.send('leave_slot');
        }
        
        room.send('join_slot', {
            slot,
            name: profile?.username || 'Piloto',
            avatar: profile?.avatar_url,
        });
    };

    const handleLeaveSlot = () => {
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

    // ── Audio: BGM + SFX ─────────────────────────────────────────────────────
    useEffect(() => {
        const phase = state?.phase;
        if (phase === prevPhaseRef.current) return;
        prevPhaseRef.current = phase;
        if (phase === 'playing') {
            audio.playBgm();
        } else if (phase === 'finished') {
            audio.stopBgm();
            if (!isSpectator) {
                const mySlot = isInSlot1 ? '1' : '2';
                if (state.winner === mySlot) audio.sfx.win();
                else if (state.winner !== '3') audio.sfx.lose();
            }
        } else if (phase === 'waiting' || phase === 'lobby') {
            audio.stopBgm();
        }
    }, [state?.phase]);

    /**
     * El jugador activo droppea una ficha en la columna `col`.
     * El servidor valida si es el turno correcto y si la columna no está llena.
     */
    const handleDrop = (col) => {
        if (!isMyTurn || state.phase !== 'playing') return;
        room.send('drop', { col });
        audio.sfx.place();
    };

    const handleReset = () => {
        room.send('reset');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col relative bg-[#050510] overflow-hidden text-white font-sans">
            {/* Ambient glows decorativos */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -z-10" />

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                        <Gamepad2 size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Conecta 4</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5 font-bold">Duelo Galáctico</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={audio.toggleMute}
                        className={`p-2.5 rounded-xl transition-all border ${audio.muted ? 'bg-white/5 text-gray-500 border-white/10' : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'}`}
                        title={audio.muted ? 'Activar sonido' : 'Silenciar'}
                    >
                        {audio.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                    <button
                        onClick={onToggleTheater}
                        className="p-2.5 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all border border-white/5 hover:bg-white/10"
                        title="Modo cine"
                    >
                        <Tv2 size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 group"
                    >
                        <X size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Área principal: sidebar de jugadores + tablero */}
            <div className={`flex-1 flex ${isTheater ? 'flex-col lg:flex-row' : 'flex-col'} overflow-hidden relative`}>

                {/* Sidebar de jugadores */}
                <div className={`
                    ${isTheater
                        ? 'w-full lg:w-64 border-b lg:border-b-0 lg:border-r h-auto lg:h-full'
                        : 'w-full border-b h-auto'
                    } flex-shrink-0 border-white/5 bg-black/20 p-4 sm:p-6
                    flex ${isTheater ? 'flex-row lg:flex-col' : 'flex-row justify-center'}
                    gap-4 sm:gap-6 items-center overflow-x-auto no-scrollbar
                `}>
                    {/* Jugador 1 (rose) */}
                    <PlayerCard
                        slot={1}
                        player={state.players?.get?.(state.p1)}
                        isTurn={state.currentTurnSid === state.p1 && state.phase === 'playing'}
                        isHost={state.p1 === state.hostId}
                        onJoin={() => handleJoin(1)}
                        onLeave={handleLeaveSlot}
                        onSpectate={handleSpectate}
                        isMe={isInSlot1}
                        canJoin={!state.p1 && !isInSlot2} // Permitir si slot 1 está libre y no estoy en slot 2
                        gameState={state.phase}
                        compact={!isTheater}
                        state={state}
                        isSpectator={isSpectator}
                    />

                    {/* Separador VS */}
                    <div className={`
                        ${isTheater ? 'h-10 lg:h-px w-px lg:w-full' : 'h-10 w-px'}
                        bg-white/10 relative flex items-center justify-center flex-shrink-0
                    `}>
                        <span className="absolute bg-[#0b0b1a] px-2 text-[10px] font-black italic text-white/20">VS</span>
                    </div>

                    {/* Jugador 2 (amber) */}
                    <PlayerCard
                        slot={2}
                        player={state.players?.get?.(state.p2)}
                        isTurn={state.currentTurnSid === state.p2 && state.phase === 'playing'}
                        isHost={state.p2 === state.hostId}
                        onJoin={() => handleJoin(2)}
                        onLeave={handleLeaveSlot}
                        onSpectate={handleSpectate}
                        isMe={isInSlot2}
                        canJoin={!state.p2 && !isInSlot1} // Permitir si slot 2 está libre y no estoy en slot 1
                        gameState={state.phase}
                        compact={!isTheater}
                        state={state}
                        isSpectator={isSpectator}
                    />
                </div>

                {/* Tablero del juego */}
                <div className="flex-1 flex items-center justify-center p-2 sm:p-10 overflow-hidden">
                    <div className="relative group scale-[0.85] sm:scale-100 transition-transform">
                        {/* Marco del tablero */}
                        <div className="relative bg-purple-950/30 rounded-[2rem] sm:rounded-[2.5rem] border-[4px] sm:border-[6px] border-white/5 p-3 sm:p-6 shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_0_60px_rgba(139,92,246,0.1)] backdrop-blur-md">

                            {/* Grid de celdas: iteramos por COLUMNAS para que el drop sea natural */}
                            <div className="grid grid-cols-7 gap-1.5 sm:gap-4 relative z-20">
                                {Array.from({ length: COLS }).map((_, col) => (
                                    <div key={col} className="flex flex-col gap-2 sm:gap-4">
                                        {Array.from({ length: ROWS }).map((_, row) => {
                                            // El board es un array plano row-major
                                            const cell = state.board ? state.board[row * COLS + col] : 0;
                                            return (
                                                <div
                                                    key={row}
                                                    className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full relative bg-gray-900/40 border-2 border-white/5 shadow-inner"
                                                >
                                                    {/* Área clickable invisible que cubre toda la celda */}
                                                    <button
                                                        onClick={() => handleDrop(col)}
                                                        disabled={!isMyTurn || state.phase !== 'playing'}
                                                        className="absolute inset-0 z-10 w-full h-full rounded-full cursor-pointer disabled:cursor-default"
                                                        aria-label={`Soltar ficha en columna ${col + 1}`}
                                                    />

                                                    {/* Ficha (animada al caer) */}
                                                    <AnimatePresence>
                                                        {cell !== 0 && (
                                                            <motion.div
                                                                initial={{ y: -500, opacity: 0 }}
                                                                animate={{ y: 0, opacity: 1 }}
                                                                transition={{ type: 'spring', damping: 15, stiffness: 120 }}
                                                                className={`absolute inset-0 rounded-full border-2 shadow-2xl ${cell === 1
                                                                        ? 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300 shadow-rose-500/40'
                                                                        : 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-200 shadow-amber-500/40'
                                                                    }`}
                                                            >
                                                                {/* Brillo interior */}
                                                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-full" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Overlay lobby — cuando no hay jugadores en ningún slot */}
                        {state.phase !== 'playing' && state.phase !== 'finished' && !state.p1 && !state.p2 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-[2rem]">
                                <div className="text-center space-y-4">
                                    <div className="space-y-2">
                                        <Gamepad2 size={32} className="text-purple-400/30 mx-auto" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Elige un slot</p>
                                    </div>
                                    {/* Botón de salir para espectadores */}
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                                    >
                                        Salir del juego
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Indicadores de drop (flechas sobre las columnas) */}
                        {isMyTurn && state.phase === 'playing' && (
                            <div className="absolute -top-12 sm:-top-16 inset-x-6 flex justify-between pointer-events-none">
                                {Array.from({ length: COLS }).map((_, col) => (
                                    <div key={col} className="w-10 sm:w-14 lg:w-16 flex justify-center">
                                        <motion.div
                                            animate={{ y: [0, 5, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className={`w-4 h-4 rounded-full border border-white/20 ${state.p1 === room.sessionId ? 'bg-rose-500/40' : 'bg-amber-500/40'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Overlay de fin de partida */}
                <AnimatePresence>
                    {state.phase === 'finished' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-[100] bg-[#050510]/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
                        >
                            <motion.div
                                initial={{ scale: 0.8, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="text-center"
                            >
                                {state.winner === "3" ? (
                                    // Empate
                                    <h3 className="text-3xl font-black uppercase tracking-[0.3em] text-white/50 mb-8">
                                        Empate Galáctico
                                    </h3>
                                ) : (
                                    // Victoria
                                    <div className="flex flex-col items-center">
                                        <Trophy
                                            size={80}
                                            className={`mb-6 p-4 rounded-3xl bg-white/5 ${state.winner === "1" ? 'text-rose-500' : 'text-amber-500'
                                                }`}
                                        />
                                        <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">
                                            Victoria Detectada
                                        </h3>
                                        <p className="text-4xl font-black uppercase tracking-widest text-white mb-8">
                                            @{state.players?.get?.(state.winner === "1" ? state.p1 : state.p2)?.username || 'Anónimo'}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleReset}
                                        className="px-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)]"
                                    >
                                        Revancha
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                                    >
                                        Salir
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer / barra de estado */}
            <div className="flex-shrink-0 px-6 py-4 bg-black/40 border-t border-white/5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Info size={14} className="text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {(state.phase === 'lobby' || state.phase === 'waiting') && (
                            !state.p1 && !state.p2 ? 'Esperando retadores...' :
                            (!state.p1 || !state.p2) ? 'Esperando segundo jugador...' :
                            'Preparando duelo...'
                        )}
                        {state.phase === 'playing' && state.p1 && state.p2 && `Duelo en curso · Turno de @${state.players?.get?.(state.currentTurnSid)?.username || '...'}`}
                        {state.phase === 'playing' && (!state.p1 || !state.p2) && 'Esperando jugador...'}
                        {state.phase === 'finished' && 'Partida finalizada'}
                    </span>
                </div>
                
                {/* Botón de salir para espectadores */}
                {isSpectator && (state.phase === 'lobby' || state.phase === 'waiting') && (
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                    >
                        Salir como espectador
                    </button>
                )}
                
                {/* Sugerencia de rotar en mobile (solo fuera del modo cine) */}
                {!isTheater && (
                    <div className="flex items-center gap-2 md:hidden">
                        <Smartphone className="text-cyan-400 rotate-90" size={14} />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                            Gira para mejor vista
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── PlayerCard ───────────────────────────────────────────────────────────────

/**
 * PlayerCard — Tarjeta de slot de jugador.
 * @param {boolean} isTurn   — Es el turno de este jugador (para el dot animado)
 * @param {boolean} canJoin  — El usuario local está como espectador y puede unirse
 */
function PlayerCard({ slot, player, isTurn, isHost, onJoin, onLeave, onSpectate, isMe, canJoin, gameState, compact, state, isSpectator }) {
    const isP1 = slot === 1;
    const hasPlayer = !!player;

    const styles = isP1 ? {
        borderOccupied: 'border-rose-500/60 bg-rose-500/5',
        borderTurn: 'border-rose-500 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.2)]',
        borderEmpty: 'border-white/5 bg-white/5',
        borderInner: 'border-rose-500',
        textAccent: 'text-rose-400',
        btn: 'bg-rose-500 text-white hover:bg-rose-400 active:scale-95',
        dot: 'bg-rose-500',
        ring: 'ring-rose-500/30',
    } : {
        borderOccupied: 'border-amber-500/60 bg-amber-500/5',
        borderTurn: 'border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]',
        borderEmpty: 'border-white/5 bg-white/5',
        borderInner: 'border-amber-500',
        textAccent: 'text-amber-400',
        btn: 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95',
        dot: 'bg-amber-500',
        ring: 'ring-amber-500/30',
    };

    const cardBorder = isTurn
        ? styles.borderTurn
        : hasPlayer ? styles.borderOccupied : styles.borderEmpty;

    return (
        <div className={`relative flex lg:flex-col items-center p-2 sm:p-3 rounded-2xl sm:rounded-3xl transition-all duration-500 border-2 ${cardBorder} ${compact ? 'flex-row gap-3 min-w-0 flex-1 lg:flex-none' : 'flex-col sm:flex-row lg:flex-col gap-3 min-w-[120px]'
            }`}>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-500 ${hasPlayer ? styles.borderInner : 'border-white/10 opacity-40 grayscale'
                    }`}>
                    {hasPlayer
                        ? <img src={player.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-white/5 flex items-center justify-center"><User size={18} className="text-white/10" /></div>
                    }
                </div>
                {/* Dot de turno activo */}
                {isTurn && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 rounded sm:rounded-lg ${styles.dot} flex items-center justify-center shadow-lg`}
                    >
                        <Play size={8} className="text-black fill-black" />
                    </motion.div>
                )}
            </div>

            {/* Info */}
            <div className="text-left lg:text-center flex-1 min-w-0">
                <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 sm:mb-1 ${hasPlayer ? styles.textAccent : 'text-white/20'}`}>
                    P{slot} · {isP1 ? 'Alfa' : 'Beta'}
                </p>
                <p className={`text-[10px] sm:text-[11px] font-black uppercase truncate flex items-center gap-1 ${hasPlayer ? 'text-white' : 'text-white/20'}`}>
                    {isHost && hasPlayer && <Crown size={8} className="text-amber-400 flex-shrink-0" />}
                    {player?.username || player?.name || 'Esperando...'}
                </p>
            </div>

            {/* Botones de acción — visibles en lobby, waiting, o si hay un slot libre */}
            {(gameState === 'lobby' || gameState === 'waiting' || gameState === 'playing') && (
                <div className="flex gap-2 lg:w-full lg:mt-2">
                    {!hasPlayer && canJoin ? (
                        <button
                            onClick={onJoin}
                            className={`px-3 lg:w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${styles.btn}`}
                        >
                            Unirse
                        </button>
                    ) : !hasPlayer && !canJoin ? (
                        // Slot libre pero el usuario ya está en otro slot O sería el único jugador
                        <div className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase text-white/20 border border-white/5">
                            {(!state.p1 && !state.p2) ? 'Espera 2 jugadores' : 'Libre'}
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

            {/* Badge "Tú" */}
            {isMe && (
                <div className="absolute -bottom-1.5 lg:-bottom-2 right-2 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 px-2 py-0.5 rounded-md bg-white text-black text-[6px] sm:text-[7px] font-black uppercase tracking-widest shadow-xl z-10">
                    Tú
                </div>
            )}
        </div>
    );
}
