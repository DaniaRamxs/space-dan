import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, User, Tv, Tv2 } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';

const MAX_SEATS = 8;
const BUY_IN = 500;
const BIG_BLIND = 20;
const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Posiciones de los 8 asientos alrededor del óvalo (% del contenedor)
const SEAT_POSITIONS = [
    { x: 50, y: 90 },   // 0: abajo-centro
    { x: 75, y: 80 },   // 1: abajo-derecha
    { x: 94, y: 53 },   // 2: derecha
    { x: 78, y: 14 },   // 3: arriba-derecha
    { x: 50, y: 4 },   // 4: arriba-centro
    { x: 22, y: 14 },   // 5: arriba-izquierda
    { x: 6, y: 53 },   // 6: izquierda
    { x: 25, y: 80 },   // 7: abajo-izquierda
];

function createDeck() {
    const deck = [];
    SUITS.forEach(s => VALUES.forEach(v => deck.push({ v, s })));
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export default function HoldemTable({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const { balance, deductCoins } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    const [phase, setPhase] = useState('lobby');
    // seats: Array(8) — null = vacío, objeto = jugador sentado
    const [seats, setSeats] = useState(Array(MAX_SEATS).fill(null));
    const [pot, setPot] = useState(0);
    const [communityCards, setCommunityCards] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(null); // índice de asiento
    const [myCards, setMyCards] = useState([]);
    const [lastAction, setLastAction] = useState(null);
    const [bettingRound, setBettingRound] = useState(0); // 0=preflop,1=flop,2=turn,3=river
    const [deckRef] = useState({ current: [] });

    const channelRef = useRef(null);
    const syncRef = useRef({ phase, seats, pot, communityCards, currentTurn, lastAction, bettingRound });

    useEffect(() => {
        syncRef.current = { phase, seats, pot, communityCards, currentTurn, lastAction, bettingRound };
    }, [phase, seats, pot, communityCards, currentTurn, lastAction, bettingRound]);

    // Leader (host)
    const allParticipants = useMemo(() => {
        if (!localParticipant) return participants;
        return [localParticipant, ...participants];
    }, [localParticipant, participants]);

    const sortedParticipants = useMemo(() =>
        [...allParticipants].sort((a, b) => (a.identity || '').localeCompare(b.identity || '')),
        [allParticipants]
    );

    const isHost = localParticipant?.identity === sortedParticipants[0]?.identity;
    const mySeatIdx = seats.findIndex(s => s?.identity === localParticipant?.identity);
    const isSeated = mySeatIdx >= 0;
    const seatedPlayers = seats.map((s, i) => s ? { ...s, seatIdx: i } : null).filter(Boolean);
    const isMyTurn = currentTurn === mySeatIdx && phase === 'betting';

    // Realtime
    useEffect(() => {
        if (!roomName || !user) return;

        const channelName = `poker8-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'holdem_state' }, ({ payload }) => {
                if (payload.phase !== undefined) setPhase(payload.phase);
                if (payload.seats !== undefined) setSeats(payload.seats);
                if (payload.pot !== undefined) setPot(payload.pot);
                if (payload.communityCards !== undefined) setCommunityCards(payload.communityCards);
                if (payload.currentTurn !== undefined) setCurrentTurn(payload.currentTurn);
                if (payload.lastAction !== undefined) setLastAction(payload.lastAction);
                if (payload.bettingRound !== undefined) setBettingRound(payload.bettingRound);
            })
            .on('broadcast', { event: 'holdem_cards' }, ({ payload }) => {
                if (payload.target === localParticipant?.identity) setMyCards(payload.cards);
            })
            .on('broadcast', { event: 'holdem_seat_req' }, ({ payload }) => {
                if (isHost) processSeatRequest(payload);
            })
            .on('broadcast', { event: 'holdem_sync_req' }, () => {
                if (isHost) broadcast('holdem_state', syncRef.current);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.send({ type: 'broadcast', event: 'holdem_sync_req', payload: {} });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [roomName, user, isHost]);

    const broadcast = (event, payload) => {
        channelRef.current?.send({ type: 'broadcast', event, payload });
    };

    const processSeatRequest = ({ seatIdx, identity, name, avatar, id }) => {
        setSeats(prev => {
            if (prev[seatIdx] !== null) return prev;
            const next = [...prev];
            next[seatIdx] = { identity, name, avatar, stack: BUY_IN, folded: false, bet: 0, id };
            broadcast('holdem_state', { seats: next });
            return next;
        });
    };

    const requestSeat = async (seatIdx) => {
        if (seats[seatIdx] !== null || isSeated) return;
        if (balance < BUY_IN) return alert('Necesitas 500◈ Starlys para el Buy-In.');
        const { success } = await deductCoins(BUY_IN, 'casino_bet', `Poker: ${roomName}`);
        if (!success) return;
        broadcast('holdem_seat_req', {
            seatIdx,
            identity: localParticipant.identity,
            name: profile?.username || 'Piloto',
            avatar: profile?.avatar_url,
            id: user.id
        });
    };

    const startHand = () => {
        if (!isHost || seatedPlayers.length < 2) return;
        const deck = createDeck();
        let idx = 0;
        const newSeats = seats.map(s => s ? { ...s, folded: false, bet: 0 } : null);

        seatedPlayers.forEach(({ identity }) => {
            broadcast('holdem_cards', { target: identity, cards: [deck[idx++], deck[idx++]] });
        });

        deckRef.current = deck.slice(idx);
        const firstTurn = seatedPlayers[0].seatIdx;
        const updates = {
            phase: 'betting', seats: newSeats, pot: 0, communityCards: [],
            currentTurn: firstTurn, lastAction: { name: 'Dealer', action: 'Nueva mano' }, bettingRound: 0,
        };
        setPhase('betting'); setSeats(newSeats); setPot(0); setCommunityCards([]);
        setCurrentTurn(firstTurn); setLastAction(updates.lastAction); setBettingRound(0); setMyCards([]);
        broadcast('holdem_state', updates);
    };

    const revealCommunity = () => {
        if (!isHost || gameState !== 'betting') return;
        const d = deckRef.current;
        const round = bettingRound + 1;
        let newCards;
        if (round === 1) newCards = d.slice(0, 3);
        else if (round === 2) newCards = [...communityCards, d[3]];
        else if (round === 3) newCards = [...communityCards, d[4]];
        else { broadcast('holdem_state', { phase: 'showdown' }); setPhase('showdown'); return; }

        const activeIdx = seatedPlayers.find(p => !p.folded)?.seatIdx ?? seatedPlayers[0].seatIdx;
        const roundNames = ['', 'Flop', 'Turn', 'River'];
        const updates = { communityCards: newCards, bettingRound: round, currentTurn: activeIdx, lastAction: { name: 'Dealer', action: roundNames[round] } };
        setCommunityCards(newCards); setBettingRound(round); setCurrentTurn(activeIdx); setLastAction(updates.lastAction);
        broadcast('holdem_state', updates);
    };

    const handleAction = (action, amount = 0) => {
        if (!isMyTurn) return;
        const newSeats = seats.map(s => s ? { ...s } : null);
        const me = newSeats[mySeatIdx];
        if (!me) return;

        if (action === 'fold') me.folded = true;
        if (action === 'call' || action === 'raise') { me.stack = Math.max(0, me.stack - amount); me.bet = (me.bet || 0) + amount; }

        const active = newSeats.map((s, i) => ({ s, i })).filter(({ s }) => s && !s.folded).map(({ i }) => i);
        const pos = active.indexOf(mySeatIdx);
        const nextTurn = active[(pos + 1) % active.length];
        const newPot = pot + amount;

        setSeats(newSeats); setPot(newPot); setCurrentTurn(nextTurn); setLastAction({ name: me.name, action, amount });
        broadcast('holdem_state', { seats: newSeats, pot: newPot, currentTurn: nextTurn, lastAction: { name: me.name, action, amount } });
    };

    const resetTable = () => {
        const updates = { phase: 'lobby', seats: Array(MAX_SEATS).fill(null), pot: 0, communityCards: [], currentTurn: null, lastAction: null, bettingRound: 0 };
        setPhase('lobby'); setSeats(updates.seats); setPot(0); setCommunityCards([]);
        setCurrentTurn(null); setLastAction(null); setBettingRound(0); setMyCards([]);
        broadcast('holdem_state', updates);
    };

    const getCardColor = (suit) => (suit === '♥' || suit === '♦') ? 'text-rose-600' : 'text-gray-900';
    const roundLabels = ['Revelar Flop', 'Revelar Turn', 'Revelar River', 'Showdown'];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full relative ${isTheater
                ? 'h-full bg-[#04120a] flex flex-col'
                : 'bg-[#050510]/95 backdrop-blur-3xl border border-rose-500/20 rounded-[2.5rem] mt-4 shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden'
                }`}
        >
            {/* ── Header ── */}
            <div className={`flex-shrink-0 flex items-center justify-between ${isTheater ? 'px-5 sm:px-8 py-4' : 'px-5 sm:px-7 py-4 border-b border-white/5'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                        <Coins size={16} className="text-rose-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-widest text-xs sm:text-sm leading-tight">Texas Hold'em</h3>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest">Hasta 8 jugadores · Buy-in 500◈ · Blinds 10/20</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {onToggleTheater && (
                        <button
                            onClick={onToggleTheater}
                            title={isTheater ? 'Vista Normal' : 'Pantalla Completa'}
                            className={`p-2 rounded-full transition-all ${isTheater ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 'bg-white/5 text-white/30 hover:text-white hover:bg-white/10'}`}
                        >
                            {isTheater ? <Tv2 size={16} /> : <Tv size={16} />}
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* ── Mesa ── */}
            <div className={`${isTheater ? 'flex-1 relative overflow-hidden px-3 sm:px-8 lg:px-16 py-2' : 'relative'}`}
                style={!isTheater ? { paddingBottom: '64%' } : undefined}>

                <div className={isTheater ? 'absolute inset-0' : 'absolute inset-0'}>
                    {/* Fieltro de la mesa */}
                    <div className="absolute inset-[4%] rounded-[50%] bg-gradient-to-b from-emerald-800/60 to-emerald-900/80 border-4 border-emerald-700/40 shadow-[inset_0_0_80px_rgba(0,0,0,0.7),0_0_60px_rgba(0,0,0,0.5)]" />
                    <div className="absolute inset-[5.5%] rounded-[50%] border border-emerald-600/15 pointer-events-none" />

                    {/* Centro: bote + cartas comunitarias */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10 pointer-events-none">
                        {/* Bote */}
                        <div className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-rose-500/30 flex items-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                            <Coins size={11} className="text-rose-400" />
                            <span className="text-xs sm:text-sm font-black text-rose-400">◈ {pot}</span>
                        </div>

                        {/* Cartas comunitarias */}
                        <div className="flex gap-1 sm:gap-1.5">
                            {communityCards.length > 0
                                ? communityCards.map((c, i) => (
                                    <motion.div key={i} initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                                        className="w-7 h-10 sm:w-10 sm:h-14 bg-white rounded-md flex flex-col items-center justify-center border border-white/30 shadow-lg"
                                    >
                                        <span className={`text-[10px] sm:text-sm font-black leading-none ${getCardColor(c.s)}`}>{c.v}</span>
                                        <span className={`text-xs sm:text-base leading-none ${getCardColor(c.s)}`}>{c.s}</span>
                                    </motion.div>
                                ))
                                : [1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="w-7 h-10 sm:w-10 sm:h-14 bg-emerald-900/50 rounded-md border border-white/5" />
                                ))
                            }
                        </div>

                        {/* Última acción */}
                        {lastAction && (
                            <p className="text-[8px] sm:text-[9px] text-white/40 uppercase font-black tracking-widest text-center bg-black/30 px-2 py-0.5 rounded-full">
                                {lastAction.name}: {lastAction.action}{lastAction.amount > 0 ? ` ◈${lastAction.amount}` : ''}
                            </p>
                        )}

                        {gameState === 'showdown' && (
                            <div className="bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse">
                                Showdown — Mostrar cartas
                            </div>
                        )}
                    </div>

                    {/* ── Asientos ── */}
                    {SEAT_POSITIONS.map((pos, seatIdx) => {
                        const player = seats[seatIdx];
                        const isTurn = currentTurn === seatIdx && gameState === 'betting';
                        const isMe = player?.identity === localParticipant?.identity;
                        const isEmpty = !player;

                        return (
                            <div
                                key={seatIdx}
                                className="absolute z-20"
                                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                            >
                                {player ? (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`flex flex-col items-center gap-0.5 ${player.folded ? 'opacity-35 grayscale' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className={`relative w-9 h-9 sm:w-11 sm:h-11 lg:w-13 lg:h-13 rounded-full border-2 overflow-hidden bg-black/60 transition-all ${isTurn ? 'border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.6)] scale-110' :
                                            isMe ? 'border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'border-white/20'
                                            }`}>
                                            <img src={player.avatar || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                                            {isTurn && <div className="absolute inset-0 rounded-full border-2 border-amber-300/60 animate-ping" />}
                                        </div>

                                        {/* Nombre + stack */}
                                        <div className={`bg-black/85 px-1.5 py-0.5 rounded-md border text-center max-w-[72px] ${isMe ? 'border-rose-500/40' : 'border-white/10'}`}>
                                            <p className="text-[7px] sm:text-[8px] font-black text-white uppercase truncate leading-tight">{isMe ? 'Tú' : player.name}</p>
                                            <p className="text-[7px] text-amber-400 font-black leading-tight">◈{player.stack}</p>
                                        </div>

                                        {isTurn && (
                                            <span className="bg-amber-400 text-black text-[6px] sm:text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase animate-bounce">TURNO</span>
                                        )}
                                        {player.bet > 0 && (
                                            <span className="text-[7px] text-rose-300 font-black bg-black/60 px-1 py-0.5 rounded-full border border-rose-500/20">◈{player.bet}</span>
                                        )}
                                    </motion.div>
                                ) : isEmpty && gameState === 'lobby' && !isSeated ? (
                                    <button
                                        onClick={() => requestSeat(seatIdx)}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 border border-dashed border-white/20 hover:bg-emerald-900/40 hover:border-emerald-500/40 transition-all flex items-center justify-center group"
                                        title="Tomar asiento"
                                    >
                                        <User size={13} className="text-white/20 group-hover:text-emerald-400 transition-colors" />
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/20 border border-dashed border-white/8 flex items-center justify-center">
                                        <User size={11} className="text-white/10" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Panel inferior: mi mano + controles ── */}
            <div className={`flex-shrink-0 ${isTheater ? 'px-4 sm:px-8 py-3 sm:py-4 border-t border-white/5 bg-black/20' : 'px-5 sm:px-7 py-4 border-t border-white/5'}`}>
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 max-w-3xl mx-auto">

                    {/* Mis cartas */}
                    {isSeated && (
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex gap-1.5 sm:gap-2">
                                {myCards.length > 0 ? myCards.map((c, i) => (
                                    <motion.div key={i} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                                        whileHover={{ y: -8 }}
                                        className="w-11 h-15 sm:w-14 sm:h-20 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-white shadow-xl cursor-default select-none"
                                        style={{ height: '60px' }}
                                    >
                                        <span className={`text-base sm:text-lg font-black leading-none ${getCardColor(c.s)}`}>{c.v}</span>
                                        <span className={`text-lg sm:text-xl leading-none ${getCardColor(c.s)}`}>{c.s}</span>
                                    </motion.div>
                                )) : (
                                    [0, 1].map(i => (
                                        <div key={i} className="w-11 sm:w-14 bg-rose-950/40 border-2 border-rose-500/20 rounded-lg flex items-center justify-center" style={{ height: '60px' }}>
                                            <span className="text-rose-500/20 text-lg">?</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <span className="text-[8px] text-white/20 uppercase font-black tracking-widest hidden sm:block">Tu mano</span>
                        </div>
                    )}

                    {/* Acciones / estado */}
                    <div className="flex-1 w-full">
                        {/* No sentado — instrucción */}
                        {!isSeated && gameState === 'lobby' && (
                            <div className="text-center py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                <p className="text-[9px] text-emerald-400/70 uppercase font-black tracking-widest">Selecciona un asiento vacío en la mesa</p>
                                <p className="text-[8px] text-white/20 uppercase tracking-widest mt-0.5">{seatedPlayers.length}/{MAX_SEATS} jugadores sentados · Buy-in 500◈</p>
                            </div>
                        )}

                        {/* Mi turno — botones */}
                        {isMyTurn && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button onClick={() => handleAction('fold')} className="flex-1 min-w-[72px] py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all uppercase tracking-widest active:scale-95">
                                    Fold
                                </button>
                                <button onClick={() => handleAction('check', 0)} className="flex-1 min-w-[72px] py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/70 hover:bg-white/10 transition-all uppercase tracking-widest active:scale-95">
                                    Check
                                </button>
                                <button onClick={() => handleAction('call', BIG_BLIND)} className="flex-1 min-w-[72px] py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black text-emerald-400 hover:bg-emerald-500/20 transition-all uppercase tracking-widest active:scale-95">
                                    Call {BIG_BLIND}◈
                                </button>
                                <button onClick={() => handleAction('raise', BIG_BLIND * 3)} className="flex-1 min-w-[72px] py-3 bg-rose-500 text-black rounded-2xl text-[10px] font-black hover:bg-rose-400 transition-all uppercase tracking-widest active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                                    Raise {BIG_BLIND * 3}◈
                                </button>
                            </div>
                        )}

                        {/* Esperando turno */}
                        {isSeated && !isMyTurn && gameState === 'betting' && (
                            <div className="py-3 bg-black/20 border border-white/5 rounded-2xl text-center text-[10px] font-black text-white/20 uppercase tracking-widest">
                                Esperando tu turno...
                            </div>
                        )}

                        {/* Controles del host */}
                        {isHost && (
                            <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                {seatedPlayers.length >= 2 && gameState !== 'betting' && (
                                    <button onClick={startHand} className="flex-1 py-2.5 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[9px] hover:bg-gray-200 transition-all active:scale-95">
                                        Repartir Nueva Mano
                                    </button>
                                )}
                                {gameState === 'betting' && (
                                    <button onClick={revealCommunity} className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black uppercase tracking-widest text-[9px] hover:bg-emerald-500/30 transition-all active:scale-95">
                                        {roundLabels[bettingRound] || 'Showdown'}
                                    </button>
                                )}
                                {gameState !== 'lobby' && (
                                    <button onClick={resetTable} className="py-2.5 px-4 rounded-xl bg-white/5 text-white/30 border border-white/10 font-black uppercase tracking-widest text-[9px] hover:bg-white/10 hover:text-white/60 transition-all active:scale-95">
                                        Resetear Mesa
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Showdown state */}
                        {gameState === 'showdown' && isSeated && (
                            <div className="mt-2 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Showdown — Compara cartas con los rivales</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Jugadores online en la mesa */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        {seatedPlayers.slice(0, 8).map(p => (
                            <div key={p.seatIdx} title={p.name} className={`w-5 h-5 rounded-full overflow-hidden border ${p.identity === localParticipant?.identity ? 'border-rose-400' : 'border-white/20'}`}>
                                <img src={p.avatar || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {seatedPlayers.length === 0 && (
                            <span className="text-[8px] text-white/20 uppercase font-black tracking-widest">Mesa vacía</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] text-white/20 uppercase tracking-widest font-black">{seatedPlayers.length}/{MAX_SEATS} jugadores</span>
                        <span className="text-[8px] text-white/20 uppercase tracking-widest font-black">Blinds 10/20</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
