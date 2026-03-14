import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Zap } from 'lucide-react';

const GIPHY_KEY = '3k4Fdn6D040IQvIq1KquLZzJgutP3dGp';

export default function GifPickerModal({ isOpen, onClose, onSelect }) {
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        fetchGifs();
    }, [isOpen]);

    const fetchGifs = async (searchQuery = '') => {
        setLoading(true);
        try {
            const endpoint = searchQuery 
                ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(searchQuery)}&api_key=${GIPHY_KEY}&limit=20`
                : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20`;
            
            const resp = await fetch(endpoint);
            const data = await resp.json();
            
            if (data.data) {
                const normalized = data.data.map(g => ({
                    id: g.id,
                    url: g.images.fixed_height.url
                }));
                setGifs(normalized);
            }
        } catch (err) {
            console.error("Giphy fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchGifs(query);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} 
            />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-[#0a0a1a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <Zap size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">GIFs Estelares</h3>
                            <p className="text-[10px] text-white/40 uppercase tracking-tighter">Powered by GIPHY</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} className="text-white/40" />
                    </button>
                </div>

                <div className="p-4">
                    <form onSubmit={handleSearch} className="relative">
                        <input 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar en el multiverso..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 min-h-[300px] max-h-[400px] no-scrollbar">
                    {loading ? (
                        <div className="h-full flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 pb-4">
                            {gifs.map(gif => (
                                <button 
                                    key={gif.id}
                                    onClick={() => {
                                        onSelect(gif);
                                        onClose();
                                    }}
                                    className="relative aspect-video rounded-xl overflow-hidden hover:scale-105 transition-transform group bg-white/5"
                                >
                                    <img src={gif.url} className="w-full h-full object-cover" loading="lazy" alt="gif" />
                                    <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
