import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, UserPlus, Zap, Tv2, Info, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const GRID_SIZE = 40; // Updated to match server

export default function SnakeDuelGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let activeRoom = null;
        const joinGame = async () => {
            try {
                const snakeRoom = await client.joinOrCreate("snake", {
                    userId: user?.id,
                    name: profile?.username || user?.email?.split('@')[0] || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });

                activeRoom = snakeRoom;
                setRoom(snakeRoom);
                setState({
                    phase: snakeRoom.state.phase,
                    countdown: snakeRoom.state.countdown,
                    winner: snakeRoom.state.winner,
                    apple: snakeRoom.state.apple,
                    hostId: snakeRoom.state.hostId,
                    players: snakeRoom.state.players ? Array.from(snakeRoom.state.players.values()) : []
                });
                setConnecting(false);

                snakeRoom.onStateChange((newState) => {
                    setState({
                        phase: newState.phase,
                        countdown: newState.countdown,
                        winner: newState.winner,
                        apple: newState.apple,
                        hostId: newState.hostId,
                        players: Array.from(newState.players.values())
                    });
                    setTick(t => t + 1);
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error conectando al servidor de combate");
                onClose();
            }
        };

        joinGame();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, [roomName]);

    const handleInput = (direction) => {
        if (!room || state?.phase !== 'playing') return;
        room.send("input", { direction });
    };

    // Keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': handleInput('UP'); break;
                case 'ArrowDown': case 's': case 'S': handleInput('DOWN'); break;
                case 'ArrowLeft': case 'a': case 'A': handleInput('LEFT'); break;
                case 'ArrowRight': case 'd': case 'D': handleInput('RIGHT'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [room, state?.phase]);

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

    const myPlayer = state.players?.find(p => p.sessionId === room.sessionId);
    const isMeInGame = !!myPlayer;

    const handleJoin = () => {
        room.send("join_game", {
            name: profile?.username || "Piloto",
            avatar: profile?.avatar_url
        });
    };

    const handleRematch = () => {
        room.send("rematch");
    };

    return (
        <div className="flex-1 flex flex-col relative bg-[#050510] overflow-hidden text-white font-sans">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/5 blur-[120px] rounded-full -z-10" />

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Zap size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Snake Duel</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5 font-bold">Resistencia Máxima</p>
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

                {/* Players Sidebar */}
                <div className={`
                    ${isTheater
                        ? 'w-full lg:w-64 border-b lg:border-b-0 lg:border-r h-auto lg:h-full'
                        : 'w-full border-b h-auto'
                    } flex-shrink-0 border-white/5 bg-black/20 p-4 sm:p-6 
                    flex ${isTheater ? 'flex-row lg:flex-col' : 'flex-row justify-center'} 
                    gap-4 sm:gap-6 items-center overflow-x-auto no-scrollbar
                `}>
                    {state.players.map((p, i) => (
                        <PlayerCard
                            key={p.sessionId}
                            slot={i + 1}
                            player={p}
                            isMe={room.sessionId === p.sessionId}
                            isHost={p.sessionId === state.hostId}
                            onJoin={handleJoin}
                            phase={state.phase}
                            compact={!isTheater}
                            color={i === 0 ? "rose" : "emerald"}
                        />
                    ))}
                    {state.players.length < 2 && (
                        <div className="flex items-center justify-center p-4 border-2 border-dashed border-white/5 rounded-3xl w-full">
                            <p className="text-[8px] font-black uppercase text-white/20">Esperando Rival...</p>
                        </div>
                    )}
                </div>

                {/* Grid area */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-10 relative">
                    <div className="relative" style={{ width: 'min(80vw, 80vh, 500px)', aspectRatio: '1/1' }}>
                        <div className="absolute inset-0 bg-emerald-950/20 rounded-[2rem] border-4 border-white/5 shadow-2xl backdrop-blur-sm overflow-hidden">
                            {/* Grid Dots */}
                            <div className="absolute inset-0 grid grid-cols-20 grid-rows-20 opacity-[0.05]">
                                {Array.from({ length: 400 }).map((_, i) => (
                                    <div key={i} className="border-[0.5px] border-white/20" />
                                ))}
                            </div>

                            {/* Snakes & Apple */}
                            <div className="absolute inset-0">
                                {state.apple && (
                                    <motion.div
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            rotate: [0, 90, 180]
                                        }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute bg-yellow-400 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.6)] z-10"
                                        style={{
                                            left: `${(state.apple.x / GRID_SIZE) * 100}%`,
                                            top: `${(state.apple.y / GRID_SIZE) * 100}%`,
                                            width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white/40 rounded-lg" />
                                    </motion.div>
                                )}
                                {state.players.map((p, pi) => (
                                    p.segments?.map((seg, i) => (
                                        <div
                                            key={`${p.sessionId}-${pi}-${i}`}
                                            className={`absolute rounded-sm shadow-[0_0_10px_rgba(0,0,0,0.4)] ${pi === 0 ? 'bg-rose-500 shadow-rose-500/40' : 'bg-emerald-500 shadow-emerald-500/40'}`}
                                            style={{
                                                left: `${(seg.x / GRID_SIZE) * 100}%`,
                                                top: `${(seg.y / GRID_SIZE) * 100}%`,
                                                width: `${100 / GRID_SIZE}%`, height: `${100 / GRID_SIZE}%`,
                                                opacity: 1 - (i / p.segments.length) * 0.6
                                            }}
                                        />
                                    ))
                                ))}
                            </div>
                        </div>

                        {/* Overlays */}
                        <AnimatePresence>
                            {state.countdown > 0 && (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.5, opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                                >
                                    <span className="text-8xl font-black italic text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                                        {state.countdown}
                                    </span>
                                </motion.div>
                            )}

                            {state.phase === 'finished' && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-[#050510]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 rounded-[2rem] z-50 text-center"
                                >
                                    <Trophy size={60} className={`mb-6 p-4 rounded-3xl bg-white/5 ${state.winner === 'draw' ? 'text-white/20' : 'text-emerald-500'}`} />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">Combate Finalizado</h3>
                                    <p className="text-2xl font-black uppercase tracking-widest text-white mb-8">
                                        {state.winner === 'draw' ? 'EMPATE TÉCNICO' : `@${state.players?.find(p => p.userId === state.winner)?.username || 'Piloto'} GANA`}
                                    </p>
                                    <div className="flex gap-4">
                                        <button onClick={handleRematch} className="px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all">Revancha</button>
                                        <button onClick={onClose} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px]">Salir</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* D-Pad for Mobile */}
                    {state.phase === 'playing' && isMeInGame && (
                        <div className="mt-8 grid grid-cols-3 gap-2 sm:hidden">
                            <div />
                            <DPadBtn icon={ChevronUp} onClick={() => handleInput('UP')} />
                            <div />
                            <DPadBtn icon={ChevronLeft} onClick={() => handleInput('LEFT')} />
                            <DPadBtn icon={ChevronDown} onClick={() => handleInput('DOWN')} />
                            <DPadBtn icon={ChevronRight} onClick={() => handleInput('RIGHT')} />
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 bg-black/40 border-t border-white/5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Info size={14} className="text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {state.phase === 'waiting' && "Esperando rivales..."}
                        {state.phase === 'playing' && "Duelo de Resistencia en curso"}
                        {state.phase === 'finished' && "Partida finalizada"}
                    </span>
                </div>
            </div>
        </div>
    );
}

function PlayerCard({ slot, player, isMe, isHost, onJoin, phase, compact, color }) {
    const isP1 = slot === 1;
    const accentColor = color === 'rose' ? 'rose' : 'emerald';
    const isActive = !!player;

    const styles = isP1 ? {
        borderActive: 'border-rose-500 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        borderInner: 'border-rose-500',
        textAccent: 'text-rose-400',
        btn: 'bg-rose-500 text-white hover:bg-rose-400'
    } : {
        borderActive: 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.15)]',
        borderInner: 'border-emerald-500',
        textAccent: 'text-emerald-400',
        btn: 'bg-emerald-500 text-white hover:bg-emerald-400'
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
            </div>

            <div className="text-left lg:text-center flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                    <p className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em] ${isActive ? styles.textAccent : 'text-white/20'}`}>
                        PILOTO {slot}
                    </p>
                    {isHost && isActive && <Crown size={9} className="text-amber-400 flex-shrink-0" />}
                </div>
                <p className={`text-[10px] sm:text-[11px] font-black uppercase truncate ${isActive ? 'text-white' : 'text-white/20'}`}>
                    {player?.username || 'VACIÓ'}
                </p>
            </div>
        </div>
    );
}

function DPadBtn({ icon: Icon, onClick }) {
    return (
        <button
            onPointerDown={(e) => { e.preventDefault(); onClick(); }}
            className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:bg-emerald-500 active:text-black transition-all touch-none"
        >
            <Icon size={24} />
        </button>
    );
}
