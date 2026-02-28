import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Users, Mic, ChevronRight, X } from 'lucide-react';

export default function VoicePartyBar({ activeParticipants = [], onJoin, isActive }) {
    return (
        <div className="voice-party-bar p-3 px-4 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border-b border-white/10 backdrop-blur-xl flex items-center justify-between group cursor-pointer hover:from-purple-900/50 hover:to-cyan-900/50 transition-all" onClick={onJoin}>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-white/10 text-white/40 border border-white/10'}`}>
                        {isActive ? <Mic size={20} className="animate-pulse" /> : <Radio size={20} />}
                    </div>
                    {!isActive && activeParticipants.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#050510] flex items-center justify-center">
                            <span className="text-[8px] font-black text-white">{activeParticipants.length}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-cyan-400' : 'text-white/40'}`}>
                        {isActive ? 'Transmisión Activa' : 'Sintonizar Voz'}
                    </span>
                    <h4 className="text-xs font-bold text-white/90">
                        {isActive ? 'Estás en la sala de audio' : 'Únete a la charla grupal'}
                    </h4>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {activeParticipants.length > 0 && (
                    <div className="flex -space-x-2 mr-2">
                        {activeParticipants.slice(0, 3).map((p, i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-[#050510] overflow-hidden bg-white/5">
                                <img src={p.avatar_url || '/default_user_blank.png'} alt="" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                    <ChevronRight size={16} className="text-white/40 group-hover:text-white" />
                </div>
            </div>
        </div>
    );
}
