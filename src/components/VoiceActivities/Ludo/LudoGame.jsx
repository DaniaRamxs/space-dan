import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Trophy, Dice6, Dices, Info, MessageCircle, Play, Crown } from 'lucide-react';
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
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const gameContainerRef = useRef(null);
    const phaserGameRef = useRef(null);

    useEffect(() => {
        let activeRoom = null;
        const joinGame = async () => {
            try {
                const ludoRoom = await client.joinOrCreate("ludo", {
                    userId: user?.id,
                    username: profile?.username || user?.displayName || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });
                activeRoom = ludoRoom;
                setRoom(ludoRoom);
                setState(ludoRoom.state);
                setConnecting(false);

                ludoRoom.onStateChange((newState) => {
                    setState(newState);
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error al conectar con la sala");
                onClose();
            }
        };

        joinGame();

        return () => {
            if (activeRoom) activeRoom.leave();
        };
    }, []);

    // Dedicated useEffect for Phaser initialization
    useEffect(() => {
        if (!room || !state || !gameContainerRef.current || phaserGameRef.current) return;

        console.log("[Ludo] Initializing Phaser in container:", gameContainerRef.current);

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
        game.scene.start('LudoScene', { room: room });
        phaserGameRef.current = game;

        return () => {
            if (phaserGameRef.current) {
                phaserGameRef.current.destroy(true);
                phaserGameRef.current = null;
            }
        };
    }, [connecting, room, state]);

    const handleRoll = () => {
        if (room?.connection?.isOpen && state.currentTurn === room.sessionId && !state.waitingForMove) {
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

    const myPlayer = state?.players?.get?.(room.sessionId);
    const isMyTurn = state?.currentTurn === room.sessionId;
    const participatingPlayers = state?.players ? Array.from(state.players.values()).filter(p => p.isParticipating) : [];

    return (
        <div className="flex-1 flex flex-col bg-[#070b14] text-white overflow-hidden font-sans">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-white/5 bg-black/20 backdrop-blur-md z-[60]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                            <Dice6 size={16} className="text-amber-400" />
                        </div>
                        <div className="hidden xs:block">
                            <h2 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest leading-none">Ludo Classic</h2>
                            <p className="text-[7px] sm:text-[8px] text-white/30 uppercase tracking-widest mt-1">Multiplayer</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {(!myPlayer || !myPlayer.isParticipating) && (state?.players?.size < 4) && (
                        <button
                            onClick={() => { if (room?.connection?.isOpen) room.send("join_game"); }}
                            className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                        >
                            <Play size={10} className="fill-current" />
                            <span className="hidden xs:inline">Unirse</span>
                            <span className="xs:hidden">Jugar</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="lg:hidden p-2 bg-white/5 rounded-xl border border-white/10 text-amber-500"
                    >
                        <Users size={18} />
                    </button>

                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 gap-4 overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] lg:w-[800px] h-[300px] sm:h-[600px] lg:h-[800px] bg-amber-500/5 rounded-full blur-[60px] sm:blur-[120px] -z-10" />

                <div className="relative shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-[1.5rem] sm:rounded-[2.5rem] p-2 sm:p-4 bg-white/5 border border-white/10 overflow-hidden w-full max-w-[min(90vw,90vh,600px)] aspect-square">
                    <div ref={gameContainerRef} className="rounded-xl sm:rounded-2xl overflow-hidden w-full h-full" />
                </div>

                <div className="hidden lg:flex flex-col gap-6 w-72 h-full justify-center">
                    <LudoControls state={state} isMyTurn={isMyTurn} handleRoll={handleRoll} participatingPlayers={participatingPlayers} sessionId={room.sessionId} />
                </div>

                <div className="lg:hidden fixed bottom-6 right-6 z-50">
                    <button
                        onClick={handleRoll}
                        disabled={!isMyTurn || state.waitingForMove}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all border-2 
                        ${isMyTurn && !state.waitingForMove
                                ? 'bg-amber-500 text-black border-amber-400 scale-110'
                                : 'bg-white/5 text-white/10 border-white/5 opacity-50'}`}
                    >
                        <Dices size={24} className={isMyTurn && !state.waitingForMove ? 'animate-bounce' : ''} />
                    </button>
                </div>

                <AnimatePresence>
                    {showMobileMenu && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowMobileMenu(false)}
                                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                            />
                            <motion.div
                                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                                className="lg:hidden fixed top-0 right-0 h-full w-[280px] bg-[#070b14] border-l border-white/10 z-[80] p-6 pt-20"
                            >
                                <button onClick={() => setShowMobileMenu(false)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-xl border border-white/10"><X size={18} /></button>
                                <LudoControls state={state} isMyTurn={isMyTurn} handleRoll={handleRoll} participatingPlayers={participatingPlayers} sessionId={room.sessionId} />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

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

function LudoControls({ state, isMyTurn, handleRoll, participatingPlayers, sessionId }) {
    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-6">
                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Turno de</p>
                    <div className="flex items-center justify-center gap-3">
                        {state.players?.get?.(state.currentTurn) && (
                            <>
                                <img src={state.players.get(state.currentTurn)?.avatar} className="w-10 h-10 rounded-xl border border-amber-500 shadow-lg shadow-amber-500/20" alt="" />
                                <span className="text-sm font-black text-white uppercase truncate max-w-[120px]">
                                    {state.currentTurn === sessionId ? "TU TURNO" : `@${state.players.get(state.currentTurn)?.username}`}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative flex flex-col items-center justify-center group scale-75 sm:scale-100">
                    <motion.div
                        animate={state.diceValue > 0 ? { rotate: [0, 90, 180, 270, 360], scale: [0.8, 1.2, 1] } : {}}
                        className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black shadow-2xl transition-all border-2 
                        ${state.diceValue > 0 ? 'bg-amber-500 text-black border-amber-400 rotate-12' : 'bg-white/5 text-white/10 border-white/5'}`}
                    >
                        {state.diceValue || "?"}
                    </motion.div>

                    {isMyTurn && !state.waitingForMove && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="absolute -bottom-2"
                        >
                            <span className="bg-amber-500 text-[9px] font-black text-black px-3 py-1 rounded-full animate-bounce shadow-xl">¡TIRA EL DADO!</span>
                        </motion.div>
                    )}
                </div>

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

            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-white/40 mb-2">
                    <Info size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Fichas</span>
                </div>
                <div className="space-y-3">
                    {participatingPlayers.map(p => (
                        <div key={p.sessionId} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${p.color === 'red' ? 'bg-red-500' : p.color === 'blue' ? 'bg-blue-500' : p.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    <span className="font-bold text-white/60 truncate max-w-[120px]">{p.username}</span>
                                </div>
                                {p.sessionId === state.currentTurn && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />}
                            </div>
                            <div className="flex gap-1.5 ml-4">
                                {p.pieces && Array.from(p.pieces.values()).map((pc, i) => (
                                    <div key={i} className={`w-2 h-2 rounded-md ${pc.status === 'finished' ? 'bg-amber-500 border border-amber-300' : pc.status === 'base' ? 'bg-white/5 border border-white/10' : 'bg-white/20 border border-white/20'}`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
