import pkg from '@consumet/extensions';
import animeFlvPkg from '@carlosnunezmx/animeflv';
import { resolveEmbedSources } from './animeExtractor.mjs';

const { ANIME } = pkg;
const { Search: animeFlvSearch, GetAnimeInfo: animeFlvGetInfo, GetResources: animeFlvGetResources } = animeFlvPkg;

console.log('[AnimeService] Available ANIME providers:', Object.keys(ANIME || {}));

const PrimaryFallbackProvider = ANIME.AnimeUnity || ANIME.AnimePahe || ANIME.Hianime;
const SecondaryFallbackProvider = ANIME.AnimePahe || ANIME.Hianime;
const fallbackPrimary = PrimaryFallbackProvider ? new PrimaryFallbackProvider() : null;
const fallbackSecondary = SecondaryFallbackProvider ? new SecondaryFallbackProvider() : null;

if (!fallbackPrimary) {
  console.error('[AnimeService] No consumet fallback provider detected.');
}

const sourceCache = new Map();
const SOURCE_CACHE_TTL = 180000;

const getCacheKey = (provider, id) => `${provider}:${id}`;

const normalizeFallbackSources = (data, providerName) => {
  const sources = data.sources || [];
  const subtitles = [...(data.subtitles || [])];
  const spanishSub = subtitles.find((sub) =>
    sub.lang?.toLowerCase().includes('spanish') ||
    sub.lang?.toLowerCase().includes('español') ||
    sub.lang?.toLowerCase() === 'es-es' ||
    sub.lang?.toLowerCase() === 'es'
  );

  if (spanishSub) {
    const others = subtitles.filter((sub) => sub !== spanishSub);
    subtitles.length = 0;
    subtitles.push(spanishSub, ...others);
  }

  return {
    sources,
    subtitles,
    spanishSubFound: Boolean(spanishSub),
    headers: data.headers || {},
    intro: data.intro || null,
    outro: data.outro || null,
    provider: providerName,
    sourceType: 'hls',
    success: true,
    timestamp: Date.now(),
  };
};

const normalizeAnimeFlvSearchResult = (anime) => ({
  id: anime.Id,
  title: anime.Title,
  image: anime.Image,
  description: anime.Description,
  type: anime.Type,
  rating: anime.Review,
  provider: 'animeflv',
});

const normalizeAnimeFlvInfo = (info) => ({
  id: info.Id,
  title: info.Title,
  image: info.Image,
  description: info.Description,
  type: info.Type,
  genres: info.Genders || [],
  ongoing: info.OnGoing,
  followers: info.Followers,
  provider: 'animeflv',
  episodes: (info.Episodes || []).map((episode) => ({
    id: episode.Id,
    number: episode.Number,
    image: episode.Image,
    provider: 'animeflv',
  })),
});

const normalizeAnimeFlvSources = (resources) => {
  const latSources = (resources?.LAT || []).map((source) => ({
    url: source.code,
    directUrl: source.url || source.code,
    server: source.server,
    quality: source.title || source.server?.toUpperCase() || 'LAT',
    isDub: true,
    lang: 'es-LAT',
    allowMobile: source.allow_mobile !== false,
    format: 'embed',
  }));
  const subSources = (resources?.SUB || []).map((source) => ({
    url: source.code,
    directUrl: source.url || source.code,
    server: source.server,
    quality: source.title || source.server?.toUpperCase() || 'SUB',
    isDub: false,
    lang: 'es',
    allowMobile: source.allow_mobile !== false,
    format: 'embed',
  }));
  const orderedSources = [...latSources, ...subSources].sort((a, b) => Number(b.allowMobile) - Number(a.allowMobile));

  return {
    sources: orderedSources,
    subtitles: [],
    spanishSubFound: latSources.length > 0 || subSources.length > 0,
    headers: {},
    intro: null,
    outro: null,
    provider: 'animeflv',
    sourceType: 'embed',
    success: orderedSources.length > 0,
    timestamp: Date.now(),
    message: orderedSources.length > 0 ? null : 'No se encontraron reproductores disponibles en AnimeFLV.',
  };
};

const normalizeFallbackSearchResult = (anime, provider = 'consumet') => ({
  ...anime,
  image: anime.image || anime.img || anime.cover,
  provider,
});

const normalizeFallbackInfo = (info, provider = 'consumet') => {
  if (!info) return info;

  info.image = info.image || info.img || info.cover;
  info.provider = provider;
  info.episodes = (info.episodes || []).map((episode) => ({
    ...episode,
    provider,
  }));

  return info;
};

const fetchFallbackInfo = async (animeId) => {
  if (!fallbackPrimary) throw new Error('No fallback provider available for anime info');

  try {
    const fetchFn = fallbackPrimary.fetchAnimeInfo || fallbackPrimary.getAnimeInfo || fallbackPrimary.fetchInfo;
    if (!fetchFn) throw new Error('Primary fallback provider does not support anime info');
    const info = await fetchFn.call(fallbackPrimary, animeId);
    return normalizeFallbackInfo(info, 'consumet');
  } catch (error) {
    console.error('[AnimeService] Fallback info error (primary):', error.message);

    if (!fallbackSecondary) {
      throw error;
    }

    const fetchFn = fallbackSecondary.fetchAnimeInfo || fallbackSecondary.getAnimeInfo || fallbackSecondary.fetchInfo;
    if (!fetchFn) {
      throw error;
    }

    const info = await fetchFn.call(fallbackSecondary, animeId);
    return normalizeFallbackInfo(info, 'consumet-fallback');
  }
};

const fetchFallbackSources = async (episodeId) => {
  let response = null;

  if (fallbackPrimary) {
    try {
      const fetchFn = fallbackPrimary.fetchEpisodeSources || fallbackPrimary.getEpisodeSources;
      if (!fetchFn) throw new Error('Primary fallback provider cannot fetch sources');
      const result = await fetchFn.call(fallbackPrimary, episodeId);
      if (result?.sources?.length) {
        response = normalizeFallbackSources(result, 'consumet');
      }
    } catch (error) {
      console.warn(`[AnimeService] Fallback source provider failed for ${episodeId}:`, error.message);
    }
  }

  if (!response && fallbackSecondary) {
    const fetchFn = fallbackSecondary.fetchEpisodeSources || fallbackSecondary.getEpisodeSources;
    if (!fetchFn) {
      return null;
    }

    try {
      const result = await fetchFn.call(fallbackSecondary, episodeId);
      if (result?.sources?.length) {
        response = normalizeFallbackSources(result, 'consumet-fallback');
      }
    } catch (error) {
      console.error(`[AnimeService] Secondary fallback source provider failed for ${episodeId}:`, error.message);
    }
  }

  return response;
};

export const searchAnime = async (query) => {
  console.log(`[AnimeService] Search: ${query}`);

  try {
    const results = await animeFlvSearch(query);
    const list = Array.isArray(results) ? results : results?.Series || [];
    if (list.length > 0) {
      return list.map(normalizeAnimeFlvSearchResult);
    }
  } catch (error) {
    console.warn('[AnimeService] AnimeFLV search failed:', error.message);
  }

  try {
    if (!fallbackPrimary) throw new Error('No fallback provider available for search');
    let results = await fallbackPrimary.search(query);
    let list = results.results || results || [];

    if (list.length === 0 && fallbackSecondary) {
      results = await fallbackSecondary.search(query);
      list = results.results || results || [];
    }

    return list.map((anime) => normalizeFallbackSearchResult(anime));
  } catch (error) {
    console.error('[AnimeService] Search error:', error.message);
    throw error;
  }
};

export const getAnimeInfo = async (animeId, provider = 'auto') => {
  console.log(`[AnimeService] getAnimeInfo: ${animeId} (${provider})`);

  if (provider === 'animeflv' || provider === 'auto') {
    try {
      const info = await animeFlvGetInfo(animeId);
      return normalizeAnimeFlvInfo(info);
    } catch (error) {
      console.warn('[AnimeService] AnimeFLV info failed:', error.message);
      if (provider === 'animeflv') {
        throw error;
      }
    }
  }

  return fetchFallbackInfo(animeId);
};

export const getEpisodeSources = async (episodeId, provider = 'auto') => {
  const cacheKey = getCacheKey(provider, episodeId);
  if (sourceCache.has(cacheKey)) {
    const cached = sourceCache.get(cacheKey);
    if (Date.now() - cached.timestamp < SOURCE_CACHE_TTL) {
      return cached;
    }
    sourceCache.delete(cacheKey);
  }

  try {
    let response = null;

    if (provider === 'animeflv' || provider === 'auto') {
      try {
        const resources = await animeFlvGetResources(episodeId);
        response = normalizeAnimeFlvSources(resources);
      } catch (error) {
        console.warn('[AnimeService] AnimeFLV sources failed:', error.message);
        if (provider === 'animeflv') {
          throw error;
        }
      }
    }

    if (!response || !response.sources?.length) {
      response = await fetchFallbackSources(episodeId);
    }

    if (response?.sources?.length) {
      // Resolve embed URLs → direct HLS/MP4 so the native player can play them
      const referer =
        response.provider === 'animeflv' ? 'https://www3.animeflv.net/' : undefined;
      const resolved = await resolveEmbedSources(response.sources, referer);

      // Only return if we got at least one playable direct stream.
      // If resolved is empty, all extractions failed — fall through to
      // the "no sources" response so the player doesn't receive raw embed URLs.
      if (resolved.length > 0) {
        const final = { ...response, sources: resolved, sourceType: 'hls' };
        sourceCache.set(cacheKey, final);
        setTimeout(() => sourceCache.delete(cacheKey), SOURCE_CACHE_TTL);
        return final;
      }

      console.warn(`[AnimeService] All embed extractions failed for ${episodeId}`);
    }

    return {
      sources: [],
      subtitles: [],
      provider,
      success: false,
      message: 'Este episodio no está disponible actualmente. No se encontraron fuentes de video funcionando.',
    };
  } catch (error) {
    console.error('[AnimeService] Terminal sources error:', error.message);
    return {
      sources: [],
      subtitles: [],
      provider,
      success: false,
      message: `Error técnico al intentar obtener el video: ${error.message}`,
    };
  }
};
