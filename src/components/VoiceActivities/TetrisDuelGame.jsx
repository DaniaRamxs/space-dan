import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, User, Zap, Tv2, Info, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { client } from '../../services/colyseusClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const COLS = 10;
const ROWS = 20;

const TETROMINOS = [
    { name: "I", color: "bg-cyan-400", border: "border-cyan-300", shadow: "shadow-cyan-500/40", shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    { name: "J", color: "bg-blue-500", border: "border-blue-300", shadow: "shadow-blue-500/40", shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    { name: "L", color: "bg-orange-500", border: "border-orange-300", shadow: "shadow-orange-500/40", shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
    { name: "O", color: "bg-yellow-400", border: "border-yellow-200", shadow: "shadow-yellow-500/40", shape: [[1, 1], [1, 1]] },
    { name: "S", color: "bg-green-500", border: "border-green-300", shadow: "shadow-green-500/40", shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    { name: "T", color: "bg-purple-500", border: "border-purple-300", shadow: "shadow-purple-500/40", shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    { name: "Z", color: "bg-red-500", border: "border-red-300", shadow: "shadow-red-500/40", shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] }
];

export default function TetrisDuelGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const joinGame = async () => {
            try {
                const tetrisRoom = await client.joinOrCreate("tetris", {
                    userId: user?.id,
                    name: profile?.username || user?.email?.split('@')[0] || "Anon",
                    avatar: profile?.avatar_url || "/default-avatar.png",
                    roomName: roomName
                });

                setRoom(tetrisRoom);
                setState(tetrisRoom.state);
                setConnecting(false);

                tetrisRoom.onStateChange((newState) => {
                    setState(newState);
                    setTick(t => t + 1);
                });

            } catch (e) {
                console.error("Colyseus Error", e);
                toast.error("Error conectando a la arena de bloques");
                onClose();
            }
        };

        joinGame();
        return () => { if (room) room.leave(); };
    }, []);

    const handleInput = (dir) => {
        if (!room || state?.gameState !== 'playing') return;
        room.send("move", { dir });
    };

    // Keyboard
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (state?.gameState !== 'playing') return;
            switch (e.key) {
                case 'ArrowLeft': case 'a': handleInput('LEFT'); break;
                case 'ArrowRight': case 'd': handleInput('RIGHT'); break;
                case 'ArrowDown': case 's': handleInput('DOWN'); break;
                case 'ArrowUp': case 'w': handleInput('ROTATE'); break;
                case ' ': handleInput('DROP'); e.preventDefault(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [room, state?.gameState]);

    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Sincronizando Boards...
                </p>
            </div>
        );
    }

    const isMeInGame = room.sessionId === state.p1 || room.sessionId === state.p2;

    const handleJoin = (slot) => {
        room.send("join_slot", {
            slot,
            name: profile?.username || "Piloto",
            avatar: profile?.avatar_url
        });
    };

    const handleLeaveSlot = () => { room.send("leave_slot"); };
    const handleReset = () => { room.send("reset"); };

    return (
        <div className="flex-1 flex flex-col relative bg-[#050510] overflow-hidden text-white font-sans">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -z-10" />

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <Zap size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.2em] leading-none">Tetris Duel</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5 font-bold">Arquitectura en Tiempo Real</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onToggleTheater} className="p-2.5 rounded-xl bg-white/5 text-white/30 hover:text-white transition-all border border-white/5 hover:bg-white/10">
                        <Tv2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20 group">
                        <X size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className={`flex-1 flex ${isTheater ? 'flex-col lg:flex-row' : 'flex-col'} overflow-hidden relative`}>

                {/* Sidebar (Players) */}
                <div className={`
                    ${isTheater ? 'w-full lg:w-64 border-b lg:border-b-0 lg:border-r' : 'w-full border-b'}
                    flex-shrink-0 border-white/5 bg-black/20 p-4 sm:p-6 flex 
                    ${isTheater ? 'flex-row lg:flex-col' : 'flex-row justify-center'}
                    gap-4 sm:gap-6 items-center overflow-x-auto no-scrollbar
                `}>
                    <PlayerCard
                        slot={1}
                        player={state.players?.get?.(state.p1)}
                        isMe={room.sessionId === state.p1}
                        onJoin={() => handleJoin(1)}
                        onLeave={handleLeaveSlot}
                        gameState={state.gameState}
                        compact={!isTheater}
                        color="blue"
                    />
                    <div className={`h-px lg:w-full w-4 bg-white/10 ${isTheater ? 'hidden lg:block' : 'hidden'}`} />
                    <PlayerCard
                        slot={2}
                        player={state.players?.get?.(state.p2)}
                        isMe={room.sessionId === state.p2}
                        onJoin={() => handleJoin(2)}
                        onLeave={handleLeaveSlot}
                        gameState={state.gameState}
                        compact={!isTheater}
                        color="rose"
                    />
                </div>

                {/* Boards (Gameplay) */}
                <div className="flex-1 flex flex-row items-center justify-center p-4 sm:p-8 gap-4 sm:gap-8 lg:gap-16 perspective-1000">
                    <div className={`flex flex-col items-center gap-4 transition-all ${isMeInGame && room.sessionId === state.p2 ? 'scale-75 opacity-40 order-2' : 'scale-100 order-1'}`}>
                        <Board board={state.board1} piece={state.p1Piece} gameState={state.gameState} isP1={true} />
                    </div>

                    <div className={`flex flex-col items-center gap-4 transition-all ${isMeInGame && room.sessionId === state.p1 ? 'scale-75 opacity-40 order-2' : 'scale-100 order-1'}`}>
                        <Board board={state.board2} piece={state.p2Piece} gameState={state.gameState} isP1={false} />
                    </div>
                </div>

                {/* Overlays */}
                <AnimatePresence>
                    {state.countdown > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
                            <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 1.5 }} className="text-9xl font-black italic text-blue-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">{state.countdown}</motion.span>
                        </motion.div>
                    )}
                    {state.gameState === 'finished' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#050510]/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8 text-center">
                            <Trophy size={64} className="text-yellow-400 mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mb-2">Duelo Finalizado</h3>
                            <p className="text-2xl font-black uppercase tracking-widest text-white mb-8">
                                @{state.players?.get?.(state.winner)?.name || 'EMPATE'} GANA
                            </p>
                            <div className="flex gap-4">
                                <button onClick={handleReset} className="px-8 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all">Revancha</button>
                                <button onClick={onClose} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[10px]">Salir</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer / Controls */}
            <div className="flex-shrink-0 bg-black/40 border-t border-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Info size={14} className="text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {state.gameState === 'lobby' && "Esperando rivales..."}
                        {state.gameState === 'playing' && "Sincronización en curso"}
                    </span>
                </div>

                {state.gameState === 'playing' && isMeInGame && (
                    <div className="flex gap-2">
                        <DPadBtn icon={ChevronLeft} onClick={() => handleInput('LEFT')} />
                        <DPadBtn icon={RotateCcw} onClick={() => handleInput('ROTATE')} className="bg-purple-500/10 text-purple-400 border-purple-500/20" />
                        <DPadBtn icon={ChevronDown} onClick={() => handleInput('DOWN')} />
                        <DPadBtn icon={ChevronRight} onClick={() => handleInput('RIGHT')} />
                        <DPadBtn icon={ChevronUp} onClick={() => handleInput('DROP')} className="bg-blue-500 text-white" />
                    </div>
                )}
            </div>
        </div>
    );
}

function Board({ board, piece, gameState, isP1 }) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("0"));

    // Fill board
    if (board && typeof board.forEach === 'function') {
        board.forEach((color, i) => {
            grid[Math.floor(i / COLS)][i % COLS] = color;
        });
    }

    // Fill active piece
    if (gameState === 'playing' && piece && typeof piece.get === 'function' && piece.get("type") !== undefined) {
        const typeIndex = piece.get("type");
        const tetromino = TETROMINOS[typeIndex];
        if (tetromino && tetromino.shape) {
            let shape = tetromino.shape;
            const rotation = piece.get("rotation");
            for (let i = 0; i < rotation; i++) {
                shape = shape[0].map((_, index) => shape.map(col => col[index]).reverse());
            }

            shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const bx = x + piece.get("x");
                        const by = y + piece.get("y");
                        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
                            grid[by][bx] = tetromino.color.replace('bg-', '');
                        }
                    }
                });
            });
        }
    }

    return (
        <div className="relative p-1 rounded-2xl bg-black/40 border-4 border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="grid grid-cols-10 gap-0.5" style={{ width: 'min(35vw, 150px)', aspectRatio: '1/2' }}>
                {grid.map((row, y) => row.map((color, x) => (
                    <div
                        key={`${y}-${x}`}
                        className={`w-full h-full rounded-[2px] transition-colors duration-100 ${color === "0" ? 'bg-white/5' :
                            color === "zinc" ? 'bg-zinc-600 border border-zinc-400' :
                                `bg-${color}-500 border border-${color}-300 shadow-[inset_0_0_8px_rgba(255,255,255,0.2)]`
                            }`}
                    />
                )))}
            </div>
        </div>
    );
}

function PlayerCard({ slot, player, isMe, onJoin, onLeave, gameState, compact, color }) {
    const isP1 = slot === 1;
    const isActive = !!player;
    const styles = isP1 ? {
        borderActive: 'border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.15)]',
        borderInner: 'border-blue-500',
        textAccent: 'text-blue-400',
        btn: 'bg-blue-500 text-white'
    } : {
        borderActive: 'border-rose-500 bg-rose-500/5 shadow-[0_0_30px_rgba(244,63,94,0.15)]',
        borderInner: 'border-rose-500',
        textAccent: 'text-rose-400',
        btn: 'bg-rose-500 text-white'
    };

    return (
        <div className={`relative flex lg:flex-col items-center p-2 rounded-2xl transition-all border-2 ${isActive ? styles.borderActive : 'border-white/5 bg-white/5'
            } ${compact ? 'flex-row gap-2' : 'flex-col sm:flex-row lg:flex-col gap-3 min-w-[100px]'}`}>
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 ${isActive ? styles.borderInner : 'border-white/10 grayscale opacity-40'}`}>
                {player ? <img src={player.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/5"><User size={14} className="text-white/10" /></div>}
            </div>
            <div className="flex-1 min-w-0 text-left lg:text-center">
                <p className={`text-[7px] font-black uppercase tracking-widest ${isActive ? styles.textAccent : 'text-white/20'}`}>PILOTO {slot}</p>
                <p className={`text-[9px] font-black uppercase truncate ${isActive ? 'text-white' : 'text-white/10'}`}>{player?.name || 'VACIÓ'}</p>
            </div>
            {gameState === 'lobby' && (
                <div className="flex">
                    {!player ? (
                        <button onClick={onJoin} className={`px-2 py-1 rounded-lg text-[7px] font-black uppercase ${styles.btn}`}>Entrar</button>
                    ) : isMe ? (
                        <button onClick={onLeave} className="px-2 py-1 rounded-lg text-[7px] font-black uppercase bg-white/5 border border-white/10">Salir</button>
                    ) : null}
                </div>
            )}
        </div>
    );
}

function DPadBtn({ icon: Icon, onClick, className = "" }) {
    return (
        <button
            onPointerDown={(e) => { e.preventDefault(); onClick(); }}
            className={`w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center active:bg-blue-500 active:text-white transition-all touch-none ${className}`}
        >
            <Icon size={18} />
        </button>
    );
}

function RotateCcw(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    )
}
