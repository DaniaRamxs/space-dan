import React, {
  useState, useEffect, useRef, useCallback, memo, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, ChevronRight, Loader2, Globe } from 'lucide-react';

// ─── API proxy (backend) — avoids CORS from browser ──────────────────────────

const API_URL   = process.env.NEXT_PUBLIC_API_URL || '';
const MANGA_API = `${API_URL}/api/manga`;
const UPLOADS   = 'https://uploads.mangadex.org';

const STATUS_COLORS = {
  ongoing:   'text-green-400 bg-green-400/10 border-green-400/20',
  completed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  hiatus:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
};
const STATUS_LABELS = {
  ongoing:   'En curso',
  completed: 'Completado',
  hiatus:    'Hiatus',
  cancelled: 'Cancelado',
};

const LANG_LABELS = { es: 'ES', en: 'EN', 'es-la': 'ES' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCoverUrl(mangaId, relationships) {
  const coverRel = relationships?.find((r) => r.type === 'cover_art');
  const fileName = coverRel?.attributes?.fileName;
  if (!mangaId || !fileName) return null;
  // Proxy through backend to avoid any CDN CORS issues on cover images
  const direct = `https://uploads.mangadex.org/covers/${mangaId}/${fileName}.256.jpg`;
  return `${MANGA_API}/image?url=${encodeURIComponent(direct)}`;
}

function getMangaTitle(attributes) {
  return (
    attributes?.title?.es ||
    attributes?.title?.['es-la'] ||
    attributes?.title?.en ||
    Object.values(attributes?.title || {})[0] ||
    'Sin título'
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

const SearchSkeleton = memo(() => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-xl bg-white/5 animate-pulse overflow-hidden">
        <div className="aspect-[2/3] bg-gray-700/50" />
        <div className="p-2 space-y-1.5">
          <div className="h-3 bg-gray-700/50 rounded w-3/4" />
          <div className="h-2.5 bg-gray-700/30 rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
));
SearchSkeleton.displayName = 'SearchSkeleton';

const ChapterSkeleton = memo(() => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
    ))}
  </div>
));
ChapterSkeleton.displayName = 'ChapterSkeleton';

// ─── Manga card ───────────────────────────────────────────────────────────────

const MangaCard = memo(({ manga, onSelect }) => {
  const { id, attributes, relationships } = manga;
  const title  = getMangaTitle(attributes);
  const cover  = getCoverUrl(id, relationships);
  const status = attributes?.status;

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => onSelect(manga)}
      className="group rounded-xl bg-white/5 border border-white/5 overflow-hidden
                 hover:border-violet-500/30 hover:bg-white/10 transition-all text-left"
    >
      <div className="aspect-[2/3] overflow-hidden bg-gray-800 relative">
        {cover ? (
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <BookOpen size={32} />
          </div>
        )}
        {status && (
          <div className={`absolute top-1.5 left-1.5 text-[9px] font-black uppercase tracking-wider
                           border rounded px-1.5 py-0.5 ${STATUS_COLORS[status] || 'text-white/40 bg-white/5 border-white/10'}`}>
            {STATUS_LABELS[status] || status}
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-white/80 text-xs font-bold leading-tight line-clamp-2">{title}</p>
      </div>
    </motion.button>
  );
});
MangaCard.displayName = 'MangaCard';

// ─── Chapter row ──────────────────────────────────────────────────────────────

const ChapterRow = memo(({ chapter, onSelect }) => {
  const { id, attributes } = chapter;
  const num   = attributes?.chapter ?? '?';
  const title = attributes?.title || '';
  const lang  = attributes?.translatedLanguage || '';

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(chapter)}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                 bg-white/5 hover:bg-white/10 border border-white/5
                 hover:border-violet-500/30 transition-all text-left group"
    >
      <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/20
                      flex items-center justify-center flex-shrink-0">
        <span className="text-violet-400 text-xs font-black">{num}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm font-bold truncate">
          Capítulo {num}
          {title && <span className="text-white/40 font-normal"> — {title}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-black uppercase border rounded px-1.5 py-0.5 flex items-center gap-1
                          ${lang === 'es' || lang === 'es-la'
                            ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                            : 'text-sky-400 bg-sky-400/10 border-sky-400/20'}`}>
          <Globe size={8} />
          {LANG_LABELS[lang] || lang.toUpperCase()}
        </span>
        <ChevronRight size={14} className="text-white/20 group-hover:text-violet-400 transition-colors" />
      </div>
    </motion.button>
  );
});
ChapterRow.displayName = 'ChapterRow';

// ─── MangaSearchModal ─────────────────────────────────────────────────────────
// Props:
//   isOpen   — boolean
//   onClose  — () => void
//   onSelect — (manga: { mangaId, mangaTitle, chapterId, chapterNum, chapterTitle }) => void

const MangaSearchModal = memo(({ isOpen, onClose, onSelect }) => {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const [selectedManga, setSelectedManga] = useState(null);
  const [chapters, setChapters]           = useState([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [langFilter, setLangFilter]       = useState('es'); // 'es' | 'en'

  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedManga(null);
      setChapters([]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `${MANGA_API}/search?title=${encodeURIComponent(query)}&limit=20`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al buscar manga');
        const data = await res.json();
        setResults(data.data || []);
      } catch (e) {
        setError('No se pudo conectar a MangaDex. Intenta de nuevo.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [query]);

  // Fetch chapters when manga is selected
  const handleSelectManga = useCallback(async (manga) => {
    setSelectedManga(manga);
    setChapters([]);
    setChaptersLoading(true);
    try {
      const url = `${MANGA_API}/${manga.id}/chapters?lang=es&limit=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar capítulos');
      const data = await res.json();
      setChapters(data.data || []);
    } catch {
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  }, []);

  // Filter chapters by lang and deduplicate by chapter number (keep first match)
  const filteredChapters = useMemo(() => {
    const byLang = chapters.filter((c) => {
      const l = c.attributes?.translatedLanguage || '';
      return langFilter === 'es' ? (l === 'es' || l === 'es-la') : l === 'en';
    });
    // If no chapters in selected lang, show all
    const list = byLang.length > 0 ? byLang : chapters;
    const seen = new Set();
    return list.filter((c) => {
      const num = c.attributes?.chapter ?? c.id;
      if (seen.has(num)) return false;
      seen.add(num);
      return true;
    });
  }, [chapters, langFilter]);

  const handleSelectChapter = useCallback((chapter) => {
    if (!selectedManga) return;
    const idx = filteredChapters.findIndex((c) => c.id === chapter.id);
    onSelect({
      mangaId:      selectedManga.id,
      mangaTitle:   getMangaTitle(selectedManga.attributes),
      chapterId:    chapter.id,
      chapterNum:   chapter.attributes?.chapter ?? '?',
      chapterTitle: chapter.attributes?.title || '',
      chapters:     filteredChapters,
      chapterIndex: idx >= 0 ? idx : 0,
    });
    onClose();
  }, [selectedManga, filteredChapters, onSelect, onClose]);

  const handleBack = useCallback(() => {
    setSelectedManga(null);
    setChapters([]);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onKeyDown={handleKeyDown}
            className="fixed inset-x-4 top-[5%] bottom-[5%] mx-auto max-w-2xl z-50
                       bg-[#0d0d14] border border-white/10 rounded-2xl overflow-hidden
                       flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10 flex-shrink-0">
              {selectedManga ? (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleBack}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/10
                             flex items-center justify-center text-white/60 hover:text-white
                             hover:border-white/20 transition-all flex-shrink-0"
                >
                  <ChevronRight size={15} className="rotate-180" />
                </motion.button>
              ) : (
                <BookOpen size={18} className="text-violet-400 flex-shrink-0" />
              )}

              <div className="flex-1 relative">
                {selectedManga ? (
                  <div>
                    <p className="text-white/40 text-xs">Seleccionar capítulo</p>
                    <p className="text-white font-bold text-sm truncate">
                      {getMangaTitle(selectedManga.attributes)}
                    </p>
                  </div>
                ) : (
                  <>
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar manga por título..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2
                                 text-sm text-white placeholder-white/30 outline-none
                                 focus:border-violet-500/50 focus:bg-white/8 transition-all"
                    />
                  </>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/10
                           flex items-center justify-center text-white/60 hover:text-white
                           hover:border-white/20 transition-all flex-shrink-0"
              >
                <X size={15} />
              </motion.button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}>
              {/* Chapter list view */}
              {selectedManga ? (
                chaptersLoading ? (
                  <ChapterSkeleton />
                ) : (
                  <>
                    {/* Language toggle */}
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                      {['es', 'en'].map((l) => (
                        <button
                          key={l}
                          onClick={() => setLangFilter(l)}
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                            langFilter === l
                              ? 'bg-violet-600 border-violet-500 text-white'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                          }`}
                        >
                          {l === 'es' ? 'Español' : 'English'}
                        </button>
                      ))}
                      <span className="text-white/20 text-xs ml-auto">{filteredChapters.length} caps</span>
                    </div>
                    {filteredChapters.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-white/30 p-8 text-center">
                        <BookOpen size={32} className="opacity-30" />
                        <p className="text-sm">Sin capítulos en {langFilter === 'es' ? 'español' : 'inglés'} — prueba el otro idioma</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 p-4">
                        {filteredChapters.map((ch) => (
                          <ChapterRow
                            key={ch.id}
                            chapter={ch}
                            onSelect={handleSelectChapter}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              ) : (
                /* Search results view */
                loading ? (
                  <SearchSkeleton />
                ) : error ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-white/40 p-8 text-center">
                    <p className="text-sm">{error}</p>
                  </div>
                ) : results.length === 0 && query.trim() ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-white/30 p-8 text-center">
                    <BookOpen size={32} className="opacity-30" />
                    <p className="text-sm">No se encontraron resultados para "{query}"</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-white/20 p-8 text-center">
                    <Search size={32} className="opacity-20" />
                    <p className="text-sm">Escribe el nombre de un manga para buscarlo</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                    {results.map((manga) => (
                      <MangaCard
                        key={manga.id}
                        manga={manga}
                        onSelect={handleSelectManga}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

MangaSearchModal.displayName = 'MangaSearchModal';

export default MangaSearchModal;
