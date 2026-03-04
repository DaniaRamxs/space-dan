import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Search, Play, Pause, SkipForward, Flame, TrendingUp, Disc, ListMusic, Youtube, ChevronDown } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import YouTubeSearchModal from '../Social/YouTubeSearchModal';

const YT_PLAYER_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
};

export default function JukeboxDJ({ roomName, onClose, isMinimized = false }) {
    const { user, profile } = useAuthContext();
    const { balance, deductCoins, awardCoins } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [queue, setQueue] = useState([]); // [{ id, name, artist, cover, source: 'youtube', tips: 0 }]
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const playerRef = useRef(null);
    const channelRef = useRef(null);
    const progressIntervalRef = useRef(null);

    // El host es el que sincroniza el tiempo real
    const isHost = participants.length === 0 || localParticipant?.identity === participants[0]?.identity;

    // --- 1. Realtime Sync ---
    useEffect(() => {
        if (!roomName || !user) return;

        const channelName = `jukebox-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
                setQueue(payload.queue);
                if (payload.currentTrack !== undefined) {
                    if (payload.currentTrack?.id !== currentTrack?.id) {
                        setCurrentTrack(payload.currentTrack);
                        setProgress(0);
                    }
                }
            })
            .on('broadcast', { event: 'playback_update' }, ({ payload }) => {
                setIsPlaying(payload.isPlaying);
                if (payload.progress !== undefined) {
                    setProgress(payload.progress);
                    // Si la diferencia es mucha, forzar skip en el youtube player
                    syncPlayerTime(payload.progress);
                }
            })
            .subscribe();

        // Cargar API de YouTube
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        return () => {
            supabase.removeChannel(channel);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [roomName, user]);

    // --- 2. YouTube Player Logic ---
    useEffect(() => {
        if (!currentTrack?.id) return;

        const initPlayer = () => {
            if (playerRef.current) {
                playerRef.current.loadVideoById(currentTrack.id);
                return;
            }

            playerRef.current = new window.YT.Player('yt-player-hidden', {
                height: '0',
                width: '0',
                videoId: currentTrack.id,
                playerVars: {
                    autoplay: isPlaying ? 1 : 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    modestbranding: 1
                },
                events: {
                    onReady: (event) => {
                        if (isPlaying) event.target.playVideo();
                        event.target.setVolume(50);
                    },
                    onStateChange: (event) => {
                        if (event.data === YT_PLAYER_STATE.ENDED && isHost) {
                            playNext();
                        }
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            window.onYouTubeIframeAPIReady = initPlayer;
        }
    }, [currentTrack?.id]);

    useEffect(() => {
        if (!playerRef.current || !playerRef.current.playVideo) return;

        if (isPlaying) {
            playerRef.current.playVideo();
        } else {
            playerRef.current.pauseVideo();
        }
    }, [isPlaying]);

    // Sync progress periodically if host
    useEffect(() => {
        if (!isHost) return;

        progressIntervalRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const currentTime = playerRef.current.getCurrentTime();
                const duration = playerRef.current.getDuration();
                const p = (currentTime / duration) * 100;
                setProgress(p);
                if (isPlaying) broadcastPlayback(isPlaying, p);
            }
        }, 4000);

        return () => clearInterval(progressIntervalRef.current);
    }, [isHost, isPlaying]);

    const syncPlayerTime = (p) => {
        if (!playerRef.current || !playerRef.current.getCurrentTime) return;
        const duration = playerRef.current.getDuration();
        const targetTime = (p / 100) * duration;
        const actualTime = playerRef.current.getCurrentTime();

        if (Math.abs(actualTime - targetTime) > 5) {
            playerRef.current.seekTo(targetTime, true);
        }
    };

    // --- 3. Actions ---
    const broadcastQueue = (newQueue, newTrack = currentTrack) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'queue_update',
            payload: { queue: newQueue, currentTrack: newTrack }
        });
    };

    const broadcastPlayback = (playing, prog) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'playback_update',
            payload: { isPlaying: playing, progress: prog }
        });
    };

    const addToQueue = (track) => {
        const entry = {
            id: track.id,
            name: track.name,
            artist: track.artist,
            cover: track.cover,
            source: 'youtube',
            addedBy: profile?.username || 'Tripulante',
            tips: 0
        };

        const newQueue = [...queue, entry];

        if (!currentTrack) {
            setCurrentTrack(entry);
            setIsPlaying(true);
            setQueue([]);
            broadcastQueue([], entry);
            broadcastPlayback(true, 0);
        } else {
            setQueue(newQueue);
            broadcastQueue(newQueue);
        }
    };

    const playNext = () => {
        if (queue.length === 0) {
            setCurrentTrack(null);
            setIsPlaying(false);
            setProgress(0);
            broadcastQueue([], null);
            broadcastPlayback(false, 0);
            return;
        }

        const nextTrack = queue[0];
        const remainingQueue = queue.slice(1);

        setCurrentTrack(nextTrack);
        setQueue(remainingQueue);
        setIsPlaying(true);
        setProgress(0);

        broadcastQueue(remainingQueue, nextTrack);
        broadcastPlayback(true, 0);
    };

    const togglePlayback = () => {
        const newState = !isPlaying;
        setIsPlaying(newState);
        broadcastPlayback(newState, progress);
    };

    const boostTrack = async (entryId) => {
        const boostCost = 50;
        if (balance < boostCost) return alert("Pide más Starlys para darle fuego a esta pista.");

        const { success } = await deductCoins(boostCost, 'casino_bet', 'Boost Jukebox DJ');
        if (!success) return;

        setQueue(prev => {
            const updated = prev.map(item =>
                item.id === entryId ? { ...item, tips: item.tips + boostCost } : item
            ).sort((a, b) => b.tips - a.tips);

            broadcastQueue(updated);
            return updated;
        });
    };

    return (
        <>
            <div id="yt-player-hidden" style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: 320, height: 180, pointerEvents: 'none' }} />

            <AnimatePresence mode="wait">
                {!isMinimized ? (
                    <motion.div
                        key="full-jukebox"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="w-full bg-[#070715]/95 backdrop-blur-2xl border border-red-500/20 rounded-[2.5rem] p-6 mt-4 relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                    >
                        {/* Background Glows */}
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />

                        <button onClick={onClose} className="absolute right-6 top-6 text-white/30 hover:text-white bg-white/5 p-2.5 rounded-full transition-all z-20 hover:scale-110 active:scale-90">
                            <ChevronDown size={18} />
                        </button>

                        {/* Header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3.5 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-2xl border border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                                <Youtube size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Frecuencia YouTube DJ</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Sincronizado • {participants.length + 1} Tripulantes</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Visualizador & Player */}
                            <div className="flex flex-col items-center">
                                <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden mb-8 border border-white/5 bg-black/40 group">
                                    {currentTrack ? (
                                        <img src={currentTrack.cover} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/10">
                                            <Youtube size={60} />
                                            <span className="text-[10px] uppercase font-black tracking-widest">Nada en el Radar</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                    {/* Vinyl Mockup overlaying video cover slightly */}
                                    <motion.div
                                        animate={{ rotate: isPlaying ? 360 : 0 }}
                                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                        className="absolute -bottom-10 -right-10 w-40 h-40 bg-black rounded-full border-[10px] border-black/80 shadow-2xl overflow-hidden opacity-80"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-full" />
                                        {currentTrack?.cover && <img src={currentTrack.cover} className="w-full h-full object-cover grayscale opacity-40 blur-[1px]" alt="" />}
                                        <div className="absolute inset-0 border-[30px] border-black/20 rounded-full" />
                                    </motion.div>
                                </div>

                                <div className="w-full text-center mb-8">
                                    <AnimatePresence mode="wait">
                                        {currentTrack ? (
                                            <motion.div key={currentTrack.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 px-4">
                                                <h4 className="text-lg font-black text-white truncate drop-shadow-lg" dangerouslySetInnerHTML={{ __html: currentTrack.name }} />
                                                <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-[10px]">{currentTrack.artist}</p>
                                                <div className="mt-4">
                                                    <div className="text-[8px] font-black bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-white/40 uppercase tracking-widest inline-block">DJ: {currentTrack.addedBy}</div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 opacity-20">
                                                <h4 className="text-sm font-black text-white uppercase tracking-widest underline decoration-red-500/50 underline-offset-8">Sistema en Reposo</h4>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Controls */}
                                <div className="w-full max-w-sm px-4">
                                    <div className="flex items-center justify-center gap-8 mb-6">
                                        <button className="text-white/40 hover:text-red-500 transition-colors" onClick={() => playerRef.current?.seekTo(0)}>
                                            <SkipForward size={24} className="rotate-180" />
                                        </button>
                                        <button
                                            onClick={togglePlayback}
                                            className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-110 active:scale-95 transition-all"
                                        >
                                            {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
                                        </button>
                                        <button className="text-white/40 hover:text-red-500 transition-colors" onClick={playNext}>
                                            <SkipForward size={24} />
                                        </button>
                                    </div>

                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                        <motion.div
                                            className="absolute top-0 left-0 h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                            animate={{ width: `${progress}%` }}
                                            transition={{ type: "tween", ease: "linear" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Queue & Search */}
                            <div className="flex flex-col min-h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <ListMusic size={16} className="text-red-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Lista de Espera</span>
                                    </div>
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className="px-5 py-2.5 bg-red-600/10 border border-red-600/30 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 hover:bg-red-600/20 transition-all shadow-[0_4px_15px_rgba(220,38,38,0.1)]"
                                    >
                                        <Search size={14} /> Buscar en YouTube
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-black/20 rounded-3xl border border-white/5 p-4 space-y-3 no-scrollbar max-h-[350px]">
                                    <AnimatePresence initial={false}>
                                        {queue.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center gap-4 py-20 opacity-20">
                                                <Music size={40} />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Nada en cola...</p>
                                            </div>
                                        ) : (
                                            queue.map((track, i) => (
                                                <motion.div
                                                    key={`queue-${track.id}-${i}`}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="group p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-white/5 transition-all"
                                                >
                                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                                        <img src={track.cover} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="text-[10px] font-black text-white truncate" dangerouslySetInnerHTML={{ __html: track.name }} />
                                                        <p className="text-[8px] text-white/40 uppercase tracking-widest truncate">{track.artist}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2 pr-1">
                                                        {track.tips > 0 && (
                                                            <div className="flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 text-red-500">
                                                                <Flame size={10} fill="currentColor" />
                                                                <span className="text-[9px] font-black">{track.tips}</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => boostTrack(track.id)}
                                                            className="p-2 rounded-xl bg-white/5 text-white/40 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-600/10 transition-all active:scale-90"
                                                        >
                                                            <TrendingUp size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="mt-6 p-4 rounded-2xl bg-red-600/5 border border-red-600/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                                            <Disc size={16} className="text-red-500 animate-[spin_4s_linear_infinite]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-red-500/60 uppercase tracking-widest">Créditos de DJ</span>
                                            <span className="text-[11px] font-black text-white tracking-widest">{balance.toLocaleString()}◈</span>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-white/30 uppercase tracking-tighter max-w-[120px] text-right italic leading-none">Añade 50◈ para prioridad máxima</p>
                                </div>
                            </div>
                        </div>

                        <YouTubeSearchModal
                            isOpen={isSearchOpen}
                            onClose={() => setIsSearchOpen(false)}
                            onSelect={addToQueue}
                        />
                    </motion.div>
                ) : (
                    isPlaying && currentTrack && (
                        <motion.div
                            key="minimized-jukebox"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="p-3 bg-red-600/10 border border-red-500/20 backdrop-blur-xl rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(220,38,38,0.2)] mb-4 cursor-pointer hover:bg-red-600/20 transition-all"
                            onClick={() => window.dispatchEvent(new CustomEvent('voice:open_activity', { detail: 'dj' }))}
                        >
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 group">
                                <img src={currentTrack.cover} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                                    <Music size={14} className="text-white animate-pulse" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[8px] font-black text-red-500 uppercase tracking-widest leading-none mb-1">
                                    {isPlaying ? '⚡ Escuchando Ahora' : '⏸ En Pausa'}
                                </p>
                                <p className="text-[10px] text-white font-bold truncate" dangerouslySetInnerHTML={{ __html: currentTrack.name }} />
                                <p className="text-[8px] text-white/40 uppercase tracking-tighter truncate">{currentTrack.artist}</p>
                            </div>

                            <div className="flex items-center gap-2 pr-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlayback();
                                    }}
                                    className="p-2.5 rounded-full bg-red-600 text-white shadow-lg active:scale-90 transition-all"
                                >
                                    {isPlaying ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
                                </button>
                            </div>
                        </motion.div>
                    )
                )}
            </AnimatePresence>

            <YouTubeSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={addToQueue}
            />
        </>
    );
}
