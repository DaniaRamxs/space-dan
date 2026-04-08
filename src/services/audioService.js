/**
 * Audio Service
 * Client-side service for fetching audio streams from backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://spacely-server-production.up.railway.app';

export const audioService = {
  /**
   * Get audio stream URL for a YouTube video
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<{url: string, duration: number, title: string}>}
   */
  async getAudioStream(videoId) {
    try {
      const response = await fetch(`${API_URL}/api/audio/stream/${videoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get audio stream');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[AudioService] Error fetching audio stream:', error);
      throw error;
    }
  },

  /**
   * Get audio streams for multiple videos
   * @param {string[]} videoIds - Array of YouTube video IDs
   * @returns {Promise<Array>}
   */
  async getAudioStreamsBatch(videoIds) {
    try {
      const response = await fetch(`${API_URL}/api/audio/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get audio streams');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[AudioService] Error fetching batch audio streams:', error);
      throw error;
    }
  },

  /**
   * Clear audio cache on server
   * @param {string} videoId - Optional video ID to clear
   */
  async clearCache(videoId = null) {
    try {
      const url = videoId 
        ? `${API_URL}/api/audio/cache/${videoId}`
        : `${API_URL}/api/audio/cache`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear cache');
      }

      return await response.json();
    } catch (error) {
      console.error('[AudioService] Error clearing cache:', error);
      throw error;
    }
  },

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const response = await fetch(`${API_URL}/api/audio/cache/stats`);
      
      if (!response.ok) {
        throw new Error('Failed to get cache stats');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('[AudioService] Error getting cache stats:', error);
      throw error;
    }
  }
};
