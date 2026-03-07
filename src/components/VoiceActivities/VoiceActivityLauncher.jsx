import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Palette, Skull, Music, X } from 'lucide-react';
import HoldemTable from './HoldemTable';
import CosmicDraw from './CosmicDraw';
import BossRaid from './BossRaid';
import JukeboxDJ from './JukeboxDJ';
import Connect4Game from './Connect4Game';
import SnakeDuelGame from './SnakeDuelGame';
import TetrisDuelGame from './TetrisDuelGame';
import { Zap, Tv, Tv2, Smartphone } from 'lucide-react';

const ACTIVITIES = [
    { id: 'connect4', name: 'Cosmic 4', icon: <Gamepad2 size={24} />, description: 'Duelo 1vs1. Gana 150◈', colorBorder: 'border-purple-500/20', colorBg: 'bg-purple-500/10', colorHover: 'hover:bg-purple-500/20', colorText: 'text-purple-400', disabled: false },
    { id: 'snake', name: 'Snake Duel', icon: <Zap size={24} />, description: 'Duelo 1vs1. Supervivencia', colorBorder: 'border-emerald-500/20', colorBg: 'bg-emerald-500/10', colorHover: 'hover:bg-emerald-500/20', colorText: 'text-emerald-400', disabled: false },
    { id: 'tetris', name: 'Tetris Duel', icon: <Gamepad2 size={24} />, description: 'Duelo 1vs1. Competitivo', colorBorder: 'border-blue-500/20', colorBg: 'bg-blue-500/10', colorHover: 'hover:bg-blue-500/20', colorText: 'text-blue-400', disabled: false },
    { id: 'holdem', name: "Texas Hold'em", icon: <Gamepad2 size={24} />, description: 'Póker de mesa. 500◈ Buy-in', colorBorder: 'border-rose-500/20', colorBg: 'bg-rose-500/10', colorHover: 'hover:bg-rose-500/20', colorText: 'text-rose-400' },
    { id: 'draw', name: 'Dibuja y Adivina', icon: <Palette size={24} />, description: 'Pizarra compartida. Gana ◈', colorBorder: 'border-cyan-500/20', colorBg: 'bg-cyan-500/10', colorHover: 'hover:bg-cyan-500/20', colorText: 'text-cyan-400', disabled: false },
    { id: 'raid', name: 'Boss Raid', icon: <Skull size={24} />, description: 'Evento Co-op Multijugador', colorBorder: 'border-emerald-500/20', colorBg: 'bg-emerald-500/10', colorHover: 'hover:bg-emerald-500/20', colorText: 'text-emerald-400', disabled: false },
    { id: 'dj', name: 'Jukebox DJ', icon: <Music size={24} />, description: 'Música V.I.P Sincronizada', colorBorder: 'border-amber-500/20', colorBg: 'bg-amber-500/10', colorHover: 'hover:bg-amber-500/20', colorText: 'text-amber-400', disabled: false },
];

export default function VoiceActivityLauncher({ roomName, activeActivity, setActiveActivity, isTheater, isFullView, onToggleTheater }) {
    const [isOpen, setIsOpen] = useState(false);

    const commonProps = { roomName, isTheater, isFullView, onToggleTheater, onClose: () => setActiveActivity(null) };

    if (activeActivity === 'holdem') return <HoldemTable {...commonProps} />;
    if (activeActivity === 'draw') return <CosmicDraw {...commonProps} />;
    if (activeActivity === 'raid') return <BossRaid {...commonProps} />;
    if (activeActivity === 'connect4') return <Connect4Game {...commonProps} />;
    if (activeActivity === 'snake') return <SnakeDuelGame {...commonProps} />;
    if (activeActivity === 'tetris') return <TetrisDuelGame {...commonProps} />;
    if (activeActivity === 'dj') return null; // El padre (VoiceRoomUI) lo maneja para persistencia.

    return (
        <div className="relative mt-2">
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 justify-center py-3 px-4 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/20 active:scale-95 transition-all w-full"
            >
                <Gamepad2 size={16} /> Ver Actividades de Voz
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="fixed inset-x-4 max-w-sm mx-auto top-1/2 -translate-y-1/2 bg-[#050518] border border-white/10 rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(168,85,247,0.2)] z-[10020]"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                    Módulo de Juegos
                                </h3>
                                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all"><X size={16} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {ACTIVITIES.map(act => (
                                    <button
                                        key={act.id}
                                        onClick={() => {
                                            if (act.disabled) return;
                                            setActiveActivity(act.id);
                                            setIsOpen(false);
                                        }}
                                        className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${act.disabled ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' :
                                            `${act.colorBg} ${act.colorBorder} ${act.colorHover} active:scale-95`
                                            }`}
                                    >
                                        <div className={`${act.colorText} mb-3`}>{act.icon}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${act.colorText} mb-1`}>{act.name}</div>
                                        <div className="text-[8px] text-white/50 leading-tight uppercase tracking-wide">{act.description}</div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
