import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, User, Tv, Tv2, Zap, Layout, ChevronUp } from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import toast from 'react-hot-toast';

const SEAT_POSITIONS = [
    { x: 50, y: 85 },   // 0: abajo-centro
    { x: 80, y: 75 },   // 1: abajo-derecha
    { x: 92, y: 45 },   // 2: derecha
    { x: 75, y: 15 },   // 3: arriba-derecha
    { x: 50, y: 10 },  // 4: arriba-centro
    { x: 25, y: 15 },   // 5: arriba-izquierda
    { x: 8, y: 45 },   // 6: izquierda
    { x: 20, y: 75 },   // 7: abajo-izquierda
];

const BUY_IN = 500;
const BIG_BLIND = 20;

export default function PokerGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const { balance, deductCoins } = useEconomy();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const joinGame = async () => {
            try {
                const pokerRoom = await client.joinOrCreate("poker", {
                    userId: user?.id,
                    name: profile?.username || "Piloto",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });

                setRoom(pokerRoom);
                setState(pokerRoom.state);
                setConnecting(false);

                pokerRoom.onStateChange((newState) => {
                    setState(newState);
                    setTick(t => t + 1);
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error conectando a la mesa de Poker");
                onClose();
            }
        };

        joinGame();
        return () => { if (room) room.leave(); };
    }, []);

    const handleJoinSeat = async (seatIdx) => {
        if (!room || !state || !state.players) return;
        if (state.seats[seatIdx] !== "") return;

        // Already seated?
        let isAlreadySeated = false;
        state.players?.forEach(p => { if (p.identity === user.id) isAlreadySeated = true; });
        if (isAlreadySeated) return;

        if (balance < BUY_IN) {
            toast.error(`Necesitas ${BUY_IN} Starlys`);
            return;
        }

        const { success } = await deductCoins(BUY_IN, 'casino_bet', `Poker: ${roomName}`);
        if (!success) return;

        room.send("join_seat", {
            seatIdx,
            name: profile?.username || "Piloto",
            avatar: profile?.avatar_url,
            id: user.id,
            identity: user.id
        });
    };

    const handleAction = (action, amount = 0) => {
        room.send("action", { action, amount });
    };

    const handleStartHand = () => { room.send("start_hand"); };
    const handleNextRound = () => { room.send("next_round"); };
    const handleReset = () => { room.send("reset"); };
    const handleLeaveSeat = () => { room.send("leave_seat"); };

    if (connecting || !state) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#04120a]">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Abriendo mesa de Poker...
                </p>
            </div>
        );
    }

    const myPlayer = state.players?.get ? state.players.get(room.sessionId) : null;
    const isMeTurn = state.currentTurn === myPlayer?.seatIdx && state.gameState === 'betting';
    const seatedCount = state.players?.forEach ? Array.from(state.players.values()).length : 0;

    return (
        <div className="flex-1 flex flex-col relative bg-[#04120a] overflow-hidden text-white font-sans">
            {/* Ambient Shadow */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Coins size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Space Poker</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5 font-bold">Texas Hold'em • Blinds 10/20</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onToggleTheater} className="p-2.5 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all border border-white/5 hover:bg-white/10">
                        <Tv2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 relative flex items-center justify-center p-4">
                {/* The Felt Table */}
                <div className="w-full max-w-4xl aspect-[2/1] relative bg-emerald-900/40 rounded-[200px] border-[12px] border-emerald-950 shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_40px_100px_rgba(0,0,0,0.6)]">

                    {/* Inner Felt Detail */}
                    <div className="absolute inset-8 border border-white/5 rounded-[160px] pointer-events-none" />

                    {/* Pot & Community Cards */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 z-10">
                        <div className="flex flex-col items-center">
                            <div className="bg-black/60 backdrop-blur-xl px-5 py-2 rounded-full border border-emerald-500/30 flex items-center gap-2 shadow-2xl">
                                <Coins size={14} className="text-emerald-400" />
                                <span className="text-lg font-black text-white">◈{state.pot}</span>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/40 mt-1">Bote Total</span>
                        </div>

                        <div className="flex gap-2 min-h-[60px]">
                            {state.communityCards?.map((card, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, y: -20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="w-10 h-14 sm:w-12 sm:h-16 bg-white rounded-lg flex flex-col items-center justify-center shadow-2xl border border-black/10"
                                >
                                    <span className={`text-base font-black leading-none ${card.s === '♥' || card.s === '♦' ? 'text-rose-600' : 'text-gray-900'}`}>{card.v}</span>
                                    <span className={`text-xl leading-none ${card.s === '♥' || card.s === '♦' ? 'text-rose-600' : 'text-gray-900'}`}>{card.s}</span>
                                </motion.div>
                            ))}
                            {state.communityCards && Array.from({ length: 5 - state.communityCards.length }).map((_, i) => (
                                <div key={i} className="w-10 h-14 sm:w-12 sm:h-16 bg-black/20 rounded-lg border border-white/5 border-dashed" />
                            ))}
                        </div>

                        {state.lastAction && (
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 bg-black/20 px-4 py-1 rounded-full">{state.lastAction}</p>
                        )}
                    </div>

                    {/* Seats */}
                    {SEAT_POSITIONS.map((pos, i) => {
                        const sessionId = state.seats?.[i];
                        const player = (sessionId && state.players?.get) ? state.players.get(sessionId) : null;
                        const isTurn = state.currentTurn === i && state.gameState === 'betting';
                        const isMe = sessionId === room?.sessionId;

                        return (
                            <div
                                key={i}
                                className="absolute z-20"
                                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                {player ? (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
                                        <div className={`
                                            relative w-12 h-12 sm:w-16 sm:h-16 rounded-full border-[3px] transition-all
                                            ${isTurn ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] scale-110' : 'border-white/10'}
                                            ${player.folded ? 'opacity-40 grayscale filter' : ''}
                                        `}>
                                            <img src={player.avatar} className="w-full h-full object-cover rounded-full" />
                                            {isTurn && <div className="absolute inset-0 rounded-full border-4 border-amber-400/30 animate-ping" />}
                                            {player.bet > 0 && (
                                                <div className="absolute -bottom-2 -right-2 bg-black/80 px-2 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1 shadow-lg">
                                                    <span className="text-[8px] font-black text-emerald-400">◈{player.bet}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-black uppercase text-white tracking-widest truncate max-w-[80px]">{player.name}</span>
                                            <span className="text-[8px] font-bold text-emerald-400">◈{player.stack}</span>
                                        </div>
                                    </motion.div>
                                ) : (
                                    state.gameState === 'lobby' && !myPlayer ? (
                                        <button
                                            onClick={() => handleJoinSeat(i)}
                                            className="w-12 h-12 rounded-full bg-white/5 border-2 border-dashed border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all flex items-center justify-center group"
                                        >
                                            <User size={16} className="text-white/20 group-hover:text-emerald-400" />
                                        </button>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-black/20 border border-white/5" />
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Winner Modal Overlay */}
            <AnimatePresence>
                {state.winnerMessage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
                        <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-emerald-950/90 p-8 rounded-[2rem] border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.2)] text-center">
                            <Trophy size={48} className="text-amber-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-black uppercase tracking-widest text-white mb-2">{state.winnerMessage}</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-[0.5em]">La mesa espera la siguiente mano</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Panel */}
            <div className="flex-shrink-0 bg-black/60 border-t border-white/5 p-4 sm:p-6 backdrop-blur-2xl">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6">

                    {/* Player Info & Cards */}
                    {myPlayer && (
                        <div className="flex items-center gap-6 pr-6 border-r border-white/10">
                            <div className="flex gap-2">
                                {myPlayer.cards.length > 0 ? myPlayer.cards.map((card, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="w-14 h-20 bg-white rounded-xl flex flex-col items-center justify-center shadow-xl border border-black/10"
                                    >
                                        <span className={`text-lg font-black leading-none ${card.s === '♥' || card.s === '♦' ? 'text-rose-600' : 'text-gray-900'}`}>{card.v}</span>
                                        <span className={`text-2xl leading-none ${card.s === '♥' || card.s === '♦' ? 'text-rose-600' : 'text-gray-900'}`}>{card.s}</span>
                                    </motion.div>
                                )) : Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="w-14 h-20 bg-emerald-950/40 rounded-xl border border-white/10 flex items-center justify-center text-white/10 text-xl font-black">?</div>
                                ))}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-emerald-500 tracking-[0.3em]">Tu Stack</span>
                                <span className="text-xl font-black text-white">◈{myPlayer.stack}</span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex-1 flex flex-wrap gap-2 justify-center md:justify-start">
                        {isMeTurn ? (
                            <>
                                <ActionBtn label="Fold" onClick={() => handleAction('fold')} color="rose" />
                                <ActionBtn label="Check" onClick={() => handleAction('check')} />
                                <ActionBtn label={`Call ${BIG_BLIND}◈`} onClick={() => handleAction('call', BIG_BLIND)} color="emerald" />
                                <ActionBtn label={`Raise ${BIG_BLIND * 2}◈`} onClick={() => handleAction('raise', BIG_BLIND * 2)} color="amber" />
                            </>
                        ) : myPlayer && state.gameState === 'betting' ? (
                            <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 text-center block">Esperando turno de otros pilotos...</span>
                            </div>
                        ) : state.gameState === 'lobby' ? (
                            <div className="flex items-center gap-4">
                                {myPlayer && (
                                    <>
                                        {seatedCount >= 2 && <button onClick={handleStartHand} className="px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl">Repartir Cartas</button>}
                                        <button onClick={handleLeaveSeat} className="px-6 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-black uppercase tracking-widest text-[10px] hover:bg-rose-500/20 transition-all">Levantarse</button>
                                    </>
                                )}
                                {!myPlayer && <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Selecciona un asiento vacío en la mesa para jugar</span>}
                            </div>
                        ) : state.gameState === 'showdown' ? (
                            <button onClick={handleNextRound} className="px-8 py-3 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl">
                                {state.bettingRound < 3 ? "Siguiente Ronda" : "Showdown Final"}
                            </button>
                        ) : null}
                    </div>

                    {/* Reset Button (Debug/Admin) */}
                    {state.gameState !== 'lobby' && (
                        <button onClick={handleReset} className="p-3 rounded-xl bg-white/5 text-white/20 hover:text-white/40 border border-white/5">
                            <Layout size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ActionBtn({ label, onClick, color = "default" }) {
    const schemas = {
        default: "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white",
        rose: "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20",
        emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
        amber: "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105"
    };

    return (
        <button
            onClick={onClick}
            className={`px-6 py-3 rounded-2xl border font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${schemas[color]}`}
        >
            {label}
        </button>
    );
}

function Trophy(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
    );
}
