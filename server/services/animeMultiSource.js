const axios = require('axios');
const cheerio = require('cheerio');

class AnimeMultiSource {
  constructor() {
    this.sources = [
      {
        name: 'AnimeFLV',
        baseUrl: 'https://www3.animeflv.net',
        priority: 1,
        features: ['doblado', 'subtitulado', 'HD']
      },
      {
        name: 'Jkanime',
        baseUrl: 'https://jkanime.net',
        priority: 2,
        features: ['doblado', 'HD']
      },
      {
        name: 'TioAnime',
        baseUrl: 'https://tioanime.com',
        priority: 3,
        features: ['doblado', 'subtitulado']
      }
    ];
  }

  // Buscar en todas las fuentes
  async searchAll(query) {
    const results = [];
    
    for (const source of this.sources) {
      try {
        const sourceResults = await this.searchInSource(source, query);
        results.push({
          source: source.name,
          results: sourceResults,
          priority: source.priority
        });
      } catch (error) {
        console.warn(`Error searching in ${source.name}:`, error.message);
      }
    }
    
    return this.mergeResults(results);
  }

  async searchInSource(source, query) {
    switch (source.name) {
      case 'AnimeFLV':
        return await this.searchAnimeFLV(query);
      case 'Jkanime':
        return await this.searchJkanime(query);
      case 'TioAnime':
        return await this.searchTioAnime(query);
      default:
        return [];
    }
  }

  // AnimeFLV - API directa
  async searchAnimeFLV(query) {
    try {
      const response = await axios.get(`${this.sources[0].baseUrl}/api/search?q=${encodeURIComponent(query)}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      return response.data.map(anime => ({
        ...anime,
        provider: 'animeflv',
        source: 'AnimeFLV',
        hasDub: true,
        hasSub: true,
        quality: 'HD',
        format: 'hls' // Importante: formato HLS para reproductor nativo
      }));
    } catch (error) {
      throw new Error(`AnimeFLV search failed: ${error.message}`);
    }
  }

  // Jkanime - Scraping
  async searchJkanime(query) {
    try {
      const html = await axios.get(`${this.sources[1].baseUrl}/buscar?q=${encodeURIComponent(query)}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const results = this.parseJkanimeResults(html.data);
      return results.map(anime => ({
        ...anime,
        provider: 'jkanime',
        source: 'Jkanime',
        hasDub: true,
        quality: 'HD',
        format: 'hls'
      }));
    } catch (error) {
      throw new Error(`Jkanime search failed: ${error.message}`);
    }
  }

  // TioAnime - Scraping
  async searchTioAnime(query) {
    try {
      const html = await axios.get(`${this.sources[2].baseUrl}/buscar?q=${encodeURIComponent(query)}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const results = this.parseTioAnimeResults(html.data);
      return results.map(anime => ({
        ...anime,
        provider: 'tioanime',
        source: 'TioAnime',
        hasDub: true,
        quality: 'HD',
        format: 'hls'
      }));
    } catch (error) {
      throw new Error(`TioAnime search failed: ${error.message}`);
    }
  }

  parseJkanimeResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.hermes .items .item').each((index, element) => {
      const $item = $(element);
      results.push({
        id: $item.find('a').attr('href')?.replace('/anime/', '') || `jk-${index}`,
        title: $item.find('.title').text().trim(),
        image: $item.find('img').attr('src'),
        type: $item.find('.type').text(),
        episodes: $item.find('.episodes').text()
      });
    });
    
    return results;
  }

  parseTioAnimeResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.hermes .items .item').each((index, element) => {
      const $item = $(element);
      results.push({
        id: $item.find('a').attr('href')?.replace('/anime/', '') || `ta-${index}`,
        title: $item.find('.title').text().trim(),
        image: $item.find('img').attr('src'),
        type: $item.find('.type').text(),
        episodes: $item.find('.episodes').text()
      });
    });
    
    return results;
  }

  mergeResults(sourceResults) {
    const allResults = [];
    const seenTitles = new Set();
    
    sourceResults.sort((a, b) => a.priority - b.priority);
    
    for (const sourceResult of sourceResults) {
      for (const anime of sourceResult.results) {
        const titleKey = anime.title.toLowerCase();
        
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          allResults.push({
            ...anime,
            sources: [anime.source],
            allSources: sourceResults.map(sr => sr.source)
          });
        } else {
          const existing = allResults.find(a => a.title.toLowerCase() === titleKey);
          if (existing && !existing.sources.includes(anime.source)) {
            existing.sources.push(anime.source);
          }
        }
      }
    }
    
    return allResults;
  }

  async getAnimeInfo(animeId, provider) {
    switch (provider) {
      case 'animeflv':
        return await this.getAnimeFLVInfo(animeId);
      case 'jkanime':
        return await this.getJkanimeInfo(animeId);
      case 'tioanime':
        return await this.getTioAnimeInfo(animeId);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  async getAnimeFLVInfo(animeId) {
    try {
      const response = await axios.get(`${this.sources[0].baseUrl}/api/anime/info/${animeId}`, {
        timeout: 5000
      });
      
      const info = response.data;
      return {
        ...info,
        provider: 'animeflv',
        episodes: info.episodes?.map(ep => ({
          ...ep,
          provider: 'animeflv',
          format: 'hls'
        })) || []
      };
    } catch (error) {
      throw new Error(`AnimeFLV info failed: ${error.message}`);
    }
  }

  async getJkanimeInfo(animeId) {
    try {
      const html = await axios.get(`${this.sources[1].baseUrl}/anime/${animeId}`, {
        timeout: 5000
      });
      
      const episodes = this.parseJkanimeEpisodes(html.data);
      return {
        title: this.extractTitle(html.data),
        image: this.extractImage(html.data),
        description: this.extractDescription(html.data),
        provider: 'jkanime',
        episodes: episodes.map(ep => ({
          ...ep,
          provider: 'jkanime',
          format: 'hls'
        }))
      };
    } catch (error) {
      throw new Error(`Jkanime info failed: ${error.message}`);
    }
  }

  async getTioAnimeInfo(animeId) {
    try {
      const html = await axios.get(`${this.sources[2].baseUrl}/anime/${animeId}`, {
        timeout: 5000
      });
      
      const episodes = this.parseTioAnimeEpisodes(html.data);
      return {
        title: this.extractTitle(html.data),
        image: this.extractImage(html.data),
        description: this.extractDescription(html.data),
        provider: 'tioanime',
        episodes: episodes.map(ep => ({
          ...ep,
          provider: 'tioanime',
          format: 'hls'
        }))
      };
    } catch (error) {
      throw new Error(`TioAnime info failed: ${error.message}`);
    }
  }

  parseJkanimeEpisodes(html) {
    const $ = cheerio.load(html);
    const episodes = [];
    
    $('.hermes .episodes .item').each((index, element) => {
      const $item = $(element);
      episodes.push({
        id: $item.find('a').attr('href')?.replace('/ver/', '') || `jk-ep-${index}`,
        number: index + 1,
        title: $item.find('.title').text().trim(),
        image: $item.find('img').attr('src')
      });
    });
    
    return episodes;
  }

  parseTioAnimeEpisodes(html) {
    const $ = cheerio.load(html);
    const episodes = [];
    
    $('.hermes .episodes .item').each((index, element) => {
      const $item = $(element);
      episodes.push({
        id: $item.find('a').attr('href')?.replace('/ver/', '') || `ta-ep-${index}`,
        number: index + 1,
        title: $item.find('.title').text().trim(),
        image: $item.find('img').attr('src')
      });
    });
    
    return episodes;
  }

  extractTitle(html) {
    const $ = cheerio.load(html);
    return $('.hermes .title h1').text().trim() || '';
  }

  extractImage(html) {
    const $ = cheerio.load(html);
    return $('.hermes .image img').attr('src') || '';
  }

  extractDescription(html) {
    const $ = cheerio.load(html);
    return $('.hermes .description').text().trim() || '';
  }

  async getEpisodeSources(episodeId, provider) {
    const sources = [];
    
    try {
      const primarySources = await this.getSourcesFromProvider(episodeId, provider);
      sources.push(...primarySources.map(s => ({ 
        ...s, 
        provider, 
        isPrimary: true,
        format: 'hls' // Asegurar formato HLS para reproductor nativo
      })));
    } catch (error) {
      console.warn(`Primary source ${provider} failed:`, error.message);
    }
    
    return this.rankSources(sources);
  }

  async getSourcesFromProvider(episodeId, provider) {
    switch (provider) {
      case 'animeflv':
        return await this.getAnimeFLVSources(episodeId);
      case 'jkanime':
        return await this.getJkanimeSources(episodeId);
      case 'tioanime':
        return await this.getTioAnimeSources(episodeId);
      default:
        return [];
    }
  }

  async getAnimeFLVSources(episodeId) {
    try {
      const response = await axios.get(`${this.sources[0].baseUrl}/api/episode/links/${episodeId}`, {
        timeout: 5000
      });
      
      return response.data.map(source => ({
        url: source.url,
        quality: source.quality || 'HD',
        format: 'hls', // Forzar HLS
        server: source.server || 'default'
      }));
    } catch (error) {
      throw new Error(`AnimeFLV sources failed: ${error.message}`);
    }
  }

  async getJkanimeSources(episodeId) {
    try {
      const html = await axios.get(`${this.sources[1].baseUrl}/ver/${episodeId}`, {
        timeout: 5000
      });
      
      const sources = this.parseJkanimeSources(html.data);
      return sources.map(source => ({
        ...source,
        format: 'hls' // Forzar HLS
      }));
    } catch (error) {
      throw new Error(`Jkanime sources failed: ${error.message}`);
    }
  }

  async getTioAnimeSources(episodeId) {
    try {
      const html = await axios.get(`${this.sources[2].baseUrl}/ver/${episodeId}`, {
        timeout: 5000
      });
      
      const sources = this.parseTioAnimeSources(html.data);
      return sources.map(source => ({
        ...source,
        format: 'hls' // Forzar HLS
      }));
    } catch (error) {
      throw new Error(`TioAnime sources failed: ${error.message}`);
    }
  }

  parseJkanimeSources(html) {
    const $ = cheerio.load(html);
    const sources = [];
    
    $('.hermes .player .sources .source').each((index, element) => {
      const $source = $(element);
      const url = $source.data('url') || $source.attr('data-url');
      if (url) {
        sources.push({
          url: url,
          quality: $source.find('.quality').text() || 'HD',
          server: $source.find('.server').text() || 'server1'
        });
      }
    });
    
    return sources;
  }

  parseTioAnimeSources(html) {
    const $ = cheerio.load(html);
    const sources = [];
    
    $('.hermes .player .sources .source').each((index, element) => {
      const $source = $(element);
      const url = $source.data('url') || $source.attr('data-url');
      if (url) {
        sources.push({
          url: url,
          quality: $source.find('.quality').text() || 'HD',
          server: $source.find('.server').text() || 'server1'
        });
      }
    });
    
    return sources;
  }

  rankSources(sources) {
    return sources.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      
      if (a.quality === 'HD' && b.quality !== 'HD') return -1;
      if (a.quality !== 'HD' && b.quality === 'HD') return 1;
      
      return 0;
    });
  }
}

module.exports = AnimeMultiSource;
