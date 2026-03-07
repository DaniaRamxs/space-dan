import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, UserPlus, Tv2, Smartphone, Gamepad2, Info } from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROWS = 6;
const COLS = 7;

export default function Connect4Game({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const joinGame = async () => {
            try {
                const c4Room = await client.joinOrCreate("connect4", {
                    name: profile?.username || user?.email?.split('@')[0] || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });

                setRoom(c4Room);
                setState(c4Room.state);
                setConnecting(false);

                c4Room.onStateChange((newState) => {
                    setState(newState);
                    setTick(t => t + 1);
                });

                c4Room.onLeave((code) => {
                    console.log("Left Connect4 room", code);
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error conectando al servidor de juegos");
                onClose();
            }
        };

        joinGame();
        return () => { if (room) room.leave(); };
    }, []);

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

    const myPlayer = state.players?.get(room.sessionId);
    const isMyTurn = state.currentTurn === room.sessionId;
    const isSpectator = !state.p1 || !state.p2 || (room.sessionId !== state.p1 && room.sessionId !== state.p2);

    const handleJoin = (slot) => {
        room.send("join_slot", {
            slot,
            name: profile?.username || "Piloto",
            avatar: profile?.avatar_url
        });
    };

    const handleLeaveSlot = () => {
        room.send("leave_slot");
    };

    const handleDrop = (col) => {
        if (!isMyTurn || state.gameState !== 'playing') return;
        room.send("drop", { col });
    };

    const handleReset = () => {
        room.send("reset");
    };

    return (
        <div className="flex-1 flex flex-col relative bg-[#050510] overflow-hidden text-white font-sans">
            {/* Ambient Background Elements */}
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
                <div className="flex items-center gap-3">
                    <button onClick={onToggleTheater} className="p-2.5 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all border border-white/5 hover:bg-white/10">
                        <Tv2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 group">
                        <X size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex ${isTheater ? 'flex-col lg:flex-row' : 'flex-col'} overflow-hidden relative`}>

                {/* Players Sidebar / Mobile Top Bar */}
                <div className={`
                    ${isTheater
                        ? 'w-full lg:w-64 border-b lg:border-b-0 lg:border-r h-auto lg:h-full'
                        : 'w-full border-b h-auto'
                    } flex-shrink-0 border-white/5 bg-black/20 p-4 sm:p-6
                    flex ${isTheater ? 'flex-row lg:flex-col' : 'flex-row justify-center'}
                    gap-4 sm:gap-6 items-center overflow-x-auto no-scrollbar
                `}>
                    <PlayerCard
                        slot={1}
                        player={state.players?.get?.(state.p1)}
                        isActive={state.currentTurn === state.p1 && state.gameState === 'playing'}
                        onJoin={() => handleJoin(1)}
                        onLeave={handleLeaveSlot}
                        isMe={room.sessionId === state.p1}
                        gameState={state.gameState}
                        compact={!isTheater}
                    />

                    <div className={`
                        ${isTheater ? 'h-10 lg:h-px w-px lg:w-full' : 'h-10 w-px'}
                        bg-white/10 relative flex items-center justify-center flex-shrink-0
                    `}>
                        <span className="absolute bg-[#0b0b1a] px-2 text-[10px] font-black italic text-white/20">VS</span>
                    </div>

                    <PlayerCard
                        slot={2}
                        player={state.players?.get?.(state.p2)}
                        isActive={state.currentTurn === state.p2 && state.gameState === 'playing'}
                        onJoin={() => handleJoin(2)}
                        onLeave={handleLeaveSlot}
                        isMe={room.sessionId === state.p2}
                        gameState={state.gameState}
                        compact={!isTheater}
                    />
                </div>

                {/* Game Board Container */}
                <div className="flex-1 flex items-center justify-center p-2 sm:p-10 perspective-1000 overflow-hidden">
                    <div className="relative group scale-[0.85] sm:scale-100 transition-transform">
                        {/* Board Frame */}
                        <div className="relative bg-purple-950/30 rounded-[2rem] sm:rounded-[2.5rem] border-[4px] sm:border-[6px] border-white/5 p-3 sm:p-6 shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_0_60px_rgba(139,92,246,0.1)] backdrop-blur-md">
                            {/* Grid */}
                            <div className="grid grid-cols-7 gap-1.5 sm:gap-4 relative z-20">
                                {Array.from({ length: COLS }).map((_, c) => (
                                    <div key={c} className="flex flex-col gap-2 sm:gap-4">
                                        {Array.from({ length: ROWS }).map((_, r) => {
                                            const cell = state.board ? state.board[r * COLS + c] : 0;
                                            return (
                                                <div
                                                    key={r}
                                                    className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full relative bg-gray-900/40 border-2 border-white/5 shadow-inner group/cell"
                                                >
                                                    <button
                                                        onClick={() => handleDrop(c)}
                                                        disabled={!isMyTurn || state.gameState !== 'playing'}
                                                        className="absolute inset-0 z-10 w-full h-full rounded-full cursor-pointer disabled:cursor-default"
                                                    />

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

                        {/* Drop Hints */}
                        {isMyTurn && state.gameState === 'playing' && (
                            <div className="absolute -top-12 sm:-top-16 inset-x-6 flex justify-between pointer-events-none">
                                {Array.from({ length: COLS }).map((_, c) => (
                                    <div key={c} className="w-10 sm:w-14 lg:w-16 flex justify-center">
                                        <motion.div
                                            animate={{ y: [0, 5, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className={`w-4 h-4 rounded-full ${state.p1 === room.sessionId ? 'bg-rose-500/40' : 'bg-amber-500/40'} border border-white/20`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Overlays (Win / Lobby) */}
                <AnimatePresence>
                    {state.gameState === 'finished' && (
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
                                {state.winner === 3 ? (
                                    <h3 className="text-3xl font-black uppercase tracking-[0.3em] text-white/50 mb-8">Empate Galáctico</h3>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Trophy size={80} className={`mb-6 p-4 rounded-3xl bg-white/5 ${state.winner === 1 ? 'text-rose-500' : 'text-amber-500'}`} />
                                        <h3 className="text-[12px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">Victoria Detectada</h3>
                                        <p className="text-4xl font-black uppercase tracking-widest text-white mb-8">
                                            @{state.players?.get?.(state.winner === 1 ? state.p1 : state.p2)?.name || 'Anónimo'}
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

            {/* Footer / Status Bar */}
            <div className="flex-shrink-0 px-6 py-4 bg-black/40 border-t border-white/5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Info size={14} className="text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {state.gameState === 'lobby' && "Esperando retadores..."}
                        {state.gameState === 'playing' && `Duelo en curso · Turno de @${state.players?.get?.(state.currentTurn)?.name || '...'}`}
                        {state.gameState === 'finished' && "Partida finalizada"}
                    </span>
                </div>
                {!isTheater && (
                    <div className="flex items-center gap-2 md:hidden">
                        <Smartphone className="text-cyan-400 rotate-90" size={14} />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Gira para mejor vista</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function PlayerCard({ slot, player, isActive, onJoin, onLeave, isMe, gameState, compact }) {
    const isP1 = slot === 1;

    // Explicit classes for Tailwind JIT
    const styles = isP1 ? {
        borderActive: 'border-rose-500 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        borderInner: 'border-rose-500',
        textAccent: 'text-rose-400',
        btn: 'bg-rose-500 text-white hover:bg-rose-400',
        dot: 'bg-rose-500'
    } : {
        borderActive: 'border-amber-500 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.15)]',
        borderInner: 'border-amber-500',
        textAccent: 'text-amber-400',
        btn: 'bg-amber-500 text-black hover:bg-amber-400',
        dot: 'bg-amber-500'
    };

    return (
        <div className={`relative flex lg:flex-col items-center p-2 sm:p-3 rounded-2xl sm:rounded-3xl transition-all duration-500 border-2 ${isActive ? styles.borderActive : 'border-white/5 bg-white/5'
            } ${compact ? 'flex-row gap-3 min-w-0 flex-1 lg:flex-none' : 'flex-col sm:flex-row lg:flex-col gap-3 min-w-[120px]'}`}>

            <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-500 ${isActive ? styles.borderInner : 'border-white/10 opacity-40 grayscale'
                    }`}>
                    {player
                        ? <img src={player.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-white/5 flex items-center justify-center"><User size={18} className="text-white/10" /></div>
                    }
                </div>
                {isActive && (
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 rounded sm:rounded-lg ${styles.dot} flex items-center justify-center shadow-lg`}
                    >
                        <Play size={8} className="text-black fill-black sm:w-[10px] sm:h-[10px]" />
                    </motion.div>
                )}
            </div>

            <div className={`text-left lg:text-center flex-1 min-w-0 ${compact ? '' : 'sm:ml-0'}`}>
                <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em] mb-0.5 sm:mb-1 ${isActive ? styles.textAccent : 'text-white/20'}`}>
                    P{slot} · {isP1 ? 'Alfa' : 'Beta'}
                </p>
                <p className={`text-[10px] sm:text-[11px] font-black uppercase truncate ${isActive ? 'text-white' : 'text-white/20'}`}>
                    {player?.name || 'Esperando...'}
                </p>
            </div>

            {gameState === 'lobby' && (
                <div className="flex gap-2 lg:w-full lg:mt-4">
                    {!player ? (
                        <button
                            onClick={onJoin}
                            className={`px-3 lg:w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${styles.btn}`}
                        >
                            Entrar
                        </button>
                    ) : isMe ? (
                        <button
                            onClick={onLeave}
                            className="px-3 lg:w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 border border-white/10 text-white/50 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20"
                        >
                            Salir
                        </button>
                    ) : null}
                </div>
            )}

            {isMe && (
                <div className="absolute -bottom-1.5 lg:-bottom-2 right-2 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 px-2 py-0.5 rounded-md bg-white text-black text-[6px] sm:text-[7px] font-black uppercase tracking-widest shadow-xl z-10">
                    Tú
                </div>
            )}
        </div>
    );
}
