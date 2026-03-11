/**
 * TetrisDuelGame.jsx
 * Juego Tetris 1v1 conectado a un servidor Colyseus ("tetris").
 *
 * Arquitectura:
 *   - El estado de Colyseus (board, piece) son objetos mutables (ArraySchema /
 *     MapSchema). Para que React detecte cambios se envuelven en un nuevo
 *     objeto literal en cada `onStateChange`, forzando re-render sin el
 *     workaround `tick`.
 *   - `board.forEach` y `piece.get` son APIs de Colyseus Schema que el
 *     componente Board usa para renderizar la cuadrícula.
 *
 * Grid: COLS × ROWS celdas (10 × 20).
 * Color de celda:
 *   "0"     → vacía
 *   "block" → bloque colocado (color por jugador)
 *   number  → índice en TETROMINOS (pieza activa en vuelo)
 *
 * Controles:
 *   ← → ↓   Mover
 *   ↑ / W    Rotar
 *   Espacio  Drop instantáneo
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, User, Zap, Tv2, Info,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
    RotateCcw, Crown
} from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Dimensiones del tablero — deben coincidir con el servidor
const COLS = 10;
const ROWS = 20;

// Paleta de tetrominos: nombre, clases Tailwind de color/borde/sombra, forma
const TETROMINOS = [
    { name: 'I', color: 'bg-cyan-400', border: 'border-cyan-300', shadow: 'shadow-cyan-500/40', shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    { name: 'J', color: 'bg-blue-500', border: 'border-blue-300', shadow: 'shadow-blue-500/40', shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    { name: 'L', color: 'bg-orange-500', border: 'border-orange-300', shadow: 'shadow-orange-500/40', shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
    { name: 'O', color: 'bg-yellow-400', border: 'border-yellow-200', shadow: 'shadow-yellow-500/40', shape: [[1, 1], [1, 1]] },
    { name: 'S', color: 'bg-green-500', border: 'border-green-300', shadow: 'shadow-green-500/40', shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    { name: 'T', color: 'bg-purple-500', border: 'border-purple-300', shadow: 'shadow-purple-500/40', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    { name: 'Z', color: 'bg-red-500', border: 'border-red-300', shadow: 'shadow-red-500/40', shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
];

export default function TetrisDuelGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);

    // ── Conexión a la sala de Colyseus ────────────────────────────────────────
    useEffect(() => {
        let activeRoom = null;

        const joinGame = async () => {
            try {
                activeRoom = await client.joinOrCreate('tetris', {
                    userId: user?.id,
                    username: profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });

                setRoom(activeRoom);
                // Envolver en objeto literal para que React detecte el cambio
                setState({ ...activeRoom.state });
                setConnecting(false);

                activeRoom.onStateChange((newState) => {
                    setState({ ...newState });
                });

            } catch (err) {
                console.error('[TetrisDuel] Error al conectar:', err?.message);
                toast.error('Error conectando a la arena de bloques');
                onClose();
            }
        };

        joinGame();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, []); // Conexión única al montar

    // ── Enviar movimiento al servidor ─────────────────────────────────────────
    const handleInput = (dir) => {
        if (!room || state?.phase !== 'playing') return;
        // Verificar que la conexión siga abierta antes de enviar
        if (room.connection?.isOpen) {
            room.send('move', { dir });
        }
    };

    // ── Teclado ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            if (state?.phase !== 'playing') return;
            switch (e.key) {
                case 'ArrowLeft': case 'a': handleInput('LEFT'); break;
                case 'ArrowRight': case 'd': handleInput('RIGHT'); break;
                case 'ArrowDown': case 's': handleInput('DOWN'); break;
                case 'ArrowUp': case 'w': handleInput('ROTATE'); break;
                case ' ':
                    e.preventDefault(); // Evitar scroll de página
                    handleInput('DROP');
                    break;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [room, state?.phase]);

    // ── Estado de carga ───────────────────────────────────────────────────────
    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Sincronizando Boards...
                </p>
            </div>
        );
    }

    // ── Datos derivados ───────────────────────────────────────────────────────
    const isInSlot1 = room.sessionId === state.p1;
    const isInSlot2 = room.sessionId === state.p2;
    const isSpectator = !isInSlot1 && !isInSlot2;
    const isMeInGame = isInSlot1 || isInSlot2;

    const handleJoin = (slot) => {
        if (!room.connection?.isOpen) return;
        if (!isSpectator) { toast.error('Ya estás en una posición'); return; }
        room.send('join_slot', {
            slot,
            username: profile?.username || 'Piloto',
            avatar: profile?.avatar_url,
        });
    };

    const handleLeaveSlot = () => {
        if (room.connection?.isOpen) room.send('leave_slot');
    };

    const handleSpectate = () => {
        // El usuario ya es espectador, no necesita hacer nada especial
        // Solo mostrar mensaje informativo
        toast.success('Modo espectador activado', {
            icon: '👁️',
            style: { background: '#020617', color: '#fff', border: '1px solid #334155' },
        });
    };

    const handleReset = () => {
        if (room.connection?.isOpen) room.send('reset');
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col relative bg-[#050510] overflow-hidden text-white font-sans">
            {/* Halos de fondo */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -z-10" />

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <Zap size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Tetris Duel</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5 font-bold">Arquitectura en Tiempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
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
                        ? 'w-full lg:w-64 border-b lg:border-b-0 lg:border-r'
                        : 'w-full border-b'
                    } flex-shrink-0 border-white/5 bg-black/20 p-4 sm:p-6
                    flex ${isTheater ? 'flex-row lg:flex-col' : 'flex-row justify-center'}
                    gap-4 sm:gap-6 items-center overflow-x-auto no-scrollbar
                `}>
                    <PlayerCard
                        slot={1}
                        player={state.players?.get?.(state.p1)}
                        isMe={room.sessionId === state.p1}
                        isHost={state.p1 === state.hostId}
                        onJoin={() => handleJoin(1)}
                        onLeave={handleLeaveSlot}
                        onSpectate={handleSpectate}
                        phase={state.phase}
                        canJoin={isSpectator}
                        compact={!isTheater}
                        isSpectator={isSpectator}
                        state={state}
                    />
                    <div className={`h-px lg:w-full w-4 bg-white/10 ${isTheater ? 'hidden lg:block' : 'hidden'}`} />
                    <PlayerCard
                        slot={2}
                        player={state.players?.get?.(state.p2)}
                        isMe={room.sessionId === state.p2}
                        isHost={state.p2 === state.hostId}
                        onJoin={() => handleJoin(2)}
                        onLeave={handleLeaveSlot}
                        onSpectate={handleSpectate}
                        phase={state.phase}
                        canJoin={isSpectator}
                        compact={!isTheater}
                        isSpectator={isSpectator}
                        state={state}
                    />
                </div>

                {/* ── Tableros de juego ─────────────────────────────────────── */}
                <div className="flex-1 flex flex-row items-center justify-center p-4 sm:p-8 gap-6 sm:gap-12 lg:gap-20 relative">

                    {/* VS central — solo visible en partida activa */}
                    {state.phase === 'playing' && (
                        <div className="absolute left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 pointer-events-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/10">vs</span>
                        </div>
                    )}

                    {/* Board 1 (azul) — se encoge si el jugador local es P2 */}
                    <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${isMeInGame && room.sessionId === state.p2 ? 'scale-75 opacity-30 order-2' : 'scale-100 order-1'
                        }`}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/80 truncate max-w-[100px]">
                                {state.players?.get?.(state.p1)?.username || 'Esperando...'}
                            </span>
                            {state.p1 === room.sessionId && (
                                <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-md text-[7px] font-black">TÚ</span>
                            )}
                        </div>
                        <Board
                            board={state.board1}
                            piece={state.p1Piece}
                            phase={state.phase}
                            isP1={true}
                            hasPid={!!state.p1}
                        />
                        {state.phase === 'playing' && state.score1 !== undefined && (
                            <div className="text-center">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Score </span>
                                <span className="text-[10px] font-black text-blue-400">{state.score1 ?? 0}</span>
                            </div>
                        )}
                    </div>

                    {/* Board 2 (rose) — se encoge si el jugador local es P1 */}
                    <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${isMeInGame && room.sessionId === state.p1 ? 'scale-75 opacity-30 order-2' : 'scale-100 order-1'
                        }`}>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-rose-400/80 truncate max-w-[100px]">
                                {state.players?.get?.(state.p2)?.username || 'Esperando...'}
                            </span>
                            {state.p2 === room.sessionId && (
                                <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-md text-[7px] font-black">TÚ</span>
                            )}
                        </div>
                        <Board
                            board={state.board2}
                            piece={state.p2Piece}
                            phase={state.phase}
                            isP1={false}
                            hasPid={!!state.p2}
                        />
                        {state.phase === 'playing' && state.score2 !== undefined && (
                            <div className="text-center">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Score </span>
                                <span className="text-[10px] font-black text-rose-400">{state.score2 ?? 0}</span>
                            </div>
                        )}
                    </div>

                    {/* Overlay de lobby — instrucciones cuando no hay partida */}
                    {(state.phase === 'lobby' || state.phase === 'waiting') && !state.p1 && !state.p2 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center space-y-2 opacity-40">
                                <Zap size={28} className="text-blue-400 mx-auto" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Elige una posición</p>
                                <p className="text-[8px] text-white/30 uppercase tracking-wider">y espera a tu rival</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Overlays de countdown y fin de partida ─────────────────── */}
                <AnimatePresence>
                    {state.countdown > 0 && (
                        <motion.div
                            key="countdown"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
                        >
                            <motion.span
                                initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 1.5 }}
                                className="text-9xl font-black italic text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                            >
                                {state.countdown}
                            </motion.span>
                        </motion.div>
                    )}

                    {state.phase === 'finished' && (
                        <motion.div
                            key="finished"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-[#050510]/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8 text-center"
                        >
                            <Trophy size={64} className="text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">
                                Duelo Finalizado
                            </h3>
                            <p className="text-2xl font-black uppercase tracking-widest text-white mb-8">
                                @{
                                    Array.from(state.players?.values() || [])
                                        .find(p => p.userId === state.winner)?.username || 'GANADOR'
                                } GANA
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleReset}
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

            {/* ── Footer con controles ──────────────────────────────────────── */}
            <div className="flex-shrink-0 bg-black/40 border-t border-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Info size={14} className="text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {(state.phase === 'lobby' || state.phase === 'waiting') && (state.p1 && state.p2 ? '¡Ambos listos! Iniciando...' : 'Elige un slot para entrar')}
                        {state.phase === 'playing' && 'Duelo en progreso'}
                        {state.phase === 'finished' && 'Partida finalizada'}
                    </span>
                </div>

                {/* D-Pad táctil — solo en partida activa */}
                {state.phase === 'playing' && isMeInGame && (
                    <div className="flex gap-2" aria-label="Controles táctiles">
                        <DPadBtn icon={ChevronLeft} label="Izquierda" onClick={() => handleInput('LEFT')} />
                        <DPadBtn icon={RotateCcw} label="Rotar" onClick={() => handleInput('ROTATE')} extraClass="bg-purple-500/10 text-purple-400 border-purple-500/20" />
                        <DPadBtn icon={ChevronDown} label="Bajar" onClick={() => handleInput('DOWN')} />
                        <DPadBtn icon={ChevronRight} label="Derecha" onClick={() => handleInput('RIGHT')} />
                        <DPadBtn icon={ChevronUp} label="Drop" onClick={() => handleInput('DROP')} extraClass="bg-blue-500 text-white border-blue-400" />
                    </div>
                )}
                
                {/* Botón de salir para espectadores */}
                {isSpectator && (state.phase === 'lobby' || state.phase === 'waiting') && (
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

// ─── Sub-componente: tablero de Tetris ────────────────────────────────────────

/**
 * Renderiza una cuadrícula ROWS × COLS.
 * Primero vuelca `board` (celdas colocadas) y luego superpone
 * la pieza activa `piece` con su rotación actual.
 *
 * @param {ArraySchema} board   - Lista plana de ROWS*COLS celdas (Colyseus)
 * @param {MapSchema}   piece   - Pieza en vuelo con {type, x, y, rotation}
 * @param {string}      phase   - Fase del juego
 * @param {boolean}     isP1    - True → colores azul, False → colores rose
 * @param {boolean}     hasPid  - Si el slot tiene un jugador asignado
 */
function Board({ board, piece, phase, isP1, hasPid }) {
    // Construir cuadrícula vacía y procesar datos en useMemo para optimizar
    const grid = useMemo(() => {
        const newGrid = Array.from({ length: ROWS }, () => Array(COLS).fill('0'));

        // Volcar estado del tablero (celdas colocadas)
        if (board && typeof board.forEach === 'function') {
            board.forEach((color, i) => {
                const r = Math.floor(i / COLS);
                const c = i % COLS;
                if (r < ROWS && c < COLS) {
                    newGrid[r][c] = color;
                }
            });
        }

        // Superponer la pieza en vuelo (solo durante la partida)
        if (phase === 'playing' && piece && typeof piece.get === 'function' && piece.get('type') !== undefined) {
            const typeIndex = piece.get('type');
            const tetromino = TETROMINOS[typeIndex];

            if (tetromino?.shape) {
                // Aplicar rotación (rotación matricial 90° sentido horario)
                let shape = tetromino.shape;
                const rotations = piece.get('rotation') ?? 0;
                for (let i = 0; i < rotations; i++) {
                    shape = shape[0].map((_, colIdx) => shape.map(row => row[colIdx]).reverse());
                }

                // Pintar segmentos de la pieza sobre la cuadrícula
                shape.forEach((row, dy) => {
                    row.forEach((value, dx) => {
                        if (!value) return;
                        const bx = dx + piece.get('x');
                        const by = dy + piece.get('y');
                        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                            newGrid[by][bx] = typeIndex; // número → color via TETROMINOS
                        }
                    });
                });
            }
        }

        return newGrid;
    }, [board, piece, phase, isP1]);

    return (
        <div className="relative p-1 rounded-2xl bg-black/40 border-4 border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Cuadrícula de celdas */}
            <div
                className="grid grid-cols-10 gap-0.5"
                style={{ width: 'min(42vw, 220px)', aspectRatio: '1 / 2' }}
            >
                {grid.map((row, y) => row.map((cell, x) => {
                    let cls = 'w-full h-full rounded-[2px] transition-colors duration-100 ';

                    if (cell === '0') {
                        // Celda vacía
                        cls += 'bg-white/5';
                    } else if (cell === 'block') {
                        // Bloque colocado — color según jugador
                        cls += isP1
                            ? 'bg-blue-500/40 border border-blue-400/30'
                            : 'bg-rose-500/40 border border-rose-400/30';
                    } else if (typeof cell === 'number') {
                        // Pieza activa — color del tetromino
                        const t = TETROMINOS[cell];
                        cls += `${t.color} border ${t.border} ${t.shadow} shadow-[inset_0_0_8px_rgba(255,255,255,0.2)]`;
                    }

                    return <div key={`${y}-${x}`} className={cls} />;
                }))}
            </div>

            {/* Overlay si el slot no tiene jugador */}
            {!hasPid && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Esperando...</span>
                </div>
            )}
        </div>
    );
}

// ─── Sub-componente: tarjeta de jugador ──────────────────────────────────────

function PlayerCard({ slot, player, isMe, isHost, onJoin, onLeave, onSpectate, phase, canJoin, compact, isSpectator, state }) {
    const isP1 = slot === 1;
    const styles = isP1 ? {
        borderActive: 'border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.15)]',
        borderInner: 'border-blue-500',
        textAccent: 'text-blue-400',
        btn: 'bg-blue-500 text-white hover:bg-blue-400',
    } : {
        borderActive: 'border-rose-500 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        borderInner: 'border-rose-500',
        textAccent: 'text-rose-400',
        btn: 'bg-rose-500 text-white hover:bg-rose-400',
    };

    return (
        <div className={`
            relative flex lg:flex-col items-center p-2 rounded-2xl transition-all border-2
            ${player ? styles.borderActive : 'border-white/5 bg-white/5'}
            ${compact ? 'flex-row gap-2' : 'flex-col sm:flex-row lg:flex-col gap-3 min-w-[100px]'}
        `}>
            {/* Avatar */}
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 ${player ? styles.borderInner : 'border-white/10 grayscale opacity-40'
                }`}>
                {player
                    ? <img src={player.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center bg-white/5"><User size={14} className="text-white/10" /></div>
                }
            </div>

            {/* Nombre */}
            <div className="flex-1 min-w-0 text-left lg:text-center">
                <p className={`text-[7px] font-black uppercase tracking-widest ${player ? styles.textAccent : 'text-white/20'}`}>
                    PILOTO {slot}
                </p>
                <p className={`text-[9px] font-black uppercase truncate flex items-center gap-1 ${player ? 'text-white' : 'text-white/10'}`}>
                    {isHost && player && <Crown size={8} className="text-amber-400 flex-shrink-0" />}
                    {player?.username || 'VACÍO'}
                </p>
            </div>

            {/* Acciones de slot (solo en lobby o waiting) */}
            {(phase === 'lobby' || phase === 'waiting' || !phase) && (
                <div className="flex mt-2 w-full">
                    {!player && (canJoin || isHost) ? (
                        <button
                            onClick={onJoin}
                            className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg ${styles.btn}`}
                        >
                            ¡Unirse Ahora!
                        </button>
                    ) : !player ? (
                        <span className="w-full py-2 text-center rounded-xl text-[8px] font-black uppercase text-white/20 bg-white/5 border border-white/5">
                            Campo Libre
                        </span>
                    ) : isMe ? (
                        <button
                            onClick={onLeave}
                            className="w-full py-2 rounded-xl text-[8px] font-black uppercase bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all font-black"
                        >
                            Abandonar Slot
                        </button>
                    ) : !isSpectator && state.p1 && state.p2 ? (
                        // Sala llena - mostrar botón de espectar
                        <button
                            onClick={onSpectate}
                            className="w-full py-2 rounded-xl text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                        >
                            Espectar Partida
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}

// ─── Sub-componente: botón D-Pad táctil ──────────────────────────────────────

function DPadBtn({ icon: Icon, label, onClick, extraClass = '' }) {
    return (
        <button
            aria-label={label}
            onPointerDown={(e) => { e.preventDefault(); onClick(); }}
            className={`w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:bg-blue-500 active:text-white transition-all touch-none ${extraClass}`}
        >
            <Icon size={18} />
        </button>
    );
}
