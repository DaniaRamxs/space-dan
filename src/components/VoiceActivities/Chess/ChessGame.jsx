import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Trophy, RotateCcw, Flag, Eye, Tv2, ChevronRight, Crown } from 'lucide-react';
import { Chess } from 'chess.js';
import { client } from '../../../services/colyseusClient';
import { useAuthContext } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const UNICODE_PIECES = {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
    k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const END_REASON_LABELS = {
    checkmate: 'Jaque Mate',
    stalemate: 'Ahogado',
    resign: 'Renuncia',
    timeout: 'Tiempo Agotado',
    abandoned: 'Abandono',
    repetition: 'Triple Repetición',
    insufficient_material: 'Material Insuficiente',
    fifty_moves: 'Regla de 50 Movimientos',
};

const CLOCK_OPTIONS = [
    { mode: 'none', label: 'Sin reloj' },
    { mode: '1', label: '1 min' },
    { mode: '3', label: '3 min' },
    { mode: '5', label: '5 min' },
    { mode: '10', label: '10 min' },
];

function formatTime(secs) {
    if (secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── ChessGame (main) ─────────────────────────────────────────────────────────

export default function ChessGame({ roomName, onClose, isTheater, onToggleTheater }) {
    const { user, profile } = useAuthContext();

    // Colyseus
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [connecting, setConnecting] = useState(true);

    // Board interaction
    const [selected, setSelected] = useState(null);   // square string e.g. "e2"
    const [legalTargets, setLegalTargets] = useState([]);     // array of square strings
    const [promotionPend, setPromotionPend] = useState(null); // { from, to }
    const [moveHistory, setMoveHistory] = useState([]);

    // Local chess instance for legal-move calculations (never authoritative)
    const localChess = useRef(new Chess());

    // ── Connect ──────────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        let activeRoom = null;

        const join = async () => {
            try {
                const r = await client.joinOrCreate('chess', {
                    userId: user?.id,
                    username: profile?.username || user?.email?.split('@')[0] || 'Anon',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    roomName,
                });

                if (!mounted) { r.leave(); return; }
                activeRoom = r;
                setRoom(r);
                setState({ ...r.state });
                syncLocalChess(r.state);
                setConnecting(false);

                r.onStateChange((s) => {
                    if (!mounted) return;
                    // Spread garantiza nuevo objeto — React detecta cambio y re-renderiza
                    setState({ ...s });
                    syncLocalChess(s);
                    if (s.moveHistory) setMoveHistory(Array.from(s.moveHistory));
                });
            } catch (e) {
                if (!mounted) return;
                console.error('[Chess] connection error', e);
                toast.error('Error conectando al servidor de Ajedrez');
                onClose();
            }
        };

        join();
        return () => {
            mounted = false;
            if (activeRoom) activeRoom.leave();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function syncLocalChess(s) {
        if (s?.fen) {
            try { localChess.current.load(s.fen); } catch (_) { }
        }
    }

    // Limpiar selección del tablero cuando el servidor confirma un movimiento
    // (state.fen cambia en cada movimiento válido)
    useEffect(() => {
        setSelected(null);
        setLegalTargets([]);
    }, [state?.fen]);

    // ── Derived values ────────────────────────────────────────────────────────
    const myColor = useMemo(() => {
        if (!state || !room || !state.players) return null;
        for (let p of state.players.values()) {
            if (p.sessionId === room.sessionId) return p.color;
        }
        return null;
    }, [state, room]);

    const isFlipped = myColor === 'black';
    const isSpectator = !myColor || myColor === 'spectator';
    const isMyTurn = !isSpectator && (
        (myColor === 'white' && state?.turn === 'w') ||
        (myColor === 'black' && state?.turn === 'b')
    );

    // ── Board interaction ─────────────────────────────────────────────────────
    const handleSquareClick = useCallback((sq) => {
        if (!isMyTurn || state?.phase !== 'playing') return;

        const chess = localChess.current;
        const board = chess.board();
        const fileIdx = sq.charCodeAt(0) - 97;          // a=0 … h=7
        const rankIdx = parseInt(sq[1]) - 1;             // 1-8 → 0-7
        const fenRow = 7 - rankIdx;                     // board[0] = rank 8
        const clickedPc = board[fenRow][fileIdx];
        const myColorLetter = myColor === 'white' ? 'w' : 'b';

        // Already have a selection
        if (selected) {
            if (sq === selected) {
                setSelected(null); setLegalTargets([]); return;
            }
            if (legalTargets.includes(sq)) {
                // Check for promotion
                const moves = chess.moves({ square: selected, verbose: true });
                const isPromo = moves.filter(m => m.to === sq).some(m => m.promotion);
                if (isPromo) {
                    setPromotionPend({ from: selected, to: sq });
                    setSelected(null); setLegalTargets([]);
                } else {
                    room.send('move', { from: selected, to: sq });
                    setSelected(null); setLegalTargets([]);
                }
                return;
            }
            // Click another own piece → switch selection
            if (clickedPc?.color === myColorLetter) {
                const targets = chess.moves({ square: sq, verbose: true });
                setSelected(sq);
                setLegalTargets([...new Set(targets.map(m => m.to))]);
                return;
            }
            setSelected(null); setLegalTargets([]); return;
        }

        // Select own piece
        if (clickedPc?.color === myColorLetter) {
            const targets = chess.moves({ square: sq, verbose: true });
            setSelected(sq);
            setLegalTargets([...new Set(targets.map(m => m.to))]);
        }
    }, [selected, legalTargets, isMyTurn, myColor, state?.phase, room]);

    const handlePromotion = useCallback((piece) => {
        if (!promotionPend) return;
        room.send('move', { from: promotionPend.from, to: promotionPend.to, promotion: piece });
        setPromotionPend(null);
    }, [promotionPend, room]);

    const handleResign = () => {
        if (!room || state?.phase !== 'playing') return;
        room.send('resign');
    };

    const handleRematch = () => {
        if (!room) return;
        room.send('request_rematch');
        toast.success('Revancha solicitada — esperando al rival');
    };

    const handleSetClock = (mode) => {
        if (!room) return;
        room.send('set_clock', { mode });
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (connecting || !state || !room) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#02020a]">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">
                    Conectando partida...
                </p>
            </div>
        );
    }

    // ── Board-level data ──────────────────────────────────────────────────────
    const chess = localChess.current;
    const boardData = chess.board(); // [rank8..rank1][fileA..fileH]

    let checkSquare = null;
    if (state.inCheck && state.phase === 'playing') {
        outer: for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardData[r][c];
                if (p?.type === 'k' && p.color === state.turn) {
                    checkSquare = String.fromCharCode(97 + c) + (8 - r);
                    break outer;
                }
            }
        }
    }

    const whitePlayer = state.whiteSid ? state.players?.get(state.whiteSid) : null;
    const blackPlayer = state.blackSid ? state.players?.get(state.blackSid) : null;
    const showClock = state.clockMode !== 'none';

    // Top player is opponent from my perspective
    const topPlayer = isFlipped ? whitePlayer : blackPlayer;
    const bottomPlayer = isFlipped ? blackPlayer : whitePlayer;
    const topTimeLeft = isFlipped ? state.whiteTime : state.blackTime;
    const bottomTimeLeft = isFlipped ? state.blackTime : state.whiteTime;
    const topActive = isFlipped ? (state.turn === 'w') : (state.turn === 'b');
    const bottomActive = isFlipped ? (state.turn === 'b') : (state.turn === 'w');

    return (
        <div className="flex-1 flex flex-col bg-[#070b14] text-white overflow-hidden min-h-0">

            {/* ── Header ── */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-base select-none">
                        ♛
                    </div>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-widest leading-none">Realtime Chess</h2>
                        <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">Sala: {roomName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSpectator && (
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-white/10 rounded-full text-white/40">
                            <Eye size={10} /> Espectador
                        </span>
                    )}
                    {onToggleTheater && (
                        <button
                            onClick={onToggleTheater}
                            className="p-2 text-white/20 hover:text-white transition-colors"
                        >
                            <Tv2 size={16} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Main area ── */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">

                {/* Board column */}
                <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 gap-2 min-h-0 overflow-auto">

                    {state.phase === 'waiting' ? (
                        <WaitingLobby
                            state={state}
                            room={room}
                            myColor={myColor}
                            onSetClock={handleSetClock}
                        />
                    ) : (
                        <>
                            {/* Opponent */}
                            <PlayerRow
                                player={topPlayer}
                                timeLeft={topTimeLeft}
                                showClock={showClock}
                                isActive={topActive && state.phase === 'playing'}
                                isTop
                            />

                            {/* Board */}
                            <div className="w-full" style={{ maxWidth: 'min(100%, calc(100vh - 280px), 520px)' }}>
                                <ChessBoard
                                    boardData={boardData}
                                    flipped={isFlipped}
                                    selected={selected}
                                    legalTargets={legalTargets}
                                    lastFrom={state.lastFrom}
                                    lastTo={state.lastTo}
                                    checkSquare={checkSquare}
                                    onSquareClick={handleSquareClick}
                                    disabled={!isMyTurn || state.phase !== 'playing'}
                                />
                            </div>

                            {/* Me */}
                            <PlayerRow
                                player={bottomPlayer}
                                timeLeft={bottomTimeLeft}
                                showClock={showClock}
                                isActive={bottomActive && state.phase === 'playing'}
                                isMe
                            />

                            {/* Compact resign (non-theater) */}
                            {!isTheater && !isSpectator && state.phase === 'playing' && (
                                <div className="flex items-center justify-between w-full max-w-sm px-1 pt-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isMyTurn ? 'text-emerald-400' : 'text-white/20'}`}>
                                        {isMyTurn ? '▶ Tu turno' : '⏳ Esperando...'}
                                    </span>
                                    <button
                                        onClick={handleResign}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-all"
                                    >
                                        <Flag size={10} /> Rendirse
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Side panel (theater mode) */}
                {isTheater && state.phase !== 'waiting' && (
                    <div className="w-full lg:w-60 xl:w-72 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-black/20 flex flex-col min-h-0">
                        <MoveHistoryPanel moves={moveHistory} />
                        {!isSpectator && state.phase === 'playing' && (
                            <div className="flex-shrink-0 p-3 border-t border-white/5 flex flex-col gap-2">
                                <div className={`text-center text-[9px] font-black uppercase tracking-widest py-2 rounded-lg ${isMyTurn ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/20 bg-white/5'}`}>
                                    {isMyTurn ? '▶ Tu turno' : '⏳ Rival pensando...'}
                                </div>
                                <button
                                    onClick={handleResign}
                                    className="w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Flag size={12} /> Rendirse
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Promotion picker ── */}
            <AnimatePresence>
                {promotionPend && (
                    <PromotionPicker color={myColor} onPick={handlePromotion} />
                )}
            </AnimatePresence>

            {/* ── Game over overlay ── */}
            <AnimatePresence>
                {state.phase === 'finished' && (
                    <GameOverOverlay
                        state={state}
                        myColor={myColor}
                        whitePlayer={whitePlayer}
                        blackPlayer={blackPlayer}
                        onRematch={handleRematch}
                        onClose={onClose}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── WaitingLobby ─────────────────────────────────────────────────────────────

function WaitingLobby({ state, room, myColor, onSetClock }) {
    const whitePlayer = state.whiteSid ? state.players?.get(state.whiteSid) : null;
    const blackPlayer = state.blackSid ? state.players?.get(state.blackSid) : null;
    const bothReady = state.whiteSid && state.blackSid;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mx-auto flex flex-col gap-5 py-4"
        >
            <div className="text-center">
                <div className="text-3xl mb-2 select-none">♛</div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white">Realtime Chess</h3>
                <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">
                    {bothReady ? '¡Preparados! La partida iniciará...' : 'Esperando oponente...'}
                </p>
            </div>

            {/* Seats */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Blancas', color: 'white', player: whitePlayer, piece: '♔', accent: 'border-amber-200/30 bg-amber-50/5' },
                    { label: 'Negras', color: 'black', player: blackPlayer, piece: '♚', accent: 'border-stone-500/30 bg-stone-500/5' },
                ].map(({ label, color, player, piece, accent }) => (
                    <div key={color} className={`rounded-2xl border p-3 flex flex-col items-center gap-2 ${accent}`}>
                        <span className="text-xl select-none">{piece}</span>
                        <p className={`text-[8px] font-black uppercase tracking-widest ${color === 'white' ? 'text-amber-200/60' : 'text-stone-400/60'}`}>
                            {label}
                        </p>
                        {player ? (
                            <div className="flex flex-col items-center gap-1">
                                <img
                                    src={player.avatar || '/default_user_blank.png'}
                                    className="w-8 h-8 rounded-full border border-white/10"
                                    alt=""
                                />
                                <p className="text-[9px] font-black text-white truncate max-w-[80px] text-center flex items-center gap-1 justify-center">
                                    {player.sessionId === state.hostId && <Crown size={8} className="text-amber-400 flex-shrink-0" />}
                                    @{player.username}
                                </p>
                                {myColor === color && (
                                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white text-black rounded-md">
                                        Tú
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 rounded-full border border-dashed border-white/10 bg-white/5 flex items-center justify-center">
                                    <span className="text-white/10 text-xs text-center leading-none">?</span>
                                </div>
                                <button
                                    onClick={() => room.send("join_game", { side: color })}
                                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[8px] font-black uppercase tracking-widest transition-all border border-white/10"
                                >
                                    Unirse
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Clock picker (only players can set it) */}
            {myColor !== 'spectator' && myColor && (
                <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1">
                        <Clock size={10} /> Control de tiempo
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {CLOCK_OPTIONS.map(({ mode, label }) => (
                            <button
                                key={mode}
                                onClick={() => onSetClock(mode)}
                                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${state.clockMode === mode
                                    ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!bothReady && (
                <div className="flex items-center justify-center gap-2 text-white/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce [animation-delay:300ms]" />
                </div>
            )}
        </motion.div>
    );
}

// ─── PlayerRow ────────────────────────────────────────────────────────────────

function PlayerRow({ player, timeLeft, showClock, isActive, isMe, isTop }) {
    const lowTime = showClock && timeLeft > 0 && timeLeft <= 30;

    return (
        <div className={`w-full max-w-sm flex items-center gap-3 px-1 ${isTop ? '' : ''}`}>
            {/* Avatar */}
            <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden border transition-all duration-300 ${isActive ? 'border-emerald-400/60 shadow-[0_0_10px_rgba(52,211,153,0.25)]' : 'border-white/10 opacity-50'}`}>
                {player ? (
                    <img src={player.avatar || '/default_user_blank.png'} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className="w-full h-full bg-white/5" />
                )}
            </div>

            {/* Name + color */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className={`text-[10px] font-black uppercase truncate transition-colors ${isActive ? 'text-white' : 'text-white/30'}`}>
                        @{player?.username || '...'}
                    </p>
                    {isMe && (
                        <span className="text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white text-black rounded-md flex-shrink-0">
                            Tú
                        </span>
                    )}
                </div>
                <p className={`text-[7px] uppercase tracking-widest ${isActive ? 'text-emerald-400/60' : 'text-white/15'}`}>
                    {player?.color === 'white' ? '♔ Blancas' : player?.color === 'black' ? '♚ Negras' : '—'}
                </p>
            </div>

            {/* Clock */}
            {showClock && (
                <div className={`flex-shrink-0 font-black tabular-nums text-sm px-2.5 py-1 rounded-lg border transition-all duration-300 ${isActive
                    ? lowTime
                        ? 'text-red-400 border-red-500/40 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                        : 'text-white border-emerald-500/30 bg-emerald-500/10'
                    : 'text-white/20 border-white/5 bg-white/5'
                    }`}>
                    {formatTime(timeLeft)}
                </div>
            )}
        </div>
    );
}

// ─── ChessBoard ───────────────────────────────────────────────────────────────

function ChessBoard({ boardData, flipped, selected, legalTargets, lastFrom, lastTo, checkSquare, onSquareClick, disabled }) {
    const files = flipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = flipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];

    const squares = [];
    for (let vRow = 0; vRow < 8; vRow++) {
        for (let vCol = 0; vCol < 8; vCol++) {
            // Map visual position → FEN board position
            const fenRow = flipped ? 7 - vRow : vRow;
            const fenCol = flipped ? 7 - vCol : vCol;
            const piece = boardData[fenRow][fenCol];

            // Square name
            const fileChar = String.fromCharCode(97 + (flipped ? 7 - vCol : vCol));
            const rankNum = flipped ? vRow + 1 : 8 - vRow;
            const sq = fileChar + rankNum;

            // Light / dark
            const fileIdx = flipped ? 7 - vCol : vCol;
            const rankIdx = rankNum - 1; // 0-based
            const isLight = (fileIdx + rankIdx) % 2 !== 0;

            const isSelected = selected === sq;
            const isTarget = legalTargets.includes(sq);
            const isLastMove = lastFrom === sq || lastTo === sq;
            const isCheck = checkSquare === sq;
            const showFileLabel = vRow === 7;
            const showRankLabel = vCol === 0;

            squares.push(
                <ChessSquare
                    key={sq}
                    sq={sq}
                    piece={piece}
                    isLight={isLight}
                    isSelected={isSelected}
                    isTarget={isTarget}
                    isLastMove={isLastMove}
                    isCheck={isCheck}
                    fileLabel={showFileLabel ? files[vCol] : null}
                    rankLabel={showRankLabel ? ranks[vRow] : null}
                    onClick={() => !disabled && onSquareClick(sq)}
                />
            );
        }
    }

    return (
        <div className="w-full aspect-square rounded-lg overflow-hidden shadow-2xl border border-white/10 grid grid-cols-8">
            {squares}
        </div>
    );
}

// ─── ChessSquare ──────────────────────────────────────────────────────────────

function ChessSquare({ sq, piece, isLight, isSelected, isTarget, isLastMove, isCheck, fileLabel, rankLabel, onClick }) {
    // Board colors — classic Lichess palette
    let bgClass;
    if (isCheck) {
        bgClass = 'bg-red-500/75';
    } else if (isSelected) {
        bgClass = isLight ? 'bg-[#f6f669]' : 'bg-[#bac946]';
    } else if (isLastMove) {
        bgClass = isLight ? 'bg-[#cdd26a]/80' : 'bg-[#aaa23a]/80';
    } else {
        bgClass = isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]';
    }

    const isWhitePiece = piece?.color === 'w';
    const pieceChar = piece
        ? UNICODE_PIECES[isWhitePiece ? piece.type.toUpperCase() : piece.type]
        : null;

    return (
        <div
            className={`relative flex items-center justify-center cursor-pointer select-none aspect-square ${bgClass} transition-colors duration-75`}
            onClick={onClick}
        >
            {/* Piece */}
            {pieceChar && (
                <motion.span
                    key={`${sq}-${pieceChar}`}
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    className={`z-10 leading-none pointer-events-none text-[clamp(14px,4.5vmin,40px)] ${isWhitePiece
                        ? 'text-[#fffdf0] [text-shadow:0_2px_4px_rgba(0,0,0,0.9),0_1px_2px_rgba(0,0,0,0.8)]'
                        : 'text-[#1a1008] [text-shadow:0_1px_2px_rgba(255,255,255,0.15)]'
                        }`}
                    style={{ userSelect: 'none' }}
                >
                    {pieceChar}
                </motion.span>
            )}

            {/* Legal move dot (empty square) */}
            {isTarget && !piece && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-[30%] h-[30%] rounded-full bg-black/25" />
                </div>
            )}

            {/* Legal move ring (occupied square) */}
            {isTarget && piece && (
                <div className="absolute inset-0 rounded-none border-[4px] border-black/25 pointer-events-none z-20" />
            )}

            {/* Hover highlight */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/[0.06] transition-colors pointer-events-none z-30" />

            {/* Coordinate labels */}
            {rankLabel && (
                <span className={`absolute top-0.5 left-0.5 text-[clamp(6px,1.2vmin,10px)] font-black leading-none pointer-events-none z-40 ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {rankLabel}
                </span>
            )}
            {fileLabel && (
                <span className={`absolute bottom-0.5 right-0.5 text-[clamp(6px,1.2vmin,10px)] font-black leading-none pointer-events-none z-40 ${isLight ? 'text-[#b58863]' : 'text-[#f0d9b5]'}`}>
                    {fileLabel}
                </span>
            )}
        </div>
    );
}

// ─── PromotionPicker ──────────────────────────────────────────────────────────

function PromotionPicker({ color, onPick }) {
    const pieces = ['q', 'r', 'b', 'n'];
    const isWhite = color === 'white';
    const labels = { q: 'Reina', r: 'Torre', b: 'Alfil', n: 'Caballo' };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
        >
            <motion.div
                initial={{ scale: 0.85, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#0d1117] border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-5 shadow-2xl"
            >
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                    Promoción de Peón
                </p>
                <div className="flex gap-3">
                    {pieces.map((p) => {
                        const char = UNICODE_PIECES[isWhite ? p.toUpperCase() : p];
                        return (
                            <button
                                key={p}
                                onClick={() => onPick(p)}
                                className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 hover:border-white/30 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group"
                            >
                                <span className={`text-3xl leading-none ${isWhite ? 'text-[#fffdf0] [text-shadow:0_2px_4px_rgba(0,0,0,0.9)]' : 'text-[#1a1008] [text-shadow:0_1px_2px_rgba(255,255,255,0.15)]'}`}>
                                    {char}
                                </span>
                                <span className="text-[7px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/60 transition-colors">
                                    {labels[p]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── GameOverOverlay ──────────────────────────────────────────────────────────

function GameOverOverlay({ state, myColor, whitePlayer, blackPlayer, onRematch, onClose }) {
    const isDraw = state.winner === 'draw';
    const iWon = !isDraw && state.winner === myColor;
    const isSpectator = !myColor || myColor === 'spectator';

    const winnerPlayer = state.winner === 'white' ? whitePlayer : blackPlayer;
    const reason = END_REASON_LABELS[state.endReason] || state.endReason;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#050510]/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
        >
            <motion.div
                initial={{ scale: 0.85, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 130 }}
                className="text-center flex flex-col items-center gap-6 max-w-xs"
            >
                {isDraw ? (
                    <>
                        <div className="text-5xl select-none">🤝</div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">Tablas</p>
                            <h3 className="text-2xl font-black uppercase tracking-widest text-white/60">{reason}</h3>
                        </div>
                    </>
                ) : (
                    <>
                        <Trophy
                            size={72}
                            className={`p-4 rounded-3xl bg-white/5 ${iWon ? 'text-amber-400' : isSpectator ? 'text-emerald-400' : 'text-white/20'}`}
                        />
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-1 ${iWon ? 'text-amber-400/60' : 'text-white/30'}`}>
                                {isSpectator ? 'Victoria' : iWon ? '¡Victoria!' : 'Derrota'}
                            </p>
                            <h3 className="text-3xl font-black uppercase tracking-wide text-white mb-1">
                                {winnerPlayer ? `@${winnerPlayer.username}` : state.winner}
                            </h3>
                            <p className="text-[9px] text-white/30 uppercase tracking-widest">{reason}</p>
                        </div>
                    </>
                )}

                <div className="flex gap-3 w-full">
                    {!isSpectator && (
                        <button
                            onClick={onRematch}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[9px] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.15)]"
                        >
                            <RotateCcw size={12} /> Revancha
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all"
                    >
                        Salir
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─── MoveHistoryPanel ─────────────────────────────────────────────────────────

function MoveHistoryPanel({ moves }) {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [moves.length]);

    const pairs = [];
    for (let i = 0; i < moves.length; i += 2) {
        pairs.push({ num: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] || '' });
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
                <p className="text-[8px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                    <ChevronRight size={10} /> Historial · {moves.length} movimientos
                </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {pairs.length === 0 ? (
                    <p className="text-[8px] text-white/15 uppercase tracking-widest text-center py-4">
                        Sin movimientos aún
                    </p>
                ) : (
                    pairs.map((pair) => (
                        <div key={pair.num} className="flex gap-1 text-[10px] font-mono">
                            <span className="text-white/20 w-6 flex-shrink-0 text-right">{pair.num}.</span>
                            <span className="text-white/80 flex-1 min-w-0">{pair.white}</span>
                            <span className="text-white/50 flex-1 min-w-0">{pair.black}</span>
                        </div>
                    ))
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
}
