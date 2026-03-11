import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * GalacticSyncEffect - Efecto visual ligero para sincronización perfecta
 * Se muestra cuando múltiples jugadores aciertan un beat simultáneamente
 */
export default function GalacticSyncEffect({ active, intensity = 1 }) {
    if (!active) return null;
    
    // Limitar partículas para no afectar rendimiento (max 20)
    const particleCount = Math.min(intensity * 3, 20);
    
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 overflow-hidden">
            {/* Glow central */}
            <motion.div
                className="absolute w-96 h-96 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(244, 114, 182, 0.2) 40%, transparent 70%)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Texto SYNC */}
            <motion.div
                className="absolute text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ 
                    scale: [1, 1.2, 1], 
                    opacity: [0.8, 1, 0.8],
                    y: [0, -10, 0],
                    rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
                SYNC x{intensity}!
            </motion.div>
            
            {/* Partículas */}
            <AnimatePresence>
                {Array.from({ length: particleCount }).map((_, i) => (
                    <Particle key={i} index={i} total={particleCount} />
                ))}
            </AnimatePresence>
            
            {/* Anillos de expansión */}
            {[0, 1, 2].map((ring) => (
                <motion.div
                    key={ring}
                    className="absolute rounded-full border-2 border-amber-400/30"
                    initial={{ width: 100, height: 100, opacity: 0 }}
                    animate={{ 
                        width: [100, 400, 600], 
                        height: [100, 400, 600], 
                        opacity: [0.6, 0.3, 0] 
                    }}
                    transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        delay: ring * 0.5,
                        ease: "easeOut"
                    }}
                />
            ))}
        </div>
    );
}

// Componente de partícula - valores pre-calculados para evitar Math.random en render
function Particle({ index, total }) {
    // Generar valores determinísticos basados en index
    const seed = index * 123.45;
    const angle = (index / total) * Math.PI * 2;
    const distance = 150 + (seed % 100);
    const size = 4 + (index % 8);
    const colors = ['#fbbf24', '#f472b6', '#a78bfa', '#22d3ee'];
    const color = colors[index % colors.length];
    const duration = 1 + ((index % 5) / 10);
    
    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: size,
                height: size,
                backgroundColor: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
            }}
            initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                opacity: 1 
            }}
            animate={{ 
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                scale: [0, 1.5, 0],
                opacity: [1, 0.5, 0]
            }}
            transition={{ 
                duration,
                delay: index * 0.05,
                ease: "easeOut"
            }}
        />
    );
}
