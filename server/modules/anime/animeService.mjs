import pkg from '@consumet/extensions';

const { ANIME } = pkg;

// Detection of available providers to avoid crashes on different library versions
const GogoProvider = ANIME.Gogoanime || ANIME.GogoAnime || ANIME.AnimePahe;
const ZoroProvider = ANIME.Zoro || ANIME.Hianime;

const gogoanime = new GogoProvider();
const zoro = new ZoroProvider();

// Memory cache for successful results (3 min TTL to avoid expired stream tokens)
const sourceCache = new Map();

/**
 * Normalizes the response from different providers
 */
const normalizeSources = (data) => {
  return {
    sources: data.sources || [],
    subtitles: data.subtitles || [],
    headers: data.headers || {},
    intro: data.intro || null,
    outro: data.outro || null,
    success: true
  };
};

/**
 * Search anime by query
 */
export const searchAnime = async (query) => {
  try {
    const results = await gogoanime.search(query);
    // Some providers return the array directly, others wrap it in results
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
    // Both fetchAnimeInfo and getAnimeInfo are common method names in Consumet
    const fetchFn = gogoanime.fetchAnimeInfo || gogoanime.getAnimeInfo;
    if (!fetchFn) throw new Error("Provider does not support fetching anime info");
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
  if (sourceCache.has(episodeId)) {
    return sourceCache.get(episodeId);
  }

  try {
    let response = null;

    // 1. Primary Provider
    try {
      const fetchFn = gogoanime.fetchEpisodeSources || gogoanime.getEpisodeSources;
      if (!fetchFn) throw new Error("Primary provider cannot fetch sources");
      
      const res = await fetchFn.call(gogoanime, episodeId);
      if (res?.sources?.length > 0) {
        response = normalizeSources(res);
      } else {
        throw new Error("Empty sources");
      }
    } catch (err) {
      console.warn(`[AnimeService] Primary provider failed for ${episodeId}:`, err.message);
      
      // 2. Fallback Provider
      try {
        console.warn(`[AnimeService] Trying fallback provider...`);
        const fetchFn = zoro.fetchEpisodeSources || zoro.getEpisodeSources;
        if (!fetchFn) throw new Error("Fallback provider cannot fetch sources");

        const zoroRes = await fetchFn.call(zoro, episodeId);
        if (zoroRes?.sources?.length > 0) {
          response = normalizeSources(zoroRes);
        } else {
          throw new Error("Fallback also returned empty sources");
        }
      } catch (zoroErr) {
        console.error(`[AnimeService] All providers failed for ${episodeId}:`, zoroErr.message);
        return {
          sources: [],
          subtitles: [],
          success: false,
          error: "No streaming sources available for this episode."
        };
      }
    }

    if (response && response.success) {
      sourceCache.set(episodeId, response);
      setTimeout(() => sourceCache.delete(episodeId), 180000); 
    }

    return response;
  } catch (error) {
    console.error('[AnimeService] Terminal sources error:', error.message);
    return {
      sources: [],
      subtitles: [],
      success: false,
      error: error.message
    };
  }
};
