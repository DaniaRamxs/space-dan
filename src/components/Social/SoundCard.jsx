import { motion } from 'framer-motion';
import { Play, Pause, Music } from 'lucide-react';
import { useAudioController } from '../../hooks/useAudioController';

export default function SoundCard({ track }) {
    if (!track) return null;

    const { isPlaying, togglePlay, progress } = useAudioController(track.track_id, track.preview_url);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => {
                e.stopPropagation();
                if (!track.preview_url) {
                    // Sin preview: abrir directamente en Spotify
                    const spotifyUrl = track.external_urls?.spotify || track.spotify_url;
                    if (spotifyUrl) {
                        window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
                    }
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

                {/* Barra de progreso minimalista */}
                {isPlaying && (
                    <div className="mt-2 w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-cyan-400/60"
                        />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
