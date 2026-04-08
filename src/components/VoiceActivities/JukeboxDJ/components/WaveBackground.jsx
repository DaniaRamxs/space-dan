import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * WaveBackground - Fondo animado con ondas y partículas
 * Crea ambiente visual tipo club/nocturno
 */
export default function WaveBackground() {
    const particleConfigs = useMemo(() => 
        [...Array(20)].map((_, i) => ({
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23) % 100}%`,
            duration: 3 + (i % 3),
            delay: (i * 0.3) % 2,
        })), []);
    
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Ondas circulares rotativas */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2"
                    style={{
                        background: `radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(147,51,234,${0.03 - i * 0.01}) 50%, transparent 60%)`,
                    }}
                    animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 20 + i * 5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
            ))}
            
            {/* Partículas flotantes */}
            {particleConfigs.map((config, i) => (
                <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-purple-400/30"
                    style={{
                        left: config.left,
                        top: config.top,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.2, 0.6, 0.2],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: config.duration,
                        repeat: Infinity,
                        delay: config.delay,
                    }}
                />
            ))}
        </div>
    );
}
