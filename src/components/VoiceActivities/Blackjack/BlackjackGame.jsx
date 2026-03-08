import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Coins, User, Shield, Info } from 'lucide-react';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function BlackjackGame({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);

    useEffect(() => {
        const joinGame = async () => {
            try {
                const bjRoom = await client.joinOrCreate("blackjack", {
                    name: profile?.username || user?.email?.split('@')[0] || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName,
                    dbId: user?.id || profile?.id
                });
                setRoom(bjRoom);
                setState(bjRoom.state);
                setConnecting(false);

                bjRoom.onStateChange((newState) => {
                    // En Colyseus 0.16+, es mejor no usar spread (...) en el state directo
                    // Force re-render without losing methods/maps
                    setState(newState);
                    setTick(t => t + 1);
                });

                bjRoom.onLeave((code) => {
                    console.log("Left Blackjack room", code);
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error conectando al servidor de Blackjack");
                onClose();
            }
        };

        joinGame();
        return () => { if (room) room.leave(); };
    }, []);

    const [tick, setTick] = useState(0); // Dummy state to force rerender

    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Conectando a la mesa...
                </p>
            </div>
        );
    }

    const myPlayer = state.players?.get(room.sessionId);
    const isMyTurn = state.currentTurn === room.sessionId;

    return (
        <div className="flex-1 flex flex-col relative bg-[#070b14] overflow-hidden text-white font-sans">
            {/* Table Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/5 bg-black/20 backdrop-blur-md z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                            <Coins size={16} className="text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Blackjack Tournament</h2>
                            <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1">Gana el que sume más victorias en 10 rondas</p>
                        </div>
                    </div>

                    {/* Tournament Progress */}
                    <div className="hidden md:flex flex-col gap-1.5 min-w-[120px]">
                        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
                            <span>Ronda {state.roundsPlayed}/{state.maxRounds}</span>
                            <span className="text-rose-400">{Math.round((state.roundsPlayed / state.maxRounds) * 100)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                animate={{ width: `${(state.roundsPlayed / state.maxRounds) * 100}%` }}
                                className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap">Pozo: {state.pot} ◈</span>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Game Table (Green Felt Style) */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-6 sm:p-10">
                <div className="absolute inset-x-10 top-20 bottom-20 bg-emerald-900/20 rounded-[10rem] border border-emerald-500/10 blur-3xl -z-10" />

                {/* Dealer Area */}
                <div className="flex flex-col items-center mb-16 gap-3">
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 mb-2">
                            <Shield size={20} className="text-emerald-400 opacity-50" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/60">Dealer</span>
                    </div>

                    <div className="flex gap-2 min-h-[100px] justify-center">
                        {state.dealer?.cards?.map((card, i) => (
                            <PlayingCard key={`dealer-${i}`} card={card} />
                        ))}
                    </div>
                    {(state.dealer?.score || 0) > 0 && (
                        <div className="bg-black/60 px-3 py-1 rounded-full border border-emerald-500/20 text-[10px] font-black text-emerald-400 shadow-xl">
                            {state.dealer.score}
                        </div>
                    )}
                </div>

                {/* Player Seats */}
                <div className="w-full max-w-4xl grid grid-cols-3 sm:grid-cols-6 gap-4 relative">
                    {state.players && Array.from(state.players.values()).map((p) => (
                        <PlayerSeat key={p.id} player={p} isCurrent={state.currentTurn === p.id} isMe={p.id === room.sessionId} />
                    ))}
                </div>

                {/* Tournament End Celebration Overlay */}
                <AnimatePresence>
                    {state.gameState === "tournament_finished" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-6"
                        >
                            <div className="bg-[#050518]/90 border border-amber-500/20 p-12 rounded-[4rem] shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center max-w-md w-full relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                                <Play size={64} className="text-amber-400 mb-6 rotate-[-90deg] drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
                                <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2">Final del Torneo</h3>
                                <p className="text-[11px] text-amber-500 font-bold uppercase tracking-[0.3em] mb-8">El pozo de {state.pot} ◈ ha sido repartido</p>

                                <div className="space-y-3 w-full">
                                    {Array.from(state.players.values())
                                        .sort((a, b) => b.roundWins - a.roundWins)
                                        .slice(0, 3)
                                        .map((p, i) => (
                                            <div key={p.id} className={`flex items-center gap-4 p-4 rounded-3xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/5'}`}>
                                                <span className={`text-xl font-black ${i === 0 ? 'text-amber-400' : 'text-white/20'}`}>{i + 1}</span>
                                                <img src={p.avatar} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                                                <div className="text-left flex-1">
                                                    <p className="text-[11px] font-black text-white uppercase truncate">@{p.name}</p>
                                                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{p.roundWins} Victorias</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                                <p className="mt-10 text-[8px] text-white/20 uppercase tracking-[0.4em] font-black italic">Iniciando nuevo torneo en breve...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Game Controls Bar */}
            <div className="flex-shrink-0 p-6 sm:p-8 bg-black/40 border-t border-white/5 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* User Info & Bet info */}
                    <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                        <div className="relative">
                            <img src={profile?.avatar_url || "/default-avatar.png"} className={`w-12 h-12 rounded-2xl border-2 ${isMyTurn ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse' : 'border-white/10'}`} alt="P" />
                            {isMyTurn && <div className="absolute -top-1 -right-1 bg-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">Tu turno</div>}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Tu Apuesta</p>
                            <p className="text-lg font-black text-white">{myPlayer?.bet || 0} <span className="text-[10px] text-rose-400 ml-1">◈</span></p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {state.gameState === "waiting" ? (
                            <div className="flex flex-col gap-3">
                                {state.players.size < 2 && (
                                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest text-center animate-pulse">
                                        Se necesitan al menos 2 jugadores
                                    </p>
                                )}
                                <button
                                    onClick={() => room.send("bet")}
                                    disabled={myPlayer?.status === "betting" || state.players.size < 2}
                                    className={`px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex flex-col items-center gap-1 ${myPlayer?.status === "betting"
                                            ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-400'
                                            : (state.players.size < 2
                                                ? 'bg-white/5 border border-white/10 text-white/20'
                                                : 'bg-rose-500 text-black shadow-[0_10px_30px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95')
                                        }`}
                                >
                                    <span>{myPlayer?.status === "betting" ? "¡Listo!" : "Unirse y Apostar"}</span>
                                    <span className="text-[8px] opacity-60">100 ◈</span>
                                </button>
                            </div>
                        ) : state.gameState === "tournament_finished" ? (
                            <div className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                                Fin del Torneo
                            </div>
                        ) : (
                            <>
                                <ControlButton
                                    label="Hit"
                                    description="Carta +"
                                    onClick={() => room.send("hit")}
                                    disabled={!isMyTurn || state.gameState !== "player_turn"}
                                    color="cyan"
                                />
                                <ControlButton
                                    label="Stand"
                                    description="Me planto"
                                    onClick={() => room.send("stand")}
                                    disabled={!isMyTurn || state.gameState !== "player_turn"}
                                    color="white"
                                />
                            </>
                        )}
                    </div>

                    {/* Round Status & Exit */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                            <Info size={14} className="text-white/20" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">
                                {state.gameState === "waiting" && (state.players.size < 2 ? "Esperando jugadores..." : "Esperando apuestas...")}
                                {state.gameState === "dealing" && "Repartiendo..."}
                                {state.gameState === "player_turn" && `Turno de: ${state.players?.get?.(state.currentTurn)?.name || '...'}`}
                                {state.gameState === "dealer_turn" && "Turno del Dealer..."}
                                {state.gameState === "finished" && "Ronda finalizada"}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-6 py-3 rounded-2xl text-[10px] font-black text-rose-500 uppercase tracking-widest transition-all"
                        >
                            Abandonar Mesa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlayerSeat({ player, isCurrent, isMe }) {
    const statusColor = player.status === 'win' ? 'text-emerald-400' : player.status === 'lose' || player.status === 'bust' ? 'text-rose-400' : 'text-cyan-400';

    return (
        <div className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all relative ${isCurrent ? 'bg-white/10 ring-1 ring-rose-500/30 shadow-[0_0_30px_rgba(0,0,0,0.4)]' : 'bg-black/20 opacity-80'}`}>
            {/* Round Wins Badge */}
            {player.roundWins > 0 && (
                <div className="absolute -top-1 -right-1 bg-amber-500 border-2 border-[#070b14] px-1.5 py-0.5 rounded-lg text-[9px] font-black text-black z-20 shadow-xl">
                    {player.roundWins}W
                </div>
            )}

            <div className="relative group">
                <img src={player.avatar} className={`w-12 h-12 rounded-2xl border-2 object-cover transition-all ${isCurrent ? 'border-rose-500 scale-110 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-white/10 opacity-40'}`} alt="U" />
                {player.status === "win" && <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1.5 shadow-lg shadow-emerald-500/40 border-2 border-[#070b14]"><Play size={10} className="text-black rotate-[-90deg]" /></div>}
            </div>

            <div className="flex flex-col items-center w-full min-w-0">
                <span className={`text-[9px] font-black uppercase tracking-widest mb-1 truncate w-full text-center ${isCurrent ? 'text-white' : 'text-white/20'}`}>
                    {isMe ? "Tú" : player.name.substring(0, 8)}
                </span>

                {/* Visual Cards representation */}
                <div className="flex gap-0.5 h-6">
                    {player?.cards?.length > 0 ? (
                        player.cards.map((_, i) => (
                            <div key={i} className="w-3.5 h-5 bg-white rounded-sm border border-neutral-200" />
                        ))
                    ) : (
                        <div className="w-8 h-1 bg-white/5 rounded-full mt-2" />
                    )}
                </div>

                {player.score > 0 && (
                    <div className={`mt-2 px-2 py-0.5 rounded-lg text-[10px] font-black bg-black/40 border ${statusColor === 'text-emerald-400' ? 'border-emerald-500/30' : statusColor === 'text-rose-400' ? 'border-rose-500/30' : 'border-white/10'} ${statusColor}`}>
                        {player.score}
                    </div>
                )}
            </div>
        </div>
    );
}

function PlayingCard({ card }) {
    if (card.isHidden) {
        return (
            <motion.div
                initial={{ rotateY: 0 }}
                className="w-12 h-18 sm:w-16 sm:h-24 bg-rose-900 rounded-lg border-2 border-white/20 shadow-xl flex items-center justify-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-20">
                    <Coins size={20} />
                </div>
            </motion.div>
        );
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

    return (
        <motion.div
            initial={{ scale: 0, y: 50, rotate: -20 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            className="w-12 h-18 sm:w-16 sm:h-24 bg-white rounded-lg border border-black/10 shadow-2xl flex flex-col p-2 relative"
        >
            <span className={`text-xs sm:text-base font-black leading-none ${isRed ? 'text-rose-600' : 'text-neutral-900'}`}>{card.rank}</span>
            <div className={`mt-auto ml-auto ${isRed ? 'text-rose-600' : 'text-neutral-900'}`}>
                {card.suit === 'hearts' && '♥'}
                {card.suit === 'diamonds' && '♦'}
                {card.suit === 'clubs' && '♣'}
                {card.suit === 'spades' && '♠'}
            </div>
        </motion.div>
    );
}

function ControlButton({ label, description, onClick, disabled, color }) {
    const colorClasses = {
        rose: "bg-rose-500 text-black shadow-rose-500/20",
        cyan: "bg-cyan-500 text-black shadow-cyan-500/20",
        amber: "bg-amber-500 text-black shadow-amber-500/20",
        white: "bg-white text-black shadow-white/20"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex flex-col items-center justify-center transition-all ${disabled
                ? 'opacity-20 grayscale border border-white/10'
                : `${colorClasses[color]} hover:scale-105 active:scale-95 shadow-2xl`}`}
        >
            <span className="text-[12px] sm:text-[14px] font-black uppercase tracking-widest">{label}</span>
            <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{description}</span>
        </button>
    );
}
