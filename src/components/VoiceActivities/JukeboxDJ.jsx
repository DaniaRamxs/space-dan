/**
 * JukeboxDJ.jsx
 * DJ de música sincronizada para salas de voz via YouTube IFrame API.
 *
 * Arquitectura:
 *   - El HOST (participants[0]) controla la reproducción y la transmite a invitados.
 *   - Los INVITADOS siguen el estado del host (reproducción, progreso, queue).
 *   - Canal de Supabase broadcast: `jukebox-{roomName}` con 2 eventos:
 *       · `queue_update`    — cola + pista actual
 *       · `playback_update` — isPlaying + progreso (%)
 *   - El progreso se sincroniza cada 4s (solo el host lo emite).
 *   - Los invitados sincronizan el tiempo del player si la diferencia > 5s.
 *
 * Fixes aplicados:
 *   - Stale closures: `currentTrackRef` y `isPlayingRef` evitan que los callbacks
 *     de broadcast lean valores desactualizados.
 *   - YT player cleanup: se destruye en el cleanup del useEffect.
 *   - `window.onYouTubeIframeAPIReady` se asigna solo si el script aún no está listo,
 *     y se limpia al desmontar para no interferir con otras instancias.
 *   - `boostTrack` usaba `alert()` → ahora usa toast.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Music, Search, Play, Pause, SkipForward,
    Flame, TrendingUp, Disc, ListMusic, Youtube, ChevronDown, Volume,
    RefreshCw, Radio, AudioLines, Activity,
} from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import YouTubeSearchModal from '../Social/YouTubeSearchModal';
import toast from 'react-hot-toast';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SYNC_INTERVAL_MS = 4000;  // Frecuencia con la que el host emite el progreso
const BOOST_COST = 50;    // ◈ para priorizar una pista en la cola
const MAX_SEEK_DRIFT_S = 5;     // Segundos de diferencia antes de hacer seek

// Mapa de estados del player de YouTube
const YT_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};

// ─── Componente: Visualizador de Audio Animado ───────────────────────────────
function AudioVisualizer({ isPlaying }) {
    const bars = 12;
    // Generar alturas deterministas basadas en índice, no aleatorias
    const barConfigs = useMemo(() => 
        [...Array(bars)].map((_, i) => ({
            baseHeight: 24 + (i % 4) * 10,
            duration: 0.4 + (i % 3) * 0.15,
        })), []);
    
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

// ─── Componente: Disco Vinilo con Surcos ─────────────────────────────────────
function VinylRecord({ cover, isPlaying }) {
    return (
        <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-12 -right-12 sm:-bottom-16 sm:-right-16 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[8px] sm:border-[12px] border-black/90 shadow-2xl overflow-hidden"
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
            
            {/* Reflejo de luz */}
            <motion.div 
                className="absolute inset-0 rounded-full"
                animate={{
                    background: isPlaying 
                        ? 'linear-gradient(135deg, transparent 40%, rgba(147,51,234,0.3) 50%, transparent 60%)'
                        : 'transparent'
                }}
                transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Centro del vinilo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-lg shadow-purple-500/50 border-4 border-black/80" />
        </motion.div>
    );
}

// ─── Componente: Fondo de Ondas Animadas ─────────────────────────────────────
function WaveBackground() {
    // Generar posiciones de partículas deterministas
    const particleConfigs = useMemo(() => 
        [...Array(20)].map((_, i) => ({
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23) % 100}%`,
            duration: 3 + (i % 3),
            delay: (i * 0.3) % 2,
        })), []);
    
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

// ─── Componente principal ───────────────────────────────────────────────────

export default function JukeboxDJ({ roomName, onClose, isMinimized = false, isPanelOpen = false }) {
    const { user, profile } = useAuthContext();
    const { balance } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const isHost = participants.length === 0 || localParticipant?.identity === participants[0]?.identity;

    // ── State ───────────────────────────────────────────────────────────────────
    const [queue, setQueue] = useState([]);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(50);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Refs para evitar stale closures dentro de callbacks de broadcast y setInterval
    const currentTrackRef = useRef(null);
    const isPlayingRef = useRef(false);
    const queueRef = useRef([]);
    const playerRef = useRef(null);
    const channelRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // Mantener refs sincronizados con el estado
    const isHostRef = useRef(isHost);

    useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);
    useEffect(() => { queueRef.current = queue; }, [queue]);

    // ── 1. Canal de Supabase + carga del SDK de YouTube ──────────────────────
    useEffect(() => {
        if (!roomName || !user) return;

        const chanName = `jukebox-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(chanName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
                setQueue(payload.queue ?? []);

                // Solo actualizar la pista actual si cambió (evitar reset de progreso)
                if (payload.currentTrack !== undefined) {
                    const prevId = currentTrackRef.current?.id;
                    if (payload.currentTrack?.id !== prevId) {
                        setCurrentTrack(payload.currentTrack);
                        setProgress(0);
                    }
                }
            })
            .on('broadcast', { event: 'playback_update' }, ({ payload }) => {
                setIsPlaying(payload.isPlaying);
                if (payload.progress !== undefined) {
                    setProgress(payload.progress);
                    // Sincronizar tiempo del player si hay mucha diferencia (como invitado)
                    if (payload.currentTime !== undefined && payload.duration !== undefined) {
                        syncPlayerTime(payload.progress, payload.currentTime, payload.duration);
                    }
                }
            })
            .subscribe();

        // Cargar SDK de YouTube si aún no está disponible
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            // Insertar antes del primer script existente (práctica recomendada por Google)
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(tag, firstScript);
        }

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (_) { }
                playerRef.current = null;
            }
        };
    }, [roomName, user]);

    // ── 2. Inicializar/cambiar pista en el player de YouTube ─────────────────
    useEffect(() => {
        if (!currentTrack?.id) return;

        const handleYTReady = () => {
            if (playerRef.current) {
                // El player ya existe — solo cambiar el video
                playerRef.current.loadVideoById(currentTrack.id);
                return;
            }

            // Primera vez: crear el player
            playerRef.current = new window.YT.Player('yt-player-jukebox', {
                height: '0',
                width: '0',
                videoId: currentTrack.id,
                playerVars: {
                    autoplay: isPlayingRef.current ? 1 : 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: (e) => {
                        // Forzar reproducción para TODOS los usuarios
                        e.target.setVolume(50);
                        if (isPlayingRef.current) {
                            console.log('[Jukebox] Forzando reproducción para todos los usuarios');
                            e.target.playVideo();
                        }
                    },
                    onStateChange: (e) => {
                        // Solo el host avanza la cola al terminar una pista
                        // Usamos isHostRef para evitar cierres obsoletos (stale closures)
                        if (e.data === YT_STATE.ENDED && isHostRef.current) {
                            playNext();
                        }
                        
                        // Debug: Log estado del player
                        console.log('[Jukebox] Estado del player:', e.data, 'isPlaying:', isPlayingRef.current);
                        
                        // Si el player se detiene inesperadamente, intentar reproducir
                        if (e.data === YT_STATE.PAUSED && isPlayingRef.current) {
                            console.log('[Jukebox] Player pausado inesperadamente, reintentando...');
                            setTimeout(() => e.target.playVideo(), 100);
                        }
                    },
                },
            });
        };

        if (window.YT && window.YT.Player) {
            handleYTReady();
        } else {
            // El SDK aún no está listo — registrar callback global
            window.onYouTubeIframeAPIReady = handleYTReady;
        }

        return () => {
            if (window.onYouTubeIframeAPIReady === handleYTReady) {
                delete window.onYouTubeIframeAPIReady;
            }
        };
    }, [currentTrack?.id]);

    // ── 3. Sincronizar play/pause con el player ───────────────────────────────
    useEffect(() => {
        const player = playerRef.current;
        if (!player?.playVideo) return;
        
        console.log('[Jukebox] Sincronizando play/pause:', isPlaying);
        
        if (isPlaying) {
            // Forzar reproducción con múltiples intentos
            player.playVideo();
            setTimeout(() => {
                if (player.getPlayerState() !== YT_STATE.PLAYING) {
                    console.log('[Jukebox] Reintentando reproducción...');
                    player.playVideo();
                }
            }, 500);
        } else {
            player.pauseVideo();
        }
    }, [isPlaying]);

    // ── 4. Emisión de progreso periódica (solo el host) ───────────────────────
    useEffect(() => {
        if (!isHost) return;
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        progressIntervalRef.current = setInterval(() => {
            const player = playerRef.current;
            if (!player?.getCurrentTime) return;

            const currentTime = player.getCurrentTime() || 0;
            const duration = player.getDuration() || 1;
            const p = (currentTime / duration) * 100;

            setProgress(p);

            // Solo emitir si está reproduciendo (evitar broadcasts innecesarios en pausa)
            if (isPlayingRef.current && channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'playback_update',
                    payload: { 
                        isPlaying: true, 
                        progress: p,
                        timestamp: Date.now(),
                        currentTime: currentTime,
                        duration: duration
                    },
                });
            }
        }, SYNC_INTERVAL_MS);

        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [isHost]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Función de troubleshooting para forzar reproducción
     */
    const forcePlayback = () => {
        const player = playerRef.current;
        if (!player) {
            toast.error('Player no inicializado');
            return;
        }

        console.log('[Jukebox] Forzando reproducción manual...');
        
        // Obtener estado actual
        const state = player.getPlayerState();
        console.log('[Jukebox] Estado actual:', state);
        
        // Forzar reproducción
        player.playVideo();
        
        // Verificar después de 1 segundo
        setTimeout(() => {
            const newState = player.getPlayerState();
            console.log('[Jukebox] Nuevo estado:', newState);
            
            if (newState === YT_STATE.PLAYING) {
                toast.success('🎵 Audio forzado exitosamente');
            } else {
                toast.error('❌ No se pudo forzar el audio. Intenta recargar la página.');
            }
        }, 1000);
    };

    /** 
     * Reinicia la pista actual desde el principio.
     * Útil cuando el audio no se escucha al volver a reproducir.
     */
    const restartCurrentTrack = () => {
        const player = playerRef.current;
        if (!player || !currentTrackRef.current?.id) {
            toast.error('No hay pista activa');
            return;
        }

        console.log('[Jukebox] Reiniciando pista:', currentTrackRef.current.name);
        
        try {
            // Recargar el video desde el principio
            player.loadVideoById(currentTrackRef.current.id);
            setIsPlaying(true);
            setProgress(0);
            broadcastPlayback(true, 0);
            toast.success('♻️ Pista reiniciada');
        } catch (err) {
            console.error('[Jukebox] Error al reiniciar:', err);
            toast.error('Error al reiniciar la pista');
        }
    };

    /**
     * Sincroniza el tiempo del player si la diferencia con el host es muy grande.
     * Solo actúa si la diferencia supera MAX_SEEK_DRIFT_S.
     */
    const syncPlayerTime = (progressPercent, currentTime, duration) => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;

        const targetTime = (progressPercent / 100) * duration;
        const actualTime = player.getCurrentTime() || 0;

        if (Math.abs(actualTime - targetTime) > MAX_SEEK_DRIFT_S) {
            console.log(`[Jukebox] Syncing audio: ${actualTime.toFixed(2)}s → ${targetTime.toFixed(2)}s (diff: ${Math.abs(actualTime - targetTime).toFixed(2)}s)`);
            player.seekTo(targetTime, true);
            
            // Mostrar toast si la diferencia es muy grande
            if (Math.abs(actualTime - targetTime) > 10) {
                toast.error('Problemas de sincronización detectados. Reajustando audio...');
            }
        }
    };

    const broadcastQueue = (newQueue, track = currentTrackRef.current) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'queue_update',
            payload: { queue: newQueue, currentTrack: track },
        });
    };

    const broadcastPlayback = (playing, prog) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'playback_update',
            payload: { isPlaying: playing, progress: prog },
        });
    };

    // ── Acciones de la cola ───────────────────────────────────────────────────

    /** Añadir una pista al final de la cola (o reproducirla si no hay nada) */
    const addToQueue = (track) => {
        const entry = {
            id: track.id,
            name: track.name,
            artist: track.artist,
            cover: track.cover,
            source: 'youtube',
            addedBy: profile?.username || 'Tripulante',
            tips: 0,
        };

        if (!currentTrackRef.current) {
            // Cola vacía → reproducir directamente
            setCurrentTrack(entry);
            setIsPlaying(true);
            setQueue([]);
            broadcastQueue([], entry);
            broadcastPlayback(true, 0);
        } else {
            // Añadir a la cola
            const newQueue = [...queue, entry];
            setQueue(newQueue);
            broadcastQueue(newQueue);
        }
    };

    /** Avanzar a la siguiente pista de la cola */
    const playNext = () => {
        const currentQueue = queueRef.current;
        if (currentQueue.length === 0) {
            // Cola vacía → detener reproducción
            setCurrentTrack(null);
            setIsPlaying(false);
            setProgress(0);
            broadcastQueue([], null);
            broadcastPlayback(false, 0);
            return;
        }

        const [next, ...remaining] = currentQueue;
        setCurrentTrack(next);
        setQueue(remaining);
        setIsPlaying(true);
        setProgress(0);
        broadcastQueue(remaining, next);
        broadcastPlayback(true, 0);
    };

    const togglePlayback = () => {
        const next = !isPlaying;
        setIsPlaying(next);
        broadcastPlayback(next, progress);
    };

    /** Dar boost (prioridad) a una pista con ◈ */
    const boostTrack = async (trackId) => {
        if (balance < BOOST_COST) {
            toast.error('Necesitas más Starlys para darle fuego a esta pista.');
            return;
        }

        const { success } = await deductCoins(BOOST_COST, 'casino_bet', 'Boost Jukebox DJ');
        if (!success) return;

        setQueue(prev => {
            // Incrementar los tips y reordenar por tips (mayor prioridad primero)
            const updated = prev
                .map(item => item.id === trackId ? { ...item, tips: item.tips + BOOST_COST } : item)
                .sort((a, b) => b.tips - a.tips);

            broadcastQueue(updated);
            return updated;
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/*
             * Iframe oculto fuera de pantalla para el player de YouTube.
             * Debe estar siempre montado para que el audio no se interrumpa.
             */}
            <div
                id="yt-player-jukebox"
                style={{
                    position: 'fixed',
                    left: '-9999px',
                    top: '-9999px',
                    width: 320,
                    height: 180,
                    pointerEvents: 'none',
                    visibility: 'hidden',
                }}
            />

            <AnimatePresence mode="wait">
                {!isMinimized ? (

                    /* ── Vista completa del Jukebox ──────────────────────────── */
                    <div
                        key="full-jukebox-wrapper"
                        className="fixed inset-0 z-[10004] flex items-center justify-center p-4 overflow-hidden pointer-events-auto"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        <motion.div
                            key="full-jukebox-panel"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative z-10 w-full sm:max-w-2xl h-auto max-h-[95vh] flex flex-col bg-gradient-to-br from-purple-900/40 via-black/60 to-pink-900/40 backdrop-blur-3xl border border-purple-500/20 rounded-[3rem] shadow-[0_50px_120px_rgba(147,51,234,0.3),0_0_60px_rgba(0,0,0,0.8)] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-10 flex flex-col relative">
                                {/* Glow decorativo de fondo */}
                                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />
                                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-pink-500/20 to-orange-500/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

                                {/* Botón minimizar */}
                                <button
                                    onClick={onClose}
                                    className="absolute right-6 top-6 text-white/40 hover:text-white bg-white/10 p-3 rounded-2xl transition-all z-20 hover:scale-110 hover:bg-white/20 active:scale-90 border border-white/10"
                                >
                                    <ChevronDown size={16} className="sm:w-[20px] sm:h-[20px]" />
                                </button>

                                {/* Header */}
                                <div className="flex items-center gap-6 mb-8 sm:mb-12">
                                    <div className="p-4 bg-gradient-to-br from-purple-500/30 to-pink-500/20 rounded-2xl border border-purple-500/40 text-purple-400 shadow-lg shadow-purple-500/20">
                                        <Youtube size={24} className="sm:w-8 sm:h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black uppercase tracking-[0.2em] text-[12px] sm:text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                            Jukebox DJ
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-lg shadow-purple-500/50" />
                                            <span className="text-[10px] sm:text-[11px] font-bold text-purple-400/80 uppercase tracking-widest leading-none">
                                                Sincronizado · {participants.length + 1} Tripulantes
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 overflow-visible">

                                    {/* ── Player / Visualizador ──── */}
                                    <div className="flex flex-col items-center">
                                        {/* Carátula del track */}
                                        <div className="relative w-full aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden mb-8 sm:mb-10 border-2 border-purple-500/20 bg-black/60 group shadow-2xl shadow-purple-500/10">
                                            {currentTrack ? (
                                                <img
                                                    src={currentTrack.cover}
                                                    alt={currentTrack.name}
                                                    className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-white/10">
                                                    <Youtube size={80} />
                                                    <span className="text-[12px] uppercase font-black tracking-widest">Nada en el Radar</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                            {/* Disco de vinilo animado */}
                                            <motion.div
                                                animate={{ rotate: isPlaying ? 360 : 0 }}
                                                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                                                className="absolute -bottom-12 -right-12 sm:-bottom-16 sm:-right-16 w-32 h-32 sm:w-40 sm:h-40 bg-black rounded-full border-[8px] sm:border-[12px] border-black/80 shadow-2xl overflow-hidden opacity-90"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/10 to-transparent rounded-full" />
                                                {currentTrack?.cover && (
                                                    <img src={currentTrack.cover} className="w-full h-full object-cover grayscale opacity-30 blur-[1px]" alt="" />
                                                )}
                                                <div className="absolute inset-0 border-[24px] sm:border-[32px] border-black/20 rounded-full" />
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50" />
                                            </motion.div>
                                        </div>

                                        {/* Info del track actual */}
                                        <div className="w-full text-center mb-8 sm:mb-10">
                                            <AnimatePresence mode="wait">
                                                {currentTrack ? (
                                                    <motion.div
                                                        key={currentTrack.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="space-y-3 px-6"
                                                    >
                                                        <h4
                                                            className="text-xl sm:text-2xl font-black text-white truncate drop-shadow-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                                                            dangerouslySetInnerHTML={{ __html: currentTrack.name }}
                                                        />
                                                        <p className="text-purple-400 font-bold uppercase tracking-[0.2em] text-[12px] sm:text-sm">
                                                            {currentTrack.artist}
                                                        </p>
                                                        <div className="mt-4 sm:mt-6">
                                                            <span className="text-[10px] font-black bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 px-4 py-2 rounded-full text-purple-300 uppercase tracking-widest inline-block leading-none shadow-lg shadow-purple-500/10">
                                                                DJ: {currentTrack.addedBy}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 opacity-20">
                                                        <h4 className="text-[12px] sm:text-sm font-black text-white uppercase tracking-widest underline decoration-purple-500/50 underline-offset-8">
                                                            Sistema en Reposo
                                                        </h4>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Controles de reproducción */}
                                        <div className="w-full max-w-md px-6">
                                            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-8 sm:mb-10">
                                                {/* Reiniciar */}
                                                <button
                                                    className="text-white/40 hover:text-purple-400 transition-all hover:scale-110 active:scale-90"
                                                    onClick={() => playerRef.current?.seekTo(0)}
                                                    title="Reiniciar pista"
                                                >
                                                    <SkipForward size={20} className="sm:w-6 sm:h-6 rotate-180" />
                                                </button>

                                                {/* Play / Pause */}
                                                <button
                                                    onClick={togglePlayback}
                                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-[0_0_40px_rgba(147,51,234,0.4)] hover:scale-110 active:scale-95 transition-all border-2 border-purple-400/30"
                                                >
                                                    {isPlaying
                                                        ? <Pause size={24} fill="white" className="sm:w-6 sm:h-6" />
                                                        : <Play size={24} fill="white" className="ml-1 sm:w-6 sm:h-6" />
                                                    }
                                                </button>

                                                {/* Siguiente */}
                                                <button
                                                    className="text-white/40 hover:text-purple-400 transition-all hover:scale-110 active:scale-90"
                                                    onClick={playNext}
                                                    title="Siguiente pista"
                                                >
                                                    <SkipForward size={20} className="sm:w-6 sm:h-6" />
                                                </button>

                                                {/* Reiniciar pista - útil cuando no suena al volver a reproducir */}
                                                <button
                                                    onClick={restartCurrentTrack}
                                                    className="text-white/40 hover:text-amber-400 transition-all hover:scale-110 active:scale-90"
                                                    title="Reiniciar pista (si no escuchas al reproducir)"
                                                >
                                                    <RefreshCw size={20} className="sm:w-6 sm:h-6" />
                                                </button>
                                            </div>

                                            {/* Barra de progreso */}
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                                                <motion.div
                                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_15px_rgba(147,51,234,0.6)]"
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ type: 'tween', ease: 'linear' }}
                                                />
                                            </div>

                                            {/* Controlador de volumen */}
                                            <div className="w-full mt-6 flex items-center gap-4">
                                                <Volume size={16} className="text-purple-400 sm:w-5 sm:h-5" />
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        value={volume}
                                                        onChange={(e) => {
                                                            const newVolume = parseInt(e.target.value);
                                                            setVolume(newVolume);
                                                            if (playerRef.current) {
                                                                playerRef.current.setVolume(newVolume);
                                                            }
                                                        }}
                                                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
                                                        style={{
                                                            background: `linear-gradient(to right, rgb(147, 51, 234) 0%, rgb(147, 51, 234) ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)`
                                                        }}
                                                    />
                                                    <div className="absolute -top-1 left-0 w-full h-4 flex items-center justify-between pointer-events-none">
                                                        <div className="w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                                                        <div className="w-2 h-2 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50" />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-purple-400 font-bold min-w-[3rem] text-center">{volume}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Cola de reproducción ──── */}
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <ListMusic size={18} className="text-purple-400 sm:w-5 sm:h-5" />
                                                <span className="text-[10px] sm:text-[12px] font-black text-white uppercase tracking-widest">
                                                    Lista de Espera
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setIsSearchOpen(true)}
                                                className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-600/30 rounded-xl text-[10px] sm:text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2 hover:from-purple-600/30 hover:to-pink-600/30 transition-all shadow-[0_8px_25px_rgba(147,51,234,0.2)] leading-none hover:scale-105 active:scale-95"
                                            >
                                                <Search size={16} className="sm:w-4 sm:h-4" />
                                                Buscar
                                            </button>
                                        </div>

                                        {/* Lista de pistas en cola */}
                                        <div className="bg-black/30 rounded-3xl sm:rounded-4xl border border-purple-500/20 p-6 space-y-4 max-h-[250px] sm:max-h-[400px] overflow-y-auto no-scrollbar backdrop-blur-xl">
                                            <AnimatePresence initial={false}>
                                                {queue.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center gap-6 py-12 sm:py-20 opacity-20">
                                                        <Music size={40} className="sm:w-12 sm:h-12" />
                                                        <p className="text-[10px] sm:text-[12px] font-black uppercase tracking-widest">Nada en cola...</p>
                                                    </div>
                                                ) : (
                                                    queue.map((track, i) => (
                                                        <motion.div
                                                            key={`${track.id}-${i}`}
                                                            initial={{ opacity: 0, x: 30 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -30 }}
                                                            className="group p-4 sm:p-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl sm:rounded-3xl flex items-center gap-4 hover:from-purple-500/20 hover:to-pink-500/20 transition-all hover:scale-[1.02] hover:border-purple-500/30"
                                                        >
                                                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 border-purple-500/30">
                                                                <img src={track.cover} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5
                                                                    className="text-[11px] sm:text-[12px] font-black text-white truncate leading-none mb-2"
                                                                    dangerouslySetInnerHTML={{ __html: track.name }}
                                                                />
                                                                <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-widest truncate">
                                                                    {track.artist}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-3 pr-2">
                                                                {track.tips > 0 && (
                                                                    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-2 rounded-xl border border-purple-500/30 text-purple-400">
                                                                        <Flame size={14} fill="currentColor" />
                                                                        <span className="text-[10px] font-black">{track.tips}</span>
                                                                    </div>
                                                                )}
                                                                {/* Botón de boost — solo visible en hover */}
                                                                <button
                                                                    onClick={() => boostTrack(track.id)}
                                                                    className="p-3 rounded-xl bg-white/10 text-white/40 sm:opacity-0 sm:group-hover:opacity-100 hover:text-purple-400 hover:bg-purple-600/20 transition-all active:scale-90"
                                                                    title={`Boost por ${BOOST_COST}◈`}
                                                                >
                                                                    <TrendingUp size={16} className="sm:w-5 sm:h-5" />
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Balance del DJ */}
                                        <div className="mt-6 p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-600/20 flex items-center justify-between backdrop-blur-xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center">
                                                    <Disc size={18} className="text-purple-400 animate-[spin_4s_linear_infinite] sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] sm:text-[9px] font-black text-purple-400/60 uppercase tracking-widest">
                                                        Créditos DJ
                                                    </span>
                                                    <span className="text-[11px] sm:text-[13px] font-black text-white tracking-widest">
                                                        {balance.toLocaleString()}◈
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-[8px] sm:text-[9px] text-white/30 uppercase tracking-tighter max-w-[120px] text-right italic leading-tight">
                                                Priority boost +{BOOST_COST}◈
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                ) : (

                    /* ── Vista minimizada: barra flotante ────────────────────── */
                    isPlaying && currentTrack && (
                        <motion.div
                            key="minimized-jukebox"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className={`${!isPanelOpen
                                ? 'fixed bottom-24 left-4 right-4 z-[11000] max-w-lg mx-auto mb-0'
                                : 'mb-4'
                                } p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-purple-500/30 rounded-3xl flex items-center gap-4 shadow-[0_0_40px_rgba(147,51,234,0.3)] cursor-pointer hover:from-purple-600/30 hover:to-pink-600/30 transition-all hover:scale-105 active:scale-95`}
                            onClick={() => window.dispatchEvent(new CustomEvent('voice:open_activity', { detail: 'dj' }))}
                        >
                            {/* Thumbnail del track */}
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 border-2 border-purple-500/30">
                                <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/60 to-pink-600/60 flex items-center justify-center">
                                    <Music size={16} className="text-white animate-pulse" />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none mb-1">
                                    {isPlaying ? '⚡ Escuchando Ahora' : '⏸ En Pausa'}
                                </p>
                                <p
                                    className="text-[12px] text-white font-bold truncate"
                                    dangerouslySetInnerHTML={{ __html: currentTrack.name }}
                                />
                                <p className="text-[9px] text-white/40 uppercase tracking-tighter truncate">
                                    {currentTrack.artist}
                                </p>
                            </div>

                            {/* Control rápido play/pause */}
                            <div className="flex items-center gap-3 pr-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
                                    className="p-3 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg active:scale-90 transition-all hover:scale-110 border-2 border-purple-400/30"
                                >
                                    {isPlaying
                                        ? <Pause size={16} fill="white" />
                                        : <Play size={16} fill="white" className="ml-0.5" />
                                    }
                                </button>
                            </div>
                        </motion.div>
                    )
                )}
            </AnimatePresence>

            {/* Modal de búsqueda de YouTube */}
            <YouTubeSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={addToQueue}
            />
        </>
    );
}
