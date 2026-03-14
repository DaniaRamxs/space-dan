import pkg from '@consumet/extensions';

const { Gogoanime, Zoro } = pkg;

const gogoanime = new Gogoanime();
const zoro = new Zoro();

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
    let sources;
    try {
      sources = await gogoanime.fetchEpisodeSources(episodeId);
    } catch (e) {
      console.warn('[AnimeService] Gogoanime failed, trying Zoro fallback (note: IDs might differ)');
      // Zoro fallback - Note: This might only work if IDs are shared or if we did a fresh search
      sources = await zoro.fetchEpisodeSources(episodeId);
    }
    
    return {
      sources: sources.sources || [],
      subtitles: sources.subtitles || [],
      intro: sources.intro,
      outro: sources.outro
    };
  } catch (error) {
    console.error('[AnimeService] Sources error:', error);
    throw error;
  }
};
