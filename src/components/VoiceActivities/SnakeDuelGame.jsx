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

                // Grow snakes every 5 seconds (simulated by not slicing last segment if certain condition met)
                // Actually, let's keep length constant for simple "duel" style to avoid overcrowding
                // but maybe we add food? For now, let's just do survival duel.
                // To make it interesting, let's make snakes LONGER every X ticks.
                const tickCount = useRef(0);
                tickCount.current = (tickCount.current || 0) + 1;
                if (tickCount.current % 30 === 0) {
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

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full relative transition-all duration-700 ${isTheater ? 'fixed inset-0 z-[50] flex flex-col md:flex-row items-center justify-center bg-[#050518] p-4 sm:p-8 landscape:flex-row' : 'bg-[#050518]/95 backdrop-blur-xl border border-emerald-500/20 rounded-[2.5rem] p-6 mt-4 shadow-[0_40px_100px_rgba(16,185,129,0.3)]'}`}
        >
            {!isTheater && (
                <>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 blur-[80px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/5 blur-[80px] pointer-events-none" />
                </>
            )}

            <div className="absolute right-6 top-6 flex items-center gap-3 z-30">
                <button
                    onClick={onToggleTheater}
                    className={`p-2 rounded-full transition-all ${isTheater ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/5 text-white/30 hover:text-white hover:bg-white/10'}`}
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
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Zap className="text-emerald-400" size={20} />
                    </div>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">Snake Duel: Resistencia</h2>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Actividad 1vs1 • Sin Recompensas</p>
                </div>
            </div>

            {/* Scoreboard */}
            <div className={`flex items-center gap-4 mb-10 overflow-x-auto no-scrollbar py-2 w-full max-w-sm mx-auto ${isTheater ? 'md:flex-col md:overflow-visible md:gap-8 md:mb-0 md:mr-12 md:max-w-none md:w-40' : 'justify-around'}`}>
                <div className={`p-4 rounded-3xl border transition-all flex-1 text-center ${myPlayerKey === 'p1' ? 'border-rose-500/40 bg-rose-500/5' : 'border-white/5 bg-black/20'} ${isTheater ? 'w-full' : ''}`}>
                    <div className={`rounded-2xl border-2 border-rose-500 overflow-hidden mx-auto mb-2 ${isTheater ? 'w-16 h-16' : 'w-12 h-12'}`}>
                        {players.p1 ? <img src={players.p1.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-rose-500/20" />}
                    </div>
                    <p className={`font-black text-white truncate px-1 ${isTheater ? 'text-xs' : 'text-[10px]'}`}>{players.p1?.name || 'Vacio'}</p>
                    {gameState === 'lobby' && !players.p1 && <button onClick={() => joinGame(1)} className="mt-2 text-[8px] bg-rose-500 text-white px-3 py-1 rounded-lg font-black uppercase">Unirse</button>}
                </div>

                {!isTheater && <div className="text-white/20 font-black italic">VS</div>}

                <div className={`p-4 rounded-3xl border transition-all flex-1 text-center ${myPlayerKey === 'p2' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-black/20'} ${isTheater ? 'w-full' : ''}`}>
                    <div className={`rounded-2xl border-2 border-emerald-500 overflow-hidden mx-auto mb-2 ${isTheater ? 'w-16 h-16' : 'w-12 h-12'}`}>
                        {players.p2 ? <img src={players.p2.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-emerald-500/20" />}
                    </div>
                    <p className={`font-black text-white truncate px-1 ${isTheater ? 'text-xs' : 'text-[10px]'}`}>{players.p2?.name || 'Vacio'}</p>
                    {gameState === 'lobby' && !players.p2 && <button onClick={() => joinGame(2)} className="mt-2 text-[8px] bg-emerald-500 text-white px-3 py-1 rounded-lg font-black uppercase">Unirse</button>}
                </div>
            </div>

            {/* Game Canvas / Grid */}
            <div className={`relative mx-auto w-full max-w-[320px] aspect-square bg-[#0a0a20] rounded-[2rem] border-4 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-700 ${isTheater ? 'scale-110 sm:scale-125 md:scale-150' : 'scale-100'}`}>
                {/* Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-20 grid-rows-20 opacity-[0.03]">
                    {[...Array(GRID_SIZE * GRID_SIZE)].map((_, i) => <div key={i} className="border-[0.5px] border-white" />)}
                </div>

                {/* Snakes */}
                <div className="absolute inset-0">
                    {/* Snake 1 */}
                    {snakes.p1.map((seg, i) => (
                        <div key={`p1-${i}`} className="absolute w-[5%] h-[5%] bg-rose-500 rounded-sm" style={{ left: `${seg.x * 5}%`, top: `${seg.y * 5}%`, opacity: i === 0 ? 1 : 0.6 }} />
                    ))}
                    {/* Snake 2 */}
                    {snakes.p2.map((seg, i) => (
                        <div key={`p2-${i}`} className="absolute w-[5%] h-[5%] bg-emerald-500 rounded-sm" style={{ left: `${seg.x * 5}%`, top: `${seg.y * 5}%`, opacity: i === 0 ? 1 : 0.6 }} />
                    ))}
                </div>

                {/* Countdown Overlay */}
                <AnimatePresence>
                    {countdown !== null && (
                        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 2 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-30">
                            <span className="text-8xl font-black text-white italic drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">{countdown}</span>
                        </motion.div>
                    )}
                    {gameState === 'finished' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4">
                            <Trophy size={60} className={winner === 'p1' ? 'text-rose-400' : winner === 'p2' ? 'text-emerald-400' : 'text-white/40'} />
                            <h3 className="text-white font-black uppercase tracking-widest mt-4">Duelo Finalizado</h3>
                            <p className={`text-xl font-black uppercase tracking-widest mb-8 ${winner === 'p1' ? 'text-rose-400' : winner === 'p2' ? 'text-emerald-400' : 'text-white/40'}`}>
                                {winner === 'draw' ? 'Empate Fatal' : `@${winner === 'p1' ? players.p1?.name : players.p2?.name} GANA`}
                            </p>
                            <button onClick={() => { setGameState('lobby'); setPlayers({ p1: null, p2: null }); }} className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <RotateCcw size={16} /> Volver a Jugar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={`flex flex-col items-center gap-6 ${isTheater ? 'md:absolute md:bottom-12 md:left-1/2 md:-translate-x-1/2' : ''}`}>
                {gameState === 'playing' && myPlayerKey && (
                    <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto mt-8">
                        <div />
                        <button onPointerDown={() => handleInput('UP')} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center active:bg-emerald-500 transition-colors"><ChevronUp className="text-white" /></button>
                        <div />
                        <button onPointerDown={() => handleInput('LEFT')} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center active:bg-emerald-500 transition-colors"><ChevronLeft className="text-white" /></button>
                        <button onPointerDown={() => handleInput('DOWN')} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center active:bg-emerald-500 transition-colors"><ChevronDown className="text-white" /></button>
                        <button onPointerDown={() => handleInput('RIGHT')} className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center active:bg-emerald-500 transition-colors"><ChevronRight className="text-white" /></button>
                    </div>
                )}

                {isTheater && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 animate-pulse md:hidden mt-4">
                        <Smartphone className="text-emerald-400 rotate-90" size={14} />
                        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Gira tu pantalla para mejor vista</span>
                    </div>
                )}
            </div>

            {!myPlayerKey && gameState === 'playing' && (
                <div className="mt-8 text-center bg-white/5 py-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Observando Duelo en Directo</p>
                </div>
            )}

            {gameState === 'lobby' && (
                <div className="mt-8 text-center animate-pulse">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Esperando a los Duelistas...</p>
                </div>
            )}
        </motion.div>
    );
}
