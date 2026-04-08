import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Trophy, Dice6, Dices, Info, MessageCircle, Play, Crown, RotateCw } from 'lucide-react';
import * as Phaser from 'phaser';
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
                setState({ ...ludoRoom.state });
                setConnecting(false);

                ludoRoom.onStateChange((newState) => {
                    setState({ ...newState });
                });

            } catch (err) {
                console.error('[Ludo] Error al conectar:', err?.message);
                toast.error('Error al conectar con la sala');
                onClose();
            }
        };

        joinGame();

        return () => {
            if (activeRoom) activeRoom.leave();
        };
    }, []);

    // Inicialización de Phaser — se ejecuta UNA SOLA VEZ cuando la sala está lista.
    // NO incluir `state` en las deps: Phaser lee el estado vivo desde `room.state`
    // directamente via `onStateChange` en LudoScene. Si se incluye `state`, Phaser
    // se destruye y recrea en cada tick del servidor, perdiendo todas las piezas.
    useEffect(() => {
        if (!room || !gameContainerRef.current || phaserGameRef.current) return;


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
    }, [room]); // Solo cuando la sala está lista — nunca recrear por cambios de state

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
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-amber-900/20 to-rose-900/20 backdrop-blur-xl z-[60]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/20">
                            <Dice6 size={18} className="text-amber-400" />
                        </div>
                        <div className="hidden xs:block">
                            <h2 className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest leading-none bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">Ludo Classic</h2>
                            <p className="text-[8px] sm:text-[9px] text-amber-400/60 uppercase tracking-widest mt-1 font-bold">Torneo 4 Jugadores</p>
                        </div>
                    </div>
                    
                    {/* Player Counter */}
                    <div className="hidden sm:flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                        <Users size={14} className="text-amber-400" />
                        <span className="text-[9px] font-black text-amber-400">{participatingPlayers.length}/4</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {(!myPlayer || !myPlayer.isParticipating) && (participatingPlayers.length < 4) && (
                        <button
                            onClick={() => { if (room?.connection?.isOpen) room.send("join_game"); }}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 flex items-center gap-2 border border-amber-400/30"
                        >
                            <Play size={12} className="fill-current" />
                            <span className="hidden xs:inline">Unirse</span>
                            <span className="xs:hidden">Jugar</span>
                        </button>
                    )}
                    
                    {/* Start Game Button - Host only */}
                    {participatingPlayers.length === 4 && state.phase === 'waiting' && state.hostId === room.sessionId && (
                        <button
                            onClick={() => room.send("start_game")}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 flex items-center gap-2 border border-emerald-400/30 animate-pulse"
                        >
                            <Play size={12} className="fill-current" />
                            <span className="hidden xs:inline">Iniciar</span>
                            <span className="xs:hidden">Jugar</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="lg:hidden p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 text-amber-400 transition-all"
                    >
                        <Users size={18} />
                    </button>

                    <button 
                        onClick={onClose} 
                        className="p-2.5 text-white/30 hover:text-white hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex lg:flex-row flex-col items-center justify-center p-4 sm:p-6 gap-6 overflow-hidden relative bg-gradient-to-br from-amber-900/5 via-transparent to-rose-900/5">
                {/* Ambient Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] lg:w-[900px] h-[400px] sm:h-[600px] lg:h-[900px] bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-full blur-[80px] sm:blur-[120px] lg:blur-[150px] -z-10 animate-pulse" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/pattern.png')] opacity-5 -z-10" />

                {/* Game Board Container */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="relative shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_40px_rgba(245,158,11,0.2)] rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 bg-gradient-to-br from-amber-900/40 to-rose-900/40 border border-amber-500/20 overflow-hidden w-full max-w-[min(85vw,85vh,700px)] aspect-square backdrop-blur-xl">
                        {/* Board Inner Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-[2rem] sm:rounded-[3rem] -z-0" />
                        <div ref={gameContainerRef} className="relative rounded-2xl sm:rounded-3xl overflow-hidden w-full h-full border-2 border-amber-500/10" />
                    </div>
                </div>

                {/* Enhanced Controls Panel */}
                <div className="hidden lg:flex flex-col gap-6 w-80 h-full justify-center flex-shrink-0">
                    <LudoControls state={state} isMyTurn={isMyTurn} handleRoll={handleRoll} participatingPlayers={participatingPlayers} sessionId={room.sessionId} />
                </div>

                <div className="lg:hidden fixed bottom-6 left-6 z-50 flex flex-col items-center gap-3">
                    {/* Enhanced Mobile Dice */}
                    <motion.div
                        animate={state.isRolling ? {
                            rotate: [0, 90, 180, 270, 360],
                            scale: [1, 1.3, 1],
                        } : state.diceValue > 0 ? {
                            scale: [0.8, 1.2, 1],
                            rotate: [0, 15, 15, 15]
                        } : {}}
                        transition={state.isRolling ? { repeat: Infinity, duration: 0.4, ease: "linear" } : { duration: 0.3 }}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black shadow-2xl transition-all border-3 backdrop-blur-xl
                        ${state.isRolling ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black border-amber-300 shadow-amber-500/40' :
                                state.diceValue > 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black border-amber-400 shadow-amber-500/30' : 'bg-white/10 text-white/20 border-white/10 backdrop-blur-sm'}`}
                    >
                        {state.isRolling ? (
                            <RotateCw className="animate-spin text-black/40" size={28} />
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className="font-black">{state.diceValue || "?"}</span>
                            </div>
                        )}
                    </motion.div>
                    {isMyTurn && !state.waitingForMove && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 text-black px-4 py-1.5 rounded-full text-[9px] font-black shadow-lg shadow-amber-500/30 border border-amber-400/30"
                        >
                            ¡TIRA!
                        </motion.div>
                    )}
                </div>

                <div className="lg:hidden fixed bottom-6 right-6 z-50">
                    <button
                        onClick={handleRoll}
                        disabled={!isMyTurn || state.waitingForMove}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all border-3 backdrop-blur-xl
                        ${isMyTurn && !state.waitingForMove
                                ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black border-amber-400 shadow-amber-500/30 scale-110 animate-pulse'
                                : 'bg-white/10 text-white/20 border-white/10 opacity-50'}`}
                    >
                        <Dices size={28} className={isMyTurn && !state.waitingForMove ? 'animate-bounce' : ''} />
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
            {/* Turn Indicator */}
            <div className="bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 rounded-3xl p-6 backdrop-blur-xl space-y-6 shadow-lg shadow-amber-500/10">
                <div className="text-center space-y-3">
                    <p className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em]">Turno de</p>
                    <div className="flex items-center justify-center gap-3">
                        {state.players?.get?.(state.currentTurn) && (
                            <>
                                <div className="relative">
                                    <img src={state.players.get(state.currentTurn)?.avatar} className="w-12 h-12 rounded-xl border-2 border-amber-400 shadow-lg shadow-amber-500/30" alt="" />
                                    {state.currentTurn === sessionId && (
                                        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 animate-pulse">
                                            <Crown size={12} className="text-black" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-base font-black text-white uppercase truncate max-w-[140px]">
                                    {state.currentTurn === sessionId ? "TU TURNO" : `@${state.players.get(state.currentTurn)?.username}`}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Enhanced Dice */}
                <div className="relative flex flex-col items-center justify-center group scale-90 sm:scale-100">
                    <motion.div
                        animate={state.isRolling ? {
                            rotate: [0, 90, 180, 270, 360],
                            scale: [1, 1.3, 1],
                        } : state.diceValue > 0 ? {
                            scale: [0.8, 1.2, 1],
                            rotate: [0, 15, 15, 15]
                        } : {}}
                        transition={state.isRolling ? { repeat: Infinity, duration: 0.4, ease: "linear" } : { duration: 0.3 }}
                        className={`w-28 h-28 rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl transition-all border-3 backdrop-blur-xl
                        ${state.isRolling ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black border-amber-300 shadow-amber-500/40' :
                                state.diceValue > 0 ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-black border-amber-400 shadow-amber-500/30 rotate-12' : 'bg-white/10 text-white/20 border-white/10 backdrop-blur-sm'}`}
                    >
                        {state.isRolling ? (
                            <div className="flex flex-col items-center gap-2">
                                <RotateCw className="animate-spin text-black/40" size={36} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className="font-black">{state.diceValue || "?"}</span>
                            </div>
                        )}
                    </motion.div>

                    {isMyTurn && !state.waitingForMove && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="absolute -bottom-3"
                        >
                            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-black px-4 py-2 rounded-full text-[10px] font-black shadow-lg shadow-amber-500/30 border border-amber-400/30 animate-bounce">¡TIRA EL DADO!</span>
                        </motion.div>
                    )}
                </div>

                {/* Enhanced Roll Button */}
                <button
                    onClick={handleRoll}
                    disabled={!isMyTurn || state.waitingForMove}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-[12px] transition-all flex items-center justify-center gap-3 border-2
                    ${isMyTurn && !state.waitingForMove
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_15px_40px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 border-amber-400/30'
                            : 'bg-white/10 text-white/30 border-white/10'}`}
                >
                    <Dices size={20} />
                    Tirar Dado
                </button>
            </div>

            {/* Enhanced Game Status */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-5">
                <div className="flex items-center gap-3 text-amber-400 mb-3">
                    <Info size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Estado del Juego</span>
                </div>
                
                <div className="text-center space-y-3 mb-5">
                    <div className="text-[11px] text-white/80 font-medium">
                        {state.phase === 'waiting' && participatingPlayers.length < 4 && `Esperando ${4 - participatingPlayers.length} jugadores...`}
                        {state.phase === 'waiting' && participatingPlayers.length === 4 && 'Listo para iniciar'}
                        {state.phase === 'countdown' && (
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-amber-400 font-bold">¡Comienza en</span>
                                <span className="text-2xl font-black text-amber-400 animate-pulse">{state.countdown}</span>
                            </div>
                        )}
                        {state.phase === 'playing' && '¡Juego en curso!'}
                        {state.phase === 'finished' && '¡Partida finalizada!'}
                    </div>
                    {state.phase === 'finished' && state.winners?.length > 0 && (
                        <div className="mt-4 p-4 bg-amber-500/20 border border-amber-500/30 rounded-2xl">
                            <div className="text-[8px] text-amber-400 font-black uppercase tracking-widest mb-2">🏆 GANADOR</div>
                            <div className="text-lg font-black text-white">{Array.from(state.players.values()).find(p => p.userId === state.winners[0])?.username || 'Desconocido'}</div>
                        </div>
                    )}
                </div>
                
                {/* Players List */}
                <div className="space-y-3">
                    <div className="text-[9px] text-amber-400 font-black uppercase tracking-widest mb-3">Jugadores ({participatingPlayers.length}/4)</div>
                    {participatingPlayers.map(p => (
                        <div key={p.sessionId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${p.color === 'red' ? 'bg-red-500' : p.color === 'blue' ? 'bg-blue-500' : p.color === 'green' ? 'bg-green-500' : 'bg-yellow-500'} shadow-lg`} />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{p.username}</span>
                                    {p.sessionId === state.currentTurn && (
                                        <span className="text-[8px] text-amber-400 font-bold animate-pulse">• Jugando</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {p.pieces && Array.from(p.pieces.values()).map((pc, i) => (
                                    <div key={i} className={`w-2.5 h-2.5 rounded-md ${pc.status === 'finished' ? 'bg-amber-500 border border-amber-300 shadow-sm shadow-amber-500/30' : pc.status === 'base' ? 'bg-white/10 border border-white/20' : 'bg-white/20 border border-white/30'}`} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Enhanced Rematch Button */}
            <button
                onClick={() => { room && room.send("rematch"); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 border border-green-400/30 shadow-lg shadow-green-500/20"
                disabled={state.phase !== 'finished'}
            >
                <Trophy size={16} />
                Nueva Revancha
            </button>
        </div>
    );
}
