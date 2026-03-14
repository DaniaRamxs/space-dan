import pkg from '@consumet/extensions';

const { ANIME } = pkg;

const gogoanime = new ANIME.Gogoanime();
const zoro = new ANIME.Zoro();

/**
 * Search anime by query
 * @param {string} query 
 * @returns {Promise<Array>}
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
 * @param {string} animeId 
 * @returns {Promise<Object>}
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
 * Get streaming sources for an episode
 * @param {string} episodeId 
 * @returns {Promise<Object>}
 */
export const getEpisodeSources = async (episodeId) => {
  try {
    try {
      return await gogoanime.fetchEpisodeSources(episodeId);
    } catch (e) {
      console.warn('[AnimeService] Gogoanime failed, trying Zoro fallback');
      return await zoro.fetchEpisodeSources(episodeId);
    }
  } catch (error) {
    console.error('[AnimeService] Sources error:', error);
    throw error;
  }
};
