/**
 * Audio Service
 * Server-side audio extraction and caching for BeatSound
 * Uses play-dl for reliable YouTube audio streaming
 */

import play from 'play-dl';
import NodeCache from 'node-cache';

// Cache audio URLs for 1 hour (3600 seconds)
const audioCache = new NodeCache({ stdTTL: 3600 });

export const audioService = {
  /**
   * Get audio stream URL from YouTube video ID
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<{url: string, duration: number, title: string}>}
   */
  async getAudioUrl(videoId) {
    try {
      // Check cache first
      const cacheKey = `audio_${videoId}`;
      const cached = audioCache.get(cacheKey);
      
      if (cached) {
        console.log(`[AudioService] Cache hit for video: ${videoId}`);
        return {
          ...cached,
          source: 'cache'
        };
      }

      console.log(`[AudioService] Fetching audio URL for: ${videoId}`);
      
      // Validate YouTube URL
      const videoUrl = `https://youtube.com/watch?v=${videoId}`;
      const isValid = await play.validate(videoUrl);
      
      if (!isValid) {
        throw new Error('Invalid YouTube URL');
      }

      // Get video info
      const info = await play.video_info(videoUrl);
      
      if (!info) {
        throw new Error('Could not fetch video info');
      }

      // Get audio stream
      const stream = await play.stream(videoUrl, {
        quality: 2, // 128kbps audio quality (good balance)
      });

      const audioData = {
        url: stream.url,
        duration: info.video_details.durationInSec * 1000, // Convert to ms
        title: info.video_details.title,
        artist: info.video_details.channel?.name || 'Unknown',
        thumbnail: info.video_details.thumbnails?.[0]?.url,
        type: stream.type, // 'audio' or 'video'
      };

      // Cache the result
      audioCache.set(cacheKey, audioData);
      console.log(`[AudioService] ✅ Audio URL cached for: ${info.video_details.title}`);

      return {
        ...audioData,
        source: 'youtube'
      };

    } catch (error) {
      console.error('[AudioService] Error getting audio URL:', error);
      throw error;
    }
  },

  /**
   * Get multiple audio URLs in batch
   * @param {string[]} videoIds - Array of YouTube video IDs
   * @returns {Promise<Object[]>}
   */
  async getAudioUrlsBatch(videoIds) {
    const results = await Promise.allSettled(
      videoIds.map(id => this.getAudioUrl(id))
    );

    return results.map((result, index) => ({
      videoId: videoIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  },

  /**
   * Clear cache for specific video or all
   * @param {string} videoId - Optional video ID to clear
   */
  clearCache(videoId = null) {
    if (videoId) {
      const cacheKey = `audio_${videoId}`;
      audioCache.del(cacheKey);
      console.log(`[AudioService] Cache cleared for: ${videoId}`);
    } else {
      audioCache.flushAll();
      console.log('[AudioService] All cache cleared');
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: audioCache.keys().length,
      stats: audioCache.getStats()
    };
  }
};
