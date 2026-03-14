import pkg from '@consumet/extensions';

const { ANIME } = pkg;

const gogoanime = new ANIME.GogoAnime();
const zoro = new ANIME.Zoro();

// Simple memory cache for sources (10 min TTL)
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
    outro: data.outro || null
  };
};

/**
 * Search anime by query
 */
export const searchAnime = async (query) => {
  try {
    const results = await gogoanime.search(query);
    return results.results || [];
  } catch (error) {
    console.error('[AnimeService] Search error:', error);
    throw error;
  }
};

/**
 * Get anime info and episodes
 */
export const getAnimeInfo = async (animeId) => {
  try {
    return await gogoanime.fetchAnimeInfo(animeId);
  } catch (error) {
    console.error('[AnimeService] Info error:', error);
    throw error;
  }
};

/**
 * Get streaming sources for an episode with cache and fallback
 */
export const getEpisodeSources = async (episodeId) => {
  // 1. Check Cache
  if (sourceCache.has(episodeId)) {
    return sourceCache.get(episodeId);
  }

  try {
    let response;

    // 2. Try Primary Provider (Gogoanime)
    try {
      const res = await gogoanime.fetchEpisodeSources(episodeId);
      if (res?.sources?.length > 0) {
        response = normalizeSources(res);
      } else {
        throw new Error("Gogoanime returned empty sources");
      }
    } catch (primaryError) {
      console.warn(`[AnimeService] Gogoanime failed for ${episodeId}, trying Zoro fallback...`);
      
      // 3. Fallback to Zoro
      const zoroRes = await zoro.fetchEpisodeSources(episodeId);
      if (zoroRes?.sources?.length > 0) {
        response = normalizeSources(zoroRes);
      } else {
        throw new Error("All providers failed to return sources");
      }
    }

    // 4. Save to Cache
    if (response) {
      sourceCache.set(episodeId, response);
      // Auto-delete after 10 minutes
      setTimeout(() => sourceCache.delete(episodeId), 600000);
    }

    return response;
  } catch (error) {
    console.error('[AnimeService] Final sources error:', error);
    throw error;
  }
};
