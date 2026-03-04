import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, Loader2, User, Coins, ChevronRight, Trophy, AlertCircle, History } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { getFrameStyle } from '../../utils/styles';

/**
 * Texas Hold'em Poker (Realtime Multiplayer)
 * Lógica Sincronizada:
 * - El Host baraja y reparte (broadcast)
 * - Los jugadores apuestan por turnos
 * - Integración con Starlys (Buy-in 500)
 */

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export default function HoldemTable({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const { balance, awardCoins, deductCoins } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    // --- GAME STATE ---
    const [gameState, setGameState] = useState('lobby'); // lobby, dealing, betting, showdown, finished
    const [players, setPlayers] = useState({}); // { identity: { name, avatar, stack, cards, folded, dealer, bet } }
    const [pot, setPot] = useState(0);
    const [communityCards, setCommunityCards] = useState([]);
    const [currentTurn, setCurrentTurn] = useState(null);
    const [deck, setDeck] = useState([]);
    const [buyInPaid, setBuyInPaid] = useState(false);
    const [myCards, setMyCards] = useState([]);
    const [winner, setWinner] = useState(null);
    const [lastAction, setLastAction] = useState(null); // { name, action, amount }

    const channelRef = useRef(null);
    const isHost = participants.length === 0 || localParticipant?.identity === participants[0]?.identity;

    const BUY_IN = 500;
    const BIG_BLIND = 20;
    const SMALL_BLIND = 10;

    // --- 1. Realtime Sync ---
    useEffect(() => {
        if (!roomName || !user) return;

        const channelName = `poker-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'poker_state' }, ({ payload }) => {
                setGameState(payload.state);
                if (payload.players) setPlayers(payload.players);
                if (payload.pot !== undefined) setPot(payload.pot);
                if (payload.communityCards) setCommunityCards(payload.communityCards);
                if (payload.currentTurn !== undefined) setCurrentTurn(payload.currentTurn);
                if (payload.lastAction) setLastAction(payload.lastAction);
                if (payload.winner) setWinner(payload.winner);
            })
            .on('broadcast', { event: 'deal_private' }, ({ payload }) => {
                if (payload.target === localParticipant.identity) {
                    setMyCards(payload.cards);
                }
            })
            .on('broadcast', { event: 'player_join_request' }, ({ payload }) => {
                if (isHost) handlePlayerJoin(payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName, user, isHost]);

    // --- 2. Host Logic (Game Master) ---
    const broadcastState = (newState) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'poker_state',
            payload: newState
        });
    };

    const handlePlayerJoin = (p) => {
        setPlayers(prev => {
            const next = { ...prev, [p.identity]: { ...p, stack: BUY_IN, folded: false, bet: 0 } };
            broadcastState({ players: next });
            return next;
        });
    };

    const requestJoin = async () => {
        if (balance < BUY_IN) return alert("Necesitas 500◈ Starlys para el Buy-In.");

        const { success } = await deductCoins(BUY_IN, 'casino_bet', `Poker Table: ${roomName}`);
        if (!success) return;

        setBuyInPaid(true);
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'player_join_request',
                payload: {
                    identity: localParticipant.identity,
                    name: profile?.username || 'Gamer',
                    avatar: profile?.avatar_url,
                    frame: Array.isArray(profile?.equipped_items) ? profile.equipped_items.find(i => i.type === 'frame')?.item_id : null
                }
            });
        }
    };

    const startHand = () => {
        if (!isHost) return;

        // Generar Baraja
        const newDeck = [];
        SUITS.forEach(s => VALUES.forEach(v => newDeck.push({ value: v, suit: s })));
        // Shuffle simple
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }

        const playerIds = Object.keys(players);
        if (playerIds.length < 2) return alert("Se necesitan al menos 2 jugadores.");

        // Repartir cartas privadas
        let deckIdx = 0;
        playerIds.forEach(id => {
            const cards = [newDeck[deckIdx++], newDeck[deckIdx++]];
            channelRef.current.send({
                type: 'broadcast',
                event: 'deal_private',
                payload: { target: id, cards }
            });
        });

        // Setup Game
        const newState = {
            state: 'betting',
            players: { ...players }, // Reiniciar estados de mano
            pot: 0,
            communityCards: [],
            currentTurn: playerIds[0],
            winner: null,
            lastAction: { name: 'Dealer', action: 'Nueva Mano' }
        };

        setGameState('betting');
        setCommunityCards([]);
        setWinner(null);
        setCurrentTurn(playerIds[0]);
        setPot(0);

        broadcastState(newState);
        setDeck(newDeck.slice(deckIdx));
    };

    const handleAction = (action, amount = 0) => {
        if (currentTurn !== localParticipant.identity) return;

        const newPlayers = { ...players };
        const me = newPlayers[localParticipant.identity];

        setLastAction({ name: me.name, action, amount });

        if (action === 'fold') me.folded = true;
        if (action === 'call' || action === 'raise') {
            me.stack -= amount;
            setPot(prev => prev + amount);
        }

        // Simular paso de turno (Host debería validar esto, aquí lo hacemos simple para MVP)
        const playerIds = Object.keys(players);
        const nextIdx = (playerIds.indexOf(localParticipant.identity) + 1) % playerIds.length;
        const nextId = playerIds[nextIdx];

        broadcastState({
            players: newPlayers,
            pot: pot + (action === 'fold' ? 0 : amount),
            currentTurn: nextId,
            lastAction: { name: me.name, action, amount }
        });
    };

    // --- UI HELPERS ---
    const getCardColor = (suit) => (suit === '♥' || suit === '♦') ? 'text-rose-500' : 'text-gray-300';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full bg-[#050510]/95 backdrop-blur-3xl border border-rose-500/20 rounded-[2.5rem] p-6 mt-4 relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
        >
            <button onClick={onClose} className="absolute right-6 top-6 text-white/30 hover:text-white bg-white/5 p-2 rounded-full transition-all z-20 hover:scale-110 active:scale-90">
                <X size={18} />
            </button>

            {/* Mesa de Poker Visual */}
            <div className="relative w-full aspect-[16/9] mb-8 flex flex-col items-center justify-center p-8 bg-emerald-950/20 rounded-[3rem] border border-white/5 shadow-[inset_0_0_100px_rgba(16,185,129,0.05)]">

                {/* Community Cards */}
                <div className="flex gap-3 mb-12">
                    {communityCards.length > 0 ? communityCards.map((c, i) => (
                        <motion.div
                            key={i} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                            className="w-12 h-18 sm:w-16 sm:h-24 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-white/20 shadow-xl"
                        >
                            <span className={`text-lg sm:text-2xl font-black ${getCardColor(c.suit)}`}>{c.value}</span>
                            <span className={`text-xl sm:text-3xl ${getCardColor(c.suit)}`}>{c.suit}</span>
                        </motion.div>
                    )) : (
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-12 h-18 sm:w-16 sm:h-24 bg-emerald-900/40 rounded-lg border-2 border-white/5 dashed" />)}
                        </div>
                    )}
                </div>

                {/* Pot & Info */}
                <div className="text-center space-y-2">
                    <div className="bg-black/60 backdrop-blur px-6 py-2 rounded-full border border-rose-500/30 inline-flex items-center gap-2 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                        <Coins size={16} className="text-rose-400" />
                        <span className="text-xl font-black text-rose-400">◈ {pot}</span>
                    </div>
                    {lastAction && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-white/40 uppercase font-black tracking-widest">
                            {lastAction.name}: {lastAction.action} {lastAction.amount > 0 && `◈${lastAction.amount}`}
                        </motion.p>
                    )}
                </div>

                {/* Player Avatars around table */}
                <div className="absolute inset-0 pointer-events-none">
                    {Object.entries(players).map(([id, p], idx) => {
                        const angle = (idx / Object.keys(players).length) * Math.PI * 2;
                        const x = Math.cos(angle) * 40 + 50;
                        const y = Math.sin(angle) * 40 + 50;
                        const isMe = id === localParticipant.identity;
                        const isTurn = currentTurn === id && gameState === 'betting';

                        return (
                            <div key={id} className="absolute transition-all duration-500" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                                <div className={`relative flex flex-col items-center gap-2 ${p.folded ? 'opacity-40 grayscale' : ''}`}>
                                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden bg-black/50 ${isTurn ? 'border-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'border-white/10'}`}>
                                        <img src={p.avatar || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="bg-black/80 px-2 py-1 rounded-lg border border-white/10 text-[8px] font-black text-white uppercase tracking-tighter whitespace-nowrap">
                                        {isMe ? 'Tú' : p.name} • ◈{p.stack}
                                    </div>
                                    {isTurn && <div className="absolute -top-6 bg-rose-500 text-black font-black text-[8px] px-2 py-0.5 rounded-full animate-bounce">TURNO</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* My Interface */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Hand View */}
                <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-4">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Tu Mano Fuerte</span>
                    <div className="flex gap-2">
                        {myCards.length > 0 ? myCards.map((c, i) => (
                            <motion.div
                                key={i} whileHover={{ y: -10 }}
                                className="w-14 h-20 bg-white rounded-lg flex flex-col items-center justify-center border-2 border-white shadow-xl rotate-1"
                            >
                                <span className={`text-xl font-black ${getCardColor(c.suit)}`}>{c.value}</span>
                                <span className={`text-2xl ${getCardColor(c.suit)}`}>{c.suit}</span>
                            </motion.div>
                        )) : (
                            <div className="flex gap-2">
                                <div className="w-14 h-20 bg-rose-950/20 border-2 border-rose-500/20 rounded-lg flex items-center justify-center"><User size={20} className="text-rose-500/20" /></div>
                                <div className="w-14 h-20 bg-rose-950/20 border-2 border-rose-500/20 rounded-lg flex items-center justify-center"><User size={20} className="text-rose-500/20" /></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions (Only if logic is ready, otherwise join logic) */}
                {!buyInPaid ? (
                    <div className="col-span-2 text-center py-6">
                        <h4 className="text-white font-black uppercase text-sm mb-4">¡Gana Starlys en la Mesa Pro!</h4>
                        <button
                            onClick={requestJoin}
                            className="px-12 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 text-black font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(244,63,94,0.3)]"
                        >
                            Pagar Buy-In (500◈)
                        </button>
                    </div>
                ) : (
                    <div className="col-span-2 flex flex-col gap-4">
                        {gameState === 'betting' && currentTurn === localParticipant.identity ? (
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => handleAction('fold')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white hover:bg-rose-500/20 transition-all uppercase tracking-widest">Fold</button>
                                <button onClick={() => handleAction('call', 20)} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white hover:bg-emerald-500/20 transition-all uppercase tracking-widest text-emerald-400">Call (20◈)</button>
                                <button onClick={() => handleAction('raise', 100)} className="flex-1 py-4 bg-rose-500 text-black rounded-2xl text-[10px] font-black hover:bg-rose-400 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.2)]">Raise (100◈)</button>
                            </div>
                        ) : (
                            <div className="h-20 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                                {gameState === 'betting' ? 'Esperando jugada ajena...' : 'Esperando nueva mano...'}
                            </div>
                        )}

                        {isHost && Object.keys(players).length >= 2 && gameState !== 'betting' && (
                            <button
                                onClick={startHand}
                                className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all"
                            >
                                Iniciar Ronda de Apuestas
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* History Tab */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-white/30 font-black uppercase tracking-widest">
                    <History size={14} /> Histórico de Mesa
                </div>
                <div className="flex gap-4">
                    <span className="text-[9px] text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">Blinds: 10/20</span>
                    <span className="text-[9px] text-white/50 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">Min Buy-In: 500◈</span>
                </div>
            </div>
        </motion.div>
    );
}
