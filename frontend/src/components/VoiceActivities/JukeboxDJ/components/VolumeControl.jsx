import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

/**
 * VolumeControl - Control de volumen con indicador visual de ondas
 * Muestra feedback visual al ajustar volumen
 */
export default function VolumeControl({ volume, onVolumeChange }) {
    const getVolumeIcon = () => {
        if (volume === 0) return <VolumeX size={16} className="text-white/30 sm:w-5 sm:h-5" />;
        if (volume < 50) return <Volume1 size={16} className="text-purple-400 sm:w-5 sm:h-5" />;
        return <Volume2 size={16} className="text-purple-400 sm:w-5 sm:h-5" />;
    };

    return (
        <div className="w-full flex items-center gap-4">
            {/* Icono de volumen con animación */}
            <motion.div
                animate={{ scale: volume > 0 ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
            >
                {getVolumeIcon()}
            </motion.div>
            
            {/* Slider con ondas animadas */}
            <div className="flex-1 relative">
                {/* Ondas decorativas debajo del slider */}
                <div className="absolute -top-4 left-0 w-full h-4 flex items-center justify-between opacity-30">
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-0.5 bg-purple-400 rounded-full"
                            animate={{
                                height: volume > i * 20 ? [4 + i * 2, 8 + i * 3, 4 + i * 2] : 2,
                                opacity: volume > i * 20 ? [0.3, 1, 0.3] : 0.1
                            }}
                            transition={{
                                duration: 0.5 + i * 0.1,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        />
                    ))}
                </div>
                
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                    style={{
                        background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)`
                    }}
                />
                
                {/* Marcadores de nivel */}
                <div className="absolute -top-1 left-0 w-full h-4 flex items-center justify-between pointer-events-none">
                    {[0, 25, 50, 75, 100].map((mark) => (
                        <motion.div 
                            key={mark}
                            className="w-1.5 h-1.5 rounded-full"
                            animate={{
                                backgroundColor: volume >= mark ? '#a855f7' : 'rgba(255,255,255,0.2)',
                                scale: volume >= mark ? 1.2 : 1
                            }}
                            transition={{ duration: 0.2 }}
                        />
                    ))}
                </div>
            </div>
            
            {/* Porcentaje con animación */}
            <motion.span 
                className="text-[10px] text-purple-400 font-bold min-w-[3rem] text-center"
                key={volume}
                initial={{ scale: 1.2, color: '#e879f9' }}
                animate={{ scale: 1, color: '#a855f7' }}
                transition={{ duration: 0.2 }}
            >
                {volume}%
            </motion.span>
        </div>
    );
}
