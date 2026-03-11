import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, Music } from 'lucide-react';

/**
 * QueueList - Lista de reproducción con animaciones
 * Muestra pistas en cola con soporte para boost/tips
 */
export default function QueueList({ 
    queue, 
    onBoostTrack, 
    boostCost,
    balance,
    onSearch 
}) {
    return (
        <div className="flex flex-col h-full">
            {/* Header de cola */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400 sm:w-5 sm:h-5">
                        <path d="M8 6v10"/><path d="M8 16h8"/><path d="M16 6v10"/><path d="M12 6v10"/>
                    </svg>
                    <span className="text-[10px] sm:text-[12px] font-black text-white uppercase tracking-widest">
                        Lista de Espera ({queue.length})
                    </span>
                </div>
                <button
                    onClick={onSearch}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-600/30 rounded-xl text-[10px] sm:text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 hover:from-purple-600/30 hover:to-pink-600/30 transition-all shadow-[0_8px_25px_rgba(147,51,234,0.2)] leading-none hover:scale-105 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    Buscar
                </button>
            </div>

            {/* Lista de pistas */}
            <div className="bg-black/30 rounded-3xl sm:rounded-4xl border border-purple-500/20 p-6 space-y-3 max-h-[250px] sm:max-h-[400px] overflow-y-auto no-scrollbar backdrop-blur-xl flex-1">
                <AnimatePresence initial={false} mode="popLayout">
                    {queue.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center gap-6 py-12 sm:py-20 opacity-20"
                        >
                            <Music size={40} className="sm:w-12 sm:h-12" />
                            <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-widest">Nada en cola...</p>
                        </motion.div>
                    ) : (
                        queue.map((track, i) => (
                            <motion.div
                                key={`${track.id}-${i}`}
                                layout
                                initial={{ opacity: 0, x: 30, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -30, scale: 0.9 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                className="group p-4 sm:p-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl sm:rounded-3xl flex items-center gap-4 hover:from-purple-500/20 hover:to-pink-500/20 transition-all hover:scale-[1.02] hover:border-purple-500/30"
                            >
                                {/* Número de posición */}
                                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">
                                    {i + 1}
                                </div>
                                
                                {/* Thumbnail */}
                                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 border-purple-500/30">
                                    <img src={track.cover} alt="" className="w-full h-full object-cover" />
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h5
                                        className="text-[11px] sm:text-[12px] font-black text-white truncate leading-none mb-2"
                                        dangerouslySetInnerHTML={{ __html: track.name }}
                                    />
                                    <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-widest truncate">
                                        {track.artist} • {track.addedBy}
                                    </p>
                                </div>

                                {/* Tips y Boost */}
                                <div className="flex items-center gap-3 pr-2">
                                    {track.tips > 0 && (
                                        <motion.div 
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-2 rounded-xl border border-orange-500/30 text-orange-400"
                                        >
                                            <Flame size={14} fill="currentColor" />
                                            <span className="text-[10px] font-black">{track.tips}</span>
                                        </motion.div>
                                    )}
                                    
                                    {/* Botón de boost */}
                                    <motion.button
                                        onClick={() => onBoostTrack(track.id)}
                                        disabled={balance < boostCost}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-3 rounded-xl bg-white/10 text-white/40 sm:opacity-0 sm:group-hover:opacity-100 hover:text-purple-400 hover:bg-purple-600/20 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={`Boost por ${boostCost}◈`}
                                    >
                                        <TrendingUp size={16} className="sm:w-5 sm:h-5" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
