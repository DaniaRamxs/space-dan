import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Youtube, X, Play, Clock, Zap, Flame, Gamepad2, Laugh, Music, Trophy, Sparkles } from 'lucide-react';
import { youtubeService } from '../../services/youtubeService';

const SHORTS_CATEGORIES = [
    { id: 'trending',  label: 'Trending',  icon: Flame,    query: 'trending shorts' },
    { id: 'gaming',    label: 'Gaming',    icon: Gamepad2, query: 'gaming shorts highlights' },
    { id: 'comedy',    label: 'Comedia',   icon: Laugh,    query: 'comedy shorts funny' },
    { id: 'music',     label: 'Música',    icon: Music,    query: 'music shorts viral' },
    { id: 'sports',    label: 'Deportes',  icon: Trophy,   query: 'sports shorts highlights' },
    { id: 'viral',     label: 'Viral',     icon: Sparkles, query: 'viral shorts 2025' },
];

export default function YouTubeSearchModal({ isOpen, onClose, onSelect, mode = 'videos', onBatchResults }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState(null);

    const isShorts = mode === 'shorts';

    // Search handler
    const performSearch = useCallback(async (searchQuery) => {
        if (!searchQuery?.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const videos = isShorts
                ? await youtubeService.searchShorts(searchQuery)
                : await youtubeService.searchVideos(searchQuery);
            setResults(videos);

            // Pass batch results to parent for shorts feed
            if (isShorts && onBatchResults && videos.length > 0) {
                onBatchResults(videos);
            }
        } catch (err) {
            console.error('Error al buscar en YouTube:', err);
            setError(err.message || 'Error al conectar con YouTube');
        } finally {
            setLoading(false);
        }
    }, [isShorts, onBatchResults]);

    // Debounced search on query change
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setActiveCategory(null);
        const delayDebounce = setTimeout(() => performSearch(query.trim()), 600);
        return () => clearTimeout(delayDebounce);
    }, [query, performSearch]);

    // Category click handler
    const handleCategoryClick = (category) => {
        setActiveCategory(category.id);
        setQuery('');
        performSearch(category.query);
    };

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setError(null);
            setActiveCategory(null);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
                    style={{
                        zIndex: 999999,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
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
                        style={{
                            position: 'relative',
                            zIndex: 999999,
                            backgroundColor: '#0c0c1a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            visibility: 'visible',
                            display: 'flex'
                        }}
                    >
                        {/* Header */}
                        <div className={`p-6 border-b border-white/5 flex items-center justify-between ${
                            isShorts
                                ? 'bg-gradient-to-r from-purple-600/10 to-transparent'
                                : 'bg-gradient-to-r from-red-600/10 to-transparent'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl shadow-lg ${
                                    isShorts
                                        ? 'bg-purple-600/20 text-purple-400 shadow-purple-500/10'
                                        : 'bg-red-600/20 text-red-500 shadow-red-500/10'
                                }`}>
                                    {isShorts ? <Zap size={20} /> : <Youtube size={20} />}
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1">
                                        {isShorts ? 'YouTube Shorts' : 'YouTube Music Jukebox'}
                                    </h2>
                                    <p className="text-[9px] text-white/40 uppercase tracking-tighter">
                                        {isShorts ? 'Busca clips cortos y shorts' : 'Busca cualquier video'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-6 flex-1 overflow-hidden flex flex-col">
                            <div className="relative mb-4">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                                    <Search size={18} />
                                </div>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder={isShorts ? "Buscar shorts..." : "Nombre del video, artista o URL..."}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className={`w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder:text-white/20 outline-none transition-all shadow-inner ${
                                        isShorts ? 'focus:border-purple-500/50' : 'focus:border-red-500/50'
                                    } focus:bg-white/[0.08]`}
                                />
                                {loading && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Loader2 className={`w-5 h-5 animate-spin ${isShorts ? 'text-purple-500' : 'text-red-500'}`} />
                                    </div>
                                )}
                            </div>

                            {/* Shorts Category Chips */}
                            {isShorts && !query.trim() && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {SHORTS_CATEGORIES.map((cat) => {
                                        const Icon = cat.icon;
                                        const isActive = activeCategory === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleCategoryClick(cat)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                    isActive
                                                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                                                }`}
                                            >
                                                <Icon size={12} />
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {error ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-10 gap-4 text-center">
                                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mb-2">
                                        <Youtube size={32} />
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 block">Modo Offline</span>
                                        <p className="text-[10px] text-white/40 uppercase tracking-tight leading-relaxed px-10">
                                            La API de YouTube no responde. Mostrando recomendaciones de respaldo.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 no-scrollbar pb-6">
                                    {results.length > 0 ? (
                                        results.map((video, idx) => (
                                            <motion.div
                                                key={`${video.id}-${idx}`}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                whileHover={{ x: 5 }}
                                                className={`group p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer shadow-sm ${
                                                    isShorts ? 'hover:border-purple-500/20' : 'hover:border-red-500/20'
                                                }`}
                                                onClick={() => {
                                                    onSelect({
                                                        id: video.id,
                                                        name: video.title,
                                                        title: video.title,
                                                        artist: video.artist,
                                                        channel: video.artist,
                                                        cover: video.thumbnail,
                                                        thumbnail: video.thumbnail,
                                                        source: 'youtube'
                                                    });
                                                    onClose();
                                                }}
                                            >
                                                <div className={`relative shrink-0 shadow-lg border border-white/5 overflow-hidden ${
                                                    isShorts
                                                        ? 'w-14 aspect-[9/16] rounded-xl'
                                                        : 'w-20 aspect-video rounded-xl'
                                                }`}>
                                                    <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Play size={isShorts ? 14 : 20} fill="white" className="text-white" />
                                                    </div>
                                                    {isShorts && (
                                                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                                                            <Zap size={8} className="text-purple-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-bold text-white leading-snug mb-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: video.title }} />
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">{video.artist}</p>
                                                        {video.duration && (
                                                            <span className="text-[8px] text-white/20 flex items-center gap-0.5">
                                                                <Clock size={8} /> {video.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                                                    <button className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg ${
                                                        isShorts ? 'bg-purple-600' : 'bg-red-600'
                                                    }`}>
                                                        <Play size={12} fill="white" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (query.trim() || activeCategory) && !loading ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
                                            <Search size={40} className="opacity-10" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">No se encontraron videos</span>
                                        </div>
                                    ) : !isShorts || (!query.trim() && !activeCategory) ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-white/10 gap-4">
                                            {isShorts ? <Zap size={60} className="opacity-5" /> : <Youtube size={60} className="opacity-5" />}
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em]">
                                                {isShorts ? 'Selecciona una categoría o busca...' : 'Esperando búsqueda...'}
                                            </p>
                                        </div>
                                    ) : null}
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
