import React from 'react';
import { motion } from 'framer-motion';

export const RandomFactsBlock = ({ config }) => {
    const facts = config?.facts || [];

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4 px-4">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] italic">Gabinete de Curiosidades</span>
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {facts.length > 0 ? facts.map((fact, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ y: -5 }}
                        className="group h-32 [perspective:1000px]"
                    >
                        <div className="relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                            {/* Card Front (Locked) */}
                            <div className="absolute inset-0 bg-[#0d0d12] border border-white/10 rounded-2xl flex items-center justify-center [backface-visibility:hidden]">
                                <div className="text-center space-y-2">
                                    <div className="text-xl opacity-20">?</div>
                                    <div className="text-[8px] font-black text-white/10 uppercase tracking-widest">Dato Secreto</div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                            </div>

                            {/* Card Back (Revealed) */}
                            <div className="absolute inset-0 bg-[#121812] border border-emerald-500/20 rounded-2xl flex items-center justify-center p-4 [transform:rotateY(180deg)] [backface-visibility:hidden] overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-emerald-500 pointer-events-none font-black italic text-4xl">INFO</div>

                                <p className="text-[10px] font-bold text-emerald-100 text-center leading-relaxed relative z-10">
                                    {fact.text || 'Sin registro'}
                                </p>

                                {/* Glitch Effect Overlay on hover */}
                                <div className="absolute inset-0 opacity-0 group-hover:animate-pulse bg-emerald-500/5 mix-blend-overlay pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                )) : (
                    <div className="col-span-full py-16 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-2">
                        <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Archivo por clasificar</span>
                    </div>
                )}
            </div>
        </div>
    );
};
