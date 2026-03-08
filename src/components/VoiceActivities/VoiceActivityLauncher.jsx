import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gamepad2, Skull, Music, Zap, Coins, Layers, PenLine, Sparkles, Minimize2, Maximize2, Smartphone, Rocket, Crosshair } from 'lucide-react';
import PokerGame from './PokerGame';
import Connect4Game from './Connect4Game';
import SnakeDuelGame from './SnakeDuelGame';
import TetrisDuelGame from './TetrisDuelGame';
import Starboard from './Starboard';
import AsteroidBattleGame from './AsteroidBattleGame';
import BlackjackGame from './Blackjack/BlackjackGame';
import ChessGame from './Chess/ChessGame';
import PixelGalaxyGame from './PixelGalaxy/PixelGalaxyGame';
import CoOpPuzzleGame from './CoOpPuzzle/CoOpPuzzleGame';

const ACTIVITIES = [
    {
        id: 'connect4', name: 'Cosmic 4', tag: 'Duelo',
        mode: 'colyseus',
        icon: Gamepad2,
        description: 'Conecta 4 fichas antes que tu rival',
        reward: '150',
        border: 'border-purple-500/30', bg: 'bg-purple-500/5',
        hover: 'hover:bg-purple-500/10 hover:border-purple-500/50',
        accent: 'bg-purple-500', text: 'text-purple-400',
        tagBg: 'bg-purple-500/20 text-purple-400',
    },
    {
        id: 'snake', name: 'Snake Duel', tag: 'Duelo',
        mode: 'colyseus',
        icon: Zap,
        description: 'Serpientes 1vs1. Sobrevive mas tiempo',
        reward: null,
        border: 'border-emerald-500/30', bg: 'bg-emerald-500/5',
        hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/50',
        accent: 'bg-emerald-500', text: 'text-emerald-400',
        tagBg: 'bg-emerald-500/20 text-emerald-400',
    },
    {
        id: 'tetris', name: 'Tetris Duel', tag: 'Duelo',
        mode: 'colyseus',
        icon: Smartphone,
        description: 'Tetris competitivo. Envia basura al rival',
        reward: null,
        border: 'border-blue-500/30', bg: 'bg-blue-500/5',
        hover: 'hover:bg-blue-500/10 hover:border-blue-500/50',
        accent: 'bg-blue-500', text: 'text-blue-400',
        tagBg: 'bg-blue-500/20 text-blue-400',
    },
    {
        id: 'poker', name: "Poker", tag: 'Casino',
        mode: 'colyseus',
        icon: Coins,
        description: 'Texas Hold\'em multinivel en tiempo real',
        reward: 'Bote',
        border: 'border-emerald-500/30', bg: 'bg-emerald-500/5',
        hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/50',
        accent: 'bg-emerald-500', text: 'text-emerald-400',
        tagBg: 'bg-emerald-500/20 text-emerald-400',
    },
    {
        id: 'starboard', name: 'Starboard', tag: 'Social',
        mode: 'colyseus',
        icon: Sparkles,
        description: 'Pizarra Pro compartida. GIFs, capas y Colyseus real-time',
        reward: null,
        border: 'border-cyan-500/30', bg: 'bg-cyan-500/5',
        hover: 'hover:bg-cyan-500/10 hover:border-cyan-500/50',
        accent: 'bg-cyan-500', text: 'text-cyan-400',
        tagBg: 'bg-cyan-500/20 text-cyan-400',
    },
    {
        id: 'dj', name: 'Jukebox DJ', tag: 'Musica',
        icon: Music,
        description: 'Musica sincronizada V.I.P para la sala',
        reward: null,
        border: 'border-orange-500/30', bg: 'bg-orange-500/5',
        hover: 'hover:bg-orange-500/10 hover:border-orange-500/50',
        accent: 'bg-orange-500', text: 'text-orange-400',
        tagBg: 'bg-orange-500/20 text-orange-400',
        mode: 'api'
    },
    {
        id: 'blackjack', name: 'Blackjack', tag: 'Casino',
        icon: Coins,
        description: 'Mesa de Blackjack multijugador en tiempo real',
        reward: 'Casa/Player',
        border: 'border-rose-500/30', bg: 'bg-rose-500/5',
        hover: 'hover:bg-rose-500/10 hover:border-rose-500/50',
        accent: 'bg-rose-500', text: 'text-rose-400',
        tagBg: 'bg-rose-500/20 text-rose-400',
        mode: 'colyseus'
    },
    {
        id: 'chess', name: 'Realtime Chess', tag: 'Duelo',
        mode: 'colyseus',
        icon: Gamepad2,
        description: 'Ajedrez 1vs1 con sincronización en tiempo real',
        reward: null,
        border: 'border-emerald-500/30', bg: 'bg-emerald-500/5',
        hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/50',
        accent: 'bg-emerald-500', text: 'text-emerald-400',
        tagBg: 'bg-emerald-500/20 text-emerald-400',
    },
    {
        id: 'pixel-galaxy', name: 'Pixel Galaxy', tag: 'Co-op',
        mode: 'colyseus',
        icon: Sparkles,
        description: 'Construye una galaxia pixel art en tiempo real',
        reward: null,
        border: 'border-purple-500/30', bg: 'bg-purple-500/5',
        hover: 'hover:bg-purple-500/10 hover:border-purple-500/50',
        accent: 'bg-purple-500', text: 'text-purple-400',
        tagBg: 'bg-purple-500/20 text-purple-400',
    },
    {
        id: 'asteroid-battle', name: 'Asteroid Battle', tag: 'Duelo',
        mode: 'colyseus',
        icon: Rocket,
        description: 'Arena espacial masiva. Dispara y sobrevive.',
        reward: 'Puntos',
        border: 'border-cyan-500/30', bg: 'bg-cyan-500/5',
        hover: 'hover:bg-cyan-500/10 hover:border-cyan-500/50',
        accent: 'bg-cyan-500', text: 'text-cyan-400',
        tagBg: 'bg-cyan-500/20 text-cyan-400',
    },
    {
        id: 'puzzle', name: 'Co-Op Puzzle', tag: 'Co-op',
        mode: 'colyseus',
        icon: ImageIcon,
        description: 'Resuelve rompecabezas en equipo con fotos reales',
        reward: 'Social',
        border: 'border-emerald-500/30', bg: 'bg-emerald-500/5',
        hover: 'hover:bg-emerald-500/10 hover:border-emerald-500/50',
        accent: 'bg-emerald-500', text: 'text-emerald-400',
        tagBg: 'bg-emerald-500/20 text-emerald-400',
    },
];

const ALL_TAGS = ['Todos', 'Duelo', 'Co-op', 'Social', 'Casino', 'Musica'];

export default function VoiceActivityLauncher({ roomName, activeActivity, setActiveActivity, isTheater, isFullView, onToggleTheater }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTag, setActiveTag] = useState('Todos');
    const [minimized, setMinimized] = useState(false);
    // Pill position — starts centered at bottom
    const [pillPos, setPillPos] = useState(null); // null = default centered
    const dragRef = useRef(null); // { startX, startY, originX, originY }
    const pillRef = useRef(null);

    // Reset minimized + position when activity changes
    useEffect(() => { setMinimized(false); setPillPos(null); }, [activeActivity]);

    // Drag handlers (mouse + touch)
    const startDrag = useCallback((clientX, clientY) => {
        const el = pillRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            originX: rect.left,
            originY: rect.top,
        };

        const onMove = (e) => {
            if (e.cancelable) e.preventDefault();
            const cx = e.touches ? e.touches[0].clientX : e.clientX;
            const cy = e.touches ? e.touches[0].clientY : e.clientY;
            const { startX, startY, originX, originY } = dragRef.current;
            const newX = originX + (cx - startX);
            const newY = originY + (cy - startY);

            // Loose clamping to allow movement across entire viewport
            const clampedX = Math.max(-50, Math.min(window.innerWidth - 50, newX));
            const clampedY = Math.max(0, Math.min(window.innerHeight - 50, newY));
            setPillPos({ x: clampedX, y: clampedY });
        };

        const onUp = () => {
            dragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
    }, []);

    const handleClose = () => {
        setActiveActivity(null);
        setMinimized(false);
    };

    const commonProps = {
        roomName,
        isTheater: true,
        isFullView: true,
        onToggleTheater,
        onClose: handleClose,
    };

    // ── Fullscreen active activity ──────────────────────────────────────────
    if (activeActivity && activeActivity !== 'dj') {
        if (!minimized) {
            return createPortal(
                <>
                    {/* Fullscreen wrapper */}
                    <div className="fixed inset-0 z-[10020] bg-[#04040f] overflow-hidden flex flex-col">
                        {activeActivity === 'poker' && <PokerGame   {...commonProps} />}
                        {activeActivity === 'connect4' && <Connect4Game  {...commonProps} />}
                        {activeActivity === 'snake' && <SnakeDuelGame {...commonProps} />}
                        {activeActivity === 'tetris' && <TetrisDuelGame {...commonProps} />}
                        {activeActivity === 'starboard' && <Starboard     {...commonProps} />}
                        {activeActivity === 'asteroid-battle' && <AsteroidBattleGame {...commonProps} />}
                        {activeActivity === 'blackjack' && <BlackjackGame {...commonProps} />}
                        {activeActivity === 'chess' && <ChessGame {...commonProps} />}
                        {activeActivity === 'pixel-galaxy' && <PixelGalaxyGame {...commonProps} />}
                        {activeActivity === 'puzzle' && <CoOpPuzzleGame {...commonProps} />}
                    </div>

                    {/* Floating minimize button — fixed so it stays on top of any z-index inside the wrapper */}
                    {activeActivity !== 'starboard' && (
                        <div className="fixed bottom-5 right-5 z-[10025] flex items-center gap-2">
                            <motion.button
                                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.6, type: 'spring', damping: 20 }}
                                onClick={() => setMinimized(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/70 border border-white/15 text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-xl transition-all hover:bg-black/90 shadow-2xl active:scale-95"
                            >
                                <Minimize2 size={11} />
                                Minimizar
                            </motion.button>
                        </div>
                    )}
                </>,
                document.body
            );
        }

        // ── Minimized pill (arrastrable) ──────────────────────────────────
        const actData = ACTIVITIES.find(a => a.id === activeActivity);
        const Icon = actData?.icon || Gamepad2;

        const pillStyle = pillPos
            ? { position: 'fixed', left: pillPos.x, top: pillPos.y, zIndex: 10020 }
            : { position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 10020 };

        return createPortal(
            <motion.div
                ref={pillRef}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ ...pillStyle, touchAction: 'none' }}
                className="flex items-center gap-3 px-4 py-2.5 bg-[#07071a]/95 border border-white/15 rounded-2xl backdrop-blur-xl shadow-2xl select-none touch-none"
            >
                {/* Drag handle */}
                <div
                    className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing pr-1 border-r border-white/10"
                    onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
                    onTouchStart={(e) => {
                        // No preventDefault here to allow actual clicks on buttons inside
                        startDrag(e.touches[0].clientX, e.touches[0].clientY);
                    }}
                >
                    {/* grip dots */}
                    <div className="flex flex-col gap-[3px]">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="flex gap-[3px]">
                                <div className="w-[3px] h-[3px] rounded-full bg-white/25" />
                                <div className="w-[3px] h-[3px] rounded-full bg-white/25" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                <Icon size={14} className={actData?.text || 'text-purple-400'} />
                <span className="text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap">
                    {actData?.name}
                </span>

                <button
                    onClick={() => setMinimized(false)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-all border border-purple-500/20 flex-shrink-0"
                >
                    <Maximize2 size={9} />
                    Restaurar
                </button>
                <button
                    onClick={handleClose}
                    className="p-1 text-white/30 hover:text-rose-400 transition-colors flex-shrink-0"
                >
                    <X size={12} />
                </button>
            </motion.div>,
            document.body
        );
    }

    if (activeActivity === 'dj') return null;

    // ── Launcher UI ────────────────────────────────────────────────────────
    const filtered = activeTag === 'Todos' ? ACTIVITIES : ACTIVITIES.filter(a => a.tag === activeTag);

    return (
        <div className="relative mt-2">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="group relative w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 hover:border-purple-500/40 active:scale-[0.98] transition-all overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center gap-2.5 relative z-10">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <Sparkles size={14} className="text-purple-400" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-tight">Modulo de Actividades</span>
                        <span className="text-[8px] text-purple-400/70 uppercase tracking-widest">{ACTIVITIES.length} actividades disponibles</span>
                    </div>
                </div>
                <span className="text-[8px] font-black text-purple-400 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-500/20 uppercase tracking-widest relative z-10 flex-shrink-0">
                    Ver
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop — centrador flex en PC */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[10010] bg-black/70 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-6 lg:p-10"
                        >
                            {/* Modal */}
                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                onClick={e => e.stopPropagation()}
                                className="flex flex-col overflow-hidden bg-[#07071a] border border-white/10 shadow-[0_30px_80px_rgba(139,92,246,0.25)]
                                           absolute inset-x-2 top-10 bottom-2 rounded-[1.75rem]
                                           sm:static sm:inset-auto sm:w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl sm:max-h-[85vh] sm:rounded-[2rem]"
                            >
                                {/* Header */}
                                <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                            <Sparkles size={15} className="text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-xs sm:text-sm leading-tight">Modulo de Actividades</h3>
                                            <p className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">Sala activa: {roomName}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all flex-shrink-0"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>

                                {/* Filtros */}
                                <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
                                    {ALL_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => setActiveTag(tag)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeTag === tag
                                                ? 'bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                                                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 border border-white/10'
                                                }`}
                                        >
                                            {tag}
                                            {tag === 'Todos' && (
                                                <span className="ml-1.5 opacity-60">{ACTIVITIES.length}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Grid scrollable */}
                                <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6">
                                    <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                        <AnimatePresence mode="popLayout">
                                            {filtered.map((act) => {
                                                const Icon = act.icon;
                                                return (
                                                    <motion.button
                                                        key={act.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.88 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.88 }}
                                                        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                                                        onClick={() => {
                                                            setActiveActivity(act.id);
                                                            setIsOpen(false);
                                                        }}
                                                        className={`relative flex flex-col text-left p-3 sm:p-4 rounded-2xl border transition-all active:scale-95 group overflow-hidden ${act.bg} ${act.border} ${act.hover}`}
                                                    >
                                                        <div className={`absolute top-0 left-0 right-0 h-[2px] ${act.accent} opacity-50 group-hover:opacity-100 transition-opacity`} />
                                                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${act.bg} ${act.border}`}>
                                                            <Icon size={20} className={act.text} />
                                                        </div>
                                                        <span className={`inline-block text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full mb-1.5 w-fit ${act.tagBg}`}>
                                                            {act.tag}
                                                        </span>
                                                        <p className={`text-[11px] sm:text-xs font-black uppercase tracking-wide leading-tight mb-1 ${act.text}`}>
                                                            {act.name}
                                                        </p>
                                                        <p className="text-[9px] sm:text-[10px] text-white/40 leading-snug flex-1">
                                                            {act.description}
                                                        </p>
                                                        {act.reward && (
                                                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1">
                                                                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Premio:</span>
                                                                <span className={`text-[9px] font-black ${act.text}`}>{act.reward}</span>
                                                            </div>
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </motion.div>

                                    {filtered.length === 0 && (
                                        <div className="flex items-center justify-center py-20">
                                            <p className="text-white/20 text-[10px] uppercase tracking-widest font-black">Sin actividades en esta categoria</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/5">
                                    <span className="text-[8px] text-white/20 uppercase tracking-widest font-black">
                                        {filtered.length} actividad{filtered.length !== 1 ? 'es' : ''}
                                    </span>
                                    <span className="text-[8px] text-purple-400/40 uppercase tracking-widest font-black">
                                        Space Dan · Voz activa
                                    </span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
