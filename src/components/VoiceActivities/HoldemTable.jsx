import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, PlayCircle, Loader2 } from 'lucide-react';

export default function HoldemTable({ roomName, onClose }) {
    const [phase, setPhase] = useState('lobby'); // lobby, playing
    const [pot, setPot] = useState(0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="w-full bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 mt-4 relative"
        >
            <button onClick={onClose} className="absolute right-4 top-4 text-rose-500/50 hover:text-rose-400 bg-rose-500/10 p-2 rounded-full transition-all">
                <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6 bg-rose-500/10 p-3 rounded-2xl w-fit">
                <div className="text-rose-400 font-black tracking-widest uppercase text-xs">♠♥ Texas Hold'em ♦♣</div>
            </div>

            {phase === 'lobby' && (
                <div className="text-center py-6">
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-6">Mesa: {roomName}</p>
                    <div className="w-24 h-24 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-6">
                        <PlayCircle size={40} className="text-rose-400" />
                    </div>
                    <button
                        onClick={() => setPhase('playing')}
                        className="w-full py-4 rounded-xl bg-rose-500 text-black font-black uppercase tracking-widest text-xs hover:bg-rose-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    >
                        Pagar Buy-In (500◈)
                    </button>
                </div>
            )}

            {phase === 'playing' && (
                <div className="text-center py-6">
                    <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] animate-pulse">Buscando Crupier...</p>
                    <div className="mt-8 text-xl font-black text-rose-400 opacity-60 flex items-center justify-center gap-4">
                        <Loader2 className="animate-spin" />
                        [ En Construcción ]
                    </div>
                </div>
            )}
        </motion.div>
    );
}
