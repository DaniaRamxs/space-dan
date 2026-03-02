import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spotifyService } from '../../services/spotifyService';
import { useAuthContext } from '../../contexts/AuthContext';

export const SpotifyBlock = ({ userId, isOwn }) => {
    const { user } = useAuthContext();
    const [soundState, setSoundState] = useState(null);
    const [soundAverage, setSoundAverage] = useState(null);
    const [musicOverlap, setMusicOverlap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setLoading(true);
            try {
                const connected = await spotifyService.isConnected(userId);
                if (!isMounted) return;
                setIsConnected(connected);

                if (connected) {
                    const [sState, sAvg] = await Promise.all([
                        spotifyService.getUserSoundState(userId).catch(() => null),
                        spotifyService.getUserSoundAverage(userId).catch(() => null)
                    ]);

                    if (!isMounted) return;
                    setSoundState(sState);
                    setSoundAverage(sAvg);

                    if (user && user.id !== userId) {
                        const overlap = await spotifyService.getMusicOverlap(user.id, userId).catch(() => null);
                        if (isMounted) setMusicOverlap(overlap);
                    }
                }
            } catch (e) {
                console.warn('Spotify Radar load error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        const interval = setInterval(load, 30000); // Poll every 30s
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [userId, user]);

    if (loading) return (
        <div className="h-48 rounded-[2rem] bg-white/[0.02] border border-white/5 animate-pulse flex items-center justify-center">
            <span className="text-micro opacity-40 uppercase tracking-widest italic animate-pulse">Sincronizando Frecuencia... 🎵</span>
        </div>
    );

    if (!isConnected) {
        if (!isOwn) return null;
        return (
            <div className="p-12 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 space-y-4 text-center group transition-all hover:bg-emerald-500/10">
                <div className="text-4xl text-emerald-500">Radar Emocional API v1.2</div>
                <p className="text-sm text-white/40 max-w-xs mx-auto italic">
                    Conecta tu cuenta para generar tu resonancia estelar e identificar puentes musicales.
                </p>
                <button
                    onClick={async () => {
                        try {
                            const url = await spotifyService.getAuthUrl();
                            window.location.href = url;
                        } catch (err) {
                            alert(err.message || 'Error al conectar con Spotify.');
                        }
                    }}
                    className="px-8 py-3 rounded-2xl bg-emerald-500 text-black text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                >
                    Conectar Spotify
                </button>
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 md:p-12 rounded-[2.5rem] bg-black/60 border border-emerald-500/20 backdrop-blur-3xl relative overflow-hidden group shadow-2xl"
            >
                {/* HUD Header Badge */}
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500/10 border-b border-l border-emerald-500/20 rounded-bl-2xl z-20">
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">Radar Emocional API v1.2</span>
                </div>

                <div className="flex flex-col gap-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        {/* Frecuencia Histórica (Left Side) */}
                        <div className="space-y-4 border-b md:border-b-0 md:border-r border-white/5 pb-8 md:pb-0 md:pr-8 flex flex-col justify-center">
                            {soundAverage ? (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                        <span className="text-emerald-400">⚡</span> Frecuencia Resonante (3 Días)
                                    </h4>
                                    <div className="flex flex-col justify-center min-h-[60px]">
                                        <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-white drop-shadow-md">
                                            {spotifyService.translateAudioFeatures(soundAverage.valence, soundAverage.energy)}
                                        </span>
                                        <div className="flex gap-4 mt-2">
                                            <span className="text-[10px] font-mono font-black text-emerald-400/70 bg-emerald-400/10 px-2 py-1 rounded-md">
                                                VAL: {Math.round(soundAverage.valence * 100)}%
                                            </span>
                                            <span className="text-[10px] font-mono font-black text-cyan-400/70 bg-cyan-400/10 px-2 py-1 rounded-md">
                                                ENG: {Math.round(soundAverage.energy * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                        <span className="text-white/20">📡</span> Frecuencia Resonante
                                    </h4>
                                    <div className="flex flex-col justify-center min-h-[60px]">
                                        <span className="text-sm italic font-medium text-white/30">Acumulando datos sonoros para patrón...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Señal en vivo & Overlaps (Right Side) */}
                        <div className="space-y-8 flex flex-col justify-center">
                            {/* Estado de Reproducción Actual */}
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                    <span className={soundState?.is_playing ? "text-cyan-400 animate-pulse" : "text-white/20"}>▶</span> Señal de Audio Actual
                                </h4>
                                {soundState && soundState.is_playing ? (
                                    <div className="p-4 rounded-[1.5rem] bg-white/[0.02] border border-white/5 flex gap-4 items-center group/track hover:bg-white/[0.04] transition-colors relative overflow-hidden">
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover/track:opacity-100 transition-opacity"></div>
                                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                                            <span className="text-cyan-400 group-hover/track:animate-pulse">🎵</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm md:text-base font-bold text-white truncate">{soundState.track_name}</div>
                                            <div className="text-[10px] md:text-xs text-white/50 uppercase tracking-widest truncate">{soundState.artist_name}</div>
                                        </div>
                                        <div className="hidden sm:block text-right shrink-0">
                                            <div className="text-[9px] text-cyan-400 font-black uppercase tracking-widest px-2.5 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg whitespace-nowrap">
                                                {soundState.emotional_label}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-[1.5rem] bg-white/[0.01] border border-white/5 border-dashed flex gap-4 items-center">
                                        <div className="w-12 h-12 rounded-xl border border-white/5 flex items-center justify-center shrink-0">
                                            <span className="text-white/10">⏸️</span>
                                        </div>
                                        <div className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Transmisión en pausa</div>
                                    </div>
                                )}
                            </div>

                            {/* Overlap */}
                            {musicOverlap && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                                        <span className="text-purple-400">🔗</span> Puente Musical (24H)
                                    </h4>
                                    <div className="p-4 rounded-[1.5rem] bg-purple-500/10 border border-purple-500/20 text-[13px] text-purple-200/80 leading-relaxed shadow-[0_0_20px_rgba(168,85,247,0.05)]">
                                        Sintonizaron {musicOverlap.overlap_type === 'track' ? 'la misma pieza' : 'al mismo artista'}: <span className="text-purple-100 font-bold ml-1">{musicOverlap.reference_name}</span>.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Animated background layers */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-500 via-purple-500 to-transparent"></div>
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            </motion.div>
        </AnimatePresence>
    );
};
