import React, { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { animeService } from './animeService';

const AnimeSearch = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await animeService.searchAnime(query);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_35%),linear-gradient(180deg,rgba(9,9,18,0.96),rgba(5,5,10,0.96))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-cyan-300">
          <Sparkles size={16} />
          <span className="text-[11px] font-black uppercase tracking-[0.28em]">AnimeFLV First</span>
        </div>
        <div className="space-y-3">
          <h1 className="max-w-xl text-3xl font-black leading-none text-white sm:text-5xl">
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
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {results.map((anime) => (
          <button
            key={`${anime.provider || 'anime'}-${anime.id}`}
            onClick={() => onSelect(anime)}
            className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] text-left transition hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-white/[0.07]"
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
              <p className="line-clamp-2 text-sm font-bold leading-5 text-white">{anime.title}</p>
              <p className="line-clamp-3 text-xs leading-5 text-white/50">
                {anime.description || 'Sin descripción disponible.'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {results.length === 0 && !loading && query && (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-white/45">
          No encontré resultados para "{query}".
        </div>
      )}
    </section>
  );
};

export default AnimeSearch;
