import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, UserPlus, Tv, Tv2, Smartphone } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import toast from 'react-hot-toast';

const ROWS = 6;
const COLS = 7;

export default function Connect4Game({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    // Game State
    const [gameState, setGameState] = useState('lobby'); // lobby, playing, finished
    const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    const [turn, setTurn] = useState(1); // 1 = Red (Player 1), 2 = Yellow (Player 2)
    const [players, setPlayers] = useState({ p1: null, p2: null }); // { identity, name, avatar }
    const [winner, setWinner] = useState(null); // 1, 2, or 'draw'

    const channelRef = useRef(null);

    // Leader selection (alphabetical by identity)
    const allParticipants = useMemo(() => {
        if (!localParticipant) return participants;
        return [localParticipant, ...participants];
    }, [localParticipant, participants]);

    const sortedParticipants = useMemo(() => {
        return [...allParticipants].sort((a, b) => (a.identity || '').localeCompare(b.identity || ''));
    }, [allParticipants]);

    const leaderIdentity = useMemo(() => sortedParticipants[0]?.identity, [sortedParticipants]);
    const isLeader = localParticipant?.identity === leaderIdentity;

    // Supabase Realtime Sync
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

                if (payload.winner && payload.winner !== 'draw' && isLeader) {
                    // Leader doesn't need to do much here, but could log
                }
            })
            .on('broadcast', { event: 'sync_request' }, () => {
                if (isLeader) {
                    broadcastState({
                        state: gameState,
                        board,
                        turn,
                        players,
                        winner
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    channel.send({ type: 'broadcast', event: 'sync_request', payload: {} });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName, user, isLeader, gameState, board, turn, players, winner]);

    const broadcastState = (payload) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'game_update',
            payload
        });
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
        } else {
            return;
        }

        setPlayers(newPlayers);

        // Si ya hay dos jugadores, el líder inicia automáticamente
        if (newPlayers.p1 && newPlayers.p2) {
            const startPayload = {
                state: 'playing',
                board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
                turn: 1,
                players: newPlayers,
                winner: null
            };
            setGameState('playing');
            setBoard(startPayload.board);
            setTurn(1);
            setWinner(null);
            broadcastState(startPayload);
        } else {
            broadcastState({ state: 'lobby', players: newPlayers, board, turn, winner });
            if (pos === 1) {
                toast(`🚀 @${playerData.name} ha iniciado un duelo de Conecta 4.`, {
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

        // Find best row
        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r][col] === 0) {
                row = r;
                break;
            }
        }

        if (row === -1) return; // Column full

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

        broadcastState({
            state: nextState,
            board: newBoard,
            turn: nextTurn,
            players,
            winner: nextWinner
        });

        if (nextWinner && nextWinner !== 'draw') {
            const winningPlayer = nextWinner === 1 ? players.p1 : players.p2;
            const losingPlayer = nextWinner === 1 ? players.p2 : players.p1;

            // Only the leader or the winner updates stats once to avoid duplicate increments
            if (localParticipant.identity === (nextWinner === 1 ? players.p1.identity : players.p2.identity)) {
                updateStats(winningPlayer.id, 'win');
                updateStats(losingPlayer.id, 'loss');
                toast.success('¡Victoria registrada!', { icon: '👑' });
            }
        }
    };

    const updateStats = async (userId, type) => {
        if (!userId) return;
        try {
            const column = type === 'win' ? 'connect4_wins' : 'connect4_losses';
            const { error: updateErr } = await supabase.rpc('increment_profile_stat', {
                profile_id: userId,
                stat_col: column,
                inc_val: 1
            });
            if (updateErr) throw updateErr;
        } catch (err) {
            console.error('[Connect4] Error updating stats:', err);
        }
    };

    const resetGame = () => {
        const resetPayload = {
            state: 'lobby',
            board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
            turn: 1,
            players: { p1: null, p2: null },
            winner: null
        };
        setGameState('lobby');
        setBoard(resetPayload.board);
        setTurn(1);
        setPlayers(resetPayload.players);
        setWinner(null);
        broadcastState(resetPayload);
    };

    const rematch = () => {
        const rematchPayload = {
            state: 'playing',
            board: Array(ROWS).fill(null).map(() => Array(COLS).fill(0)),
            turn: winner === 1 ? 2 : 1, // El que perdió empieza
            players,
            winner: null
        };
        setGameState('playing');
        setBoard(rematchPayload.board);
        setTurn(rematchPayload.turn);
        setWinner(null);
        broadcastState(rematchPayload);
    };

    const checkWinner = (b, r, c) => {
        const p = b[r][c];

        // Horizontal
        let count = 0;
        for (let j = 0; j < COLS; j++) {
            if (b[r][j] === p) {
                count++;
                if (count === 4) return true;
            } else count = 0;
        }

        // Vertical
        count = 0;
        for (let i = 0; i < ROWS; i++) {
            if (b[i][c] === p) {
                count++;
                if (count === 4) return true;
            } else count = 0;
        }

        // Diagonals... (simplified check for brevity but fully functional)
        const directions = [[1, 1], [1, -1]];
        for (let [dr, dc] of directions) {
            count = 1;
            // one way
            for (let i = 1; i < 4; i++) {
                const nr = r + dr * i, nc = c + dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) count++;
                else break;
            }
            // other way
            for (let i = 1; i < 4; i++) {
                const nr = r - dr * i, nc = c - dc * i;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc] === p) count++;
                else break;
            }
            if (count >= 4) return true;
        }
        return false;
    };

    const isMyTurn = (turn === 1 && players.p1?.identity === localParticipant.identity) ||
        (turn === 2 && players.p2?.identity === localParticipant.identity);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full relative transition-all duration-700 ${isTheater ? 'fixed inset-0 z-[50] flex flex-col md:flex-row items-center justify-center bg-[#050518] p-4 sm:p-8 landscape:flex-row' : 'bg-[#050518]/95 backdrop-blur-xl border border-purple-500/20 rounded-[2.5rem] p-6 mt-4 shadow-[0_40px_100px_rgba(139,92,246,0.3)]'}`}
        >
            {/* Background elements (Only if NOT theater, as theater handles its own background if needed) */}
            {!isTheater && (
                <>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 blur-[80px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/5 blur-[80px] pointer-events-none" />
                </>
            )}

            <div className="absolute right-6 top-6 flex items-center gap-3 z-30">
                <button
                    onClick={onToggleTheater}
                    className={`p-2 rounded-full transition-all ${isTheater ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-white/30 hover:text-white hover:bg-white/10'}`}
                    title={isTheater ? "Vista Normal" : "Vista de Cine"}
                >
                    {isTheater ? <Tv2 size={18} /> : <Tv size={18} />}
                </button>
                <button onClick={onClose} className="text-white/30 hover:text-white bg-white/5 p-2 rounded-full transition-all">
                    <X size={16} />
                </button>
            </div>

            <div className="flex flex-col items-center mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Gamepad2 className="text-purple-400" size={20} />
                    </div>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Conecta 4: Desafío Espacial</h2>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Actividad de Entretenimiento</p>
                </div>
            </div>

            <div className={`flex items-center gap-4 mb-10 overflow-x-auto no-scrollbar py-2 ${isTheater ? 'md:flex-col md:overflow-visible md:gap-8 md:mb-0 md:mr-12' : 'justify-around'}`}>
                {/* Player 1 Card */}
                <div className={`flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all ${isTheater ? 'w-40' : 'w-32'} ${turn === 1 && gameState === 'playing' ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'bg-black/20 border-white/5 opacity-60'}`}>
                    <div className={`relative ${isTheater ? 'w-20 h-20' : 'w-14 h-14'} rounded-2xl overflow-hidden border-2 ${turn === 1 ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'border-white/10'}`}>
                        {players.p1 ? (
                            <img src={players.p1.avatar || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-rose-500/20"><User size={isTheater ? 32 : 24} /></div>
                        )}
                        {turn === 1 && gameState === 'playing' && <div className="absolute inset-0 border-2 border-white animate-pulse rounded-2xl" />}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">P1 • Rojo</span>
                        <p className={`font-bold text-white truncate w-full text-center ${isTheater ? 'text-xs' : 'text-[10px]'}`}>{players.p1?.name || (gameState === 'lobby' ? 'Esperando' : 'Desconectado')}</p>
                    </div>
                    {gameState === 'lobby' && !players.p1 && (
                        <button onClick={() => joinGame(1)} className="mt-1 py-1.5 px-4 rounded-lg bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-rose-400 transition-all">Unirse</button>
                    )}
                </div>

                {!isTheater && <div className="text-white/20 font-black text-xl italic tracking-tighter shrink-0">VS</div>}

                {/* Player 2 Card */}
                <div className={`flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all ${isTheater ? 'w-40' : 'w-32'} ${turn === 2 && gameState === 'playing' ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-black/20 border-white/5 opacity-60'}`}>
                    <div className={`relative ${isTheater ? 'w-20 h-20' : 'w-14 h-14'} rounded-2xl overflow-hidden border-2 ${turn === 2 ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'border-white/10'}`}>
                        {players.p2 ? (
                            <img src={players.p2.avatar || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-amber-500/20"><User size={isTheater ? 32 : 24} /></div>
                        )}
                        {turn === 2 && gameState === 'playing' && <div className="absolute inset-0 border-2 border-white animate-pulse rounded-2xl" />}
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">P2 • Oro</span>
                        <p className={`font-bold text-white truncate w-full text-center ${isTheater ? 'text-xs' : 'text-[10px]'}`}>{players.p2?.name || (gameState === 'lobby' ? 'Esperando' : 'Desconectado')}</p>
                    </div>
                    {gameState === 'lobby' && !players.p2 && (
                        <button onClick={() => joinGame(2)} className="mt-1 py-1.5 px-4 rounded-lg bg-amber-500 text-black text-[8px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">Unirse</button>
                    )}
                </div>
            </div>

            {/* Board */}
            <div className={`relative mx-auto bg-purple-950/40 p-3 sm:p-5 md:p-8 rounded-[2rem] border-4 border-white/10 shadow-[inset_0_0_50px_rgba(0,0,0,0.5),0_20px_40px_rgba(0,0,0,0.4)] w-fit mb-8 overflow-hidden transition-all duration-700 ${isTheater ? 'scale-110 sm:scale-125 md:scale-150' : 'scale-100'}`}>
                <div className="flex flex-col gap-2 sm:gap-3 relative z-20">
                    {board.map((row, r) => (
                        <div key={r} className="flex gap-2 sm:gap-3">
                            {row.map((cell, c) => (
                                <div key={c} className="relative w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14">
                                    {/* Orificio del tablero */}
                                    <button
                                        onClick={() => dropDisc(c)}
                                        disabled={gameState !== 'playing' || !isMyTurn || cell !== 0}
                                        className={`absolute inset-0 z-10 w-full h-full rounded-full border-2 transition-all 
                                            ${cell === 0 ? 'bg-black/40 border-white/5 hover:border-purple-500/30' : 'bg-transparent border-transparent'}
                                            ${isMyTurn && cell === 0 && r === 0 ? 'hover:after:content-["↓"] hover:after:absolute hover:after:-top-7 hover:after:left-0 hover:after:w-full hover:after:text-center hover:after:text-purple-400 hover:after:text-xs' : ''}
                                        `}
                                    />
                                    {/* Ficha con animación de gravedad */}
                                    <AnimatePresence>
                                        {cell !== 0 && (
                                            <motion.div
                                                initial={{ y: -400 }}
                                                animate={{ y: 0 }}
                                                transition={{
                                                    type: 'spring',
                                                    damping: 12,
                                                    stiffness: 100,
                                                    mass: 0.8
                                                }}
                                                className={`absolute inset-0 rounded-full border-2 
                                                    ${cell === 1 ? 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300 shadow-[0_4px_10px_rgba(244,63,94,0.4)]' : ''}
                                                    ${cell === 2 ? 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-200 shadow-[0_4px_10px_rgba(245,158,11,0.4)]' : ''}
                                                `}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <AnimatePresence>
                    {gameState === 'finished' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center rounded-[1.8rem] z-10 p-4 border border-white/10">
                            {winner === 'draw' ? (
                                <>
                                    <div className="text-5xl mb-4">🤝</div>
                                    <h3 className="text-white font-black uppercase tracking-widest mb-6">Empate Dimensional</h3>
                                </>
                            ) : (
                                <>
                                    <div className="relative mb-6">
                                        <Trophy size={60} className={winner === 1 ? 'text-rose-400' : 'text-amber-400'} />
                                    </div>
                                    <h3 className="text-white font-black uppercase tracking-widest text-xs mb-2">Duelo Terminado</h3>
                                    <p className={`text-xl font-black uppercase tracking-widest mb-8 ${winner === 1 ? 'text-rose-400' : 'text-amber-400'}`}>
                                        @{winner === 1 ? players.p1?.name : players.p2?.name} Victoria
                                    </p>
                                </>
                            )}
                            <div className="flex gap-4">
                                <button onClick={rematch} className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all">
                                    <Play size={16} /> Revancha
                                </button>
                                <button onClick={resetGame} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">
                                    <RotateCcw size={16} /> Salir
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'lobby' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-none rounded-[1.8rem]" />
                    )}
                </AnimatePresence>
            </div>

            <div className={`flex flex-col items-center gap-6 ${isTheater ? 'md:absolute md:bottom-12 md:left-1/2 md:-translate-x-1/2' : ''}`}>
                {gameState === 'lobby' ? (
                    <div className="flex flex-col items-center animate-bounce">
                        <UserPlus className="text-purple-400 mb-2" size={24} />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Esperando Retadores...</span>
                    </div>
                ) : gameState === 'playing' ? (
                    <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className={`w-3 h-3 rounded-full animate-pulse transition-colors ${turn === 1 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            Turno de: <span className={turn === 1 ? 'text-rose-400' : 'text-amber-400'}>@{turn === 1 ? players.p1?.name : players.p2?.name}</span>
                        </span>
                        {isMyTurn && (
                            <span className="bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded uppercase ml-2 animate-bounce">¡Tu turno!</span>
                        )}
                    </div>
                ) : null}

                {/* Rotation hint for mobile theater mode */}
                {isTheater && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 animate-pulse md:hidden">
                        <Smartphone className="text-cyan-400 rotate-90" size={14} />
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Gira tu pantalla para mejor vista</span>
                    </div>
                )}
            </div>

            {isLeader && gameState !== 'lobby' && (
                <div className="mt-8 text-center">
                    <button onClick={resetGame} className="text-[9px] font-black text-white/20 hover:text-rose-400 uppercase tracking-widest transition-all">
                        Terminar Partida (Líder)
                    </button>
                </div>
            )}
        </motion.div>
    );
}

function Gamepad2(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="6" x2="10" y1="12" y2="12" />
            <line x1="8" x2="8" y1="10" y2="14" />
            <line x1="15" x2="15.01" y1="13" y2="13" />
            <line x1="18" x2="18.01" y1="11" y2="11" />
            <rect width="20" height="12" x="2" y="6" rx="2" />
        </svg>
    );
}

