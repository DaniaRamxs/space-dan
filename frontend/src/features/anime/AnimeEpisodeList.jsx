import React from 'react';
import { Play, Clapperboard, Languages } from 'lucide-react';

const AnimeEpisodeList = ({ anime, episodes = [], onSelect, currentEpisodeId }) => {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3 pb-8 pt-4 sm:px-6">
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:rounded-[28px] sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row">
          <img
            src={anime.image || anime.img || anime.cover}
            alt={anime.title}
            className="mx-auto aspect-[3/4] w-full max-w-[180px] rounded-[20px] object-cover shadow-2xl sm:max-w-[220px] sm:rounded-[24px]"
          />

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">
                {anime.provider === 'animeflv' ? 'AnimeFLV' : 'Proveedor alterno'}
              </span>
              <h1 className="text-2xl font-black leading-none text-white sm:text-4xl">{anime.title}</h1>
              <p className="text-sm leading-6 text-white/65 sm:text-base">
                {anime.description || 'Sin descripción disponible.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center gap-2 text-cyan-300">
                  <Clapperboard size={16} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Episodios</span>
                </div>
                <div className="text-2xl font-black text-white">{episodes.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center gap-2 text-amber-300">
                  <Languages size={16} />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Audio</span>
                </div>
                <div className="text-sm font-bold text-white">LAT / SUB</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:rounded-[28px] sm:p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <h2 className="text-base font-black uppercase tracking-[0.18em] text-white sm:text-xl sm:tracking-[0.2em]">Lista de episodios</h2>
          <span className="text-xs text-white/45">Toca un episodio para reproducir</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => onSelect(ep)}
              className={`relative rounded-2xl border px-3 py-3 text-center transition sm:py-4 ${
                currentEpisodeId === ep.id
                  ? 'border-cyan-300/60 bg-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.22)]'
                  : 'border-white/10 bg-black/20 text-white hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">Ep</div>
              <div className="text-lg font-black">{ep.number}</div>
              {currentEpisodeId === ep.id && (
                <div className="absolute right-2 top-2 rounded-full bg-slate-950/15 p-1">
                  <Play size={10} fill="currentColor" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnimeEpisodeList;
