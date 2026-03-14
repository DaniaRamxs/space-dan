import { ANIME } from '@consumet/extensions';

const gogoanime = new ANIME.Gogoanime();

/**
 * Search anime by query
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export const searchAnime = async (query) => {
  try {
    const results = await gogoanime.search(query);
    return results.results.map(item => ({
      id: item.id,
      title: item.title,
      image: item.image,
      releaseDate: item.releaseDate
    }));
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
    const info = await gogoanime.fetchAnimeInfo(animeId);
    return {
      title: info.title,
      description: info.description,
      image: info.image,
      episodes: info.episodes.map(ep => ({
        id: ep.id,
        number: ep.number,
        url: ep.url
      }))
    };
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
    const sources = await gogoanime.fetchEpisodeSources(episodeId);
    
    // Consumet Gogoanime usually returns m3u8 in sources
    // We also want to filter for Spanish subtitles if available, 
    // although Gogoanime is usually hardcoded or has its own player.
    // Some providers in Consumet return subtitles.
    
    return {
      sources: sources.sources, // Usually contains { url, isM3U8, quality }
      subtitles: sources.subtitles || [],
      intro: sources.intro,
      outro: sources.outro
    };
  } catch (error) {
    console.error('[AnimeService] Sources error:', error);
    throw error;
  }
};
