import React from 'react';
import { motion } from 'framer-motion';
import { Music, Play } from 'lucide-react';

export const MusicOdysseyBlock = ({ config }) => {
    const songs = config?.songs || [];

    return (
        <div className="p-8 md:p-14 rounded-3xl md:rounded-[3rem] bg-gradient-to-br from-[#0a0a0f] to-[#121218] border border-white/5 space-y-10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                <Music size={120} />
            </div>

            <div className="relative z-10 flex flex-col gap-8">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] italic">Odisea Musical</span>
                    <h3 className="text-xl font-black text-white italic truncate">Himnos de mi semana</h3>
                </div>

                <div className="space-y-6">
                    {songs.length > 0 ? songs.map((song, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-6 group/song"
                        >
                            {/* Floating Vinyl Aesthetic */}
                            <div className="relative shrink-0">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="w-16 h-16 rounded-full bg-black border-2 border-white/10 relative overflow-hidden flex items-center justify-center shadow-2xl"
                                >
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_black_41%)] opacity-40 z-10" />
                                    {song.cover ? (
                                        <img src={song.cover} alt="" className="w-full h-full object-cover opacity-60" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
                                    )}
                                    <div className="w-4 h-4 rounded-full bg-[#0a0a0f] border border-white/20 z-20" />
                                </motion.div>

                                <div className="absolute -inset-1 rounded-full border border-cyan-500/20 animate-pulse pointer-events-none" />
                            </div>

                            <div className="flex-1 space-y-2">
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-white italic group-hover/song:text-cyan-400 transition-colors uppercase tracking-tight">
                                        {song.title || 'Título Desconocido'}
                                    </span>
                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">
                                        {song.artist || 'Navegante Anónimo'}
                                    </span>
                                </div>

                                {song.annotation && (
                                    <p className="text-[11px] text-white/50 leading-relaxed italic border-l border-white/10 pl-3 py-1 bg-white/[0.01] rounded-r-lg">
                                        "{song.annotation}"
                                    </p>
                                )}

                                {/* Spectrum Bars Placeholder */}
                                <div className="flex items-end gap-0.5 h-3 opacity-20">
                                    {[...Array(12)].map((_, j) => (
                                        <motion.div
                                            key={j}
                                            animate={{ height: [2, Math.random() * 12 + 2, 2] }}
                                            transition={{ duration: 0.5 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                                            className="w-1 bg-cyan-400 rounded-full"
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )) : (
                        <div className="py-12 border-2 border-dashed border-white/5 rounded-[2rem] text-center">
                            <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">Sintonizando frecuencias...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
