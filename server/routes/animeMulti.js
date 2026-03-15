import express from 'express';
import axios from 'axios';
import AnimeMultiSource from '../services/animeMultiSource.js';
const router = express.Router();

const animeMulti = new AnimeMultiSource();

// Búsqueda multi-fuente
router.get('/search/:query', async (req, res) => {
  try {
    const results = await animeMulti.searchAll(req.params.query);
    res.json({
      success: true,
      data: results,
      sources: animeMulti.sources.map(s => s.name)
    });
  } catch (error) {
    console.error('Multi-source search error:', error);
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
    
    // Asegurar que todas las fuentes sean HLS para reproductor nativo
    const hlsSources = sources.map(source => ({
      ...source,
      format: 'hls', // Forzar HLS
      sourceType: 'hls' // Para compatibilidad con AnimePlayer
    }));
    
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
router.get('/status', async (req, res) => {
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

export default router;
