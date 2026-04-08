const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:2567';

const buildUrl = (path, params = {}) => {
  const base = API_URL || window.location.origin;
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

export const animeService = {
  async searchAnime(query, retryCount = 0) {
    try {
      const response = await fetch(buildUrl('/api/anime/search', { q: query }));
      
      if (!response.ok) {
        if (response.status === 500 && retryCount < 2) {
          // Retry once after 1 second for server errors
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.searchAnime(query, retryCount + 1);
        }
        throw new Error(`Server error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      if (error.message.includes('Failed to fetch') && retryCount < 2) {
        // Network error, retry once
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.searchAnime(query, retryCount + 1);
      }
      throw error;
    }
  },

  async getAnimeInfo(id, provider) {
    const response = await fetch(buildUrl(`/api/anime/info/${encodeURIComponent(id)}`, { provider }));
    if (!response.ok) throw new Error('Failed to get anime info');
    return response.json();
  },

  async getEpisodeSources(episodeId, provider) {
    const response = await fetch(buildUrl('/api/anime/watch', { episodeId, provider }));
    if (!response.ok) throw new Error('Failed to get episode sources');
    return response.json();
  }
};
