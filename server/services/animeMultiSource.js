import axios from 'axios';
import * as cheerio from 'cheerio';

class AnimeMultiSource {
  constructor() {
    this.sources = [
      {
        name: 'AnimeFLV',
        baseUrl: 'https://www3.animeflv.net',
        priority: 1,
        features: ['doblado español', 'subtitulado español', 'HD', 'videos funcionales']
      },
      {
        name: 'Jkanime',
        baseUrl: 'https://jkanime.net',
        priority: 2,
        features: ['doblado español', 'HD', 'videos funcionales']
      },
      {
        name: 'AnimeID',
        baseUrl: 'https://www.animeid.tv',
        priority: 3,
        features: ['doblado español', 'subtitulado español', 'videos funcionales']
      }
    ];
  }

  // Buscar en todas las fuentes
  async searchAll(query) {
    console.log(`[AnimeMultiSource] Starting search for: "${query}"`);
    const results = [];
    
    for (const source of this.sources) {
      try {
        console.log(`[AnimeMultiSource] Searching in ${source.name}...`);
        const sourceResults = await this.searchInSource(source, query);
        console.log(`[AnimeMultiSource] ${source.name} found ${sourceResults.length} results`);
        results.push({
          source: source.name,
          results: sourceResults,
          priority: source.priority
        });
      } catch (error) {
        console.warn(`[AnimeMultiSource] Error searching in ${source.name}:`, error.message);
      }
    }
    
    const mergedResults = this.mergeResults(results);
    console.log(`[AnimeMultiSource] Final merged results: ${mergedResults.length} items`);
    return mergedResults;
  }

  async searchInSource(source, query) {
    switch (source.name) {
      case 'AnimeFLV':
        return await this.searchAnimeFLV(query);
      case 'Jkanime':
        return await this.searchJkanime(query);
      case 'AnimeID':
        return await this.searchAnimeID(query);
      default:
        return [];
    }
  }

  // AnimeFLV - Doblaje español + videos funcionales
  async searchAnimeFLV(query) {
    console.log(`[AnimeMultiSource] AnimeFLV: Starting search for "${query}"`);
    try {
      const url = `${this.sources[0].baseUrl}/browse?search=${encodeURIComponent(query)}`;
      console.log(`[AnimeMultiSource] AnimeFLV: Fetching ${url}`);
      
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`[AnimeMultiSource] AnimeFLV: Got HTML, length: ${html.data.length}`);
      const results = this.parseAnimeFLVResults(html.data);
      console.log(`[AnimeMultiSource] AnimeFLV: Parsed ${results.length} results`);
      
      return results.map(anime => ({
        ...anime,
        provider: 'animeflv',
        source: 'AnimeFLV',
        hasDub: true,
        hasSub: true,
        quality: 'HD',
        format: 'hls'
      }));
    } catch (error) {
      console.error(`[AnimeMultiSource] AnimeFLV search failed:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      throw new Error(`AnimeFLV search failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Jkanime - Doblaje español + videos funcionales
  async searchJkanime(query) {
    console.log(`[AnimeMultiSource] Jkanime: Starting search for "${query}"`);
    try {
      const url = `${this.sources[1].baseUrl}/buscar?q=${encodeURIComponent(query)}`;
      console.log(`[AnimeMultiSource] Jkanime: Fetching ${url}`);
      
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`[AnimeMultiSource] Jkanime: Got HTML, length: ${html.data.length}`);
      const results = this.parseJkanimeResults(html.data);
      console.log(`[AnimeMultiSource] Jkanime: Parsed ${results.length} results`);
      
      return results.map(anime => ({
        ...anime,
        provider: 'jkanime',
        source: 'Jkanime',
        hasDub: true,
        hasSub: true,
        quality: 'HD',
        format: 'hls'
      }));
    } catch (error) {
      console.error(`[AnimeMultiSource] Jkanime search failed:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      throw new Error(`Jkanime search failed: ${error.message || 'Unknown error'}`);
    }
  }

  // AnimeID - Doblaje español + videos funcionales
  async searchAnimeID(query) {
    console.log(`[AnimeMultiSource] AnimeID: Starting search for "${query}"`);
    try {
      const url = `${this.sources[2].baseUrl}/buscar?q=${encodeURIComponent(query)}`;
      console.log(`[AnimeMultiSource] AnimeID: Fetching ${url}`);
      
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`[AnimeMultiSource] AnimeID: Got HTML, length: ${html.data.length}`);
      const results = this.parseAnimeIDResults(html.data);
      console.log(`[AnimeMultiSource] AnimeID: Parsed ${results.length} results`);
      
      return results.map(anime => ({
        ...anime,
        provider: 'animeid',
        source: 'AnimeID',
        hasDub: true,
        hasSub: true,
        quality: 'HD',
        format: 'hls'
      }));
    } catch (error) {
      console.error(`[AnimeMultiSource] AnimeID search failed:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      throw new Error(`AnimeID search failed: ${error.message || 'Unknown error'}`);
    }
  }

  // Parser methods
  parseAnimeFLVResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.AnimeList .item, .ListAnimes .article, .anime-item').each((index, element) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      const $img = $item.find('img');
      
      if ($link.length && $img.length) {
        results.push({
          id: $link.attr('href')?.replace('/anime/', '') || `flv-${index}`,
          title: $img.attr('alt') || $link.attr('title') || $item.find('.Title, .title').text().trim() || `Anime ${index + 1}`,
          image: $img.attr('src'),
          type: $item.find('.type').text() || 'TV',
          episodes: $item.find('.episodes').text().trim() || '?'
        });
      }
    });
    
    return results;
  }

  parseJkanimeResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.hermes .items .item, .anime-item, .search-item').each((index, element) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      const $img = $item.find('img');
      
      if ($link.length && $img.length) {
        results.push({
          id: $link.attr('href')?.replace('/anime/', '') || `jk-${index}`,
          title: $img.attr('alt') || $item.find('.title').text().trim() || `Anime ${index + 1}`,
          image: $img.attr('src'),
          type: 'TV',
          episodes: $item.find('.type, .episodes').text().trim() || '?'
        });
      }
    });
    
    return results;
  }

  parseAnimeIDResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.anime-item, .series-item, .item, .card').each((index, element) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      const $img = $item.find('img');
      
      if ($link.length && $img.length) {
        results.push({
          id: $link.attr('href')?.replace('/anime/', '') || `animeid-${index}`,
          title: $img.attr('alt') || $link.text().trim() || $item.find('.title, .name').text().trim() || `Anime ${index + 1}`,
          image: $img.attr('src'),
          type: 'TV',
          episodes: $item.find('.episodes, .eps').text().trim() || '?'
        });
      }
    });
    
    return results;
  }

  // Merge results from multiple sources
  mergeResults(sourceResults) {
    const allResults = [];
    const seenTitles = new Set();
    
    // Sort by priority (lower number = higher priority)
    sourceResults.sort((a, b) => a.priority - b.priority);
    
    for (const sourceResult of sourceResults) {
      for (const anime of sourceResult.results) {
        const titleKey = anime.title.toLowerCase().trim();
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          allResults.push(anime);
        }
      }
    }
    
    return allResults;
  }
}

export default AnimeMultiSource;
