import React from 'react';
import { motion } from 'framer-motion';
import { Music, Play, Pause } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import VinylRecord from './VinylRecord';

/**
 * PlayerView - Vista principal del reproductor
 * Muestra carátula, info de pista, visualizador y disco vinilo
 */
export default function PlayerView({ 
    currentTrack, 
    isPlaying, 
    progress 
}) {
    return (
        <div className="flex flex-col items-center">
            {/* Carátula del track */}
            <div className="relative w-full aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden mb-6 sm:mb-8 border-2 border-purple-500/20 bg-black/60 group shadow-2xl shadow-purple-500/10">
                {currentTrack ? (
                    <motion.img
                        src={currentTrack.cover}
                        alt={currentTrack.name}
                        className="w-full h-full object-cover opacity-70"
                        animate={{ scale: isPlaying ? 1.05 : 1 }}
                        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-white/10">
                        <Music size={80} />
                        <span className="text-[12px] uppercase font-black tracking-widest">Nada en el Radar</span>
                    </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Disco vinilo */}
                {currentTrack && (
                    <VinylRecord 
                        cover={currentTrack.cover} 
                        isPlaying={isPlaying} 
                        size="large"
                    />
                )}
            </div>

            {/* Visualizador de audio */}
            {currentTrack && <AudioVisualizer isPlaying={isPlaying} />}
        </div>
    );
}
