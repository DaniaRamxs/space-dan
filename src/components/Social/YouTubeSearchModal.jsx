import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Youtube, X, Play, Clock } from 'lucide-react';
import { youtubeService } from '../../services/youtubeService';

export default function YouTubeSearchModal({ isOpen, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setLoading(true);
            setError(null);
            try {
                const videos = await youtubeService.searchVideos(query.trim());
                setResults(videos);
            } catch (err) {
                console.error('Error al buscar en YouTube:', err);
                setError(err.message || 'Error al conectar con YouTube');
            } finally {
                setLoading(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-xl bg-[#0c0c1a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-red-600/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-600/20 rounded-xl text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                                    <Youtube size={20} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">YouTube Music Jukebox</h2>
                                    <p className="text-[9px] text-white/40 uppercase tracking-tighter">Busca cualquier canción o video</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-6 flex-1 overflow-hidden flex flex-col">
                            <div className="relative mb-6">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                                    <Search size={18} />
                                </div>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Nombre de la canción, artista o URL..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-red-500/50 focus:bg-white/[0.08] transition-all shadow-inner"
                                />
                                {loading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {error ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4 text-center">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                                        <X size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-red-400 block">⚠️ Configuración Incompleta</span>
                                        <p className="text-[10px] text-white/40 uppercase tracking-tight leading-relaxed px-10">
                                            {error.includes('VITE_YOUTUBE_API_KEY')
                                                ? 'Para usar el buscador de YouTube, necesitas añadir VITE_YOUTUBE_API_KEY al archivo .env'
                                                : error}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 no-scrollbar pb-6">
                                    {results.length > 0 ? (
                                        results.map((video) => (
                                            <motion.div
                                                key={video.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                whileHover={{ x: 5 }}
                                                className="group p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 hover:border-red-500/20 transition-all cursor-pointer shadow-sm"
                                                onClick={() => {
                                                    onSelect({
                                                        id: video.id,
                                                        name: video.title,
                                                        artist: video.artist,
                                                        cover: video.thumbnail,
                                                        source: 'youtube'
                                                    });
                                                    onClose();
                                                }}
                                            >
                                                <div className="relative w-20 aspect-video rounded-xl overflow-hidden shrink-0 shadow-lg border border-white/5">
                                                    <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play size={20} fill="white" className="text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-white leading-snug mb-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: video.title }} />
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">{video.artist}</p>
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                                    <button className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg">
                                                        <Play size={12} fill="white" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : query.trim() && !loading ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
                                            <Search size={40} className="opacity-10" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">No se encontraron videos</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-white/10 gap-4">
                                            <Youtube size={60} className="opacity-5" />
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em]">Esperando búsqueda...</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function Loader2({ className }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}
