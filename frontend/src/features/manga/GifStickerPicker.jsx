// GifStickerPicker — busca GIFs en Giphy y permite seleccionar uno para colocar como sticker
import React, { useState, useCallback, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';

const GIPHY_KEY = '3k4Fdn6D040IQvIq1KquLZzJgutP3dGp';

const SIZES = [
  { key: 'small',  label: 'S', px: 60 },
  { key: 'medium', label: 'M', px: 80 },
  { key: 'large',  label: 'L', px: 120 },
];

// ─── GifStickerPicker ─────────────────────────────────────────────────────────
// Floating panel rendered over the manga page to search Giphy GIFs.
// When a GIF is selected, calls onSelectGif({ gifUrl, gifId, title }).
// The caller then enters "placement mode" and closes this panel.

const GifStickerPicker = memo(({
  isOpen,
  onClose,
  onSelectGif,
  stickerSize = 80,
  onSizeChange,
}) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=24&rating=g`;
      const res  = await fetch(url);
      const json = await res.json();
      setResults(json.data || []);
      setHasSearched(true);
    } catch {
      setError('Error al buscar GIFs');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = useCallback((e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 450);
  }, [search]);

  const handleSelect = useCallback((gif) => {
    const gifUrl = gif.images?.fixed_width_small?.url
      || gif.images?.fixed_width?.url
      || gif.images?.downsized?.url;
    if (!gifUrl) return;
    onSelectGif({ gifUrl, gifId: gif.id, title: gif.title || '' });
    onClose();
  }, [onSelectGif, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10050]
                 w-80 max-w-[92vw] bg-[#0d0d14]/97 border border-white/10
                 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <span className="text-white font-black text-sm">🎯 Stickers GIF</span>

        {/* Size selector */}
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s.key}
              onClick={() => onSizeChange?.(s.px)}
              className={`w-6 h-6 rounded-lg text-[10px] font-black border transition-all ${
                stickerSize === s.px
                  ? 'bg-violet-600/50 border-violet-500/60 text-violet-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10
                     flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
        >
          <X size={13} />
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl
                        px-3 py-2 focus-within:border-violet-500/40 transition-all">
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={handleInput}
            placeholder="love, cry, wow, haha…"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          />
          {loading && <Loader2 size={13} className="text-violet-400 animate-spin flex-shrink-0" />}
        </div>
      </div>

      {/* Results grid */}
      <div
        className="overflow-y-auto px-2 pb-3"
        style={{ maxHeight: '240px', scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}
      >
        {error && (
          <p className="text-red-400 text-xs text-center py-3">{error}</p>
        )}
        {!loading && !error && hasSearched && results.length === 0 && (
          <p className="text-white/20 text-xs text-center py-4">Sin resultados para "{query}"</p>
        )}
        {!hasSearched && !loading && (
          <p className="text-white/20 text-xs text-center py-6">
            Busca un GIF para colocarlo como sticker
          </p>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          {results.map((gif) => (
            <motion.button
              key={gif.id}
              whileTap={{ scale: 0.88 }}
              onClick={() => handleSelect(gif)}
              title={gif.title}
              className="rounded-lg overflow-hidden aspect-square bg-white/5 border border-white/5
                         hover:border-violet-500/40 transition-all"
            >
              <img
                src={gif.images?.fixed_width_small?.url}
                alt={gif.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.button>
          ))}
        </div>

        {results.length > 0 && (
          <p className="text-center text-white/15 text-[9px] mt-2">Powered by GIPHY</p>
        )}
      </div>
    </motion.div>
  );
});

GifStickerPicker.displayName = 'GifStickerPicker';
export default GifStickerPicker;
