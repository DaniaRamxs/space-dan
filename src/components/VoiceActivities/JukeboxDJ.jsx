import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Search, Play, Pause, SkipForward, Flame, TrendingUp, Disc, ListMusic } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { spotifyService } from '../../services/spotifyService';
import SongSearchModal from '../Social/SongSearchModal';

export default function JukeboxDJ({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const { balance, deductCoins, awardCoins } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [queue, setQueue] = useState([]); // [{ id, name, artist, cover, preview_url, addedBy, tips: 0 }]
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 100

    const audioRef = useRef(null);
    const channelRef = useRef(null);
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
                    // Si el track cambió, actualizamos localmente
                    if (payload.currentTrack?.id !== currentTrack?.id) {
                        setCurrentTrack(payload.currentTrack);
                        setProgress(0);
                    }
                }
            })
            .on('broadcast', { event: 'playback_update' }, ({ payload }) => {
                setIsPlaying(payload.isPlaying);
                if (payload.progress !== undefined) setProgress(payload.progress);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [roomName, user]);

    // --- 2. Audio Control ---
    useEffect(() => {
        if (!currentTrack?.preview_url) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            return;
        }

        // Si cambia el track, reiniciamos el audio
        if (!audioRef.current || audioRef.current.src !== currentTrack.preview_url) {
            if (audioRef.current) audioRef.current.pause();
            const audio = new Audio(currentTrack.preview_url);
            audio.crossOrigin = "anonymous";
            audio.volume = 0.5;
            audioRef.current = audio;

            audio.onended = () => {
                if (isHost) playNext();
            };

            audio.ontimeupdate = () => {
                const p = (audio.currentTime / audio.duration) * 100;
                setProgress(p);
            };
        }

        if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Autoplay preventado:", e));
        } else {
            audioRef.current.pause();
        }

    }, [currentTrack, isPlaying]);

    // Sync progress periodically if host
    useEffect(() => {
        if (!isHost || !isPlaying) return;
        const interval = setInterval(() => {
            if (audioRef.current) {
                broadcastPlayback(isPlaying, (audioRef.current.currentTime / audioRef.current.duration) * 100);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [isHost, isPlaying]);

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
            id: track.track_id + Math.random().toString(36).substr(2, 5), // unique in queue
            spotifyId: track.track_id,
            name: track.track_name,
            artist: track.artist_name,
            cover: track.album_cover,
            preview_url: track.preview_url,
            addedBy: profile?.username || 'DJ Anon',
            tips: 0
        };

        const newQueue = [...queue, entry];

        // Si no hay nada sonando, empezamos esto
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

        // Award some coins back to the person who added it? (optional)
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="w-full bg-[#070715]/95 backdrop-blur-2xl border border-amber-500/20 rounded-[2.5rem] p-6 mt-4 relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
        >
            {/* Background Glows */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />

            <button onClick={onClose} className="absolute right-6 top-6 text-white/30 hover:text-white bg-white/5 p-2.5 rounded-full transition-all z-20 hover:scale-110 active:scale-90">
                <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                    <Music size={24} />
                </div>
                <div>
                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm">Frecuencia Estelar DJ</h3>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">En Vivo • {participants.length + 1} Tripulantes</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visualizador & Player */}
                <div className="flex flex-col items-center">
                    <div className="relative w-full aspect-square max-w-[280px] mb-8">
                        {/* Vinyl Mockup */}
                        <motion.div
                            animate={{ rotate: isPlaying ? 360 : 0 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-[12px] border-black shadow-2xl relative z-10"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-full" />
                            <div className={`w-full h-full rounded-full overflow-hidden border-4 ${currentTrack ? 'border-amber-500/30' : 'border-white/5'} bg-black/40 flex items-center justify-center`}>
                                {currentTrack?.cover ? (
                                    <img src={currentTrack.cover} alt="" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <Disc size={80} className="text-white/10" />
                                )}
                            </div>
                            {/* Inner Circle */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-black rounded-full border-4 border-white/5 flex items-center justify-center z-20">
                                <div className="w-3 h-3 bg-white/20 rounded-full" />
                            </div>
                        </motion.div>

                        {/* Ambient Glow */}
                        <AnimatePresence>
                            {isPlaying && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute -inset-10 bg-amber-500/10 blur-[60px] rounded-full -z-0"
                                />
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="w-full text-center mb-8">
                        <AnimatePresence mode="wait">
                            {currentTrack ? (
                                <motion.div key={currentTrack.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 px-4">
                                    <h4 className="text-lg font-black text-white truncate drop-shadow-lg">{currentTrack.name}</h4>
                                    <p className="text-amber-500 font-bold uppercase tracking-[0.2em] text-[10px]">{currentTrack.artist}</p>
                                    <div className="flex items-center justify-center gap-1.5 mt-4">
                                        <div className="text-[8px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded-md text-white/40 uppercase tracking-widest">Añadido por: {currentTrack.addedBy}</div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 opacity-30">
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Sintonizando el Vacío...</h4>
                                    <p className="text-[10px] uppercase font-bold tracking-widest">Busca una pista para comenzar</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Controls */}
                    <div className="w-full max-w-sm px-4">
                        <div className="flex items-center justify-center gap-8 mb-6">
                            <button className="text-white/40 hover:text-white transition-colors" onClick={() => audioRef.current && (audioRef.current.currentTime = 0)}>
                                <SkipForward size={24} className="rotate-180" />
                            </button>
                            <button
                                onClick={togglePlayback}
                                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 transition-all"
                            >
                                {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}
                            </button>
                            <button className="text-white/40 hover:text-white transition-colors" onClick={playNext}>
                                <SkipForward size={24} />
                            </button>
                        </div>

                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "tween", ease: "linear" }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] font-black text-white/20 uppercase tracking-widest">
                            <span>0:00</span>
                            <span>{currentTrack ? '0:30' : '0:00'}</span>
                        </div>
                    </div>
                </div>

                {/* Queue & Search */}
                <div className="flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <ListMusic size={16} className="text-amber-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Cola de Reproducción</span>
                        </div>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500/20 transition-all"
                        >
                            <Search size={14} /> Ordenar Pista
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-black/20 rounded-3xl border border-white/5 p-4 space-y-3 no-scrollbar max-h-[350px]">
                        <AnimatePresence initial={false}>
                            {queue.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 py-20 opacity-20">
                                    <Search size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Vibraciones de radio ausentes</p>
                                </div>
                            ) : (
                                queue.map((track, i) => (
                                    <motion.div
                                        key={track.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="group p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-white/5 transition-all"
                                    >
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                            <img src={track.cover} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-[10px] font-black text-white truncate">{track.name}</h5>
                                            <p className="text-[8px] text-white/40 uppercase tracking-widest truncate">{track.artist}</p>
                                        </div>

                                        <div className="flex items-center gap-2 pr-1">
                                            {track.tips > 0 && (
                                                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-amber-400">
                                                    <Flame size={10} fill="currentColor" />
                                                    <span className="text-[9px] font-black">{track.tips}</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => boostTrack(track.id)}
                                                className="p-2 rounded-xl bg-white/5 text-white/40 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-500/10 transition-all active:scale-90"
                                            >
                                                <TrendingUp size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <Disc size={16} className="text-amber-500 animate-[spin_4s_linear_infinite]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">Tu Balance DJ</span>
                                <span className="text-[11px] font-black text-white tracking-widest">{balance.toLocaleString()}◈</span>
                            </div>
                        </div>
                        <p className="text-[8px] text-white/30 uppercase tracking-tighter max-w-[120px] text-right italic">Cada boost de 50◈ sube el hype de la pista</p>
                    </div>
                </div>
            </div>

            <SongSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={addToQueue}
            />
        </motion.div>
    );
}
