import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Clock } from 'lucide-react';

export const TimeCapsuleBlock = ({ config }) => {
    const revealDate = config?.reveal_date ? new Date(config.reveal_date) : null;
    const [isLocked, setIsLocked] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!revealDate) return;

        const updateTimer = () => {
            const now = new Date();
            const diff = revealDate - now;

            if (diff <= 0) {
                setIsLocked(false);
                setTimeLeft('REVELADO');
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [revealDate]);

    return (
        <div className="p-8 md:p-14 rounded-3xl md:rounded-[3rem] bg-white/[0.02] border border-white/10 relative overflow-hidden group">
            {/* Background Glow */}
            <div className={`absolute inset-0 bg-gradient-to-br ${isLocked ? 'from-amber-500/5' : 'from-cyan-500/5'} to-transparent opacity-50`} />

            <div className="relative z-10 flex flex-col items-center gap-8 text-center">
                <div className="space-y-2">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] italic mb-4 block">Cápsula del Tiempo</span>
                    {isLocked ? (
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.1)] relative">
                                <Lock className="text-amber-500 animate-pulse" size={32} />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-2 border-2 border-dashed border-amber-500/10 rounded-full"
                                />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Mensaje Encriptado</h3>
                                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-black/40 border border-white/5 text-amber-400 font-mono text-sm font-black shadow-inner">
                                    <Clock size={14} className="opacity-60" />
                                    {timeLeft}
                                </div>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-loose max-w-xs mx-auto">
                                    Este pensamiento está sellado en el vacío. <br />Vuelve cuando el tiempo se agote.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/[0.03] p-8 rounded-[2rem] border border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.05)]"
                        >
                            <Unlock className="text-cyan-400 mb-6 mx-auto" size={32} />
                            <div className="prose prose-invert prose-cyan">
                                <p className="text-lg md:text-xl font-bold text-white italic leading-relaxed">
                                    {config?.message || 'El mensaje se ha perdido en la entropía...'}
                                </p>
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400/40 italic">
                                Sello Roto el {revealDate?.toLocaleDateString()}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};
