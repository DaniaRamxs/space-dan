import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, X, Play, Pause } from 'lucide-react';
import { spotifyService } from '../../services/spotifyService';
import { useAuthContext } from '../../contexts/AuthContext';

export default function SongSearchModal({ isOpen, onClose, onSelect }) {
    const { user } = useAuthContext();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [connected, setConnected] = useState(true);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState(null);
    const [previewAudio, setPreviewAudio] = useState(null);
    const [playingId, setPlayingId] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        const checkConn = async () => {
            setChecking(true);
            try {
                const isConn = await spotifyService.isConnected(user.id);
                setConnected(isConn);
            } catch (err) {
                console.error('Error checking connection:', err);
            } finally {
                setChecking(false);
            }
        };
        checkConn();
    }, [isOpen, user.id]);

    const handleConnect = async () => {
        try {
            const url = await spotifyService.getAuthUrl();
            window.location.href = url;
        } catch (err) {
            setError('No se pudo iniciar la conexión con Spotify');
        }
    };

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setLoading(true);
            try {
                const tracks = await spotifyService.searchTracks(query.trim(), user.id);
                setResults(tracks);
            } catch (err) {
                console.error('Error al buscar canciones:', err);
                const errorMessage = err.message || '';
                const errorHint = err.hint || '';

                if (spotifyService.isAuthError(err)) {
                    setError(errorHint || 'Tu sesión de Spotify ha expirado. Por favor, vuelve a vincular tu cuenta.');
                    setConnected(false);
                } else {
                    setError(errorHint || 'Ocurrió un error al sintonizar Spotify. Inténtalo de nuevo.');
                }
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [query, user.id]);

    const handleTogglePreview = (track) => {
        if (!track.preview_url) return;

        if (playingId === track.id) {
            previewAudio.pause();
            setPlayingId(null);
        } else {
            if (previewAudio) {
                previewAudio.pause();
            }
            const audio = new Audio(track.preview_url);
            audio.volume = 0.3;
            audio.play();
            audio.onended = () => setPlayingId(null);
            setPreviewAudio(audio);
            setPlayingId(track.id);
        }
    };

    useEffect(() => {
        return () => {
            if (previewAudio) previewAudio.pause();
        };
    }, [previewAudio]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0c0c1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
                                    <Music size={20} />
                                </div>
                                <h2 className="text-sm font-black text-white uppercase tracking-widest">Sintonizador Spotify</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Input (Only if connected) */}
                        <div className="p-6 flex-1 overflow-hidden flex flex-col">
                            {checking ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">Sincronizando Frecuencias...</span>
                                </div>
                            ) : !connected ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center gap-6">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/20">
                                        <Music size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-white font-bold">Spotify no está conectado</h3>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed px-10">Conecta tu cuenta para buscar y compartir música en el Global Feed</p>
                                    </div>
                                    <button
                                        onClick={handleConnect}
                                        className="px-8 py-3 bg-[#1DB954] text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                    >
                                        Vincular con Spotify
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative mb-6">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Buscar canción, artista o álbum..."
                                            value={query}
                                            onChange={(e) => { setQuery(e.target.value); setError(null); }}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-green-500/30 transition-all"
                                        />
                                        {loading && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-white/5 border-t-green-500 rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {error ? (
                                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-rose-400">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-6">⚠️ {error}</span>
                                            <p className="text-[9px] text-white/20 uppercase tracking-tighter">Es posible que el servicio necesite una actualización</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 no-scrollbar">
                                            {results.length > 0 ? (
                                                [...results]
                                                    .sort((a, b) => (b.preview_url ? 1 : 0) - (a.preview_url ? 1 : 0))
                                                    .map((track) => (
                                                        <motion.div
                                                            key={track.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            className={`group p-3 bg-white/5 border rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer ${!track.preview_url ? 'opacity-60 border-white/5' : 'border-white/5 hover:border-white/10'}`}
                                                            onClick={() => {
                                                                if (!track.preview_url) {
                                                                    if (!window.confirm('Esta canción no tiene vista previa disponible en Spotify. ¿Deseas seleccionarla de todos modos? (Se verá pero no sonará)')) return;
                                                                }
                                                                onSelect({
                                                                    track_id: track.id,
                                                                    track_name: track.name,
                                                                    artist_name: track.artists[0]?.name || 'Unknown',
                                                                    album_cover: track.album?.images[0]?.url,
                                                                    preview_url: track.preview_url
                                                                });
                                                                onClose();
                                                            }}
                                                        >
                                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
                                                                <img src={track.album?.images[0]?.url} className="w-full h-full object-cover" alt="" />
                                                                {track.preview_url && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTogglePreview(track);
                                                                        }}
                                                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        {playingId === track.id ? (
                                                                            <Pause size={16} fill="white" />
                                                                        ) : (
                                                                            <Play size={16} fill="white" />
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-xs font-bold text-white truncate">{track.name}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">{track.artists[0]?.name}</p>
                                                                    {!track.preview_url && (
                                                                        <span className="text-[8px] bg-white/5 text-white/20 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">Sin audio</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-black ${track.preview_url ? 'bg-green-500' : 'bg-white/20'}`}>
                                                                    <Music size={10} />
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                            ) : query.trim() && !loading ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-white/20">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">El vacío no devolvió ecos</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
