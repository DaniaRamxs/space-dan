import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, UserPlus, Tv2, Smartphone } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROWS = 6;
const COLS = 7;

function GamepadIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" x2="10" y1="12" y2="12" />
            <line x1="8" x2="8" y1="10" y2="14" />
            <line x1="15" x2="15.01" y1="13" y2="13" />
            <line x1="18" x2="18.01" y1="11" y2="11" />
            <rect width="20" height="12" x="2" y="6" rx="2" />
        </svg>
    );
}

export default function Connect4Game({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    const [gameState, setGameState] = useState('lobby');
    const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    const [turn, setTurn] = useState(1);
    const [players, setPlayers] = useState({ p1: null, p2: null });
    const [winner, setWinner] = useState(null);
    const [cellSize, setCellSize] = useState(56);

    const channelRef = useRef(null);
    const syncRef = useRef({ gameState, board, turn, players, winner });

    useEffect(() => {
        syncRef.current = { gameState, board, turn, players, winner };
    }, [gameState, board, turn, players, winner]);

    // Compute cell size based on available viewport space (theater mode)
    useEffect(() => {
        if (!isTheater) return;
        const compute = () => {
            const sidebarW = 208; // w-52 = 208px
            const headerH = 56;
            const padding = 80;
            const availW = Math.floor((window.innerWidth - sidebarW - padding) / COLS);
            const availH = Math.floor((window.innerHeight - headerH - padding) / ROWS);
            setCellSize(Math.min(availW, availH, 110));
        };
        compute();
        window.addEventListener('resize', compute);
        return () => window.removeEventListener('resize', compute);
    }, [isTheater]);

    const allParticipants = useMemo(() => {
        if (!localParticipant) return participants;
        return [localParticipant, ...participants];
    }, [localParticipant, participants]);

    const sortedParticipants = useMemo(() => {
        return [...allParticipants].sort((a, b) => (a.identity || '').localeCompare(b.identity || ''));
    }, [allParticipants]);

    const leaderIdentity = useMemo(() => sortedParticipants[0]?.identity, [sortedParticipants]);
    const isLeader = localParticipant?.identity === leaderIdentity;

    useEffect(() => {
        if (!roomName || !user) return;
        const channelName = `connect4-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'game_update' }, ({ payload }) => {
                setGameState(payload.state);
                setBoard(payload.board);
                setTurn(payload.turn);
                setPlayers(payload.players);
                setWinner(payload.winner);
            })
            .on('broadcast', { event: 'sync_request' }, () => {
                if (isLeader) {
                    const s = syncRef.current;
                    broadcastState({ state: s.gameState, board: s.board, turn: s.turn, players: s.players, winner: s.winner });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.send({ type: 'broadcast', event: 'sync_request', payload: {} });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [roomName, user, isLeader]);

    const broadcastState = (payload) => {
        channelRef.current?.send({ type: 'broadcast', event: 'game_update', payload });
    };

    const joinGame = (pos) => {
        if (gameState !== 'lobby') return;
        if (players.p1?.identity === localParticipant.identity || players.p2?.identity === localParticipant.identity) return;

        const newPlayers = { ...players };
        const playerData = {
            identity: localParticipant.identity,
            name: profile?.username || 'Piloto',
            avatar: profile?.avatar_url,
            id: user?.id
        };

        if (pos === 1 && !players.p1) {
            newPlayers.p1 = playerData;
        } else if (pos === 2 && !players.p2) {
            newPlayers.p2 = playerData;
        } else return;

        setPlayers(newPlayers);

        if (newPlayers.p1 && newPlayers.p2) {
            const startPayload = {
                state: 'playing',
                board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
                turn: 1, players: newPlayers, winner: null
            };
            setGameState('playing');
            setBoard(startPayload.board);
            setTurn(1);
            setWinner(null);
            broadcastState(startPayload);
        } else {
            broadcastState({ state: 'lobby', players: newPlayers, board, turn, winner });
            if (pos === 1) {
                toast(`@${playerData.name} ha iniciado un duelo de Conecta 4.`, {
                    style: { background: '#080b14', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' },
                    icon: '🎮'
                });
            }
        }
    };

    const dropDisc = (col) => {
        if (gameState !== 'playing' || winner) return;
        const isP1 = players.p1?.identity === localParticipant.identity;
        const isP2 = players.p2?.identity === localParticipant.identity;
        if (turn === 1 && !isP1) return;
        if (turn === 2 && !isP2) return;

        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) { row = r; break; }
        }
        if (row === -1) return;

        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = turn;

        const win = checkWinner(newBoard, row, col);
        const isDraw = !win && newBoard[0].every(c => c !== 0);
        const nextTurn = turn === 1 ? 2 : 1;
        const nextWinner = win ? turn : (isDraw ? 'draw' : null);
        const nextState = (win || isDraw) ? 'finished' : 'playing';

        setBoard(newBoard);
        setTurn(nextTurn);
        setWinner(nextWinner);
        setGameState(nextState);
        broadcastState({ state: nextState, board: newBoard, turn: nextTurn, players, winner: nextWinner });

        if (nextWinner && nextWinner !== 'draw') {
            const winningPlayer = nextWinner === 1 ? players.p1 : players.p2;
            const losingPlayer = nextWinner === 1 ? players.p2 : players.p1;
            if (localParticipant.identity === (nextWinner === 1 ? players.p1.identity : players.p2.identity)) {
                updateStats(winningPlayer.id, 'win');
                updateStats(losingPlayer.id, 'loss');
                toast.success('Victoria registrada!', { icon: '👑' });
            }
        }
    };

    const updateStats = async (userId, type) => {
        if (!userId) return;
        try {
            await supabase.rpc('increment_profile_stat', {
                profile_id: userId,
                stat_col: type === 'win' ? 'connect4_wins' : 'connect4_losses',
                inc_val: 1
            });
        } catch (err) { console.error('[Connect4] Stats error:', err); }
    };

    const resetGame = () => {
        const payload = {
            state: 'lobby',
            board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
            turn: 1, players: { p1: null, p2: null }, winner: null
        };
        setGameState('lobby'); setBoard(payload.board); setTurn(1);
        setPlayers(payload.players); setWinner(null);
        broadcastState(payload);
    };

    const rematch = () => {
        const payload = {
            state: 'playing',
            board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
            turn: winner === 1 ? 2 : 1, players, winner: null
        };
        setGameState('playing'); setBoard(payload.board);
        setTurn(payload.turn); setWinner(null);
        broadcastState(payload);
    };

    const checkWinner = (b, r, c) => {
        const p = b[r][c];
        let count = 0;
        for (let j = 0; j < COLS; j++) { if (b[r][j] === p) { count++; if (count === 4) return true; } else count = 0; }
        count = 0;
        for (let i = 0; i < ROWS; i++) { if (b[i][c] === p) { count++; if (count === 4) return true; } else count = 0; }
        for (let [dr, dc] of [[1, 1], [1, -1]]) {
            count = 1;
            for (let i = 1; i < 4; i++) { const nr = r + dr * i, nc = c + dc * i; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) count++; else break; }
            for (let i = 1; i < 4; i++) { const nr = r - dr * i, nc = c - dc * i; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) count++; else break; }
            if (count >= 4) return true;
        }
        return false;
    };

    const isMyTurn = (turn === 1 && players.p1?.identity === localParticipant.identity) ||
        (turn === 2 && players.p2?.identity === localParticipant.identity);

    const gap = Math.max(6, Math.floor(cellSize * 0.15));
    const boardPad = Math.max(12, Math.floor(cellSize * 0.2));

    const BoardGrid = () => (
        <div
            className="relative bg-purple-950/40 rounded-[2rem] border-4 border-white/10 shadow-[inset_0_0_60px_rgba(0,0,0,0.6),0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ padding: boardPad }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap }} className="relative z-20">
                {board.map((row, r) => (
                    <div key={r} style={{ display: 'flex', gap }}>
                        {row.map((cell, c) => (
                            <div key={c} className="relative" style={{ width: cellSize, height: cellSize }}>
                                <button
                                    onClick={() => dropDisc(c)}
                                    disabled={gameState !== 'playing' || !isMyTurn || cell !== 0}
                                    className={`absolute inset-0 z-10 w-full h-full rounded-full border-2 transition-all ${cell === 0 ? 'bg-black/40 border-white/5 hover:border-purple-500/40 hover:bg-purple-500/10' : 'bg-transparent border-transparent'}`}
                                />
                                <AnimatePresence>
                                    {cell !== 0 && (
                                        <motion.div
                                            initial={{ y: -500 }} animate={{ y: 0 }}
                                            transition={{ type: 'spring', damping: 12, stiffness: 100, mass: 0.8 }}
                                            className={`absolute inset-0 rounded-full border-2 pointer-events-none ${
                                                cell === 1
                                                    ? 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300 shadow-[0_4px_12px_rgba(244,63,94,0.5)]'
                                                    : 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.5)]'
                                            }`}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Lobby overlay */}
            <AnimatePresence>
                {gameState === 'lobby' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-none rounded-[1.8rem]" />
                )}
            </AnimatePresence>

            {/* Finish overlay */}
            <AnimatePresence>
                {gameState === 'finished' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center rounded-[1.8rem] z-10 p-6 border border-white/10"
                    >
                        {winner === 'draw' ? (
                            <>
                                <div className="text-5xl mb-4">🤝</div>
                                <h3 className="text-white font-black uppercase tracking-widest mb-6">Empate Dimensional</h3>
                            </>
                        ) : (
                            <>
                                <Trophy size={52} className={`mb-4 ${winner === 1 ? 'text-rose-400' : 'text-amber-400'}`} />
                                <h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">Duelo Terminado</h3>
                                <p className={`text-xl font-black uppercase tracking-widest mb-8 ${winner === 1 ? 'text-rose-400' : 'text-amber-400'}`}>
                                    @{winner === 1 ? players.p1?.name : players.p2?.name} Victoria
                                </p>
                            </>
                        )}
                        <div className="flex gap-3">
                            <button onClick={rematch} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all">
                                <Play size={14} /> Revancha
                            </button>
                            <button onClick={resetGame} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                                <RotateCcw size={14} /> Salir
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    // ── Theater / Fullscreen layout ─────────────────────────────────────────
    if (isTheater) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[50] bg-[#050518] flex flex-col"
            >
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <GamepadIcon className="text-purple-400" width={16} height={16} />
                        </div>
                        <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Conecta 4: Desafío Espacial</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onToggleTheater} className="p-2 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all" title="Vista Normal">
                            <Tv2 size={14} />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Main: sidebar + board */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left sidebar */}
                    <div className="flex-shrink-0 w-52 flex flex-col gap-3 p-4 border-r border-white/5 overflow-y-auto no-scrollbar">
                        {/* P1 */}
                        <PlayerSlot
                            player={players.p1} slot={1} turn={turn} gameState={gameState}
                            isMyTurn={turn === 1 && players.p1?.identity === localParticipant?.identity}
                            onJoin={() => joinGame(1)}
                        />

                        <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">VS</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        {/* P2 */}
                        <PlayerSlot
                            player={players.p2} slot={2} turn={turn} gameState={gameState}
                            isMyTurn={turn === 2 && players.p2?.identity === localParticipant?.identity}
                            onJoin={() => joinGame(2)}
                        />

                        <div className="flex-1" />

                        {/* Turn / Lobby status */}
                        {gameState === 'lobby' && (
                            <div className="flex flex-col items-center gap-2 py-4 animate-pulse">
                                <UserPlus className="text-purple-400" size={22} />
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center leading-relaxed">
                                    Esperando Retadores...
                                </span>
                            </div>
                        )}
                        {gameState === 'playing' && (
                            <div className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${turn === 1 ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                                <div className={`w-3 h-3 rounded-full animate-pulse ${turn === 1 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest text-center ${turn === 1 ? 'text-rose-400' : 'text-amber-400'}`}>
                                    {turn === 1 ? players.p1?.name : players.p2?.name}
                                </span>
                                {isMyTurn && (
                                    <span className="bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase animate-bounce">
                                        Tu turno!
                                    </span>
                                )}
                            </div>
                        )}

                        {isLeader && gameState !== 'lobby' && (
                            <button onClick={resetGame} className="text-[9px] font-black text-white/20 hover:text-rose-400 uppercase tracking-widest transition-all text-center py-2">
                                Terminar (Lider)
                            </button>
                        )}

                        {/* Hint landscape mobile */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-full border border-white/10 md:hidden">
                            <Smartphone className="text-cyan-400 rotate-90 flex-shrink-0" size={12} />
                            <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Gira la pantalla</span>
                        </div>
                    </div>

                    {/* Board area — fills remaining space, centers board */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                        <BoardGrid />
                    </div>
                </div>
            </motion.div>
        );
    }

    // ── Card / Normal layout ────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full relative bg-[#050518]/95 backdrop-blur-xl border border-purple-500/20 rounded-[2.5rem] p-6 mt-4 shadow-[0_40px_100px_rgba(139,92,246,0.3)]"
        >
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/5 blur-[80px] pointer-events-none" />

            <div className="absolute right-6 top-6 flex items-center gap-3 z-30">
                <button onClick={onToggleTheater} className="bg-white/5 text-white/30 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all" title="Vista de Cine">
                    <Tv2 size={16} />
                </button>
                <button onClick={onClose} className="text-white/30 hover:text-white bg-white/5 p-2 rounded-full transition-all">
                    <X size={16} />
                </button>
            </div>

            <div className="flex flex-col items-center mb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <GamepadIcon className="text-purple-400" width={20} height={20} />
                    </div>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Conecta 4: Desafío Espacial</h2>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Actividad de Entretenimiento</p>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-5 w-full max-w-sm mx-auto">
                <PlayerSlot player={players.p1} slot={1} turn={turn} gameState={gameState} isMyTurn={turn === 1 && players.p1?.identity === localParticipant?.identity} onJoin={() => joinGame(1)} compact />
                <span className="text-white/20 font-black text-xs flex-shrink-0">VS</span>
                <PlayerSlot player={players.p2} slot={2} turn={turn} gameState={gameState} isMyTurn={turn === 2 && players.p2?.identity === localParticipant?.identity} onJoin={() => joinGame(2)} compact />
            </div>

            <div className="flex justify-center mb-6">
                <BoardGrid />
            </div>

            <div className="flex flex-col items-center gap-4">
                {gameState === 'lobby' && (
                    <div className="flex flex-col items-center animate-bounce">
                        <UserPlus className="text-purple-400 mb-2" size={22} />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Esperando Retadores...</span>
                    </div>
                )}
                {gameState === 'playing' && (
                    <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${turn === 1 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            Turno: <span className={turn === 1 ? 'text-rose-400' : 'text-amber-400'}>@{turn === 1 ? players.p1?.name : players.p2?.name}</span>
                        </span>
                        {isMyTurn && <span className="bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase ml-2 animate-bounce">Tu turno!</span>}
                    </div>
                )}
                {isLeader && gameState !== 'lobby' && (
                    <button onClick={resetGame} className="text-[9px] font-black text-white/20 hover:text-rose-400 uppercase tracking-widest transition-all">
                        Terminar Partida (Lider)
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// Static classes for Tailwind JIT (dynamic strings get purged)
const SLOT_CLASSES = {
    1: {
        activeBorder: 'border-rose-500/40',
        activeBg: 'bg-rose-500/5',
        border: 'border-rose-500',
        iconText: 'text-rose-500/30',
        label: 'text-rose-400',
        joinBtn: 'bg-rose-500 text-white hover:bg-rose-400',
        turnBg: 'border-rose-500/30 bg-rose-500/5',
        turnText: 'text-rose-400',
        dot: 'bg-rose-500',
    },
    2: {
        activeBorder: 'border-amber-500/40',
        activeBg: 'bg-amber-500/5',
        border: 'border-amber-500',
        iconText: 'text-amber-500/30',
        label: 'text-amber-400',
        joinBtn: 'bg-amber-500 text-black hover:bg-amber-400',
        turnBg: 'border-amber-500/30 bg-amber-500/5',
        turnText: 'text-amber-400',
        dot: 'bg-amber-500',
    },
};

function PlayerSlot({ player, slot, turn, gameState, isMyTurn, onJoin, compact }) {
    const isRed = slot === 1;
    const sc = SLOT_CLASSES[slot];
    const isActive = turn === slot && gameState === 'playing';

    if (compact) {
        return (
            <div className={`flex items-center gap-2 flex-1 p-2 rounded-2xl border transition-all min-w-0 ${isActive ? `${sc.activeBorder} ${sc.activeBg}` : 'border-white/5 bg-black/20'}`}>
                <div className={`relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border-2 ${isActive ? sc.border : 'border-white/10'}`}>
                    {player
                        ? <img src={player.avatar || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                        : <div className={`w-full h-full bg-white/5 flex items-center justify-center`}><User size={14} className={sc.iconText} /></div>
                    }
                    {isActive && <div className="absolute inset-0 border-2 border-white/60 animate-pulse rounded-xl" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-[8px] font-black ${sc.label} uppercase tracking-widest`}>P{slot} · {isRed ? 'Rojo' : 'Oro'}</span>
                    <p className="text-[10px] font-black text-white truncate">{player?.name || '—'}</p>
                </div>
                {gameState === 'lobby' && !player && (
                    <button onClick={onJoin} className={`text-[7px] ${sc.joinBtn} px-2 py-1 rounded-lg font-black uppercase flex-shrink-0 transition-all`}>
                        Unirse
                    </button>
                )}
            </div>
        );
    }

    // Sidebar variant (theater)
    return (
        <div className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${isActive ? `${sc.activeBorder} ${sc.activeBg}` : 'border-white/5 bg-black/20'}`}>
            <div className="flex items-center gap-2">
                <div className={`relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border-2 ${isActive ? sc.border : 'border-white/10'}`}>
                    {player
                        ? <img src={player.avatar || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-white/5 flex items-center justify-center"><User size={16} className={sc.iconText} /></div>
                    }
                    {isActive && <div className="absolute inset-0 border-2 border-white/60 animate-pulse rounded-xl" />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-[8px] font-black ${sc.label} uppercase tracking-widest`}>Jugador {slot} · {isRed ? 'Rojo' : 'Oro'}</span>
                    <p className="text-xs font-black text-white truncate">{player?.name || 'Esperando...'}</p>
                </div>
            </div>
            {gameState === 'lobby' && !player && (
                <button onClick={onJoin} className={`w-full py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${sc.joinBtn}`}>
                    Unirse como P{slot}
                </button>
            )}
        </div>
    );
}
