import React from 'react';
import { motion } from 'framer-motion';

/**
 * VinylRecord - Disco vinilo realista con surcos y reflejos
 * Gira cuando está reproduciendo música
 */
export default function VinylRecord({ cover, isPlaying, size = 'large' }) {
    const sizeClasses = size === 'large' 
        ? 'w-32 h-32 sm:w-40 sm:h-40 -bottom-12 -right-12 sm:-bottom-16 sm:-right-16 border-[8px] sm:border-[12px]'
        : 'w-20 h-20 -bottom-8 -right-8 border-[6px]';

    return (
        <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className={`absolute ${sizeClasses} rounded-full border-black/90 shadow-2xl overflow-hidden`}
            style={{
                background: 'conic-gradient(from 0deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #16213e 75%, #1a1a2e 100%)',
            }}
        >
            {/* Surcos del vinilo */}
            <div className="absolute inset-0 rounded-full" style={{
                background: `repeating-radial-gradient(
                    circle at center,
                    transparent 0px,
                    transparent 2px,
                    rgba(255,255,255,0.03) 2px,
                    rgba(255,255,255,0.03) 3px
                )`
            }} />
            
            {/* Carátula en el centro */}
            {cover && (
                <img 
                    src={cover} 
                    className="absolute inset-4 rounded-full w-[calc(100%-32px)] h-[calc(100%-32px)] object-cover grayscale opacity-40 blur-[1px]" 
                    alt="" 
                />
            )}
            
            {/* Reflejo de luz animado */}
            <motion.div 
                className="absolute inset-0 rounded-full"
                animate={{
                    background: isPlaying 
                        ? ['linear-gradient(135deg, transparent 40%, rgba(147,51,234,0) 50%, transparent 60%)', 
                           'linear-gradient(135deg, transparent 40%, rgba(147,51,234,0.4) 50%, transparent 60%)',
                           'linear-gradient(135deg, transparent 40%, rgba(147,51,234,0) 50%, transparent 60%)']
                        : 'transparent'
                }}
                transition={{ duration: 3, repeat: Infinity }}
            />
            
            {/* Centro del vinilo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-lg shadow-purple-500/50 border-4 border-black/80" />
        </motion.div>
    );
}
