/**
 * Audio Routes
 * API endpoints for audio extraction and streaming
 */

import express from 'express';
import { audioService } from './audioService.mjs';

const router = express.Router();

/**
 * GET /audio/stream/:videoId
 * Get audio stream URL for a YouTube video
 */
router.get('/stream/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const audioData = await audioService.getAudioUrl(videoId);

    res.json({
      success: true,
      data: audioData
    });

  } catch (error) {
    console.error('[Audio API] Stream error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get audio stream'
    });
  }
});

/**
 * POST /audio/batch
 * Get audio URLs for multiple videos
 */
router.post('/batch', async (req, res) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'videoIds array is required' });
    }

    if (videoIds.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 videos per batch' });
    }

    const results = await audioService.getAudioUrlsBatch(videoIds);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('[Audio API] Batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get audio streams'
    });
  }
});

/**
 * DELETE /audio/cache/:videoId?
 * Clear audio cache
 */
router.delete('/cache/:videoId?', (req, res) => {
  try {
    const { videoId } = req.params;
    audioService.clearCache(videoId);

    res.json({
      success: true,
      message: videoId ? `Cache cleared for ${videoId}` : 'All cache cleared'
    });

  } catch (error) {
    console.error('[Audio API] Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /audio/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = audioService.getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Audio API] Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
