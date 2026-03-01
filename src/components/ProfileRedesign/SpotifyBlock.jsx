import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spotifyService } from '../../services/spotifyService';

export const SpotifyBlock = ({ userId, isOwn }) => {
    const [current, setCurrent] = useState(null);
    const [tops, setTops] = useState({ tracks: [], artists: [] });
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        load();
        const interval = setInterval(loadCurrent, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [userId]);

    async function load() {
        setLoading(true);
        try {
            const connected = await spotifyService.isConnected(userId);
            setIsConnected(connected);
            if (connected) {
                await Promise.all([loadCurrent(), loadTops()]);
            }
        } catch (e) {
            console.warn('Spotify load error:', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadCurrent() {
        try {
            const data = await spotifyService.getCurrentPlaying(userId);
            setCurrent(data?.item ? data : null);
        } catch (e) { }
    }

    async function loadTops() {
        try {
            const [tracks, artists] = await Promise.all([
                spotifyService.getTopTracks(userId, 5),
                spotifyService.getTopArtists(userId, 3)
            ]);
            setTops({ tracks, artists });
        } catch (e) { }
    }

    if (loading) return (
        <div className="h-48 rounded-[2rem] bg-white/[0.02] border border-white/5 animate-pulse flex items-center justify-center">
            <span className="text-micro opacity-40 uppercase tracking-widest italic animate-pulse">Sincronizando Spotify... 🎵</span>
        </div>
    );

    if (!isConnected) {
        if (!isOwn) return null;
        return (
            <div className="p-12 rounded-[2.5rem] bg-[#1DB954]/5 border border-[#1DB954]/20 space-y-4 text-center group transition-all hover:bg-[#1DB954]/10">
                <div className="text-4xl text-[#1DB954]">Spotify API v1</div>
                <p className="text-sm text-white/40 max-w-xs mx-auto italic">
                    Conecta tu cuenta para mostrar tu música favorita y lo que escuchas ahora.
                </p>
                <button
                    onClick={async () => window.location.href = await spotifyService.getAuthUrl()}
                    className="px-8 py-3 rounded-2xl bg-[#1DB954] text-black text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                >
                    Conectar Spotify
                </button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 md:p-12 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl space-y-8 relative overflow-hidden"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center group/title cursor-default">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DB954] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DB954]"></span>
                        </span>
                        Sincronización Musical
                    </span>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Estación Spotify</h2>
                </div>
                <img src="/spotify_logo.png" className="w-10 opacity-40 group-hover:opacity-100 transition-opacity" alt="Spotify" />
            </div>

            <AnimatePresence mode="wait">
                {current ? (
                    <motion.div
                        key="current"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col md:flex-row items-center gap-8 group/card"
                    >
                        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/20 transition-transform duration-500 group-hover/card:scale-105 group-hover/card:rotate-2">
                            <img src={current.item.album.images[0]?.url} className="w-full h-full object-cover" alt="Album" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest italic animate-pulse">Reproduciendo Ahora</span>
                                <h3 className="text-2xl md:text-4xl font-black text-white leading-none tracking-tight italic uppercase group-hover/card:text-[#1DB954] transition-colors">{current.item.name}</h3>
                                <p className="text-white/60 text-lg font-bold tracking-tight italic">{current.item.artists.map(a => a.name).join(', ')}</p>
                            </div>
                            <a
                                href={current.item.external_urls.spotify}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-4 px-6 py-2.5 bg-black/40 border border-[#1DB954]/20 rounded-xl text-[10px] font-black text-white/50 hover:text-[#1DB954] hover:bg-[#1DB954]/5 transition-all uppercase tracking-widest decoration-transparent"
                            >
                                Abrir en Spotify 🎧
                            </a>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="tops"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                        {/* Top Tracks */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Lo más escuchado</span>
                            <div className="space-y-4">
                                {tops.tracks.map((track, idx) => (
                                    <div key={track.id} className="flex items-center gap-4 group/item">
                                        <span className="text-xl font-black text-white/10 italic">0{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-white/80 truncate uppercase italic group-hover/item:text-[#1DB954] transition-colors">{track.name}</h4>
                                            <p className="text-[10px] text-white/30 truncate uppercase">{track.artists.map(a => a.name).join(', ')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Artists */}
                        <div className="space-y-6">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Artistas Top</span>
                            <div className="flex flex-wrap gap-4">
                                {tops.artists.map((artist) => (
                                    <div key={artist.id} className="relative group/artist cursor-pointer">
                                        <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border border-white/10 group-hover/artist:border-[#1DB954] transition-all group-hover/artist:-translate-y-2">
                                            <img src={artist.images[0]?.url} className="w-full h-full object-cover grayscale opacity-50 group-hover/artist:grayscale-0 group-hover/artist:opacity-100 transition-all duration-500" alt={artist.name} />
                                        </div>
                                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black border border-white/10 px-2 py-0.5 rounded-full text-[7px] font-black text-white opacity-0 group-hover/artist:opacity-100 transition-opacity uppercase whitespace-nowrap z-10">{artist.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
