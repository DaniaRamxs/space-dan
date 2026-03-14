/**
 * WatchTogether.jsx
 * Sistema de video sincronizado para ver YouTube juntos
 * v2.0: Con Colyseus, Reaction Timeline y Host Transfer
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Play, Pause, SkipForward, Volume2, VolumeX,
    Maximize2, Minimize2, Users, MessageCircle, Settings,
    Film, Tv, Share2, Clock, Eye, EyeOff, Menu, Crown,
    Heart, Laugh, Ghost, Zap, Smile, Send
} from 'lucide-react';
import { useLocalParticipant, useParticipants as useLiveKitParticipants } from '@livekit/components-react';
import { supabase } from '@/supabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePlaybackSync } from '@/hooks/usePlaybackSync';
import { joinOrCreateRoom } from '@/services/colyseusClient';
import YouTubeSearchModal from '@/components/Social/YouTubeSearchModal';
import GifPickerModal from '@/components/reactions/GifPickerModal';
import ReactionOverlay from '@/components/reactions/ReactionOverlay';

// ─── Constantes ───────────────────────────────────────────────────────────────
const SYNC_INTERVAL_MS = 2000;
const MAX_SEEK_DRIFT_S = 3;

const YT_STATE = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};

const QUICK_REACTIONS = [
    { type: 'emoji', content: '😂', icon: Laugh, color: 'text-yellow-400' },
    { type: 'emoji', content: '🔥', icon: Zap, color: 'text-orange-500' },
    { type: 'emoji', content: '😱', icon: Ghost, color: 'text-purple-400' },
    { type: 'emoji', content: '❤️', icon: Heart, color: 'text-red-500' },
    { type: 'emoji', content: '💯', contentText: '100', color: 'text-white' },
];

export default function WatchTogether({ roomName, onClose, isMinimized = false, isPanelOpen = false }) {
    const { user, profile } = useAuthContext();
    const livekitParticipants = useLiveKitParticipants();
    
    // ── Colyseus Room State ─────────────────────────────────────────────────────
    const [room, setRoom] = useState(null);
    const [colyseusParticipants, setColyseusParticipants] = useState([]);
    
    const hostParticipant = useMemo(() => {
        return colyseusParticipants.find(p => p.isHost || p.userId === playbackState.hostId);
    }, [colyseusParticipants, playbackState.hostId]);

    const { 
        playbackState, 
        isHost, 
        reactions,
        updatePlayback 
    } = usePlaybackSync({
        roomName: roomName || 'general',
        colyseusRoom: room
    });

    // ── Local State ─────────────────────────────────────────────────────────────
    const [currentVideo, setCurrentVideo] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(50);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isShortsMode, setIsShortsMode] = useState(false);
    const [shortsCategory, setShortsCategory] = useState('trending');
    const [customSearch, setCustomSearch] = useState('');
    const [participantsMenuOpen, setParticipantsMenuOpen] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [gifPickerOpen, setGifPickerOpen] = useState(false);
    const [gifOverlays, setGifOverlays] = useState([]);
    const [reactionBuffer, setReactionBuffer] = useState([]);
    const [isStorming, setIsStorming] = useState(false);
    const stormTimestampsRef = useRef([]);

    const playerRef = useRef(null);
    const channelRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const controlsTimeoutRef = useRef(null);
    const isPlayingRef = useRef(false);

    // ── Connection Logic ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!roomName || !user || room) return;

        const connect = async () => {
            try {
                const joinedRoom = await joinOrCreateRoom("live_activity", {
                    instanceId: roomName,
                    userId: user.id,
                    username: profile?.username || 'Anon',
                    avatar: profile?.avatar_url,
                    activityId: `watch-${roomName}`,
                    activityType: 'watch',
                    roomName: roomName
                });
                
                setRoom(joinedRoom);
                
                joinedRoom.onStateChange((state) => {
                    setColyseusParticipants(Array.from(state.participants.values()));
                });

                joinedRoom.onMessage("chat", (msg) => {
                    setMessages(prev => [...prev.slice(-50), msg]);
                });

            } catch (err) {
                console.error("[WatchTogether] Colyseus connection failed:", err);
            }
        };

        connect();

        return () => {
            if (room) room.leave();
        };
    }, [roomName, user, room]);

    // ── Supabase Broadcast Connection ─────────────────────────────────────────
    useEffect(() => {
        if (!roomName || !user) return;

        const chanName = `watch-sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
        const channel = supabase.channel(chanName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
                if (payload.type === "gif") {
                    const newGif = { id: Date.now() + Math.random(), url: payload.gifUrl };
                    setGifOverlays(prev => [...prev.slice(-4), newGif]);
                    setReactionBuffer(prev => [...prev.slice(-10), Date.now()]);
                    
                    setTimeout(() => {
                        setGifOverlays(prev => prev.filter(g => g.id !== newGif.id));
                    }, 4000);
                }

                if (payload.userId !== user?.id) {
                    setMessages(prev => [...prev.slice(-50), payload]);
                }
            })
            .subscribe();

        return () => {
            channelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [roomName, user]);

    useEffect(() => {
        const now = Date.now();
        const recentReactions = reactionBuffer.filter(t => now - t < 2000);
        
        if (recentReactions.length >= 5 && !isStorming) {
            // Throttling: max 3 storms per minute
            const oneMinuteAgo = now - 60000;
            stormTimestampsRef.current = stormTimestampsRef.current.filter(t => t > oneMinuteAgo);
            
            if (stormTimestampsRef.current.length < 3) {
                setIsStorming(true);
                stormTimestampsRef.current.push(now);
                setTimeout(() => setIsStorming(false), 5000);
            }
        }
    }, [reactionBuffer, isStorming]);

    // Sync state from hook
    useEffect(() => {
        if (!isHost && playbackState.videoId) {
            setIsPlaying(playbackState.playing);
            if (playbackState.videoId !== currentVideo?.id) {
                setCurrentVideo({ id: playbackState.videoId, name: 'Video en reproducción' });
            }
            
            // Sync time if drift is too much
            const player = playerRef.current;
            if (player?.getCurrentTime) {
                const drift = Math.abs(player.getCurrentTime() - playbackState.currentTime);
                if (drift > MAX_SEEK_DRIFT_S) {
                    player.seekTo(playbackState.currentTime, true);
                }
            }
        }
    }, [playbackState, isHost]);

    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // ── YouTube API Setup ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, []);

    useEffect(() => {
        if (!currentVideo?.id) return;

        const handleYTReady = () => {
            if (playerRef.current) try { playerRef.current.destroy(); } catch(e){}

            const wrapper = document.getElementById('wt-player-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '<div id="wt-player"></div>';
            }

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
                    origin: window.location.origin,
                    enablejsapi: 1,
                },
                events: {
                    onReady: (e) => {
                        e.target.setVolume(volume);
                        setVideoDuration(e.target.getDuration());
                        if (isPlayingRef.current) e.target.playVideo();
                        if (!isHost) e.target.seekTo(playbackState.currentTime || 0, true);
                    },
                    onStateChange: (e) => {
                        if (e.data === YT_STATE.ENDED && isHost) {
                            if (isShortsMode) playNextShort();
                        }
                    }
                },
            });
        };

        if (window.YT && window.YT.Player) handleYTReady();
        else window.onYouTubeIframeAPIReady = handleYTReady;
    }, [currentVideo?.id, isHost, isShortsMode]);

    // ── Progress Loop ──────────────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const player = playerRef.current;
            if (!player?.getCurrentTime) return;

            const time = player.getCurrentTime() || 0;
            const dur = player.getDuration() || 1;
            setCurrentTime(time);
            setProgress((time / dur) * 100);

            if (isHost && isPlayingRef.current) {
                updatePlayback({ 
                    playing: true, 
                    currentTime: time,
                    lastUpdate: Date.now()
                });
            }
        }, isHost ? SYNC_INTERVAL_MS : 1000);

        return () => clearInterval(interval);
    }, [isHost, updatePlayback]);

    // ── Reactions & GIFs ──────────────────────────────────────────────────────
    const sendReaction = (type, content) => {
        if (!room) return;
        const player = playerRef.current;
        const videoTimestamp = player?.getCurrentTime ? player.getCurrentTime() : 0;
        
        room.send("reaction", { type, content, videoTimestamp });
    };

    const sendGif = (gifUrl) => {
        if (!channelRef.current) return;

        const message = {
            id: Date.now(),
            userId: user?.id,
            username: profile?.username || "Anon",
            type: "gif",
            gifUrl,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev.slice(-50), message]);

        channelRef.current.send({
            type: "broadcast",
            event: "chat_message",
            payload: message
        });

        // Also send to Colyseus for persistent Reaction Timeline
        if (room) {
            const player = playerRef.current;
            const videoTimestamp = player?.getCurrentTime ? player.getCurrentTime() : 0;
            room.send("reaction", { type: "gif", content: gifUrl, videoTimestamp });
        }

        // Also trigger local overlay for the sender
        const newGif = { id: Date.now() + Math.random(), url: gifUrl };
        setGifOverlays(prev => [...prev.slice(-4), newGif]);
        setReactionBuffer(prev => [...prev.slice(-10), Date.now()]);
        setTimeout(() => setGifOverlays(prev => prev.filter(g => g.id !== newGif.id)), 4000);
    };

    // Filter reactions to show nearby ones on timeline? 
    // Or just show all as markers.
    const timelineReactions = useMemo(() => {
        if (!reactions || videoDuration === 0) return [];
        
        const WINDOW = 3; // 3 seconds grouping window
        const sorted = [...reactions].sort((a, b) => a.timestamp - b.timestamp);
        const groups = [];

        sorted.forEach(r => {
            const lastGroup = groups[groups.length - 1];
            if (lastGroup && (r.timestamp - lastGroup.timestamp) <= WINDOW) {
                lastGroup.count = (lastGroup.count || 1) + 1;
            } else {
                groups.push({ ...r, count: 1 });
            }
        });

        return groups.map(g => ({
            ...g,
            left: (g.timestamp / videoDuration) * 100
        }));
    }, [reactions, videoDuration]);

    // ── Controls ───────────────────────────────────────────────────────────────
    const togglePlayback = () => {
        if (!isHost) return;
        const player = playerRef.current;
        if (!player) return;
        
        const newPlaying = !isPlaying;
        if (newPlaying) player.playVideo();
        else player.pauseVideo();
        
        setIsPlaying(newPlaying);
        updatePlayback({ playing: newPlaying, currentTime: player.getCurrentTime() });
    };

    const seekTo = (percent) => {
        if (!isHost) return;
        const player = playerRef.current;
        if (!player) return;
        
        const seconds = (percent / 100) * videoDuration;
        player.seekTo(seconds, true);
        setProgress(percent);
        updatePlayback({ currentTime: seconds });
    };

    const playVideo = (video) => {
        if (!isHost) return;
        setCurrentVideo(video);
        setIsPlaying(true);
        updatePlayback({ 
            videoId: video.id, 
            playing: true, 
            currentTime: 0 
        });
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleShortsMode = () => {
        if (!isHost) return;
        setIsShortsMode(!isShortsMode);
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[99996] flex items-center justify-center bg-black/90 backdrop-blur-xl" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full max-w-6xl max-h-[90vh] bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col sm:flex-row"
                onClick={e => e.stopPropagation()}
            >
                {/* Main Video Area */}
                <div className="flex-1 relative bg-black flex flex-col" onMouseMove={handleMouseMove}>
                    {currentVideo ? (
                        <div className="relative flex-1">
                            <div id="wt-player-wrapper" className="absolute inset-0">
                                <div id="wt-player" className="w-full h-full" />
                            </div>

                            {/* Centered Reaction & Storm Overlays */}
                            <ReactionOverlay gifOverlays={gifOverlays} isStorming={isStorming} />

                            {/* Top Bar */}
                            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/10 rounded-lg"><Film size={20} className="text-white" /></div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm truncate max-w-[200px]">{currentVideo.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white/40 text-[10px] uppercase tracking-widest">YouTube</span>
                                            {isHost ? (
                                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-[8px] font-black uppercase tracking-widest border border-yellow-500/20 flex items-center gap-1">
                                                    <Crown size={8} fill="currentColor" /> HOST
                                                </span>
                                            ) : (
                                                <span className="text-white/40 text-[10px] flex items-center gap-1">
                                                    <Users size={10} /> Esperando al Host: {hostParticipant?.username || '...'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setChatOpen(!chatOpen)} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"><MessageCircle size={18} /></button>
                                    <button onClick={onClose} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20"><X size={18} /></button>
                                </div>
                            </div>

                            {/* Overlay Controls */}
                            <AnimatePresence>
                                {showControls && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/20 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10">
                                        
                                        {/* Reaction Timeline */}
                                        <div className="relative h-8 mb-2 group">
                                            {timelineReactions.map((r, i) => (
                                                <motion.div 
                                                    key={i}
                                                    initial={{ scale: 0, y: 10 }}
                                                    animate={{ scale: 1, y: 0 }}
                                                    className="absolute bottom-0 transform -translate-x-1/2 p-1 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-xl overflow-hidden"
                                                    style={{ left: `${r.left}%` }}
                                                >
                                                    {r.type === 'gif' ? (
                                                        <div className="relative">
                                                            <img src={r.content} className="w-6 h-6 object-cover rounded-md" alt="timeline gif" />
                                                            {r.count > 1 && (
                                                                <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[8px] font-bold px-1 rounded-full border border-white/20">
                                                                    x{r.count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 px-1">
                                                            <span className="text-xs">{r.content}</span>
                                                            {r.count > 1 && (
                                                                <span className="text-[9px] font-bold text-cyan-400">x{r.count}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="relative h-1.5 bg-white/10 rounded-full mb-4 cursor-pointer group"
                                            onClick={(e) => {
                                                if (!isHost) return;
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                seekTo(((e.clientX - rect.left) / rect.width) * 100);
                                            }}>
                                            <div className="absolute h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progress}%` }} />
                                            {/* Hover Seek Indicator (Host only) */}
                                            {isHost && (
                                                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg" style={{ left: `${progress}%` }} />
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {isHost && (
                                                    <button onClick={togglePlayback} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
                                                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                                    </button>
                                                )}
                                                <div className="text-white/80 text-xs font-mono">
                                                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                                                </div>
                                            </div>

                                            {/* Quick Reactions */}
                                            <div className="flex items-center gap-2">
                                                {QUICK_REACTIONS.map((r, i) => (
                                                    <button 
                                                        key={i}
                                                        onClick={() => sendReaction(r.type, r.content)}
                                                        className="p-2 bg-white/5 rounded-xl hover:bg-white/15 transition-all active:scale-90 border border-white/5"
                                                    >
                                                        {r.icon ? <r.icon size={18} className={r.color} /> : <span className="text-sm font-bold">{r.contentText}</span>}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 group/volume">
                                                    <Volume2 size={18} className="text-white/50" />
                                                    <input type="range" min="0" max="100" value={volume} onChange={e => {
                                                        const v = e.target.value;
                                                        setVolume(v);
                                                        playerRef.current?.setVolume(v);
                                                    }} className="w-20 accent-blue-500" />
                                                </div>
                                                {isHost && (
                                                    <button onClick={() => setIsSearchOpen(true)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all font-bold text-xs uppercase tracking-widest">CAMBIAR</button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                                <Tv size={48} className="text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Mirar Juntos</h2>
                            <p className="text-white/40 mb-8 max-w-sm">Busca un video de YouTube para empezar la fiesta.</p>
                            {isHost ? (
                                <button onClick={() => setIsSearchOpen(true)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                                    Buscar Video
                                </button>
                            ) : (
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-xs text-blue-400 font-bold uppercase tracking-widest">
                                            Esperando al Host: @{hostParticipant?.username || '...'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/20 italic">Solo el host puede iniciar la reproducción.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar Chat (conditional) */}
                <AnimatePresence>
                    {chatOpen && (
                        <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                            className="bg-[#050510] border-l border-white/5 flex flex-col relative"
                        >
                            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">Chat en Directo</h4>
                                <button onClick={() => setChatOpen(false)}><X size={16} className="text-white/40" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                                {messages.map((m, i) => (
                                    <div key={m.id || i} className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-blue-400 uppercase">{m.username}</span>
                                            <span className="text-[8px] text-white/20 uppercase font-mono">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        {m.type === "gif" ? (
                                            <img src={m.gifUrl} className="max-w-[160px] rounded-xl border border-white/10 shadow-lg mt-1" alt="reaction gif" />
                                        ) : (
                                            <p className="text-xs text-white/70 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5">{m.message || m.content}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-white/5 bg-black/40">
                                <div className="relative flex items-center gap-2">
                                    <button 
                                        onClick={() => setGifPickerOpen(true)}
                                        className="p-2 bg-white/5 rounded-xl text-lg hover:bg-white/10 transition-all border border-white/10"
                                        title="Enviar GIF"
                                    >
                                        😀
                                    </button>
                                    <div className="relative flex-1">
                                        <input 
                                            placeholder="Escribe algo..." 
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-xs text-white focus:outline-none focus:border-blue-500/50"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && e.target.value.trim() && room) {
                                                    const text = e.target.value.trim();
                                                    room.send("chat", text);
                                                    
                                                    // Also send via Supabase so we have a unified stream for GIFs if needed
                                                    if (channelRef.current) {
                                                        channelRef.current.send({
                                                            type: 'broadcast',
                                                            event: 'chat_message',
                                                            payload: {
                                                                id: Date.now(),
                                                                userId: user.id,
                                                                username: profile?.username || 'Anon',
                                                                content: text,
                                                                timestamp: Date.now()
                                                            }
                                                        });
                                                    }
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <Send size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <YouTubeSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={playVideo} />
            <GifPickerModal isOpen={gifPickerOpen} onClose={() => setGifPickerOpen(false)} onSelect={(gif) => sendGif(gif.url)} />
        </div>
    );
}
