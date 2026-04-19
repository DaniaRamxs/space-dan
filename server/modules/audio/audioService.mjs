/**
 * Audio Service
 * Server-side audio extraction and caching for BeatSound
 * Uses play-dl for reliable YouTube audio streaming
 */

import play from 'play-dl';

// Simple TTL cache — replaces node-cache (removed with anime cleanup)
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const audioCache = {
  _store: new Map(),
  _stats: { hits: 0, misses: 0, keys: 0 },
  get(key) {
    const entry = this._store.get(key);
    if (!entry) { this._stats.misses++; return undefined; }
    if (Date.now() > entry.expires) {
      this._store.delete(key);
      this._stats.keys = this._store.size;
      this._stats.misses++;
      return undefined;
    }
    this._stats.hits++;
    return entry.value;
  },
  set(key, value) {
    this._store.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
    this._stats.keys = this._store.size;
  },
  del(key) {
    this._store.delete(key);
    this._stats.keys = this._store.size;
  },
  flushAll() {
    this._store.clear();
    this._stats.keys = 0;
  },
  keys() {
    return Array.from(this._store.keys());
  },
  getStats() {
    return { ...this._stats };
  },
};

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
