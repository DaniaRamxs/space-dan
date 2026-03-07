import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Play, RotateCcw, User, UserPlus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap, Tv, Tv2, Smartphone } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const COLS = 10;
const ROWS = 20;

const TETROMINOS = {
    I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 'bg-cyan-400' },
    J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-blue-500' },
    L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 'bg-orange-500' },
    O: { shape: [[1, 1], [1, 1]], color: 'bg-yellow-400' },
    S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 'bg-green-500' },
    T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 'bg-purple-500' },
    Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 'bg-red-500' }
};

const RANDOM_PIECE = () => {
    const keys = Object.keys(TETROMINOS);
    return keys[Math.floor(Math.random() * keys.length)];
};

export default function TetrisDuelGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    // Game State
    const [gameState, setGameState] = useState('lobby'); // lobby, playing, finished
    const [players, setPlayers] = useState({ p1: null, p2: null });
    const [winner, setWinner] = useState(null);
    const [countdown, setCountdown] = useState(null);

    // Boards
    const [myBoard, setMyBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
    const [opponentBoard, setOpponentBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));

    // Active Piece (Local only)
    const [piece, setPiece] = useState(null);

    const channelRef = useRef(null);
    const gameLoopRef = useRef(null);
    const boardRef = useRef(myBoard);

    // Sync ref
    useEffect(() => { boardRef.current = myBoard; }, [myBoard]);

    const myPlayerKey = useMemo(() => {
        if (players.p1?.identity === localParticipant?.identity) return 'p1';
        if (players.p2?.identity === localParticipant?.identity) return 'p2';
        return null;
    }, [players, localParticipant]);

    const broadcastEvent = useCallback((event, payload) => {
        if (!channelRef.current) return;
        channelRef.current.send({ type: 'broadcast', event, payload });
    }, []);

    // Pieces Logic
    const spawnPiece = useCallback(() => {
        const type = RANDOM_PIECE();
        const newPiece = {
            pos: { x: 3, y: 0 },
            type: type,
            shape: TETROMINOS[type].shape,
            color: TETROMINOS[type].color
        };

        if (checkCollision(newPiece.pos, newPiece.shape)) {
            endGameLocal();
            return;
        }
        setPiece(newPiece);
    }, []);

    const checkCollision = (pos, shape) => {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const newY = y + pos.y;
                    const newX = x + pos.x;
                    if (newY >= ROWS || newX < 0 || newX >= COLS || (newY >= 0 && boardRef.current[newY][newX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const rotate = (shape) => {
        const rotated = shape[0].map((_, index) => shape.map(col => col[index]).reverse());
        return rotated;
    };

    const handleMove = (dir) => {
        if (!piece || gameState !== 'playing') return;
        const newPos = { x: piece.pos.x + dir.x, y: piece.pos.y + dir.y };
        if (!checkCollision(newPos, piece.shape)) {
            setPiece({ ...piece, pos: newPos });
            return true;
        }
        return false;
    };

    const handleRotate = () => {
        if (!piece || gameState !== 'playing') return;
        const rotated = rotate(piece.shape);
        if (!checkCollision(piece.pos, rotated)) {
            setPiece({ ...piece, shape: rotated });
        }
    };

    const lockPiece = () => {
        const newBoard = boardRef.current.map(row => [...row]);
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = y + piece.pos.y;
                    const boardX = x + piece.pos.x;
                    if (boardY >= 0) newBoard[boardY][boardX] = piece.color;
                }
            });
        });

        // Clear lines
        let cleared = 0;
        const filteredBoard = newBoard.filter(row => {
            const isFull = row.every(cell => cell !== 0);
            if (isFull) cleared++;
            return !isFull;
        });

        while (filteredBoard.length < ROWS) {
            filteredBoard.unshift(Array(COLS).fill(0));
        }

        setMyBoard(filteredBoard);
        setPiece(null);
        spawnPiece();

        // Broadcast board to opponent
        broadcastEvent('tetris_board_sync', { player: myPlayerKey, board: filteredBoard });

        // Garbage system
        if (cleared > 1) {
            let garbageLines = 0;
            if (cleared === 2) garbageLines = 1;
            if (cleared === 3) garbageLines = 2;
            if (cleared === 4) garbageLines = 4;
            broadcastEvent('tetris_garbage', { from: myPlayerKey, lines: garbageLines });
        }
    };

    const drop = () => {
        if (!piece || gameState !== 'playing') return;
        if (!handleMove({ x: 0, y: 1 })) {
            lockPiece();
        }
    };

    const hardDrop = () => {
        if (!piece || gameState !== 'playing') return;
        let currentPos = { ...piece.pos };
        while (!checkCollision({ x: currentPos.x, y: currentPos.y + 1 }, piece.shape)) {
            currentPos.y += 1;
        }
        setPiece({ ...piece, pos: currentPos });
        setTimeout(() => lockPiece(), 0);
    };

    // Game loop
    useEffect(() => {
        if (gameState === 'playing' && myPlayerKey) {
            gameLoopRef.current = setInterval(drop, 800);
            return () => clearInterval(gameLoopRef.current);
        }
    }, [gameState, piece, myPlayerKey]);

    const endGameLocal = () => {
        setGameState('finished');
        const loser = myPlayerKey;
        const winnerKey = loser === 'p1' ? 'p2' : 'p1';
        setWinner(winnerKey);
        broadcastEvent('tetris_game_over', { winner: winnerKey });
        updateStats(user.id, 'loss');
    };

    const updateStats = async (userId, type) => {
        if (!userId) return;
        try {
            const column = type === 'win' ? 'tetris_wins' : 'tetris_losses';
            await supabase.rpc('increment_profile_stat', { profile_id: userId, stat_col: column, inc_val: 1 });
        } catch (e) { }
    };

    // Realtime Sync
    useEffect(() => {
        if (!roomName || !user) return;
        const channel = supabase.channel(`tetris-${roomName.toLowerCase()}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'tetris_board_sync' }, ({ payload }) => {
                if (payload.player !== myPlayerKey) {
                    setOpponentBoard(payload.board);
                }
            })
            .on('broadcast', { event: 'tetris_garbage' }, ({ payload }) => {
                if (payload.from !== myPlayerKey && gameState === 'playing') {
                    // Add garbage lines
                    setMyBoard(prev => {
                        const newBoard = prev.slice(payload.lines);
                        for (let i = 0; i < payload.lines; i++) {
                            const garbage = Array(COLS).fill('bg-zinc-600');
                            garbage[Math.floor(Math.random() * COLS)] = 0;
                            newBoard.push(garbage);
                        }
                        return newBoard;
                    });
                }
            })
            .on('broadcast', { event: 'tetris_game_over' }, ({ payload }) => {
                setGameState('finished');
                setWinner(payload.winner);
                if (myPlayerKey === payload.winner) {
                    updateStats(user.id, 'win');
                }
            })
            .on('broadcast', { event: 'tetris_update_players' }, ({ payload }) => {
                setPlayers(payload.players);
                if (payload.gameState) setGameState(payload.gameState);
                if (payload.countdown !== undefined) setCountdown(payload.countdown);
            })
            .on('broadcast', { event: 'tetris_sync_req' }, () => {
                if (myPlayerKey) {
                    broadcastEvent('tetris_update_players', { players, gameState });
                    broadcastEvent('tetris_board_sync', { player: myPlayerKey, board: boardRef.current });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomName, user, myPlayerKey, players, gameState]);

    const joinGame = (pos) => {
        if (gameState !== 'lobby') return;
        if (players.p1?.identity === localParticipant.identity || players.p2?.identity === localParticipant.identity) return;

        const newPlayers = { ...players };
        const playerData = { id: user.id, identity: localParticipant.identity, name: profile?.username || 'Piloto', avatar: profile?.avatar_url };
        if (pos === 1 && !players.p1) newPlayers.p1 = playerData;
        else if (pos === 2 && !players.p2) newPlayers.p2 = playerData;
        else return;

        setPlayers(newPlayers);
        broadcastEvent('tetris_update_players', { players: newPlayers, gameState: 'lobby' });

        if (newPlayers.p1 && newPlayers.p2) {
            let count = 3;
            setCountdown(count);
            const timer = setInterval(() => {
                count--;
                setCountdown(count);
                if (count === 0) {
                    clearInterval(timer);
                    setGameState('playing');
                    setCountdown(null);
                    setMyBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
                    setOpponentBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(0)));
                    if (myPlayerKey) spawnPiece();
                    broadcastEvent('tetris_update_players', { players: newPlayers, gameState: 'playing', countdown: null });
                }
            }, 1000);
        } else if (pos === 1) {
            toast(`🧊 @${playerData.name} ha lanzado un Tetris Duel.`, { style: { background: '#080b14', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }, icon: '🕹️' });
        }
    };

    useEffect(() => {
        if (gameState === 'playing' && !piece && myPlayerKey) spawnPiece();
    }, [gameState, piece, myPlayerKey]);

    // Controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing') return;
            switch (e.key) {
                case 'ArrowLeft': case 'a': handleMove({ x: -1, y: 0 }); break;
                case 'ArrowRight': case 'd': handleMove({ x: 1, y: 0 }); break;
                case 'ArrowDown': case 's': drop(); break;
                case 'ArrowUp': case 'w': handleRotate(); break;
                case ' ': hardDrop(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [piece, gameState]);

    const renderBoard = (board, isLocal = false) => {
        const displayBoard = board.map(row => [...row]);
        if (isLocal && piece) {
            piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const boardY = y + piece.pos.y;
                        const boardX = x + piece.pos.x;
                        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                            displayBoard[boardY][boardX] = piece.color;
                        }
                    }
                });
            });
        }

        return (
            <div className={`grid grid-cols-10 gap-[1px] bg-black/40 border-2 border-white/10 p-1 rounded-xl shadow-2xl relative ${isLocal ? 'scale-100' : 'scale-90 opacity-80'}`}>
                {displayBoard.map((row, y) => (
                    row.map((cell, x) => (
                        <div key={`${y}-${x}`} className={`aspect-square rounded-sm ${cell || 'bg-black/20'} ${cell ? 'shadow-[inset_0_0_8px_rgba(255,255,255,0.3)]' : ''}`} />
                    ))
                ))}
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full relative transition-all duration-700 ${isTheater ? 'fixed inset-0 z-[50] flex flex-col md:flex-row items-center justify-center bg-[#050518] p-4 landscape:flex-row gap-8 overflow-y-auto' : 'bg-[#050518]/95 backdrop-blur-xl border border-blue-500/20 rounded-[2.5rem] p-6 mt-4 shadow-[0_40px_100px_rgba(59,130,246,0.3)]'}`}
        >
            <div className="absolute right-6 top-6 flex items-center gap-3 z-30">
                <button onClick={onToggleTheater} className={`p-2 rounded-full transition-all ${isTheater ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/5 text-white/30 hover:text-white'}`}>
                    {isTheater ? <Tv2 size={18} /> : <Tv size={18} />}
                </button>
                <button onClick={onClose} className="text-white/30 hover:text-white bg-white/5 p-2 rounded-full"><X size={16} /></button>
            </div>

            <div className={`flex flex-col items-center gap-8 w-full ${isTheater ? 'max-w-4xl' : ''}`}>
                <div className="text-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 justify-center">
                        <span className="text-blue-400">Tetris</span> Duel
                    </h2>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Supervivencia • Envia basura al rival</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 w-full justify-center">
                    {/* My Board */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-blue-500">
                                {players.p1 ? <img src={players.p1.avatar} className="w-full h-full" /> : <div className="bg-white/5 w-full h-full" />}
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{players.p1?.name || (gameState === 'lobby' ? 'Esperando' : '---')}</span>
                            {gameState === 'lobby' && !players.p1 && <button onClick={() => joinGame(1)} className="bg-white text-black px-3 py-1 rounded text-[8px] font-black uppercase">Unirse</button>}
                        </div>
                        <div className="h-[400px] w-[200px]">
                            {renderBoard(myBoard, true)}
                        </div>
                    </div>

                    <div className="text-white/20 font-black italic scale-150 hidden md:block">VS</div>

                    {/* Opponent Board */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-rose-500">
                                {players.p2 ? <img src={players.p2.avatar} className="w-full h-full" /> : <div className="bg-white/5 w-full h-full" />}
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{players.p2?.name || (gameState === 'lobby' ? 'Esperando' : '---')}</span>
                            {gameState === 'lobby' && !players.p2 && <button onClick={() => joinGame(2)} className="bg-white text-black px-3 py-1 rounded text-[8px] font-black uppercase">Unirse</button>}
                        </div>
                        <div className="h-[400px] w-[200px]">
                            {renderBoard(opponentBoard)}
                        </div>
                    </div>
                </div>

                {/* Controls Mobile */}
                {gameState === 'playing' && myPlayerKey && (
                    <div className="grid grid-cols-4 gap-4 w-full max-w-sm mt-4">
                        <button onPointerDown={() => handleMove({ x: -1, y: 0 })} className="h-14 bg-white/5 rounded-2xl flex items-center justify-center active:bg-blue-500/40"><ChevronLeft className="text-white" /></button>
                        <button onPointerDown={handleRotate} className="h-14 bg-white/10 rounded-2xl flex items-center justify-center active:bg-purple-500/40"><RotateCcw className="text-white" /></button>
                        <button onPointerDown={drop} className="h-14 bg-white/5 rounded-2xl flex items-center justify-center active:bg-blue-500/40"><ChevronDown className="text-white" /></button>
                        <button onPointerDown={() => handleMove({ x: 1, y: 0 })} className="h-14 bg-white/5 rounded-2xl flex items-center justify-center active:bg-blue-500/40"><ChevronRight className="text-white" /></button>
                        <button onPointerDown={hardDrop} className="col-span-4 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 border border-blue-500/20 active:bg-blue-500/20">Caida Rápida</button>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {countdown !== null && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[40] flex items-center justify-center">
                        <span className="text-9xl font-black text-white italic animate-zoom-in">{countdown}</span>
                    </motion.div>
                )}
                {gameState === 'finished' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#050518]/90 backdrop-blur-xl z-[50] flex flex-col items-center justify-center p-8">
                        <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
                        <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2">Duelo Terminado</h3>
                        <p className="text-xl font-black text-blue-400 uppercase tracking-widest mb-12 italic">Ganador: @{winner === 'p1' ? players.p1?.name : players.p2?.name}</p>
                        <button onClick={() => { setGameState('lobby'); setPlayers({ p1: null, p2: null }); }} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-105 active:scale-95 transition-all">Volver a Retar</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
