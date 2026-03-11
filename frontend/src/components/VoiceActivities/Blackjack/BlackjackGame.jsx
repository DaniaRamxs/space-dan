import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Coins, User, Shield, Info, Crown, Timer, Trophy, Target, Zap } from 'lucide-react';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function BlackjackGame({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [turnTimer, setTurnTimer] = useState(30);
    const [selectedBet, setSelectedBet] = useState(100);
    const [showStats, setShowStats] = useState(false);

    // Constants for game rules
    const BET_AMOUNTS = [50, 100, 200];
    const TURN_TIME_LIMIT = 30;
    const DEALER_STAND_LIMIT = 17;
    const BLACKJACK_PAYOUT = 2.5;
    const MAX_ROUNDS = 10;

    // Core game logic functions
    const calculateScore = useCallback((cards) => {
        if (!cards || cards.length === 0) return 0;
        
        let score = 0;
        let aces = 0;
        
        cards.forEach(card => {
            if (card.isHidden) return;
            
            if (card.rank === 'A') {
                aces += 1;
                score += 11;
            } else if (['K', 'Q', 'J'].includes(card.rank)) {
                score += 10;
            } else {
                score += parseInt(card.rank);
            }
        });
        
        // Adjust for aces
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }
        
        return score;
    }, []);

    const checkBlackjack = useCallback((cards) => {
        if (!cards || cards.length !== 2) return false;
        const score = calculateScore(cards);
        return score === 21;
    }, [calculateScore]);

    const isBust = useCallback((cards) => {
        return calculateScore(cards) > 21;
    }, [calculateScore]);

    const determineWinner = useCallback((playerCards, dealerCards) => {
        const playerScore = calculateScore(playerCards);
        const dealerScore = calculateScore(dealerCards);
        
        // Check for busts
        const playerBust = isBust(playerCards);
        const dealerBust = isBust(dealerCards);
        
        // Check for blackjacks
        const playerBlackjack = checkBlackjack(playerCards);
        const dealerBlackjack = checkBlackjack(dealerCards);
        
        // Determine winner
        if (playerBust && dealerBust) return 'tie';
        if (playerBust) return 'dealer';
        if (dealerBust) return 'player';
        
        if (playerBlackjack && !dealerBlackjack) return 'player';
        if (dealerBlackjack && !playerBlackjack) return 'dealer';
        if (playerBlackjack && dealerBlackjack) return 'tie';
        
        // Compare scores
        if (playerScore > dealerScore) return 'player';
        if (dealerScore > playerScore) return 'dealer';
        return 'tie';
    }, [calculateScore, isBust, checkBlackjack]);

    // Enhanced action handlers (MUST be before any conditional returns)
    const handleBet = useCallback((amount) => {
        if (room && amount > 0) {
            room.send("bet", { amount });
            toast.success(`🎰 Apostaste ${amount} ◈`, {
                icon: '💰',
                style: { background: '#04120a', color: '#fff', border: '1px solid #10b981' },
            });
        }
    }, [room]);

    const handleHit = useCallback(() => {
        if (room && isMyTurn) {
            room.send("hit");
            const myPlayer = state.players?.get(room.sessionId);
            const newScore = calculateScore([...(myPlayer?.cards || []), { rank: 'A', suit: 'spades' }]);
            
            if (newScore > 21) {
                toast.error('💥 Te pasaste de 21! ¡Bust!', {
                    icon: '💥',
                    style: { background: '#dc2626', color: '#fff' },
                });
            } else if (newScore === 21) {
                toast.success('🎯 ¡21! ¡Blackjack!', {
                    icon: '🎯',
                    style: { background: '#10b981', color: '#fff' },
                });
            }
        }
    }, [room, isMyTurn, state, calculateScore]);

    const handleStand = useCallback(() => {
        if (room && isMyTurn) {
            room.send("stand");
            toast('✅ Te plantaste', {
                icon: '✅',
                style: { background: '#04120a', color: '#fff', border: '1px solid #10b981' },
            });
        }
    }, [room, isMyTurn]);

    const handleDoubleDown = useCallback(() => {
        if (room && isMyTurn) {
            const myPlayer = state.players?.get(room.sessionId);
            if (myPlayer?.cards?.length === 2) {
                room.send("double_down");
                toast('🎲 ¡Doble o Nada!', {
                    icon: '🎲',
                    style: { background: '#f59e0b', color: '#000' },
                });
            } else {
                toast.error('❌ Solo puedes doblar con 2 cartas');
            }
        }
    }, [room, isMyTurn, state]);

    const handleSplit = useCallback(() => {
        if (room && isMyTurn) {
            const myPlayer = state.players?.get(room.sessionId);
            if (myPlayer?.cards?.length === 2 && myPlayer.cards[0].rank === myPlayer.cards[1].rank) {
                room.send("split");
                toast('✂️ ¡Cartas divididas!', {
                    icon: '✂️',
                    style: { background: '#8b5cf6', color: '#fff' },
                });
            } else {
                toast.error('❌ Solo puedes dividir cartas iguales');
            }
        }
    }, [room, isMyTurn, state]);

    const handleInsurance = useCallback(() => {
        if (room && isMyTurn) {
            const dealerCard = state.dealer?.cards?.[0];
            if (dealerCard?.rank === 'A') {
                room.send("insurance");
                toast('🛡️ Seguro activado', {
                    icon: '🛡️',
                    style: { background: '#06b6d4', color: '#fff' },
                });
            } else {
                toast.error('❌ Solo puedes asegurar contra As');
            }
        }
    }, [room, isMyTurn, state]);

    const handleSurrender = useCallback(() => {
        if (room && isMyTurn) {
            const myPlayer = state.players?.get(room.sessionId);
            if (myPlayer?.cards?.length === 2) {
                room.send("surrender");
                toast('🏳️ Te rendiste', {
                    icon: '🏳️',
                    style: { background: '#6b7280', color: '#fff' },
                });
            } else {
                toast.error('❌ Solo puedes rendirte con 2 cartas');
            }
        }
    }, [room, isMyTurn, state]);

    // Timer management (MUST be before any conditional returns)
    useEffect(() => {
        if (isMyTurn && state.phase === 'playing' && turnTimer > 0) {
            const timer = setTimeout(() => {
                setTurnTimer(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setTurnTimer(TURN_TIME_LIMIT);
        }
    }, [isMyTurn, state.phase, turnTimer]);

    useEffect(() => {
        let activeRoom = null;
        const joinGame = async () => {
            try {
                const bjRoom = await client.joinOrCreate('blackjack', {
                    userId: user?.id || profile?.id,
                    name: profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });
                activeRoom = bjRoom;
                setRoom(bjRoom);
                // Spread para que React detecte un nuevo objeto y re-renderice el HUD
                setState({ ...bjRoom.state });
                setConnecting(false);

                bjRoom.onStateChange((newState) => {
                    // Spread crea nuevo objeto literal — React detecta cambio y re-renderiza.
                    // Los hijos (players MapSchema, dealer, etc.) siguen siendo las mismas
                    // instancias de Colyseus Schema con sus métodos .get(), .values(), etc.
                    setState({ ...newState });
                });

            } catch (err) {
                console.error('[Blackjack] Error al conectar:', err?.message);
                toast.error('Error conectando al servidor de Blackjack');
                onClose();
            }
        };

        joinGame();
        return () => { if (activeRoom) activeRoom.leave(); };
    }, []);

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

    // Declare variables AFTER hooks but before JSX
    const myPlayer = state.players?.get(room.sessionId);
    const isMyTurn = state.currentTurn === room.sessionId;

    // Timer management (single instance)
    useEffect(() => {
        if (isMyTurn && state.phase === 'playing' && turnTimer > 0) {
            const timer = setTimeout(() => {
                setTurnTimer(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setTurnTimer(TURN_TIME_LIMIT);
        }
    }, [isMyTurn, state.phase, turnTimer]);

    return (
        <div className="flex-1 flex flex-col relative bg-[#070b14] overflow-hidden text-white font-sans">
            {/* Table Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-3 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-50">
                <div className="flex items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                            <Coins size={14} className="text-rose-400" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest leading-none truncate">Arena de Blackjack</h2>
                            <p className="hidden xs:block text-[7px] sm:text-[8px] text-white/30 uppercase tracking-widest mt-1 truncate">10 Rondas • Pozo Acumulado</p>
                        </div>
                    </div>

                    {/* Tournament Progress - Compact on mobile */}
                    <div className="flex flex-col gap-1 min-w-[60px] sm:min-w-[120px]">
                        <div className="flex justify-between items-center text-[7px] sm:text-[8px] font-black uppercase tracking-[0.1em] text-white/40">
                            <span className="truncate">Ronda {state.roundsPlayed}/{state.maxRounds}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                animate={{ width: `${(state.roundsPlayed / state.maxRounds) * 100}%` }}
                                className="h-full bg-rose-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                        <span className="text-[9px] sm:text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">{state.pot} ◈</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 sm:p-2 text-white/20 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Game Table (Green Felt Style) */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-4 sm:p-10 overflow-y-auto overflow-x-hidden">
                <div className="absolute inset-x-4 sm:inset-x-10 top-20 bottom-20 bg-emerald-900/20 rounded-[4rem] sm:rounded-[10rem] border border-emerald-500/10 blur-3xl -z-10" />

                {/* Dealer Area */}
                <div className="flex flex-col items-center mb-8 sm:mb-16 gap-2 sm:gap-3">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10 mb-1 sm:mb-2">
                            <Shield size={16} className="text-emerald-400 opacity-50" />
                        </div>
                        <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-emerald-400/60">Crupier</span>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 min-h-[80px] sm:min-h-[100px] justify-center">
                        {state.dealer?.cards?.map((card, i) => (
                            <PlayingCard key={`dealer-${i}`} card={card} />
                        ))}
                    </div>
                    {(state.dealer?.score || 0) > 0 && (
                        <div className="bg-black/60 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-emerald-500/20 text-[9px] sm:text-[10px] font-black text-emerald-400 shadow-xl">
                            {state.dealer.score}
                        </div>
                    )}
                </div>

                {/* Player Seats - More compact on mobile */}
                <div className="w-full max-w-4xl grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-4 relative">
                    {state.players && Array.from(state.players.values()).map((p) => (
                        <PlayerSeat key={p.sessionId} player={p} isCurrent={state.currentTurn === p.sessionId} isMe={p.sessionId === room.sessionId} isHost={p.sessionId === state.hostId} />
                    ))}
                </div>

                {/* Tournament End Celebration Overlay */}
                <AnimatePresence>
                    {state.phase === "tournament_finished" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-6"
                        >
                            <div className="bg-[#050518]/90 border border-amber-500/20 p-12 rounded-[4rem] shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center max-w-md w-full relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                                <Trophy size={64} className="text-amber-400 mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
                                <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2">Final del Torneo</h3>
                                <p className="text-[11px] text-amber-500 font-bold uppercase tracking-[0.3em] mb-8">El pozo de {state.pot} ◈ ha sido repartido</p>

                                <div className="space-y-3 w-full">
                                    {Array.from(state.players.values())
                                        .sort((a, b) => b.roundWins - a.roundWins)
                                        .slice(0, 3)
                                        .map((p, index) => (
                                            <div key={p.sessionId} className={`flex items-center gap-4 p-4 rounded-3xl border ${index === 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/5'}`}>
                                                <span className={`text-xl font-black ${index === 0 ? 'text-amber-400' : 'text-white/20'}`}>{index + 1}</span>
                                                <img src={p.avatar} className="w-10 h-10 rounded-xl border border-white/10" alt="" />
                                                <div className="text-left flex-1">
                                                    <p className="text-[11px] font-black text-white uppercase truncate flex items-center gap-1">
                                                        {p.sessionId === state.hostId && <Crown size={9} className="text-amber-400 flex-shrink-0" />}
                                                        @{p.username}
                                                    </p>
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
                        {state.phase === "waiting" ? (
                            <div className="flex flex-col gap-3">
                                {state.players?.size < 2 && (
                                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest text-center animate-pulse">
                                        Se necesitan al menos 2 jugadores
                                    </p>
                                )}
                                <button
                                    onClick={() => room.send("bet")}
                                    disabled={myPlayer?.status === "betting" || (state?.players?.size ?? 0) < 2}
                                    className={`px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex flex-col items-center gap-1 ${myPlayer?.status === "betting"
                                        ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-emerald-500 text-black hover:bg-emerald-400 border-2 border-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                                    }`}
                                    title="Apostar 100 ◈ para unirte a la ronda"
                                >
                                    <span>{myPlayer?.status === "betting" ? "¡Listo!" : "Unirse y Apostar"}</span>
                                    <span className="text-[8px] opacity-60">100 ◈</span>
                                </button>
                            </div>
                        ) : state.phase === "tournament_finished" ? (
                            <div className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white/20 uppercase tracking-widest flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
                                Fin del Torneo
                            </div>
                        ) : (
                            <>
                                <ControlButton
                                    label="Pedir"
                                    description="Carta +"
                                    onClick={() => room.send("hit")}
                                    disabled={!isMyTurn || state.phase !== "playing"}
                                    color="cyan"
                                    title="Pedir otra carta para acercarte a 21"
                                />
                                <ControlButton
                                    label="Plantar"
                                    description="Me planto"
                                    onClick={() => room.send("stand")}
                                    disabled={!isMyTurn || state.phase !== "playing"}
                                    color="white"
                                    title="Mantener tus cartas actuales y terminar tu turno"
                                />
                            </>
                        )}
                    </div>

                    {/* Round Status & Exit */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Tips Section */}
                        <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                            <Info size={14} className="text-amber-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 whitespace-nowrap">
                                {(() => {
                                    if (isMyTurn && state.phase === "playing") return "💡 Tu turno: Pide cartas o planta";
                                    if (state.phase === "waiting") return "💡 Espera a 2+ jugadores para apostar";
                                    if (state.phase === "dealing") return "💡 Repartiendo cartas...";
                                    if (state.phase === "dealer_turn") return "💡 Turno del crupier";
                                    if (state.phase === "finished") return "💡 Ronda finalizada";
                                    if (!isMyTurn && state.phase === "playing") return "💡 Espera tu turno...";
                                    return "💡 Preparando juego...";
                                })()}
                            </span>
                        </div>
                        
                        {/* Status Info */}
                        <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap">
                                {state.phase === "waiting" && ((state?.players?.size ?? 0) < 2 ? "Esperando jugadores..." : "Esperando apuestas...")}
                                {state.phase === "dealing" && "Repartiendo..."}
                                {state.phase === "player_turn" && `Turno de: ${state.players?.get?.(state.currentTurn)?.username || '...'}`}
                                {state.phase === "dealer_turn" && "Turno del Dealer..."}
                                {state.phase === "finished" && "Ronda finalizada"}
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

function PlayerSeat({ player, isCurrent, isMe, isHost }) {
    const statusColor = player.status === 'win' ? 'text-emerald-400' : player.status === 'lose' || player.status === 'bust' ? 'text-rose-400' : 'text-cyan-400';

    return (
        <div className={`flex flex-col items-center gap-1.5 sm:gap-3 p-2 sm:p-4 rounded-2xl sm:rounded-3xl transition-all relative ${isCurrent ? 'bg-white/10 ring-1 ring-rose-500/30 shadow-[0_0_30px_rgba(0,0,0,0.4)]' : 'bg-black/20 opacity-80'}`}>
            {/* Round Wins Badge */}
            {player.roundWins > 0 && (
                <div className="absolute -top-1 -right-1 bg-amber-500 border border-[#070b14] px-1 sm:px-1.5 py-0.5 rounded-md sm:rounded-lg text-[7px] sm:text-[9px] font-black text-black z-20 shadow-xl">
                    {player.roundWins}W
                </div>
            )}

            <div className="relative group">
                <img src={player.avatar} className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl border-2 object-cover transition-all ${isCurrent ? 'border-rose-500 scale-105 sm:scale-110 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'border-white/10 opacity-40'}`} alt="U" />
                {player.status === "win" && <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1 sm:p-1.5 shadow-lg shadow-emerald-500/40 border border-[#070b14]"><Play size={8} className="text-black rotate-[-90deg]" /></div>}
            </div>

            <div className="flex flex-col items-center w-full min-w-0">
                <span className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 sm:mb-1 truncate w-full text-center flex items-center justify-center gap-1 ${isCurrent ? 'text-white' : 'text-white/20'}`}>
                    {isMe ? "Tú" : (player.username?.length > 8 ? player.username?.substring(0, 8) + '..' : player.username) || "Anon"}
                </span>

                {player.score > 0 && (
                    <div className={`px-1 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black bg-black/40 border ${statusColor === 'text-emerald-400' ? 'border-emerald-500/30' : statusColor === 'text-rose-400' ? 'border-rose-500/30' : 'border-white/10'} ${statusColor}`}>
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
                whileHover={{ rotateY: 20, rotateX: 10, scale: 1.05 }}
                className="w-12 h-[4.5rem] sm:w-16 sm:h-24 bg-rose-900 rounded-lg border-2 border-white/20 shadow-xl flex items-center justify-center relative overflow-hidden group/card"
                style={{ perspective: '1000px' }}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-transparent opacity-50" />
                <div className="absolute inset-0 border-[4px] border-white/5 m-1 rounded-md" />
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-30 group-hover/card:scale-110 group-hover/card:opacity-60 transition-all">
                    <Shield size={20} className="text-white" />
                </div>
            </motion.div>
        );
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

    return (
        <motion.div
            initial={{ scale: 0, y: 50, rotate: -20 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            whileHover={{ y: -10, scale: 1.1, rotateY: 10 }}
            className="w-12 h-[4.5rem] sm:w-16 sm:h-24 bg-white rounded-lg border border-black/10 shadow-2xl flex flex-col p-1.5 sm:p-2 relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-12 h-12 bg-black/[0.02] rounded-full -mr-6 -mt-6" />
            <span className={`text-[10px] sm:text-base font-black leading-none ${isRed ? 'text-rose-600' : 'text-neutral-900'}`}>{card.rank}</span>
            <div className={`mt-auto ml-auto text-sm sm:text-xl font-bold opacity-80 ${isRed ? 'text-rose-600' : 'text-neutral-900'}`}>
                {card.suit === 'hearts' && '♥'}
                {card.suit === 'diamonds' && '♦'}
                {card.suit === 'clubs' && '♣'}
                {card.suit === 'spades' && '♠'}
            </div>
            {/* Watermark suit symbol in the background */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl sm:text-4xl opacity-[0.03] pointer-events-none ${isRed ? 'text-rose-600' : 'text-black'}`}>
                {card.suit === 'hearts' && '♥'}
                {card.suit === 'diamonds' && '♦'}
                {card.suit === 'clubs' && '♣'}
                {card.suit === 'spades' && '♠'}
            </div>
        </motion.div>
    );
}

function ControlButton({ label, description, onClick, disabled, color, title }) {
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
            title={title}
            className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center transition-all ${disabled
                ? 'opacity-20 grayscale border border-white/10'
                : `${colorClasses[color]} hover:scale-105 active:scale-95 shadow-2xl`}`}
        >
            <span className="text-[10px] sm:text-[14px] font-black uppercase tracking-widest leading-none">{label}</span>
            <span className="text-[6px] sm:text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1 sm:mt-1.5">{description}</span>
        </button>
    );
}
