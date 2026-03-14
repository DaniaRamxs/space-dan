import pkg from '@consumet/extensions';

const { ANIME } = pkg;

// Print detected providers for debugging (useful when library updates)
console.log('[AnimeService] Available ANIME providers:', Object.keys(ANIME || {}));

/**
 * Detection of available providers using prioritized list
 * We prefer Gogoanime/AnimePahe for faster scraping, Zoro/Hianime for quality/subtitles
 */
const GogoProvider = ANIME.Gogoanime || ANIME.GogoAnime || ANIME.AnimePahe;
const ZoroProvider = ANIME.Zoro || ANIME.Hianime;

if (!GogoProvider) {
    console.error('[AnimeService] NO PRIMARY PROVIDER DETECTED! Check @consumet/extensions version.');
}

const gogoanime = GogoProvider ? new GogoProvider() : null;
const zoro = ZoroProvider ? new ZoroProvider() : null;

// Memory cache for successful results (3 min TTL to avoid expired stream tokens)
const sourceCache = new Map();

/**
 * Normalizes the response from different providers to have a consistent structure
 */
const normalizeSources = (data, providerName) => {
  return {
    sources: data.sources || [],
    subtitles: data.subtitles || [],
    headers: data.headers || {},
    intro: data.intro || null,
    outro: data.outro || null,
    provider: providerName,
    success: true,
    timestamp: Date.now()
  };
};

/**
 * Search anime by query
 */
export const searchAnime = async (query) => {
  try {
    if (!gogoanime) throw new Error("No provider available for search");
    const results = await gogoanime.search(query);
    return results.results || results || [];
  } catch (error) {
    console.error('[AnimeService] Search error:', error.message);
    throw error;
  }
};

/**
 * Get anime info and episodes
 */
export const getAnimeInfo = async (animeId) => {
  try {
    if (!gogoanime) throw new Error("No provider available for info");
    const fetchFn = gogoanime.fetchAnimeInfo || gogoanime.getAnimeInfo || gogoanime.fetchInfo;
    if (!fetchFn) throw new Error("Primary provider does not support fetching anime info");
    return await fetchFn.call(gogoanime, animeId);
  } catch (error) {
    console.error('[AnimeService] Info error:', error.message);
    throw error;
  }
};

/**
 * Get streaming sources for an episode with fallback and safety checks
 */
export const getEpisodeSources = async (episodeId) => {
  // 1. Check Cache (3 min TTL is safe for HLS sessions)
  if (sourceCache.has(episodeId)) {
    const cached = sourceCache.get(episodeId);
    // Extra safety: check age even if TTL handles it
    if (Date.now() - cached.timestamp < 180000) {
        return cached;
    }
    sourceCache.delete(episodeId);
  }

  try {
    let response = null;

    // 2. Primary Provider (Gogo)
    if (gogoanime) {
        try {
          const fetchFn = gogoanime.fetchEpisodeSources || gogoanime.getEpisodeSources;
          if (!fetchFn) throw new Error("Primary provider cannot fetch sources");
          
          const res = await fetchFn.call(gogoanime, episodeId);
          if (res?.sources?.length > 0) {
            response = normalizeSources(res, 'gogoanime');
          } else {
            throw new Error("Gogo returned empty sources list");
          }
        } catch (err) {
          console.warn(`[AnimeService] Gogo fallback triggered for ${episodeId}:`, err.message);
        }
    }

    // 3. Fallback Provider (Zoro/Hianime)
    if (!response && zoro) {
      try {
        console.warn(`[AnimeService] Attempting Zoro/Hianime fallback...`);
        const fetchFn = zoro.fetchEpisodeSources || zoro.getEpisodeSources;
        if (!fetchFn) throw new Error("Fallback provider cannot fetch sources");

        const zoroRes = await fetchFn.call(zoro, episodeId);
        if (zoroRes?.sources?.length > 0) {
          response = normalizeSources(zoroRes, 'zoro/hianime');
        } else {
          throw new Error("Zoro fallback also returned empty sources");
        }
      } catch (zoroErr) {
        console.error(`[AnimeService] All providers failed for ${episodeId}:`, zoroErr.message);
      }
    }

    // 4. Return or Error Object
    if (response) {
      sourceCache.set(episodeId, response);
      setTimeout(() => sourceCache.delete(episodeId), 180000); 
      return response;
    }

    // Graceful error for UI
    return {
      sources: [],
      subtitles: [],
      success: false,
      error: "This episode is currently unavailable. No working sources found."
    };

  } catch (error) {
    console.error('[AnimeService] Terminal sources error:', error.message);
    return {
      sources: [],
      subtitles: [],
      success: false,
      error: "Technical error while fetching media."
    };
  }
};
