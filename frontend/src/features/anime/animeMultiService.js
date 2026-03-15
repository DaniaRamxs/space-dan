const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2567';

export const animeMultiService = {
  async searchAnime(query) {
    try {
      const response = await fetch(`${API_URL}/api/anime-multi/search/${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      console.log('[animeMultiService] Search response:', data);
      return data.data || []; // Backend sends { success: true, data: results }
    } catch (error) {
      console.error('Multi-source search error:', error);
      throw error;
    }
  },

  async getAnimeInfo(animeId, provider) {
    try {
      const response = await fetch(`${API_URL}/api/anime-multi/info/${animeId}/${provider}`);
      if (!response.ok) throw new Error('Failed to get anime info');
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Anime info error:', error);
      throw error;
    }
  },

  async getEpisodeSources(episodeId, provider) {
    try {
      const response = await fetch(`${API_URL}/api/anime-multi/episodes/${episodeId}/${provider}`);
      if (!response.ok) throw new Error('Failed to get episode sources');
      const data = await response.json();
      
      // Formatear para compatibilidad con AnimePlayer
      return {
        success: true,
        sources: data.data.sources.map(source => ({
          ...source,
          format: 'hls',
          sourceType: 'hls'
        })),
        subtitles: data.data.subtitles || []
      };
    } catch (error) {
      console.error('Episode sources error:', error);
      throw error;
    }
  },

  async getSourceStatus() {
    try {
      const response = await fetch(`${API_URL}/api/anime-multi/status`);
      if (!response.ok) throw new Error('Failed to get source status');
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Source status error:', error);
      return [];
    }
  }
};
