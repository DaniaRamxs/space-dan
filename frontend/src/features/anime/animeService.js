import { supabase } from '../../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:2567';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
  };
}

export const animeService = {
  async searchAnime(query) {
    const response = await fetch(`${API_URL}/api/anime/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search anime');
    return response.json();
  },

  async getAnimeInfo(id) {
    const response = await fetch(`${API_URL}/api/anime/info/${id}`);
    if (!response.ok) throw new Error('Failed to get anime info');
    return response.json();
  },

  async getEpisodeSources(episodeId) {
    const response = await fetch(`${API_URL}/api/anime/watch/${episodeId}`);
    if (!response.ok) throw new Error('Failed to get episode sources');
    return response.json();
  }
};
