import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spotifyService } from '../../services/spotifyService';
import { useAuthContext } from '../../contexts/AuthContext';

function getEnergyLabel(energy) {
    if (energy == null) return null;
    if (energy > 0.7) return 'Alta';
    if (energy > 0.4) return 'Media';
    return 'Baja';
}

function PlayingBars() {
    return (
        <div className="flex items-end gap-[3px] h-4" aria-hidden>
            {[0.5, 1, 0.7, 0.9, 0.6].map((delay, i) => (
                <motion.div
                    key={i}
                    className="w-[3px] bg-cyan-400 rounded-full"
                    animate={{ height: ['40%', '100%', '55%', '85%', '40%'] }}
                    transition={{
                        duration: 1.1,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: delay * 0.3,
                    }}
                    style={{ minHeight: 4 }}
                />
            ))}
        </div>
    );
}

export const SpotifyBlock = ({ userId, isOwn }) => {
    const { user } = useAuthContext();
    const [soundState, setSoundState] = useState(null);
    const [soundAverage, setSoundAverage] = useState(null);
    const [musicOverlap, setMusicOverlap] = useState(null);
    const [topTracks, setTopTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthExpired, setIsAuthExpired] = useState(false);
    const [isConnected, setIsConnected] = useState(false); // Added this line, it was missing in the original code but used.

    const timeoutRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            if (!isMounted || spotifyService.getAuthExpired()) return;
            try {
                const connected = await spotifyService.isConnected(userId);
                if (!isMounted || spotifyService.getAuthExpired()) return;
                setIsConnected(connected);

                if (connected) {
                    const [sState, sAvg, tracks] = await Promise.all([
                        spotifyService.getUserSoundState(userId).catch(err => {
                            if (spotifyService.isAuthError(err)) throw err;
                            return null;
                        }),
                        spotifyService.getUserSoundAverage(userId).catch(() => null),
                        spotifyService.getTopTracks(userId, 5).catch(err => {
                            if (spotifyService.isAuthError(err)) throw err;
                            return [];
                        }),
                    ]);

                    if (!isMounted) return;
                    setSoundState(sState);
                    setSoundAverage(sAvg);
                    setTopTracks(tracks || []);
                    setIsAuthExpired(false);

                    if (user && user.id !== userId) {
                        const overlap = await spotifyService.getMusicOverlap(user.id, userId).catch(() => null);
                        if (isMounted) setMusicOverlap(overlap);
                    }

                    // Programar siguiente refresco solo si todo OK
                    if (isMounted && !spotifyService.getAuthExpired()) {
                        timeoutRef.current = setTimeout(load, 30000);
                    }
                }
            } catch (e) {
                if (spotifyService.isAuthError(e)) {
                    if (isMounted) {
                        setIsAuthExpired(true);
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }
                    }
                }
                console.warn('Spotify Radar load error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        load();
        return () => {
            isMounted = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [userId, user]);

    const instantStats = soundAverage
        ?? (soundState?.valence != null && soundState?.energy != null
            ? { valence: soundState.valence, energy: soundState.energy, isInstant: true }
            : null);

    const emotionalLabel = instantStats
        ? spotifyService.translateAudioFeatures(instantStats.valence, instantStats.energy)
        : null;

    const energyLabel = instantStats ? getEnergyLabel(instantStats.energy) : null;

    if (loading) {
        return (
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 h-28 animate-pulse flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-white/20 animate-pulse">
                    Sintonizando...
                </span>
            </div>
        );
    }

    if (isAuthExpired) {
        if (!isOwn) return null;
        return (
            <div className="rounded-2xl bg-rose-500/[0.04] border border-rose-500/15 p-5 space-y-3 text-center animate-in fade-in slide-in-from-bottom-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400/50">Sesión Expirada</p>
                <p className="text-sm text-white/35 italic max-w-xs mx-auto leading-relaxed">
                    Tu conexión con Spotify ha caducado. Reconéctala para seguir sincronizando tu música.
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
                    className="px-6 py-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-black uppercase tracking-widest hover:bg-rose-500/30 transition-all shadow-lg"
                >
                    Reconectar Spotify
                </button>
            </div>
        );
    }

    if (!isConnected) {
        if (!isOwn) return null;
        return (
            <div className="rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/15 p-5 space-y-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/50">Radar Sonoro</p>
                <p className="text-sm text-white/35 italic max-w-xs mx-auto leading-relaxed">
                    Conecta Spotify para activar tu radar emocional y encontrar puentes musicales.
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
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
                >
                    Conectar Spotify
                </button>
            </div>
        );
    }

    const isPlaying = soundState?.is_playing === true;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden"
            >
                {/* Top bar label */}
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">
                        Radar Sonoro
                    </span>
                    {isPlaying && (
                        <div className="flex items-center gap-2">
                            <PlayingBars />
                            <span className="text-[9px] text-cyan-400/60 font-bold uppercase tracking-widest">En vivo</span>
                        </div>
                    )}
                </div>

                <div className="px-5 pb-5 space-y-4">
                    {/* Emotional label */}
                    {emotionalLabel ? (
                        <div className="space-y-0.5">
                            <p className="text-xl font-black text-white tracking-tight leading-tight">
                                {emotionalLabel}
                            </p>
                            {energyLabel && (
                                <p className="text-[11px] text-white/35">
                                    Energía: {energyLabel}
                                </p>
                            )}
                        </div>
                    ) : topTracks.length > 0 ? null : (
                        <p className="text-sm text-white/30 italic">Sin actividad de escucha reciente.</p>
                    )}

                    {/* Current track */}
                    {soundState && (
                        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isPlaying
                            ? 'bg-cyan-500/[0.06] border border-cyan-500/10'
                            : 'bg-white/[0.02] border border-white/5 opacity-60'
                            }`}>
                            {/* Album art */}
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0 relative">
                                {soundState.track_image_url ? (
                                    <>
                                        <img
                                            src={soundState.track_image_url}
                                            alt="Cover"
                                            className={`w-full h-full object-cover transition-all duration-500 ${isPlaying ? '' : 'opacity-40 grayscale'
                                                }`}
                                        />
                                        {!isPlaying && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-white/50 text-xs">⏸</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/20 text-base">
                                        {isPlaying ? '♪' : '⏸'}
                                    </div>
                                )}
                                {isPlaying && (
                                    <motion.div
                                        className="absolute inset-0 rounded-lg border border-cyan-400/20"
                                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                )}
                            </div>

                            {/* Track info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate leading-tight">
                                    {soundState.track_name}
                                </p>
                                <p className="text-[11px] text-white/40 truncate">
                                    {soundState.artist_name}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Top tracks (no current track or no average stats) */}
                    {!soundState && topTracks.length > 0 && (
                        <div className="space-y-2">
                            {topTracks.slice(0, 3).map((t, i) => (
                                <div key={i} className="flex items-center gap-2.5 group">
                                    <span className="text-[9px] font-black text-white/20 w-3 shrink-0 text-center">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-bold text-white/60 truncate">{t.name}</p>
                                        <p className="text-[10px] text-white/25 truncate">{t.artists?.[0]?.name}</p>
                                    </div>
                                    {/* Preview o link a Spotify */}
                                    {t.preview_url ? (
                                        <button
                                            onClick={() => {
                                                const audio = new Audio(t.preview_url);
                                                audio.volume = 0.5;
                                                audio.play().catch(() => { });
                                            }}
                                            title="Reproducir muestra"
                                            className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 flex items-center justify-center text-emerald-400 text-[10px] transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            ▶
                                        </button>
                                    ) : t.external_urls?.spotify ? (
                                        <a
                                            href={t.external_urls.spotify}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Abrir en Spotify"
                                            className="shrink-0 w-6 h-6 rounded-full bg-white/5 hover:bg-[#1DB954]/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#1DB954]" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                            </svg>
                                        </a>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}


                    {/* Music overlap bridge */}
                    {musicOverlap && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/12">
                            <span className="text-violet-400 text-sm shrink-0">◈</span>
                            <p className="text-[12px] text-white/50 leading-snug">
                                Escucharon{' '}
                                {musicOverlap.overlap_type === 'track' ? 'la misma canción' : 'el mismo artista'}
                                :{' '}
                                <span className="text-white/70 font-bold">{musicOverlap.reference_name}</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Subtle background glow */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.025] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500 via-cyan-500 to-transparent rounded-2xl" />
            </motion.div>
        </AnimatePresence>
    );
};
