import { motion } from 'framer-motion';
import { Play, Pause, Music, ExternalLink } from 'lucide-react';
import { useAudioController } from '../../hooks/useAudioController';

export default function SoundCard({ track }) {
    if (!track) return null;

    const { isPlaying, togglePlay, progress } = useAudioController(track.track_id, track.preview_url);

    // Construir URL de Spotify con múltiples fallbacks
    const spotifyUrl = track.external_urls?.spotify
        || track.spotify_url
        || (track.track_id ? `https://open.spotify.com/track/${track.track_id}` : null)
        || (track.track_name ? `https://open.spotify.com/search/${encodeURIComponent(`${track.track_name} ${track.artist_name || ''}`)}` : null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => {
                e.stopPropagation();
                if (!track.preview_url) {
                    if (spotifyUrl) window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
                    return;
                }
                togglePlay();
            }}
            className="mt-3 group relative bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-3 flex items-center gap-4 transition-all hover:bg-white/[0.07] cursor-pointer"
        >
            {/* Portada con Play Overlap */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-lg group-hover:shadow-cyan-500/10 transition-shadow">
                <img
                    src={track.album_cover}
                    alt={track.track_name}
                    className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`}
                />
                <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity ${!track.preview_url ? 'opacity-40' : 'opacity-0 group-hover:opacity-100'}`}
                >
                    {isPlaying ? (
                        <Pause size={20} fill="white" className="text-white" />
                    ) : (
                        <Play size={20} fill={track.preview_url ? "white" : "gray"} className={track.preview_url ? "text-white" : "text-gray-400"} />
                    )}
                </div>

                {/* Micro-animación cuando suena */}
                {isPlaying && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5 items-end h-3 px-1 bg-black/60 rounded-sm">
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={{ height: [4, 10, 6, 12, 4] }}
                                transition={{ repeat: Infinity, duration: 0.8 / i, ease: "linear" }}
                                className="w-0.5 bg-cyan-400 rounded-full"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Info de la pista */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white leading-tight truncate">
                        {track.track_name}
                    </span>
                    <Music size={10} className="text-cyan-400/30" />
                </div>
                <div className="text-[10px] text-white/40 font-black uppercase tracking-widest truncate leading-none">
                    {track.artist_name}
                </div>

                {/* Barra de progreso — siempre visible */}
                <div className="mt-2 w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                    {isPlaying ? (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-cyan-400/60"
                        />
                    ) : (
                        <div className="h-full w-full bg-white/10 rounded-full" />
                    )}
                </div>
            </div>

            {/* Botón de Spotify — siempre visible si hay URL */}
            {spotifyUrl && (
                <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Abrir en Spotify"
                    className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/30 border border-[#1DB954]/20 transition-all"
                >
                    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#1DB954] shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    <span className="text-[#1DB954] text-[9px] font-black uppercase tracking-wider">Abrir</span>
                    <ExternalLink size={8} className="text-[#1DB954]/60" />
                </a>
            )}
        </motion.div>
    );
}
