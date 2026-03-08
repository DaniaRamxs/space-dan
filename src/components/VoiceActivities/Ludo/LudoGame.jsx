import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Trophy, Dice6, Dices, Info, MessageCircle, Play } from 'lucide-react';
import Phaser from 'phaser';
import LudoScene from './LudoScene';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LudoGame({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const gameContainerRef = useRef(null);
    const phaserGameRef = useRef(null);

    useEffect(() => {
        const joinGame = async () => {
            try {
                const ludoRoom = await client.joinOrCreate("ludo", {
                    name: profile?.username || user?.displayName || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });
                setRoom(ludoRoom);
                setState(ludoRoom.state);
                setConnecting(false);

                ludoRoom.onStateChange((newState) => {
                    setState(newState);
                });

                // Initialize Phaser
                const config = {
                    type: Phaser.AUTO,
                    parent: gameContainerRef.current,
                    width: 600,
                    height: 600,
                    backgroundColor: '#0f172a',
                    transparent: true,
                    scene: [LudoScene],
                    physics: { default: 'arcade' },
                };

                const game = new Phaser.Game(config);
                game.scene.start('LudoScene', { room: ludoRoom });
                phaserGameRef.current = game;

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error al conectar con la sala");
                onClose();
            }
        };

        joinGame();

        return () => {
            if (phaserGameRef.current) phaserGameRef.current.destroy(true);
            if (room) room.leave();
        };
    }, []);

    const handleRoll = () => {
        if (room && state.currentTurn === room.sessionId && !state.waitingForMove) {
            room.send("roll_dice");
        }
    };

    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#070b14] overflow-hidden text-white">
                <Dices size={48} className="text-amber-500 animate-bounce mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/40">Cargando Tablero...</p>
            </div>
        );
    }

    const myPlayer = state.players.get(room.sessionId);
    const isMyTurn = state.currentTurn === room.sessionId;

    return (
        <div className="flex-1 flex flex-col bg-[#070b14] text-white overflow-hidden font-sans">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-md z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                            <Dice6 size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Ludo Classic</h2>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1">Multiplayer Realtime</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3 overflow-hidden p-1">
                        {state.players && Array.from(state.players.values()).map((p) => (
                            <div key={p.id} className={`relative group transition-transform hover:scale-110 z-10`}>
                                <img src={p.avatar} className={`w-8 h-8 rounded-full border-2 ${p.id === state.currentTurn ? 'border-amber-500 shadow-[0_0_10px_#f59e0b]' : 'border-white/10'}`} alt="" />
                                {p.id === state.currentTurn && <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />}
                            </div>
                        ))}
                    </div>
                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 overflow-hidden relative">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px] -z-10" />

                {/* Phaser Canvas */}
                <div className="relative shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-4 bg-white/5 border border-white/10 overflow-hidden">
                    <div ref={gameContainerRef} className="rounded-2xl overflow-hidden" style={{ width: 600, height: 600 }} />
                </div>

                {/* Side Panel: Game Controls & Info */}
                <div className="flex flex-col gap-6 w-full lg:w-72">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-6">
                        {/* Current Turn Indicator */}
                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Turno de</p>
                            <div className="flex items-center justify-center gap-3">
                                {state.players?.get?.(state.currentTurn) && (
                                    <>
                                        <img src={state.players.get(state.currentTurn)?.avatar} className="w-10 h-10 rounded-xl border border-amber-500 shadow-lg shadow-amber-500/20" alt="" />
                                        <span className="text-sm font-black text-white uppercase truncate max-w-[120px]">
                                            {isMyTurn ? "TU TURNO" : `@${state.players.get(state.currentTurn)?.name}`}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Dice Display */}
                        <div className="relative flex flex-col items-center justify-center group">
                            <motion.div
                                animate={state.diceValue > 0 ? { rotate: [0, 90, 180, 270, 360], scale: [0.8, 1.2, 1] } : {}}
                                className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl transition-all border-2 
                                ${state.diceValue > 0 ? 'bg-amber-500 text-black border-amber-400 rotate-12' : 'bg-white/5 text-white/10 border-white/5'}`}
                            >
                                {state.diceValue || "?"}
                            </motion.div>

                            {isMyTurn && !state.waitingForMove && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute -bottom-2"
                                >
                                    <span className="bg-amber-500 text-[9px] font-black text-black px-3 py-1 rounded-full animate-bounce shadow-xl">¡TIRA EL DADO!</span>
                                </motion.div>
                            )}
                        </div>

                        {/* Roll Button */}
                        <button
                            onClick={handleRoll}
                            disabled={!isMyTurn || state.waitingForMove}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2
                            ${isMyTurn && !state.waitingForMove
                                    ? 'bg-amber-500 text-black shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95'
                                    : 'bg-white/5 text-white/10 border border-white/5'}`}
                        >
                            <Dices size={16} />
                            Tirar Dado
                        </button>
                    </div>

                    {/* Stats/History */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-white/40 mb-2">
                            <Info size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Estado de Fichas</span>
                        </div>
                        <div className="space-y-2">
                            {state.players && Array.from(state.players.values()).map(p => (
                                <div key={p.id} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${p.color === 'red' ? 'bg-red-500' : p.color === 'blue' ? 'bg-blue-500' : p.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                        <span className="font-bold text-white/60 truncate max-w-[100px]">{p.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        {p.pieces && p.pieces.map((pc, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${pc.status === 'finished' ? 'bg-amber-500' : pc.status === 'base' ? 'bg-white/10' : 'bg-white/40'}`} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Help Overlay for moves */}
            <AnimatePresence>
                {isMyTurn && state.waitingForMove && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                    >
                        <div className="bg-amber-500 text-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-amber-400">
                            <Play size={16} className="text-black rotate-[-90deg] animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-widest italic">Haz clic en una de tus fichas para moverla</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
