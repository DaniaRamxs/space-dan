import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * AudioVisualizer - Barras de espectro de audio animadas
 * Responden visualmente al estado de reproducción
 */
export default function AudioVisualizer({ isPlaying, barCount = 12 }) {
    const barConfigs = useMemo(() => 
        [...Array(barCount)].map((_, i) => ({
            baseHeight: 24 + (i % 4) * 10,
            duration: 0.4 + (i % 3) * 0.15,
        })), [barCount]);
    
    return (
        <div className="flex items-end justify-center gap-1 h-16">
            {barConfigs.map((config, i) => (
                <motion.div
                    key={i}
                    className="w-2 bg-gradient-to-t from-purple-600 to-pink-400 rounded-t-full"
                    animate={{
                        height: isPlaying ? [8, config.baseHeight, 8] : 8,
                        opacity: isPlaying ? [0.5, 1, 0.5] : 0.3,
                    }}
                    transition={{
                        duration: config.duration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: i * 0.05,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}
