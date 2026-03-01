import React from 'react';
import { motion } from 'framer-motion';
import { SpotifyBlock } from './SpotifyBlock';

export const BlocksRenderer = ({ blocks, userId, isOwn, onEdit }) => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const renderBlock = (block) => {
        switch (block.block_type) {
            case 'spotify':
                return <SpotifyBlock userId={userId} isOwn={isOwn} />;
            case 'thought':
                return (
                    <div className="p-12 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4 group">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic group-hover:text-cyan-400 transition-colors">Pensamiento Galáctico</span>
                        <p className="text-2xl md:text-3xl font-black text-white italic tracking-tighter leading-snug drop-shadow-2xl">
                            "{block.config?.text || 'La realidad es solo una construcción de nuestra percepción del tiempo.'}"
                        </p>
                    </div>
                );
            case 'status':
                return (
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-[#111] to-[#1a1a25] border border-white/5 flex items-center justify-between group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-full blur-3xl" />
                        <div className="space-y-2 relative z-10">
                            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest italic">Actualmente...</span>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase italic group-hover:translate-x-2 transition-transform">{block.config?.activity || 'Navegando el Espacio Dan 🌌'}</h3>
                        </div>
                        <div className="text-4xl grayscale group-hover:grayscale-0 transition-all group-hover:scale-125 duration-500 relative z-10">{block.config?.emoji || '🚀'}</div>
                    </div>
                );
            case 'markdown':
                return (
                    <div className="p-12 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-6 prose prose-invert prose-cyan max-w-none">
                        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest italic mb-4">Registro Estelar</div>
                        <div className="text-white/60 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: block.config?.html || 'Cargando datos del núcleo...' }} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-12"
        >
            {blocks.map((block) => (
                <motion.div key={block.id || block.block_type} variants={item}>
                    {renderBlock(block)}
                </motion.div>
            ))}

            {isOwn && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={onEdit}
                    className="w-full py-8 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-white/20 hover:text-white/60 hover:border-white/20 hover:bg-white/[0.01] transition-all group"
                >
                    <span className="text-4xl group-hover:rotate-180 transition-transform duration-700">+</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">Configurar Bloques Modulares</span>
                </motion.button>
            )}
        </motion.div>
    );
};
