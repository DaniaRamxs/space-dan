import express from 'express';
import axios from 'axios';
import AnimeMultiSource from '../services/animeMultiSource.js';
import { getCacheStats } from '../modules/anime/animeExtractor.mjs';
const router = express.Router();

const animeMulti = new AnimeMultiSource();

// Directory cache — TTL 30 min so pagination requests aren't repeated on every page load
let directoryCache = null;
let directoryCacheAt = 0;
const DIRECTORY_TTL = 30 * 60 * 1000;

// Directorio de anime - todos los animes disponibles
router.get('/directory', async (_req, res) => {
  console.log('[AnimeMultiRoutes] Directory request');
  try {
    const now = Date.now();
    if (directoryCache && now - directoryCacheAt < DIRECTORY_TTL) {
      console.log(`[AnimeMultiRoutes] Serving cached directory (${directoryCache.length} anime)`);
      return res.json({ success: true, data: directoryCache, sources: animeMulti.sources.map(s => s.name), cached: true });
    }
    const directory = await animeMulti.getAnimeDirectory();
    console.log(`[AnimeMultiRoutes] Sending directory with ${directory.length} anime`);
    directoryCache = directory;
    directoryCacheAt = now;
    res.json({
      success: true,
      data: directory,
      sources: animeMulti.sources.map(s => s.name)
    });
  } catch (error) {
    console.error('[AnimeMultiRoutes] Directory error:', error);
    // Serve stale cache on error if available
    if (directoryCache) {
      return res.json({ success: true, data: directoryCache, sources: animeMulti.sources.map(s => s.name), stale: true });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Búsqueda multi-fuente
router.get('/search/:query', async (req, res) => {
  console.log(`[AnimeMultiRoutes] Search request for: "${req.params.query}"`);
  try {
    const results = await animeMulti.searchAll(req.params.query);
    console.log(`[AnimeMultiRoutes] Sending ${results.length} results`);
    res.json({
      success: true,
      data: results,
      sources: animeMulti.sources.map(s => s.name)
    });
  } catch (error) {
    console.error('[AnimeMultiRoutes] Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Información de anime específico
router.get('/info/:id/:provider', async (req, res) => {
  try {
    const info = await animeMulti.getAnimeInfo(req.params.id, req.params.provider);
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('Anime info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Fuentes de episodio (HLS para reproductor nativo)
router.get('/episodes/:episodeId/:provider', async (req, res) => {
  try {
    const sources = await animeMulti.getEpisodeSources(req.params.episodeId, req.params.provider);
    
    // Preservar el formato real (hls/mp4) para que el player lo maneje correctamente
    const hlsSources = sources.map(source => {
      const url = source.url || '';
      const isMp4 = url.includes('.mp4') || source.format === 'mp4';
      return {
        ...source,
        format: isMp4 ? 'mp4' : 'hls',
        sourceType: isMp4 ? 'mp4' : 'hls',
      };
    });
    
    res.json({
      success: true,
      data: {
        sources: hlsSources,
        subtitles: []
      }
    });
  } catch (error) {
    console.error('Episode sources error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Verificar estado de las fuentes
router.get('/status', async (_req, res) => {
  try {
    const status = [];
    
    for (const source of animeMulti.sources) {
      try {
        const response = await axios.get(source.baseUrl, { timeout: 3000 });
        status.push({
          name: source.name,
          status: 'online',
          responseTime: response.headers['response-time'] || 'unknown'
        });
      } catch (error) {
        status.push({
          name: source.name,
          status: 'offline',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Estadísticas del cache del extractor
router.get('/cache-stats', (_req, res) => {
  res.json({ success: true, data: getCacheStats() });
});

export default router;
