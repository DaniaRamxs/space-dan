import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Mic, ChevronDown, ChevronUp, Plus, Users } from 'lucide-react';

export default function VoicePartyBar({ activeParticipants = [], onJoin, onCreateRoom, isActive, currentRoom }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [customRoom, setCustomRoom] = useState('');

    const inVoice = activeParticipants.filter(u => u.inVoice);
    const onlineOnly = activeParticipants.filter(u => !u.inVoice);
    const totalOnline = activeParticipants.length;

    const handleCreateRoom = () => {
        if (!customRoom.trim()) return;
        onCreateRoom(customRoom.trim());
        setCustomRoom('');
        setIsExpanded(false);
    };

    return (
        <div className="border-b border-white/10 relative z-10">
            {/* Barra principal siempre visible */}
            <div className={`p-3 px-4 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 backdrop-blur-xl flex items-center justify-between transition-all ${!isExpanded && 'hover:from-purple-900/50 hover:to-cyan-900/50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-white/10 text-white/40 border border-white/10'}`}>
                        {isActive ? <Mic size={20} className="animate-pulse" /> : <Radio size={20} />}
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-cyan-400' : 'text-white/40'}`}>
                            {isActive ? 'Transmisión Activa' : 'Sala de Voz'}
                        </span>
                        <h4 className="text-xs font-bold text-white/90">{currentRoom || 'Sala Galáctica'}</h4>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-white/40">
                        <Users size={12} />
                        <span className="text-[10px] font-black">{totalOnline}</span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(v => !v)}
                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
                    >
                        {isExpanded
                            ? <ChevronUp size={14} className="text-white/60" />
                            : <ChevronDown size={14} className="text-white/60" />}
                    </button>
                </div>
            </div>

            {/* Panel expandible */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-black/30 border-b border-white/5"
                    >
                        <div className="p-4 space-y-4">

                            {/* En voz ahora */}
                            {inVoice.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400/60">🎙️ En Voz Ahora</p>
                                    <div className="flex flex-wrap gap-2">
                                        {inVoice.map((p, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-cyan-500/10 rounded-xl px-3 py-1.5 border border-cyan-500/20">
                                                <img src={p.avatar_url || '/default_user_blank.png'} className="w-5 h-5 rounded-full object-cover" alt="" />
                                                <span className="text-[10px] font-bold text-cyan-300">{p.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Online en el chat */}
                            {onlineOnly.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                                        {inVoice.length > 0 ? '💬 En el Chat' : '🌐 Conectados'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {onlineOnly.map((p, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
                                                <img src={p.avatar_url || '/default_user_blank.png'} className="w-5 h-5 rounded-full object-cover" alt="" />
                                                <span className="text-[10px] font-bold text-white/70">{p.username}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {totalOnline === 0 && (
                                <p className="text-[9px] text-white/20 uppercase font-black tracking-widest text-center py-1">
                                    Sin viajeros en línea...
                                </p>
                            )}

                            {/* Botón unirse / abrir control */}
                            <button
                                onClick={() => { onJoin(); setIsExpanded(false); }}
                                className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
                            >
                                {isActive ? 'Abrir Control de Voz' : `Unirse · ${currentRoom || 'Sala Galáctica'}`}
                            </button>

                            {/* Crear sala temporal (solo si no está en voz) */}
                            {!isActive && (
                                <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Crear Sala Temporal</p>
                                    <div className="flex gap-2">
                                        <input
                                            value={customRoom}
                                            onChange={e => setCustomRoom(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                                            placeholder="Nombre de sala..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 transition-all"
                                        />
                                        <button
                                            onClick={handleCreateRoom}
                                            disabled={!customRoom.trim()}
                                            className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
