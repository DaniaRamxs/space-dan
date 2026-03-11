/**
 * JukeboxDJ.jsx (Refactorizado)
 * DJ de música sincronizada para salas de voz via YouTube IFrame API.
 * 
 * Versión modularizada usando componentes y hooks separados.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Music, Youtube, ChevronDown, SkipForward, Play, Pause,
    RefreshCw, Disc, ListMusic, Search
} from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import YouTubeSearchModal from '../Social/YouTubeSearchModal';
import toast from 'react-hot-toast';

// Componentes modularizados
import {
    PlayerView,
    MiniPlayer,
    QueueList,
    VolumeControl,
    WaveBackground,
} from './components';

// Hooks personalizados
import { useYouTubePlayer, useJukeboxSync } from './hooks';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SYNC_INTERVAL_MS = 4000;
const BOOST_COST = 50;
const YT_STATE = {
    UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5,
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function JukeboxDJ({ roomName, onClose, isMinimized = false, isPanelOpen = false }) {
    const { user, profile } = useAuthContext();
    const { balance } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const isHost = participants.length === 0 || localParticipant?.identity === participants[0]?.identity;

    // ── State ───────────────────────────────────────────────────────────────────
    const [volume, setVolume] = useState(50);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const progressIntervalRef = useRef(null);

    // Sincronización via Supabase
    const {
        queue, setQueue,
        currentTrack, setCurrentTrack,
        isPlaying, setIsPlaying,
        progress, setProgress,
        broadcastQueue,
        broadcastPlayback,
    } = useJukeboxSync({ roomName, user, isHost });

    // Player de YouTube
    const {
        seekTo,
        getCurrentTime,
        getDuration,
    } = useYouTubePlayer({
        videoId: currentTrack?.id,
        isPlaying,
        volume,
        onStateChange: (state) => {
            if (state === YT_STATE.ENDED && isHost) {
                playNext();
            }
        },
    });

    // ── Efectos ──────────────────────────────────────────────────────────────────
    
    // Sincronizar progreso periódicamente (solo host)
    useEffect(() => {
        if (!isHost) return;
        
        progressIntervalRef.current = setInterval(() => {
            const currentTime = getCurrentTime();
            const duration = getDuration();
            const p = (currentTime / duration) * 100;
            setProgress(p);
            
            if (isPlaying) {
                broadcastPlayback(true, p);
            }
        }, SYNC_INTERVAL_MS);

        return () => clearInterval(progressIntervalRef.current);
    }, [isHost, isPlaying, broadcastPlayback, getCurrentTime, getDuration]);

    // ── Acciones ──────────────────────────────────────────────────────────────────

    const addToQueue = useCallback((track) => {
        const entry = {
            id: track.id,
            name: track.name,
            artist: track.artist,
            cover: track.cover,
            addedBy: profile?.username || 'Tripulante',
            tips: 0,
        };

        if (!currentTrack) {
            setCurrentTrack(entry);
            setIsPlaying(true);
            setQueue([]);
            broadcastQueue([], entry);
            broadcastPlayback(true, 0);
        } else {
            const newQueue = [...queue, entry];
            setQueue(newQueue);
            broadcastQueue(newQueue);
        }
    }, [currentTrack, queue, profile, broadcastQueue, broadcastPlayback]);

    const playNext = useCallback(() => {
        if (queue.length === 0) {
            setCurrentTrack(null);
            setIsPlaying(false);
            setProgress(0);
            broadcastQueue([], null);
            broadcastPlayback(false, 0);
            return;
        }

        const [next, ...remaining] = queue;
        setCurrentTrack(next);
        setQueue(remaining);
        setIsPlaying(true);
        setProgress(0);
        broadcastQueue(remaining, next);
        broadcastPlayback(true, 0);
    }, [queue, broadcastQueue, broadcastPlayback]);

    const togglePlayback = useCallback(() => {
        const next = !isPlaying;
        setIsPlaying(next);
        broadcastPlayback(next, progress);
    }, [isPlaying, progress, broadcastPlayback]);

    const boostTrack = useCallback(async (trackId) => {
        if (balance < BOOST_COST) {
            toast.error('Necesitas más Starlys para darle fuego a esta pista.');
            return;
        }

        // Aquí iría la lógica de gastar monedas
        // const { success } = await spendCoins(BOOST_COST, 'boost_jukebox');
        // if (!success) return;

        setQueue(prev => {
            const updated = prev
                .map(item => item.id === trackId ? { ...item, tips: item.tips + BOOST_COST } : item)
                .sort((a, b) => b.tips - a.tips);
            broadcastQueue(updated);
            return updated;
        });

        toast.success(`🔥 Boost aplicado! -${BOOST_COST}◈`);
    }, [balance, BOOST_COST, broadcastQueue]);

    // ── Render ───────────────────────────────────────────────────────────────────
    
    return (
        <>
            {/* Iframe oculto para YouTube */}
            <div id="yt-player-jukebox" className="fixed -left-[9999px] -top-[9999px] w-[320px] h-[180px] pointer-events-none" />

            <AnimatePresence mode="wait">
                {!isMinimized ? (
                    <div
                        key="full-jukebox"
                        className="fixed inset-0 z-[10004] flex items-center justify-center p-4 overflow-hidden pointer-events-auto"
                    >
                        {/* Fondo */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        {/* Panel Principal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative z-10 w-full sm:max-w-4xl h-auto max-h-[95vh] flex flex-col bg-gradient-to-br from-purple-900/40 via-black/60 to-pink-900/40 backdrop-blur-3xl border border-purple-500/20 rounded-[3rem] shadow-[0_50px_120px_rgba(147,51,234,0.3)] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Background animado */}
                            <WaveBackground />

                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 flex flex-col relative">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-br from-purple-500/30 to-pink-500/20 rounded-2xl border border-purple-500/40 text-purple-400">
                                            <Youtube size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                                Jukebox DJ
                                            </h3>
                                            <p className="text-[10px] text-purple-400/60 uppercase tracking-widest">
                                                {participants.length + 1} Tripulantes conectados
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={onClose}
                                        className="text-white/40 hover:text-white bg-white/10 p-3 rounded-2xl transition-all hover:scale-110 hover:bg-white/20 border border-white/10"
                                    >
                                        <ChevronDown size={20} />
                                    </button>
                                </div>

                                {/* Grid principal */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Columna izquierda: Player */}
                                    <div className="space-y-6">
                                        <PlayerView 
                                            currentTrack={currentTrack}
                                            isPlaying={isPlaying}
                                            progress={progress}
                                        />

                                        {/* Controles */}
                                        <div className="flex items-center justify-center gap-6">
                                            <button
                                                onClick={() => seekTo(0)}
                                                className="p-3 rounded-full text-white/40 hover:text-purple-400 hover:bg-white/10 transition-all"
                                                title="Reiniciar"
                                            >
                                                <SkipForward size={20} className="rotate-180" />
                                            </button>

                                            <motion.button
                                                onClick={togglePlayback}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.4)] border-2 border-purple-400/30"
                                            >
                                                {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
                                            </motion.button>

                                            <button
                                                onClick={playNext}
                                                className="p-3 rounded-full text-white/40 hover:text-purple-400 hover:bg-white/10 transition-all"
                                                title="Siguiente"
                                            >
                                                <SkipForward size={20} />
                                            </button>
                                        </div>

                                        {/* Barra de progreso */}
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                                                animate={{ width: `${progress}%` }}
                                                transition={{ type: 'tween', ease: 'linear' }}
                                            />
                                        </div>

                                        {/* Volumen */}
                                        <VolumeControl 
                                            volume={volume} 
                                            onVolumeChange={(v) => {
                                                setVolume(v);
                                                // El player se actualiza via el hook
                                            }} 
                                        />
                                    </div>

                                    {/* Columna derecha: Cola */}
                                    <QueueList
                                        queue={queue}
                                        onBoostTrack={boostTrack}
                                        boostCost={BOOST_COST}
                                        balance={balance}
                                        onSearch={() => setIsSearchOpen(true)}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    <MiniPlayer
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        onTogglePlayback={togglePlayback}
                        isPanelOpen={isPanelOpen}
                    />
                )}
            </AnimatePresence>

            {/* Modal de búsqueda */}
            <YouTubeSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={addToQueue}
            />
        </>
    );
}
