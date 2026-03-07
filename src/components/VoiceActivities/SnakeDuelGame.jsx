import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, UserPlus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, Tv, Tv2, Smartphone } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;

const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

export default function SnakeDuelGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    // Game State
    const [gameState, setGameState] = useState('lobby'); // lobby, playing, finished
    const [players, setPlayers] = useState({ p1: null, p2: null });
    const [snakes, setSnakes] = useState({
        p1: [
            { x: 5, y: 10 },
            { x: 4, y: 10 },
            { x: 3, y: 10 }
        ],
        p2: [
            { x: 14, y: 10 },
            { x: 15, y: 10 },
            { x: 16, y: 10 }
        ]
    });
    const [directions, setDirections] = useState({ p1: 'RIGHT', p2: 'LEFT' });
    const [winner, setWinner] = useState(null); // 'p1', 'p2', or 'draw'
    const [countdown, setCountdown] = useState(null);

    const channelRef = useRef(null);
    const gameLoopRef = useRef(null);
    const lastDirectionInput = useRef(null);
    const tickCountRef = useRef(0);

    // Leader selection
    const allParticipants = useMemo(() => {
        if (!localParticipant) return participants;
        return [localParticipant, ...participants];
    }, [localParticipant, participants]);

    const sortedParticipants = useMemo(() => {
        return [...allParticipants].sort((a, b) => (a.identity || '').localeCompare(b.identity || ''));
    }, [allParticipants]);

    const leaderIdentity = useMemo(() => sortedParticipants[0]?.identity, [sortedParticipants]);
    const isLeader = localParticipant?.identity === leaderIdentity;

    const myPlayerKey = useMemo(() => {
        if (players.p1?.identity === localParticipant?.identity) return 'p1';
        if (players.p2?.identity === localParticipant?.identity) return 'p2';
        return null;
    }, [players, localParticipant]);

    // Broadcast state
    const broadcastState = useCallback((payload) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'snake_update',
            payload
        });
    }, []);

    // Game Loop (Only on leader)
    useEffect(() => {
        if (!isLeader || gameState !== 'playing') {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            return;
        }

        gameLoopRef.current = setInterval(() => {
            setSnakes(prevSnakes => {
                const newSnakes = { ...prevSnakes };
                const p1Head = { ...newSnakes.p1[0] };
                const p2Head = { ...newSnakes.p2[0] };

                // Move P1
                p1Head.x += DIRECTIONS[directions.p1].x;
                p1Head.y += DIRECTIONS[directions.p1].y;
                newSnakes.p1 = [p1Head, ...newSnakes.p1.slice(0, -1)];

                // Move P2
                p2Head.x += DIRECTIONS[directions.p2].x;
                p2Head.y += DIRECTIONS[directions.p2].y;
                newSnakes.p2 = [p2Head, ...newSnakes.p2.slice(0, -1)];

                // Collision Detection
                const p1HitsWall = p1Head.x < 0 || p1Head.x >= GRID_SIZE || p1Head.y < 0 || p1Head.y >= GRID_SIZE;
                const p2HitsWall = p2Head.x < 0 || p2Head.x >= GRID_SIZE || p2Head.y < 0 || p2Head.y >= GRID_SIZE;

                const p1HitsSelf = newSnakes.p1.slice(1).some(seg => seg.x === p1Head.x && seg.y === p1Head.y);
                const p2HitsSelf = newSnakes.p2.slice(1).some(seg => seg.x === p2Head.x && seg.y === p2Head.y);

                const p1HitsP2 = newSnakes.p2.some(seg => seg.x === p1Head.x && seg.y === p1Head.y);
                const p2HitsP1 = newSnakes.p1.some(seg => seg.x === p2Head.x && seg.y === p2Head.y);

                const p1Loses = p1HitsWall || p1HitsSelf || p1HitsP2;
                const p2Loses = p2HitsWall || p2HitsSelf || p2HitsP1;

                if (p1Loses && p2Loses) {
                    endGame('draw');
                    return prevSnakes;
                } else if (p1Loses) {
                    endGame('p2');
                    return prevSnakes;
                } else if (p2Loses) {
                    endGame('p1');
                    return prevSnakes;
                }

                // Crecer cada ~4.5 segundos (30 ticks × 150ms)
                tickCountRef.current++;
                if (tickCountRef.current % 30 === 0) {
                    newSnakes.p1 = [p1Head, ...prevSnakes.p1];
                    newSnakes.p2 = [p2Head, ...prevSnakes.p2];
                }

                broadcastState({ snakes: newSnakes, directions, gameState: 'playing' });
                return newSnakes;
            });
        }, INITIAL_SPEED);

        return () => clearInterval(gameLoopRef.current);
    }, [isLeader, gameState, directions, broadcastState]);

    const endGame = (winnerKey) => {
        setWinner(winnerKey);
        setGameState('finished');
        broadcastState({ gameState: 'finished', winner: winnerKey });

        if (winnerKey !== 'draw') {
            const winnerData = winnerKey === 'p1' ? players.p1 : players.p2;
            const loserData = winnerKey === 'p1' ? players.p2 : players.p1;

            if (myPlayerKey === winnerKey) {
                updateStats(winnerData.id, 'win');
                updateStats(loserData.id, 'loss');
            }
        }
    };

    const updateStats = async (userId, type) => {
        if (!userId) return;
        try {
            const column = type === 'win' ? 'snake_wins' : 'snake_losses';
            await supabase.rpc('increment_profile_stat', {
                profile_id: userId,
                stat_col: column,
                inc_val: 1
            });
        } catch (e) { }
    };

    // Supabase Realtime
    useEffect(() => {
        if (!roomName || !user) return;

        const channel = supabase.channel(`snake-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'snake_update' }, ({ payload }) => {
                if (payload.gameState) setGameState(payload.gameState);
                if (payload.snakes) setSnakes(payload.snakes);
                if (payload.directions) setDirections(payload.directions);
                if (payload.players) setPlayers(payload.players);
                if (payload.winner) setWinner(payload.winner);
                if (payload.countdown !== undefined) setCountdown(payload.countdown);
            })
            .on('broadcast', { event: 'input' }, ({ payload }) => {
                if (isLeader && gameState === 'playing') {
                    setDirections(prev => {
                        const newDirs = { ...prev };
                        // Prevent 180 degree turns
                        const currentDir = prev[payload.player];
                        const newDir = payload.direction;
                        if (
                            (newDir === 'UP' && currentDir !== 'DOWN') ||
                            (newDir === 'DOWN' && currentDir !== 'UP') ||
                            (newDir === 'LEFT' && currentDir !== 'RIGHT') ||
                            (newDir === 'RIGHT' && currentDir !== 'LEFT')
                        ) {
                            newDirs[payload.player] = newDir;
                        }
                        return newDirs;
                    });
                }
            })
            .on('broadcast', { event: 'sync_request' }, () => {
                if (isLeader) {
                    broadcastState({ gameState, snakes, directions, players, winner, countdown });
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
    }, [roomName, user, isLeader, broadcastState, gameState, snakes, directions, players, winner, countdown]);

    const joinGame = (pos) => {
        if (gameState !== 'lobby') return;
        if (players.p1?.identity === localParticipant.identity || players.p2?.identity === localParticipant.identity) return;

        const newPlayers = { ...players };
        const playerData = {
            id: user.id,
            identity: localParticipant.identity,
            name: profile?.username || 'Piloto',
            avatar: profile?.avatar_url
        };

        if (pos === 1 && !players.p1) newPlayers.p1 = playerData;
        else if (pos === 2 && !players.p2) newPlayers.p2 = playerData;
        else return;

        setPlayers(newPlayers);
        broadcastState({ players: newPlayers, gameState: 'lobby' });

        if (newPlayers.p1 && newPlayers.p2 && isLeader) {
            startCountdown();
        } else if (pos === 1) {
            toast(`🐍 @${playerData.name} ha lanzado un Snake Duel.`, {
                style: { background: '#080b14', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' },
                icon: '🎮'
            });
        }
    };

    const startCountdown = () => {
        let count = 3;
        setCountdown(count);
        broadcastState({ countdown: count, gameState: 'lobby' });

        const timer = setInterval(() => {
            count--;
            setCountdown(count);
            broadcastState({ countdown: count, gameState: 'lobby' });

            if (count === 0) {
                clearInterval(timer);
                setGameState('playing');
                setCountdown(null);
                tickCountRef.current = 0;
                setSnakes({
                    p1: [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }],
                    p2: [{ x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 }]
                });
                setDirections({ p1: 'RIGHT', p2: 'LEFT' });
                broadcastState({ gameState: 'playing', countdown: null, snakes: { p1: [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }], p2: [{ x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 }] }, directions: { p1: 'RIGHT', p2: 'LEFT' } });
            }
        }, 1000);
    };

    const handleInput = (dir) => {
        if (gameState !== 'playing' || !myPlayerKey) return;
        if (lastDirectionInput.current === dir) return;

        lastDirectionInput.current = dir;
        channelRef.current.send({
            type: 'broadcast',
            event: 'input',
            payload: { player: myPlayerKey, direction: dir }
        });
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing') return;
            switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup': handleInput('UP'); break;
                case 's': case 'arrowdown': handleInput('DOWN'); break;
                case 'a': case 'arrowleft': handleInput('LEFT'); break;
                case 'd': case 'arrowright': handleInput('RIGHT'); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, myPlayerKey]);

    const GameGrid = () => (
        <div
            className="relative bg-[#0a0a20] rounded-[2rem] border-4 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
            style={isTheater
                ? { width: 'min(calc(100vh - 200px), calc(100vw - 260px))', height: 'min(calc(100vh - 200px), calc(100vw - 260px))' }
                : { width: '100%', maxWidth: 320, aspectRatio: '1/1' }
            }
        >
            <div className="absolute inset-0 grid opacity-[0.03]" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
                {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => <div key={i} className="border-[0.5px] border-white" />)}
            </div>
            <div className="absolute inset-0">
                {snakes.p1.map((seg, i) => (
                    <div key={`p1-${i}`} className="absolute bg-rose-500 rounded-sm" style={{ left: `${seg.x * 5}%`, top: `${seg.y * 5}%`, width: '5%', height: '5%', opacity: i === 0 ? 1 : 0.6 }} />
                ))}
                {snakes.p2.map((seg, i) => (
                    <div key={`p2-${i}`} className="absolute bg-emerald-500 rounded-sm" style={{ left: `${seg.x * 5}%`, top: `${seg.y * 5}%`, width: '5%', height: '5%', opacity: i === 0 ? 1 : 0.6 }} />
                ))}
            </div>
            <AnimatePresence>
                {countdown !== null && (
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 2 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30">
                        <span className="text-8xl font-black text-white italic drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">{countdown}</span>
                    </motion.div>
                )}
                {gameState === 'finished' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4">
                        <Trophy size={52} className={winner === 'p1' ? 'text-rose-400' : winner === 'p2' ? 'text-emerald-400' : 'text-white/40'} />
                        <h3 className="text-white font-black uppercase tracking-widest mt-3 text-sm">Duelo Finalizado</h3>
                        <p className={`text-xl font-black uppercase tracking-widest mb-6 ${winner === 'p1' ? 'text-rose-400' : winner === 'p2' ? 'text-emerald-400' : 'text-white/40'}`}>
                            {winner === 'draw' ? 'Empate Fatal' : `@${winner === 'p1' ? players.p1?.name : players.p2?.name} GANA`}
                        </p>
                        <button onClick={() => { setGameState('lobby'); setPlayers({ p1: null, p2: null }); }} className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-gray-200 active:scale-95 transition-all">
                            <RotateCcw size={14} /> Volver a Jugar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    const DPad = () => (
        <div className="grid grid-cols-3 gap-1.5 w-fit mx-auto">
            <div />
            <button onPointerDown={(e) => { e.preventDefault(); handleInput('UP'); }} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center active:bg-emerald-500 transition-colors touch-none"><ChevronUp className="text-white" size={20} /></button>
            <div />
            <button onPointerDown={(e) => { e.preventDefault(); handleInput('LEFT'); }} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center active:bg-emerald-500 transition-colors touch-none"><ChevronLeft className="text-white" size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); handleInput('DOWN'); }} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center active:bg-emerald-500 transition-colors touch-none"><ChevronDown className="text-white" size={20} /></button>
            <button onPointerDown={(e) => { e.preventDefault(); handleInput('RIGHT'); }} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center active:bg-emerald-500 transition-colors touch-none"><ChevronRight className="text-white" size={20} /></button>
        </div>
    );

    // ── Theater / Fullscreen layout ─────────────────────────────────────────
    if (isTheater) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col bg-[#050518]">
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Zap className="text-emerald-400" size={16} />
                        </div>
                        <h2 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Snake Duel: Resistencia</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onToggleTheater} className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all" title="Vista Normal">
                            <Tv2 size={14} />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Main: sidebar + grid */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="flex-shrink-0 w-48 flex flex-col gap-3 p-4 border-r border-white/5 overflow-y-auto no-scrollbar">
                        {/* P1 */}
                        <div className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${myPlayerKey === 'p1' ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/5 bg-black/20'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl border-2 border-rose-500 overflow-hidden flex-shrink-0">
                                    {players.p1 ? <img src={players.p1.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-rose-500/20 flex items-center justify-center"><User size={14} className="text-rose-500/40" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] text-rose-400 font-black uppercase tracking-widest block">P1 Rojo</span>
                                    <p className="text-xs font-black text-white truncate">{players.p1?.name || 'Esperando...'}</p>
                                </div>
                            </div>
                            {gameState === 'lobby' && !players.p1 && (
                                <button onClick={() => joinGame(1)} className="w-full py-1.5 rounded-xl bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-rose-400 transition-all">
                                    Unirse como P1
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 px-2">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">VS</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        {/* P2 */}
                        <div className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${myPlayerKey === 'p2' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-black/20'}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl border-2 border-emerald-500 overflow-hidden flex-shrink-0">
                                    {players.p2 ? <img src={players.p2.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-emerald-500/20 flex items-center justify-center"><User size={14} className="text-emerald-500/40" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest block">P2 Verde</span>
                                    <p className="text-xs font-black text-white truncate">{players.p2?.name || 'Esperando...'}</p>
                                </div>
                            </div>
                            {gameState === 'lobby' && !players.p2 && (
                                <button onClick={() => joinGame(2)} className="w-full py-1.5 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">
                                    Unirse como P2
                                </button>
                            )}
                        </div>

                        <div className="flex-1" />

                        {gameState === 'lobby' && (
                            <div className="flex flex-col items-center gap-2 py-3 animate-pulse">
                                <UserPlus className="text-emerald-400" size={20} />
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center leading-relaxed">Esperando Duelistas...</span>
                            </div>
                        )}
                        {gameState === 'playing' && (
                            <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest text-center">En Juego</span>
                                {!myPlayerKey && <span className="text-[8px] text-white/30 uppercase tracking-widest text-center">Observando</span>}
                            </div>
                        )}
                    </div>

                    {/* Grid area — fills remaining space */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
                        <GameGrid />
                    </div>
                </div>

                {/* Bottom: D-pad (only if playing) */}
                {gameState === 'playing' && myPlayerKey && (
                    <div className="flex-shrink-0 flex items-center justify-center py-3 border-t border-white/5 bg-black/20">
                        <DPad />
                    </div>
                )}
            </motion.div>
        );
    }

    // ── Card / Normal layout ────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full relative bg-[#050518]/95 backdrop-blur-xl border border-emerald-500/20 rounded-[2.5rem] p-6 mt-4 shadow-[0_40px_100px_rgba(16,185,129,0.3)]"
        >
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[80px] pointer-events-none" />
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
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Zap className="text-emerald-400" size={20} />
                    </div>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Snake Duel: Resistencia</h2>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Actividad 1vs1 • Sin Recompensas</p>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-5 w-full max-w-sm mx-auto px-1">
                <div className={`flex items-center gap-2 flex-1 p-2 rounded-2xl border transition-all min-w-0 ${myPlayerKey === 'p1' ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/5 bg-black/20'}`}>
                    <div className="w-9 h-9 rounded-xl border-2 border-rose-500 overflow-hidden flex-shrink-0">
                        {players.p1 ? <img src={players.p1.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-rose-500/20" />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[8px] text-rose-400 font-black uppercase tracking-widest">P1 Rojo</span>
                        <p className="text-[10px] font-black text-white truncate">{players.p1?.name || '—'}</p>
                    </div>
                    {gameState === 'lobby' && !players.p1 && (
                        <button onClick={() => joinGame(1)} className="text-[7px] bg-rose-500 text-white px-2 py-1 rounded-lg font-black uppercase flex-shrink-0">Unirse</button>
                    )}
                </div>

                <span className="text-white/20 font-black text-xs flex-shrink-0">VS</span>

                <div className={`flex items-center gap-2 flex-1 p-2 rounded-2xl border transition-all min-w-0 ${myPlayerKey === 'p2' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-black/20'}`}>
                    <div className="w-9 h-9 rounded-xl border-2 border-emerald-500 overflow-hidden flex-shrink-0">
                        {players.p2 ? <img src={players.p2.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-emerald-500/20" />}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[8px] text-emerald-400 font-black uppercase tracking-widest">P2 Verde</span>
                        <p className="text-[10px] font-black text-white truncate">{players.p2?.name || '—'}</p>
                    </div>
                    {gameState === 'lobby' && !players.p2 && (
                        <button onClick={() => joinGame(2)} className="text-[7px] bg-emerald-500 text-white px-2 py-1 rounded-lg font-black uppercase flex-shrink-0">Unirse</button>
                    )}
                </div>
            </div>

            <div className="flex justify-center mb-4">
                <GameGrid />
            </div>

            {gameState === 'playing' && myPlayerKey && (
                <div className="mt-4">
                    <DPad />
                </div>
            )}
            {!myPlayerKey && gameState === 'playing' && (
                <div className="mt-4 text-center bg-white/5 py-3 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Observando Duelo en Directo</p>
                </div>
            )}
            {gameState === 'lobby' && (
                <div className="mt-6 text-center animate-pulse">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Esperando a los Duelistas...</p>
                </div>
            )}
        </motion.div>
    );
}
