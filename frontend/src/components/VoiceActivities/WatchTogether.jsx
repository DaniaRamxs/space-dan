/**
 * WatchTogether.jsx
 * Sistema de video sincronizado para ver YouTube juntos
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Play, Pause, SkipForward, Volume2, VolumeX,
    Maximize2, Minimize2, Users, MessageCircle, Settings,
    Film, Tv, Share2, Clock, Eye, EyeOff, Menu, Crown
} from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import YouTubeSearchModal from '../Social/YouTubeSearchModal';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SYNC_INTERVAL_MS = 4000;
const MAX_SEEK_DRIFT_S = 5;

// Mapa de estados del player de YouTube
const YT_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};

export default function WatchTogether({ roomName, onClose, isMinimized = false, isPanelOpen = false }) {
    const { user, profile } = useAuthContext();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const firstParticipantId = participants[0]?.identity;
    const localIdentity = localParticipant?.identity ?? user?.id;
    
    // Host: first participant in room list; when local participant metadata is missing,
    // fallback to authenticated user id.
    const effectiveHost = participants.length === 0 || (!!localIdentity && localIdentity === firstParticipantId);
    const isHost = effectiveHost;

    // Fallback only when participants exist but no resolvable first identity.
    const allowAllVideos = participants.length > 0 && !firstParticipantId;

    // ── State ───────────────────────────────────────────────────────────────────
    const [currentVideo, setCurrentVideo] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(50);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [watchers, setWatchers] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isShortsMode, setIsShortsMode] = useState(false);
    const [shortsCategory, setShortsCategory] = useState('trending');
    const [customSearch, setCustomSearch] = useState('');
    const [participantsMenuOpen, setParticipantsMenuOpen] = useState(false);
    const [channelParticipants, setChannelParticipants] = useState([]);
    const [isShortVideo, setIsShortVideo] = useState(false);
    const [youtubePlayer, setYoutubePlayer] = useState(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // ── YouTube Player API ─────────────────────────────────────────────────────
    useEffect(() => {
        // Cargar YouTube API
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Inicializar player cuando API esté lista
        window.onYouTubeIframeAPIReady = () => {
            console.log('YouTube API Ready');
        };

        return () => {
            window.onYouTubeIframeAPIReady = null;
        };
    }, []);


    // ── Volume Control ───────────────────────────────────────────────────────
    useEffect(() => {
        if (youtubePlayer) {
            youtubePlayer.setVolume(isMuted ? 0 : volume);
        }
    }, [volume, isMuted, youtubePlayer]);

    // ── Progress Update ───────────────────────────────────────────────────────
    useEffect(() => {
        if (youtubePlayer && isPlaying) {
            const interval = setInterval(() => {
                const currentTime = youtubePlayer.getCurrentTime();
                const duration = youtubePlayer.getDuration();
                const progressPercent = (currentTime / duration) * 100;
                setProgress(progressPercent);
            }, 1000);
            
            return () => clearInterval(interval);
        }
    }, [youtubePlayer, isPlaying]);
    const currentVideoRef = useRef(null);
    const isPlayingRef = useRef(false);
    const playerRef = useRef(null);
    const channelRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    // Mantener refs sincronizados
    useEffect(() => { currentVideoRef.current = currentVideo; }, [currentVideo]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    
    // Debug del estado currentVideo
    useEffect(() => {
        console.log('currentVideo cambió a:', currentVideo);
    }, [currentVideo]);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const syncPlayerTime = (progressPercent, currentTime, duration) => {
        const player = playerRef.current;
        if (!player?.getCurrentTime) return;

        const targetTime = (progressPercent / 100) * duration;
        const actualTime = player.getCurrentTime() || 0;

        if (Math.abs(actualTime - targetTime) > MAX_SEEK_DRIFT_S) {
            player.seekTo(targetTime, true);
        }
    };

    const playNext = () => {
        // Placeholder for next video functionality
        console.log('Play next video');
    };

    // ── Cleanup on Unmount ───────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            // Cleanup YouTube player - usar playerRef.current
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.log('[WatchTogether] Error destroying player:', e);
                }
                playerRef.current = null;
            }
            
            // Cleanup Supabase channel
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            
            // Cleanup intervals
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
                controlsTimeoutRef.current = null;
            }
            
            // Limpiar el callback global
            window.onYouTubeIframeAPIReady = null;
            
            console.log('WatchTogether cleanup completed');
        };
    }, []);

    // ── 1. Canal de Supabase + carga del SDK de YouTube ──────────────────────
    useEffect(() => {
        if (!roomName || !user) return;

        const chanName = `watch-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(chanName);
        channelRef.current = channel;

        console.log('Creating new WatchTogether room:', chanName);

        channel
            .on('broadcast', { event: 'video_update' }, ({ payload }) => {
                if (payload.video !== undefined && payload.video?.id !== currentVideoRef.current?.id) {
                    setCurrentVideo(payload.video);
                    setProgress(0);
                }
            })
            .on('broadcast', { event: 'playback_update' }, ({ payload }) => {
                setIsPlaying(payload.isPlaying);
                if (payload.progress !== undefined) {
                    setProgress(payload.progress);
                    syncPlayerTime(payload.progress, payload.currentTime, payload.duration);
                }
            })
            .on('broadcast', { event: 'viewer_update' }, ({ payload }) => {
                setWatchers(payload.watchers || []);
            })
            .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
                // Only add message if it's not from current user (to avoid duplicates)
                if (payload.userId !== user?.id) {
                    setMessages(prev => [...prev.slice(-50), payload]);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    emitViewerStatus();
                }
            });

        // Cargar SDK de YouTube si aún no está disponible
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(tag, firstScript);
        }

        // Emitir estado de espectador
        const emitViewerStatus = () => {
            channel.send({
                type: 'broadcast',
                event: 'viewer_update',
                payload: {
                    userId: user.id,
                    username: profile.username,
                    isWatching: true,
                    timestamp: Date.now()
                }
            });
        };

        const interval = setInterval(emitViewerStatus, 30000);

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            clearInterval(interval);

            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (_) { }
                playerRef.current = null;
            }
        };
    }, [roomName, user]);

    // ── 2. Inicializar/cambiar video en el player de YouTube ─────────────────
    useEffect(() => {
        if (!currentVideo?.id) return;

        const handleYTReady = () => {
            // Check if player exists and is ready with required methods
            if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
                playerRef.current.loadVideoById(currentVideo.id);
                return;
            }
            
            // Destroy existing player if it exists but isn't ready
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.log('Error destroying player:', e);
                }
                playerRef.current = null;
            }

            // After destroy(), YouTube replaces the div with an iframe and removes it.
            // Recreate the target div inside the wrapper before initializing.
            const wrapper = document.getElementById('wt-player-wrapper');
            if (wrapper) {
                const newDiv = document.createElement('div');
                newDiv.id = 'wt-player';
                newDiv.style.width = '100%';
                newDiv.style.height = '100%';
                wrapper.innerHTML = '';
                wrapper.appendChild(newDiv);
            }

            if (!document.getElementById('wt-player')) return;

            playerRef.current = new window.YT.Player('wt-player', {
                height: '100%',
                width: '100%',
                videoId: currentVideo.id,
                playerVars: {
                    autoplay: isPlayingRef.current ? 1 : 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    modestbranding: 1,
                    iv_load_policy: 3,
                    cc_load_policy: 1,
                    origin: window.location.origin,
                    enablejsapi: 1,
                },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(volume);
                        e.target.setPlaybackQuality('hd720');
                        if (isPlayingRef.current) {
                            e.target.playVideo();
                        }
                    },
                    onStateChange: (e) => {
                        if (e.data === YT_STATE.ENDED && isHost) {
                            playNext();
                        }
                    },
                    onPlaybackQualityChange: (e) => {
                        console.log('Quality changed to:', e.data);
                    }
                },
            });
        };

        if (window.YT && window.YT.Player) {
            handleYTReady();
        } else {
            window.onYouTubeIframeAPIReady = handleYTReady;
        }

        return () => {
            if (window.onYouTubeIframeAPIReady === handleYTReady) {
                delete window.onYouTubeIframeAPIReady;
            }
        };
    }, [currentVideo?.id, isFullscreen, volume]);

    // ── 3. Sincronizar play/pause con el player ───────────────────────────────
    useEffect(() => {
        const player = playerRef.current;
        if (!player?.playVideo) return;
        
        if (isPlaying) {
            player.playVideo();
        } else {
            player.pauseVideo();
        }
    }, [isPlaying]);

    // ── 4. Sincronizar volumen ─────────────────────────────────────────────────────
    useEffect(() => {
        const player = playerRef.current;
        if (!player?.setVolume) return;
        
        player.setVolume(isMuted ? 0 : volume);
    }, [volume, isMuted]);

    // ── 5. Emisión de progreso periódica (solo el host) ───────────────────────
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

    // ── 6. Auto-hide controls ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!isPlaying) return;

        const resetControlsTimeout = () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        };

        resetControlsTimeout();
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [isPlaying]);

    const togglePlayback = () => {
        if (!effectiveHost && !allowAllVideos) {
            console.log('No es host y allowAllVideos es false, no puede controlar reproducción');
            return;
        }

        const player = playerRef.current;
        if (!player?.playVideo) {
            console.log('Player no disponible');
            return;
        }

        if (isPlaying) {
            player.pauseVideo();
            setIsPlaying(false);
        } else {
            player.playVideo();
            setIsPlaying(true);
        }

        // Broadcast a otros participantes
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'playback_update',
                payload: { isPlaying: !isPlaying, progress },
            });
        }
    };

    const seekTo = (percent) => {
        if (!effectiveHost && !allowAllVideos) {
            console.log('No es host y allowAllVideos es false, no puede hacer seek');
            return;
        }

        const player = playerRef.current;
        if (!player?.getDuration || !currentVideo) {
            console.log('Player no disponible');
            return;
        }

        const duration = player.getDuration();
        const seconds = (percent / 100) * duration;
        player.seekTo(seconds, true);
        setProgress(percent);

        // Broadcast a otros participantes
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'seek_update',
                payload: { progress: percent },
            });
        }
    };

const playVideo = (video) => {
    console.log('playVideo llamado con:', video);
    console.log('effectiveHost:', effectiveHost);
    console.log('allowAllVideos:', allowAllVideos);
    console.log('currentVideo ANTES:', currentVideo);
    
    if (!effectiveHost && !allowAllVideos) {
        console.log('No es host y allowAllVideos es false, no puede reproducir video');
        return;
    }
    
    // Detectar si es un Short por el ID o título
    const isShort = video.id.includes('shorts') || 
                   video.name.toLowerCase().includes('shorts') ||
                   video.name.toLowerCase().includes('#shorts');
    
    setIsShortVideo(isShort);
    console.log('Es un Short:', isShort);
    
    setCurrentVideo(video);
    setProgress(0);
    setIsPlaying(true);
    
    console.log('currentVideo DESPUÉS:', video);
    console.log('isPlaying establecido a: true');

    if (channelRef.current) {
        channelRef.current.send({
            type: 'broadcast',
            event: 'video_update',
            payload: { video },
        });
        console.log('video_update enviado al canal');
    } else {
        console.log('channelRef.current es null');
    }
};

    const sendMessage = (text) => {
        if (!channelRef.current || !text.trim()) return;

        const message = {
            id: Date.now(),
            userId: user?.id,
            username: profile?.username || 'Anon',
            content: text.trim(),
            timestamp: Date.now(),
        };

        // Add message locally for immediate feedback
        setMessages(prev => [...prev.slice(-50), message]);

        // Broadcast to other participants
        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: message,
        });
    };

    // ── TikTok-Style Touch Handlers ─────────────────────────────────────────────
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [shortsIndex, setShortsIndex] = useState(0);
    const [shortsFeed, setShortsFeed] = useState([]);

    // Handle touch events for TikTok-style scrolling
    const handleTouchStart = (e) => {
        if (!isShortsMode) return;
        setTouchEnd(0);
        setTouchStart(e.targetTouches[0].clientY);
    };

    const handleTouchMove = (e) => {
        if (!isShortsMode) return;
        setTouchEnd(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = () => {
        if (!isShortsMode) return;
        
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isUpSwipe = distance > 50;
        const isDownSwipe = distance < -50;
        
        if (isUpSwipe) {
            // Swipe up - next short
            playNextShort();
        } else if (isDownSwipe) {
            // Swipe down - previous short
            playPreviousShort();
        }
    };

    const playPreviousShort = async () => {
        if (!effectiveHost || !isShortsMode) return;
        
        try {
            const shorts = await searchShorts(shortsCategory, customSearch);
            const currentIndex = shorts.findIndex(s => s.id.videoId === currentVideo?.id);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : shorts.length - 1;
            
            if (shorts[prevIndex]) {
                const prevShort = {
                    id: shorts[prevIndex].id.videoId,
                    name: shorts[prevIndex].snippet.title,
                    artist: shorts[prevIndex].snippet.channelTitle,
                    cover: shorts[prevIndex].snippet.thumbnails.medium.url,
                    isShort: true
                };
                playVideo(prevShort);
            }
        } catch (error) {
            console.error('Error playing previous short:', error);
        }
    };

    // ── Shorts Functions ───────────────────────────────────────────────────────
    
    const searchShorts = async (category = 'trending', customTerm = '') => {
        const queries = {
            trending: 'shorts en tendencia',
            music: 'música shorts',
            dance: 'baile shorts',
            comedy: 'chistes shorts',
            gaming: 'videojuegos shorts',
            sports: 'deportes shorts',
            asmr: 'asmr shorts',
            comida: 'comida shorts',
            mascotas: 'mascotas shorts',
            belleza: 'belleza shorts',
            fitness: 'ejercicio shorts',
            viajes: 'viajes shorts'
        };
        
        const query = customTerm || queries[category] || 'shorts';
        
        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=25&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
            );
            const data = await response.json();
            return data.items || [];
        } catch (error) {
            console.error('Error searching shorts:', error);
            return [];
        }
    };

    const loadShortsFeed = async () => {
        if (!effectiveHost) return;
        
        try {
            const shorts = await searchShorts(shortsCategory, customSearch);
            if (shorts.length > 0) {
                const firstShort = {
                    id: shorts[0].id.videoId,
                    name: shorts[0].snippet.title,
                    artist: shorts[0].snippet.channelTitle,
                    cover: shorts[0].snippet.thumbnails.medium.url,
                    isShort: true
                };
                playVideo(firstShort);
            }
        } catch (error) {
            console.error('Error loading shorts feed:', error);
        }
    };

    const playNextShort = async () => {
        if (!effectiveHost || !isShortsMode) return;
        
        try {
            const shorts = await searchShorts(shortsCategory, customSearch);
            const currentIndex = shorts.findIndex(s => s.id.videoId === currentVideo?.id);
            const nextIndex = currentIndex >= 0 && currentIndex < shorts.length - 1 ? currentIndex + 1 : 0;
            
            if (shorts[nextIndex]) {
                const nextShort = {
                    id: shorts[nextIndex].id.videoId,
                    name: shorts[nextIndex].snippet.title,
                    artist: shorts[nextIndex].snippet.channelTitle,
                    cover: shorts[nextIndex].snippet.thumbnails.medium.url,
                    isShort: true
                };
                playVideo(nextShort);
            }
        } catch (error) {
            console.error('Error playing next short:', error);
        }
    };

    const toggleShortsMode = () => {
        if (!effectiveHost) return;
        
        const newMode = !isShortsMode;
        setIsShortsMode(newMode);
        
        if (newMode) {
            loadShortsFeed();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────────

    if (isMinimized && currentVideo) {
        return (
            <div className="fixed bottom-24 left-4 right-4 z-[99997] max-w-2xl mx-auto">
                <div 
                    className="bg-black/90 backdrop-blur-xl rounded-2xl p-4 border border-white/10 cursor-pointer hover:bg-black/80 transition-all"
                    onClick={() => window.dispatchEvent(new CustomEvent('voice:open_activity', { detail: 'watch' }))}
                >
                    <div className="flex items-center gap-4">
                        <img 
                            src={currentVideo.cover} 
                            className="w-16 h-10 rounded-lg object-cover" 
                            alt=""
                        />
                        <div className="flex-1">
                            <p className="text-white font-bold text-sm truncate">{currentVideo.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-white/60">
                                    {isPlaying ? '⏸ Pausado' : '▶️ Reproduciendo'}
                                </span>
                                <span className="text-xs text-white/40">
                                    {watchers.length + 1} viendo
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlayback(); }}
                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all"
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>

            <AnimatePresence mode="wait">
                {!isMinimized && (
                    <div
                        key="watch-together-wrapper"
                        className="fixed inset-0 z-[99996] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl"
                        onClick={onClose}
                    >
                        <motion.div
                            key="watch-together-panel"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="relative w-full h-full max-w-6xl max-h-[95vh] sm:h-[90vh] sm:max-h-[800px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Video Container */}
                            <div 
                                className={`relative w-full h-full bg-black ${
                                    isShortsMode ? 'aspect-[9/16]' : 'aspect-video'
                                }`}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={() => isPlaying && setShowControls(false)}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                {currentVideo ? (
                                    <>
                                        {/* YouTube Video Player - YT.Player API renders here */}
                                        <div id="wt-player-wrapper" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                                            <div id="wt-player" style={{
                                                width: '100%',
                                                height: '100%',
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                            }} />
                                        </div>

                                        {/* Video Info Header - Hidden in Shorts Mode */}
                                        {!isShortsMode && (
                                            <div className="absolute top-0 left-0 right-0 p-3 sm:p-6 bg-gradient-to-b from-black/80 to-transparent">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 sm:p-3 bg-white/10 rounded-lg sm:rounded-xl pointer-events-none">
                                                            <Film size={16} className="text-white sm:hidden" />
                                                            <Film size={20} className="text-white hidden sm:block" />
                                                        </div>
                                                        <div className="min-w-0 flex-1 pointer-events-none">
                                                            <h3 className="text-white font-bold text-sm sm:text-lg truncate">
                                                                {currentVideo.name}
                                                            </h3>
                                                            <p className="text-white/60 text-xs sm:text-sm">
                                                                {currentVideo.artist || 'YouTube Video'}
                                                                {isShortsMode && ' • Shorts Mode'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                                        {/* Participants Menu */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setParticipantsMenuOpen(!participantsMenuOpen);
                                                            }}
                                                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all touch-manipulation pointer-events-auto"
                                                        >
                                                            <Menu size={16} />
                                                        </button>
                                                        
                                                        {/* Shorts Mode Toggle */}
                                                        {effectiveHost && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    toggleShortsMode();
                                                                }}
                                                                className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all touch-manipulation pointer-events-auto ${
                                                                    isShortsMode 
                                                                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                                                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                                                }`}
                                                            >
                                                                {isShortsMode ? 'Shorts On' : 'Shorts'}
                                                            </button>
                                                        )}
                                                        
                                                        {/* Allow All Videos Toggle */}
                                                        {effectiveHost && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    // Toggle functionality removed - allowAllVideos is now computed
                                                                }}
                                                                className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all touch-manipulation pointer-events-auto ${
                                                                    allowAllVideos 
                                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                                                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                                                }`}
                                                            >
                                                                {allowAllVideos ? 'Permitir Todos' : 'Bloquear Todos'}
                                                            </button>
                                                        )}
                                                        
                                                        {/* Shorts Category Selector */}
                                                        {isShortsMode && effectiveHost && (
                                                            <select
                                                                value={shortsCategory}
                                                                onChange={(e) => setShortsCategory(e.target.value)}
                                                                className="px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg border border-white/20 focus:outline-none focus:border-white/40"
                                                            >
                                                                <option value="trending">Trending</option>
                                                                <option value="music">Music</option>
                                                                <option value="dance">Dance</option>
                                                                <option value="comedy">Comedy</option>
                                                                <option value="gaming">Gaming</option>
                                                                <option value="sports">Sports</option>
                                                            </select>
                                                        )}
                                                        
                                                        <div className="flex items-center gap-2 text-white/60 text-sm">
                                                            <Users size={16} />
                                                            <span>{watchers.length + 1}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setChatOpen(!chatOpen)}
                                                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all pointer-events-auto"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setIsFullscreen(!isFullscreen)}
                                                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all pointer-events-auto"
                                                        >
                                                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={onClose}
                                                            className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all pointer-events-auto"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TikTok-style Shorts Overlay */}
                                        {isShortsMode && (
                                            <div className="absolute inset-0 pointer-events-none">
                                                {/* Top controls */}
                                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                                    {/* Category selector and custom search */}
                                                    {effectiveHost && (
                                                        <div className="flex flex-col gap-2">
                                                            <select
                                                                value={shortsCategory}
                                                                onChange={(e) => setShortsCategory(e.target.value)}
                                                                className="px-3 py-2 bg-black/60 backdrop-blur text-white text-sm rounded-lg border border-white/30 focus:outline-none focus:border-white/50 pointer-events-auto"
                                                            >
                                                                <option value="trending">🔥 En Tendencia</option>
                                                                <option value="music">🎵 Música</option>
                                                                <option value="dance">💃 Baile</option>
                                                                <option value="comedy">😂 Comedia</option>
                                                                <option value="gaming">🎮 Videojuegos</option>
                                                                <option value="sports">⚽ Deportes</option>
                                                                <option value="asmr">🤫 ASMR</option>
                                                                <option value="comida">🍕 Comida</option>
                                                                <option value="mascotas">🐾 Mascotas</option>
                                                                <option value="belleza">💄 Belleza</option>
                                                                <option value="fitness">💪 Fitness</option>
                                                                <option value="viajes">✈️ Viajes</option>
                                                                <option value="custom">🔍 Búsqueda Personalizada</option>
                                                            </select>
                                                            
                                                            {shortsCategory === 'custom' && (
                                                                <input
                                                                    type="text"
                                                                    value={customSearch}
                                                                    onChange={(e) => setCustomSearch(e.target.value)}
                                                                    placeholder="Buscar tema (ej: ASMR, anime, etc)"
                                                                    className="px-3 py-2 bg-black/60 backdrop-blur text-white text-sm rounded-lg border border-white/30 focus:outline-none focus:border-white/50 placeholder-white/50 pointer-events-auto"
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Exit button - more visible */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleShortsMode();
                                                        }}
                                                        className="p-3 bg-black/60 backdrop-blur rounded-full text-white hover:bg-black/80 transition-all pointer-events-auto border border-white/30"
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                                
                                                {/* Swipe indicators */}
                                                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-white/20">
                                                    <SkipForward size={24} className="rotate-90" />
                                                </div>
                                                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-white/20">
                                                    <SkipForward size={24} className="-rotate-90" />
                                                </div>
                                                
                                                {/* Video info */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                                    <h3 className="text-white font-bold text-sm mb-1">{currentVideo.name}</h3>
                                                    <p className="text-white/80 text-xs">{currentVideo.artist || 'YouTube'}</p>
                                                    
                                                    {/* Skip buttons for mobile */}
                                                    <div className="flex justify-center gap-4 mt-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                playPreviousShort();
                                                            }}
                                                            className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-all pointer-events-auto"
                                                        >
                                                            <SkipForward size={16} className="rotate-180" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                playNextShort();
                                                            }}
                                                            className="p-2 bg-white/20 backdrop-blur rounded-full text-white hover:bg-white/30 transition-all pointer-events-auto"
                                                        >
                                                            <SkipForward size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Center Controls - Hidden in Shorts Mode */}
                                        <AnimatePresence>
                                            {showControls && !isShortsMode && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 20 }}
                                                    className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent"
                                                >
                                                    {/* Progress Bar */}
                                                    <div className="mb-6">
                                                        <div className="relative h-2 bg-white/20 rounded-full overflow-hidden cursor-pointer pointer-events-auto"
                                                             onClick={(e) => {
                                                                 e.preventDefault();
                                                                 e.stopPropagation();
                                                                 const rect = e.currentTarget.getBoundingClientRect();
                                                                 const percent = ((e.clientX - rect.left) / rect.width) * 100;
                                                                 seekTo(percent);
                                                             }}>
                                                            <motion.div
                                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                                                                animate={{ width: `${progress}%` }}
                                                                transition={{ type: 'tween', ease: 'linear' }}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between mt-2 text-xs text-white/60">
                                                            <span>{formatTime((progress / 100) * videoDuration)}</span>
                                                            <span>{formatTime(videoDuration)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Playback Controls */}
                                                    <div className="flex items-center justify-center gap-8">
                                                        <button
                                                            onClick={() => seekTo(Math.max(0, progress - 10))}
                                                            className="p-3 text-white/60 hover:text-white transition-all"
                                                        >
                                                            <SkipForward size={20} className="rotate-180" />
                                                        </button>
                                                        
                                                        <button
                                                            onClick={togglePlayback}
                                                            className="p-4 bg-white/20 rounded-full text-white hover:bg-white/30 transition-all"
                                                        >
                                                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                                                        </button>
                                                        
                                                        <button
                                                            onClick={() => seekTo(Math.min(100, progress + 10))}
                                                            className="p-3 text-white/60 hover:text-white transition-all"
                                                        >
                                                            <SkipForward size={20} />
                                                        </button>
                                                        
                                                        {/* Next Short Button */}
                                                        {isShortsMode && effectiveHost && (
                                                            <button
                                                                onClick={playNextShort}
                                                                className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-white hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
                                                            >
                                                                <SkipForward size={20} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Volume Control */}
                                                    <div className="flex items-center justify-center gap-4 mt-6">
                                                        <button
                                                            onClick={() => setIsMuted(!isMuted)}
                                                            className="p-2 text-white/60 hover:text-white transition-all"
                                                        >
                                                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                                        </button>
                                                        <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                                                style={{ width: `${isMuted ? 0 : volume}%` }}
                                                            />
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={volume}
                                                            onChange={(e) => setVolume(parseInt(e.target.value))}
                                                            className="w-24 h-1 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Chat Sidebar */}
                                        <AnimatePresence>
                                            {chatOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: 100 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 100 }}
                                                    className="absolute right-0 top-20 bottom-20 w-80 bg-black/80 backdrop-blur-xl rounded-l-2xl border-l border-white/10 p-4"
                                                >
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="text-white font-bold">Chat</h4>
                                                        <button
                                                            onClick={() => setChatOpen(false)}
                                                            className="p-1 text-white/60 hover:text-white"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-60">
                                                        {messages.map((msg) => (
                                                            <div key={msg.id} className="text-white/80 text-sm">
                                                                <span className="font-bold text-blue-400">{msg.username}:</span> {msg.content}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Escribe un mensaje..."
                                                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm"
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                sendMessage(e.target.value);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-white/40">
                                        {!isShortsMode && !currentVideo && !isSearchOpen ? (
                                            /* Mode Selection Screen - solo host */
                                            effectiveHost ? (
                                            <div className="flex flex-col items-center justify-center max-w-md w-full px-6">
                                                <Tv size={64} className="mb-4 text-white/60" />
                                                <h3 className="text-2xl font-bold mb-2 text-white">Elige el modo</h3>
                                                <p className="text-sm mb-8 text-white/50">¿Qué quieres ver hoy?</p>
                                                
                                                <div className="grid grid-cols-2 gap-4 w-full">
                                                    {/* Shorts Option */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setIsShortsMode(true);
                                                            setTimeout(() => {
                                                                loadShortsFeed();
                                                            }, 100);
                                                        }}
                                                        className="flex flex-col items-center p-6 bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-500/50 hover:border-pink-500 rounded-2xl transition-all hover:scale-105 group"
                                                    >
                                                        <div className="w-16 h-16 mb-3 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-pink-500/50 transition-all">
                                                            <span className="text-3xl">📱</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-white mb-1">Shorts</span>
                                                        <span className="text-xs text-white/60">Videos cortos</span>
                                                    </button>
                                                    
                                                    {/* Videos Option */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setIsSearchOpen(true);
                                                        }}
                                                        className="flex flex-col items-center p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 hover:border-blue-500 rounded-2xl transition-all hover:scale-105 group"
                                                    >
                                                        <div className="w-16 h-16 mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-all">
                                                            <span className="text-3xl">📺</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-white mb-1">Videos</span>
                                                        <span className="text-xs text-white/60">Videos normales</span>
                                                    </button>
                                                </div>
                                            </div>
                                            ) : (
                                            /* Non-host waiting screen */
                                            <div className="flex flex-col items-center justify-center max-w-md w-full px-6">
                                                <Tv size={64} className="mb-4 text-white/30" />
                                                <h3 className="text-xl font-bold mb-2 text-white/70">Esperando al host...</h3>
                                                <p className="text-sm text-white/40">El host está eligiendo un video</p>
                                            </div>
                                            )
                                        ) : (
                                            /* Default Initial Screen with controls */
                                            <>
                                                <Tv size={64} className="mb-4" />
                                                <h3 className="text-xl font-bold mb-2">Sala de Mirar Juntos</h3>
                                                <p className="text-sm mb-6">Prueba nuestra nueva función para ver shorts y videos en tiempo real</p>
                                                
                                                {/* Shorts Mode Toggle */}
                                                {effectiveHost && (
                                                    <div className="mb-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                toggleShortsMode();
                                                                // Auto-load after activation
                                                                setTimeout(() => {
                                                                    loadShortsFeed();
                                                                }, 500);
                                                            }}
                                                            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-widest transition-all mb-4 ${
                                                                isShortsMode 
                                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                                                                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                                                            }`}
                                                        >
                                                            {isShortsMode ? '🔥 Shorts Mode Activado' : '📱 Activar Shorts Mode'}
                                                        </button>
                                                        {isShortsMode && (
                                                            <div className="text-center">
                                                                <select
                                                                    value={shortsCategory}
                                                                    onChange={(e) => setShortsCategory(e.target.value)}
                                                                    className="px-3 py-2 bg-black/60 backdrop-blur text-white text-sm rounded-lg border border-white/30 focus:outline-none focus:border-white/50 mb-2"
                                                                >
                                                                    <option value="trending">🔥 En Tendencia</option>
                                                                    <option value="music">🎵 Música</option>
                                                                    <option value="dance">💃 Baile</option>
                                                                    <option value="comedy">😂 Comedia</option>
                                                                    <option value="gaming">🎮 Videojuegos</option>
                                                                    <option value="sports">⚽ Deportes</option>
                                                                    <option value="asmr">🤫 ASMR</option>
                                                                    <option value="comida">🍕 Comida</option>
                                                                    <option value="mascotas">🐾 Mascotas</option>
                                                                    <option value="belleza">💄 Belleza</option>
                                                                    <option value="fitness">💪 Fitness</option>
                                                                    <option value="viajes">✈️ Viajes</option>
                                                                    <option value="custom">🔍 Búsqueda Personalizada</option>
                                                                </select>
                                                                
                                                                {shortsCategory === 'custom' && (
                                                                    <div className="mb-2">
                                                                        <input
                                                                            type="text"
                                                                            value={customSearch}
                                                                            onChange={(e) => setCustomSearch(e.target.value)}
                                                                            placeholder="Buscar tema (ej: ASMR, anime, etc)"
                                                                            className="px-3 py-2 bg-black/60 backdrop-blur text-white text-sm rounded-lg border border-white/30 focus:outline-none focus:border-white/50 placeholder-white/50 mr-2"
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                console.log('Cargar shorts personalizados');
                                                                                loadShortsFeed();
                                                                            }}
                                                                            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-bold hover:scale-105 transition-all"
                                                                        >
                                                                            Cargar Shorts
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                
                                                                {shortsCategory !== 'custom' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            console.log('Cargar shorts feed');
                                                                            loadShortsFeed();
                                                                        }}
                                                                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-sm font-bold hover:scale-105 transition-all"
                                                                    >
                                                                        Cargar Shorts
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Videos Mode - Show Search Button */}
                                                {effectiveHost && !isShortsMode && (
                                                    <div className="mb-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setIsSearchOpen(true);
                                                            }}
                                                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 shadow-lg flex items-center gap-2"
                                                        >
                                                            <Film size={18} />
                                                            Buscar Videos en YouTube
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {!effectiveHost && (
                                                    <p className="text-sm text-white/60">Esperando que el host inicie un video...</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Participants Menu */}
            <AnimatePresence>
                {participantsMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute top-16 right-2 sm:right-4 w-72 sm:w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[99998] max-h-[50vh] overflow-hidden"
                    >
                        <div className="p-3 sm:p-4">
                            <h3 className="text-white font-bold text-sm mb-3">Participantes</h3>
                            <div className="space-y-2 max-h-40 sm:max-h-64 overflow-y-auto">
                                {/* Participante local */}
                                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                                    <img 
                                        src={profile?.avatar_url || 'https://via.placeholder.com/40'} 
                                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white/20" 
                                        alt=""
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-white text-xs sm:text-sm font-medium truncate">{profile?.username || 'Tú'}</p>
                                            {effectiveHost && (
                                                <Crown size={14} className="text-yellow-400 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-white/60 text-xs">Host</p>
                                    </div>
                                </div>
                                
                                {/* Otros participantes */}
                                {participants.filter(p => p.identity !== localIdentity).map((participant, index) => (
                                    <div key={participant.identity} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                                        <img 
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.identity}`} 
                                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white/20" 
                                            alt=""
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-white text-xs sm:text-sm font-medium truncate">
                                                    {participant.name || `Usuario ${index + 1}`}
                                                </p>
                                                {index === 0 && !effectiveHost && (
                                                    <Crown size={14} className="text-yellow-400 flex-shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-white/60 text-xs">
                                                {index === 0 ? 'Host' : 'Participante'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* YouTube Search Modal */}
            <YouTubeSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={(video) => {
                    playVideo(video);
                    setIsSearchOpen(false);
                }}
            />
        </>
    );
}
