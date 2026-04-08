import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronUp, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import useTouchGestures from '../../../../hooks/useTouchGestures';

/**
 * MiniPlayer - Vista minimizada flotante premium con gestos táctiles
 * 
 * Gestos soportados:
 * - ← → : Cambiar pista anterior/siguiente
 * - ↑   : Expandir player completo
 * - ↓   : Minimizar/Cerrar
 * - Tap : Play/Pause
 */
export default function MiniPlayer({ 
    currentTrack, 
    isPlaying, 
    onTogglePlayback, 
    onNextTrack,
    onPrevTrack,
    onExpand,
    onClose,
    isPanelOpen 
}) {
    const playerRef = useRef(null);
    
    // Configurar gestos táctiles (siempre llamar hooks antes de condicionales)
    const { bind } = useTouchGestures({
        onSwipeLeft: () => {
            onNextTrack?.();
            if (playerRef.current) {
                playerRef.current.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    if (playerRef.current) playerRef.current.style.transform = '';
                }, 150);
            }
        },
        onSwipeRight: () => {
            onPrevTrack?.();
            if (playerRef.current) {
                playerRef.current.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    if (playerRef.current) playerRef.current.style.transform = '';
                }, 150);
            }
        },
        onSwipeUp: () => onExpand?.(),
        onSwipeDown: () => onClose?.(),
        swipeThreshold: 30,
    });
    
    if (!currentTrack) return null;

    return (
        <motion.div
            ref={(el) => {
                playerRef.current = el;
                bind(el);
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
                if (info.offset.y > 100) onClose?.();
                if (info.offset.y < -50) onExpand?.();
            }}
            className={`${!isPanelOpen
                ? 'fixed bottom-20 left-2 right-2 z-[11000] mx-auto'
                : 'mb-2'
                } p-3 bg-gradient-to-r from-purple-600/40 to-pink-600/40 backdrop-blur-2xl border border-purple-500/50 rounded-2xl shadow-[0_0_40px_rgba(147,51,234,0.5)] cursor-grab active:cursor-grabbing touch-pan-y`}
        >
            {/* Indicadores de gestos (solo visibles al interactuar) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white/30 text-[10px] pointer-events-none">
                <ChevronUp size={12} />
                <span>Expandir</span>
            </div>
            
            {/* Flechas de navegación (indicadores visuales) */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                <ChevronLeft size={16} />
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                <ChevronRight size={16} />
            </div>

            <div className="flex items-center gap-3 px-6">
                {/* Thumbnail con animación */}
                <motion.div 
                    className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 border-purple-500/50"
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlayback();
                    }}
                >
                    <motion.img 
                        src={currentTrack.cover} 
                        className="w-full h-full object-cover" 
                        alt=""
                        animate={{ scale: isPlaying ? [1, 1.1, 1] : 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-br from-purple-600/60 to-pink-600/60 flex items-center justify-center"
                        animate={{ opacity: isPlaying ? [0.6, 1, 0.6] : 0.6 }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </motion.div>
                </motion.div>

                {/* Info compacta */}
                <div className="flex-1 min-w-0" onClick={onExpand}>
                    <motion.p 
                        className="text-[10px] font-black text-purple-300 uppercase tracking-widest leading-none mb-1"
                        animate={{ opacity: isPlaying ? [0.5, 1, 0.5] : 0.7 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        {isPlaying ? '⚡ Reproduciendo' : '⏸ En Pausa'}
                    </motion.p>
                    <p
                        className="text-[11px] text-white font-bold truncate"
                        dangerouslySetInnerHTML={{ __html: currentTrack.name }}
                    />
                    <p className="text-[9px] text-white/50 uppercase tracking-tighter truncate">
                        {currentTrack.artist}
                    </p>
                </div>

                {/* Botones de navegación rápida */}
                <div className="flex items-center gap-1">
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onPrevTrack?.(); }}
                        className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        whileTap={{ scale: 0.8 }}
                    >
                        <SkipForward size={16} className="rotate-180" />
                    </motion.button>
                    
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onTogglePlayback(); }}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] border-2 border-purple-400/50 flex items-center justify-center"
                        whileTap={{ scale: 0.9 }}
                    >
                        {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                    </motion.button>
                    
                    <motion.button
                        onClick={(e) => { e.stopPropagation(); onNextTrack?.(); }}
                        className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
                        whileTap={{ scale: 0.8 }}
                    >
                        <SkipForward size={16} />
                    </motion.button>
                </div>
            </div>
            
            {/* Barra de progreso mini */}
            <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
                    style={{ width: `${currentTrack.progress || 0}%` }}
                />
            </div>
        </motion.div>
    );
}
