import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import { Trophy, Dices, Users, RotateCcw, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MultiplayerRoomLauncher({ gameName, roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);

    useEffect(() => {
        const joinGame = async () => {
            try {
                const joinedRoom = await client.joinOrCreate(gameName, {
                    userId: user?.id,
                    username: profile?.username || user?.displayName || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });

                setRoom(joinedRoom);
                setState(joinedRoom.state);
                setConnecting(false);

                // Listen for all state changes
                joinedRoom.onStateChange((newState) => {
                    setState({ ...newState });
                });

            } catch (e) {
                console.error("Colyseus connection error", e);
                toast.error("Error al conectar con la sala");
                onClose();
            }
        };

        joinGame();

        return () => {
            if (room) room.leave();
        };
    }, []);

    const handleRematch = () => {
        if (room) room.send("rematch");
    };

    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#070b14] text-white">
                <Dices size={48} className="text-purple-500 animate-bounce mb-4" />
                <p className="text-xs uppercase tracking-widest font-black opacity-40">Connecting to {gameName}...</p>
            </div>
        );
    }

    const myPlayer = state.players.get(room.sessionId);
    const totalPlayers = state.players.size;
    const rematchVotes = state.rematchVotes.size;

    return (
        <div className="flex-1 flex flex-col bg-[#070b14] text-white overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] -z-10" />

            {/* 1. STATE INDICATOR (Wait, Play, etc.) */}
            <Header status={state.phase} playersCount={totalPlayers} onLeave={onClose} />

            {/* 2. GAME AREA */}
            <div className="flex-1 relative flex items-center justify-center p-6">

                {/* COUNTDOWN OVERLAY */}
                <AnimatePresence>
                    {state.phase === "countdown" && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
                        >
                            <h1 className="text-9xl font-black italic tracking-tighter text-purple-500 shadow-purple-500/20 shadow-2xl">
                                {state.countdown}
                            </h1>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* WINNER OVERLAY */}
                <AnimatePresence>
                    {state.phase === "finished" && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-[#070b14]/90 backdrop-blur-xl"
                        >
                            <div className="bg-purple-500/20 p-8 rounded-[3rem] border border-purple-500/30 flex flex-col items-center gap-6 shadow-2xl">
                                <Trophy size={80} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                                <div className="text-center">
                                    <h2 className="text-2xl font-black uppercase italic text-white tracking-widest">Partida Finalizada</h2>
                                    <p className="text-purple-400 font-bold uppercase tracking-widest text-[10px] mt-2">
                                        Ganador: @{Array.from(state.players.values()).find(p => p.userId === state.winner)?.username || "Desconocido"}
                                    </p>
                                </div>

                                {/* REMATCH SYSTEM */}
                                <div className="flex flex-col items-center gap-3">
                                    <button
                                        onClick={handleRematch}
                                        disabled={state.rematchVotes.has(user?.id)}
                                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${state.rematchVotes.has(user?.id)
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-purple-600 text-white hover:bg-purple-500 shadow-xl shadow-purple-600/20'
                                            }`}
                                    >
                                        <RotateCcw size={18} />
                                        {state.rematchVotes.has(user?.id) ? "Voto Registrado" : "Revancha"}
                                    </button>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                        Votos: <span className="text-purple-500">{rematchVotes}</span> / {totalPlayers}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ACTUAL GAME VIEWPORT (Placeholder for Canvas/Phaser) */}
                <div className="w-full max-w-2xl aspect-square bg-slate-900/50 border border-white/5 rounded-[2rem] flex items-center justify-center">
                    {state.phase === "waiting" && (
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                            <Users size={32} className="text-white/20" />
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Esperando oponente...</p>
                        </div>
                    )}

                    {/* HERE GOES THE ACTUAL GAME (Example: Snake Game Grid) */}
                    {state.phase === "playing" && (
                        <div className="text-purple-400 text-xs font-mono uppercase tracking-widest italic animate-pulse">
                            {"< Game Underway >"}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Header({ status, playersCount, onLeave }) {
    const statusMap = {
        waiting: { label: "Waiting...", color: "bg-white/10 text-white/40" },
        countdown: { label: "Ready?", color: "bg-amber-500 text-black" },
        playing: { label: "Live Partida", color: "bg-purple-600 text-white animate-pulse" },
        finished: { label: "Finalizado", color: "bg-slate-800 text-white/40" }
    };
    const current = statusMap[status] || statusMap.waiting;

    return (
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl ${current.color}`}>
                    {current.label}
                </div>
                <div className="flex items-center gap-2 text-white/20">
                    <Users size={12} />
                    <span className="text-[10px] font-black">{playersCount}</span>
                </div>
            </div>
            <button onClick={onLeave} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <RotateCcw size={16} className="text-white/40" />
            </button>
        </div>
    );
}
