const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2567';

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
  async searchAnime(query) {
    const response = await fetch(buildUrl('/api/anime/search', { q: query }));
    if (!response.ok) throw new Error('Failed to search anime');
    return response.json();
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
