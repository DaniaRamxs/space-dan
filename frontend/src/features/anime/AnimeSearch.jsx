import React, { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { animeService } from './animeService';
import { animeMultiService } from './animeMultiService';

const AnimeSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [directUrl, setDirectUrl] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Intentar con multi-source primero
      let data;
      try {
        data = await animeMultiService.searchAnime(query);
      } catch (multiError) {
        console.warn('Multi-source search failed, trying fallback:', multiError);
        // Fallback al servicio original
        data = await animeService.searchAnime(query);
      }
      
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setError(error.message);
      
      // Auto-enable emergency mode on server error
      if (error.message.includes('500') || error.message.includes('Server error')) {
        setEmergencyMode(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencySubmit = (e) => {
    e.preventDefault();
    if (!directUrl.trim()) return;
    
    // Create a mock anime object for direct URLs
    const mockAnime = {
      id: 'direct-url',
      title: 'Direct URL Video',
      image: '/default-avatar.png',
      description: 'Direct video URL - no metadata available',
      provider: 'direct',
      url: directUrl.trim()
    };
    
    onSelect(mockAnime);
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 pb-8 pt-4 sm:gap-6 sm:px-6">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_35%),linear-gradient(180deg,rgba(9,9,18,0.96),rgba(5,5,10,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-cyan-300">
          <Sparkles size={16} />
          <span className="text-[11px] font-black uppercase tracking-[0.28em]">AnimeFLV First</span>
        </div>
        <div className="space-y-3">
          <h1 className="max-w-xl text-2xl font-black leading-none text-white sm:text-5xl">
            AnimeSpace pensado primero para móvil.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
            Busca anime en español, entra a un episodio en pocos toques y comparte la sala cuando quieras.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Naruto, One Piece, Bleach..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-4 text-base text-white placeholder:text-white/30 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[180px]"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            Buscar
          </button>
        </form>

        {/* Emergency Mode */}
        {emergencyMode && (
          <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-300">
              <span className="text-[10px] font-black uppercase tracking-[0.28em]">Modo Emergencia</span>
            </div>
            <p className="mb-3 text-xs text-amber-200/80">
              El servidor está caído. Usa URLs directas de video (HLS, MP4, etc.)
            </p>
            <form onSubmit={handleEmergencySubmit} className="flex flex-col gap-2">
              <input
                type="url"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://ejemplo.com/video.m3u8"
                className="w-full rounded-lg border border-amber-400/30 bg-amber-500/5 py-2 px-3 text-sm text-white placeholder:text-amber-300/50 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/20"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-amber-400"
              >
                Usar URL Directa
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {results.map((anime) => (
          <button
            key={`${anime.provider || 'anime'}-${anime.id}`}
            onClick={() => onSelect(anime)}
            className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] text-left transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.07] sm:rounded-[24px]"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={anime.image || anime.img || anime.cover}
                alt={anime.title}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                  {anime.provider === 'animeflv' ? 'ESP' : 'ALT'}
                </span>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <p className="line-clamp-2 text-[13px] font-bold leading-5 text-white sm:text-sm">{anime.title}</p>
              <p className="line-clamp-2 text-xs leading-5 text-white/50 sm:line-clamp-3">
                {anime.description || 'Sin descripción disponible.'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-center">
          <div className="text-sm font-medium text-rose-200">
            Error al buscar anime
          </div>
          <div className="mt-1 text-xs text-rose-300/80">
            {error.includes('500') ? 'El servidor está temporalmente caído. Intenta de nuevo en unos minutos.' : error}
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-3 rounded-full border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/30 transition"
          >
            Cerrar
          </button>
        </div>
      )}

      {results.length === 0 && !loading && query && !error && (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-white/45">
          No encontré resultados para "{query}".
        </div>
      )}
    </section>
  );
};

export default AnimeSearch;
