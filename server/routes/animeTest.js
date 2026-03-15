// Test endpoint para debuggear fuentes individuales
import express from 'express';
import axios from 'axios';
import AnimeMultiSource from '../services/animeMultiSource.js';

const router = express.Router();

// Test individual sources
router.get('/test-sources', async (req, res) => {
  const results = [];
  
  // Test AnimeFLV
  try {
    console.log('Testing AnimeFLV...');
    const response = await axios.get('https://www3.animeflv.net/api/search?q=naruto', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    results.push({
      source: 'AnimeFLV',
      status: 'success',
      data: response.data,
      url: 'https://www3.animeflv.net/api/search?q=naruto'
    });
  } catch (error) {
    results.push({
      source: 'AnimeFLV',
      status: 'error',
      error: error.message,
      url: 'https://www3.animeflv.net/api/search?q=naruto'
    });
  }
  
  // Test Jkanime
  try {
    console.log('Testing Jkanime...');
    const response = await axios.get('https://jkanime.net/buscar?q=naruto', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    results.push({
      source: 'Jkanime',
      status: 'success',
      htmlLength: response.data.length,
      url: 'https://jkanime.net/buscar?q=naruto'
    });
  } catch (error) {
    results.push({
      source: 'Jkanime',
      status: 'error',
      error: error.message,
      url: 'https://jkanime.net/buscar?q=naruto'
    });
  }
  
  // Test TioAnime
  try {
    console.log('Testing TioAnime...');
    const response = await axios.get('https://tioanime.com/buscar?q=naruto', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    results.push({
      source: 'TioAnime',
      status: 'success',
      htmlLength: response.data.length,
      url: 'https://tioanime.com/buscar?q=naruto'
    });
  } catch (error) {
    results.push({
      source: 'TioAnime',
      status: 'error',
      error: error.message,
      url: 'https://tioanime.com/buscar?q=naruto'
    });
  }
  
  res.json({
    success: true,
    data: results
  });
});

export default router;
