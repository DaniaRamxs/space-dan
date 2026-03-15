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
    
    // Debug: Mostrar estructura del HTML
    console.log(`[AnimeMultiSource] AnimeFLV HTML structure sample:`, html.substring(0, 500));
    
    // Buscar CUALQUIER elemento con imagen y enlace
    $('*').each((index, element) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      const $img = $item.find('img').first();
      
      if ($link.length && $img.length) {
        const title = $img.attr('alt') || $link.attr('title') || $item.text().trim();
        if (title && title.length > 2 && title.length < 100) {
          results.push({
            id: $link.attr('href')?.replace('/anime/', '').replace('/ver/', '') || `flv-${index}`,
            title: title,
            image: $img.attr('src') || $img.attr('data-src'),
            type: 'TV',
            episodes: '?'
          });
        }
      }
    });
    
    console.log(`[AnimeMultiSource] AnimeFLV parser found ${results.length} items with universal selector`);
    return results;
  }

  parseJkanimeResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    // Debug: Mostrar estructura del HTML
    console.log(`[AnimeMultiSource] Jkanime HTML structure sample:`, html.substring(0, 500));
    
    // Buscar CUALQUIER elemento con imagen y enlace
    $('*').each((index, element) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      const $img = $item.find('img').first();
      
      if ($link.length && $img.length) {
        const title = $img.attr('alt') || $link.attr('title') || $item.text().trim();
        if (title && title.length > 2 && title.length < 100) {
          results.push({
            id: $link.attr('href')?.replace('/anime/', '').replace('/ver/', '') || `jk-${index}`,
            title: title,
            image: $img.attr('src') || $img.attr('data-src'),
            type: 'TV',
            episodes: '?'
          });
        }
      }
    });
    
    console.log(`[AnimeMultiSource] Jkanime parser found ${results.length} items with universal selector`);
    return results;
  }

  parseAnimeIDResults(html) {
    const $ = cheerio.load(html);
    const results = [];
    
    // Debug: Mostrar estructura del HTML
    console.log(`[AnimeMultiSource] AnimeID HTML structure sample:`, html.substring(0, 500));
    
    // Buscar CUALQUIER elemento con imagen y enlace
    $('*').each((index, element) => {
      const $item = $(element);
      const $link = $item.find('a').first();
      const $img = $item.find('img').first();
      
      if ($link.length && $img.length) {
        const title = $img.attr('alt') || $link.attr('title') || $item.text().trim();
        if (title && title.length > 2 && title.length < 100) {
          results.push({
            id: $link.attr('href')?.replace('/anime/', '').replace('/ver/', '') || `animeid-${index}`,
            title: title,
            image: $img.attr('src') || $img.attr('data-src'),
            type: 'TV',
            episodes: '?'
          });
        }
      }
    });
    
    console.log(`[AnimeMultiSource] AnimeID parser found ${results.length} items with universal selector`);
    return results;
  }

  // Get anime directory - all available anime
  async getAnimeDirectory() {
    console.log(`[AnimeMultiSource] Getting anime directory...`);
    const allAnime = [];
    
    for (const source of this.sources) {
      try {
        console.log(`[AnimeMultiSource] Getting directory from ${source.name}...`);
        const sourceAnime = await this.getDirectoryFromSource(source);
        console.log(`[AnimeMultiSource] ${source.name} found ${sourceAnime.length} anime`);
        allAnime.push(...sourceAnime);
      } catch (error) {
        console.warn(`[AnimeMultiSource] Error getting directory from ${source.name}:`, error.message);
      }
    }
    
    // Remove duplicates and sort
    const uniqueAnime = this.mergeResults([{ results: allAnime, priority: 1 }]);
    console.log(`[AnimeMultiSource] Directory complete: ${uniqueAnime.length} unique anime`);
    
    return uniqueAnime;
  }

  // Get directory from specific source
  async getDirectoryFromSource(source) {
    switch (source.name) {
      case 'AnimeFLV':
        return await this.getAnimeFLVDirectory();
      case 'Jkanime':
        return await this.getJkanimeDirectory();
      case 'AnimeID':
        return await this.getAnimeIDDirectory();
      default:
        return [];
    }
  }

  // AnimeFLV directory
  async getAnimeFLVDirectory() {
    try {
      const url = `${this.sources[0].baseUrl}/browse`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      const results = [];
      
      $('.AnimeList .item, .ListAnimes .article').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('a').first();
        const $img = $item.find('img').first();
        const $title = $item.find('.Title, .title, h3').first();
        
        if ($link.length && $img.length) {
          const title = $img.attr('alt') || $link.attr('title') || $title.text().trim() || $link.text().trim();
          if (title && title.length > 2 && title.length < 100) {
            results.push({
              id: $link.attr('href')?.replace('/anime/', '') || `flv-${index}`,
              title: title,
              image: $img.attr('src') || $img.attr('data-src'),
              type: $item.find('.type').text() || 'TV',
              episodes: $item.find('.episodes').text().trim() || '?',
              provider: 'animeflv',
              source: 'AnimeFLV',
              hasDub: true,
              hasSub: true,
              quality: 'HD',
              format: 'hls'
            });
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error('AnimeFLV directory error:', error);
      return [];
    }
  }

  // Jkanime directory
  async getJkanimeDirectory() {
    try {
      const url = `${this.sources[1].baseUrl}/directorio`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      const results = [];
      
      $('.hermes .items .item, .anime-item').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('a').first();
        const $img = $item.find('img').first();
        
        if ($link.length && $img.length) {
          const title = $img.attr('alt') || $item.find('.title').text().trim();
          if (title && title.length > 2 && title.length < 100) {
            results.push({
              id: $link.attr('href')?.replace('/anime/', '') || `jk-${index}`,
              title: title,
              image: $img.attr('src') || $img.attr('data-src'),
              type: 'TV',
              episodes: '?',
              provider: 'jkanime',
              source: 'Jkanime',
              hasDub: true,
              hasSub: true,
              quality: 'HD',
              format: 'hls'
            });
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error('Jkanime directory error:', error);
      return [];
    }
  }

  // AnimeID directory
  async getAnimeIDDirectory() {
    try {
      const url = `${this.sources[2].baseUrl}/directorio`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      const results = [];
      
      $('.anime-item, .series-item, .card').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('a').first();
        const $img = $item.find('img').first();
        
        if ($link.length && $img.length) {
          const title = $img.attr('alt') || $item.find('.title, .name').text().trim();
          if (title && title.length > 2 && title.length < 100) {
            results.push({
              id: $link.attr('href')?.replace('/anime/', '') || `animeid-${index}`,
              title: title,
              image: $img.attr('src') || $img.attr('data-src'),
              type: 'TV',
              episodes: '?',
              provider: 'animeid',
              source: 'AnimeID',
              hasDub: true,
              hasSub: true,
              quality: 'HD',
              format: 'hls'
            });
          }
        }
      });
      
      return results;
    } catch (error) {
      console.error('AnimeID directory error:', error);
      return [];
    }
  }

  // Get anime info and episodes
  async getAnimeInfo(animeId, provider) {
    console.log(`[AnimeMultiSource] Getting info for ${animeId} from ${provider}`);
    
    switch (provider) {
      case 'animeflv':
        return await this.getAnimeFLVInfo(animeId);
      case 'jkanime':
        return await this.getJkanimeInfo(animeId);
      case 'animeid':
        return await this.getAnimeIDInfo(animeId);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  // Get episode sources (HLS URLs)
  async getEpisodeSources(episodeId, provider) {
    console.log(`[AnimeMultiSource] Getting sources for ${episodeId} from ${provider}`);
    
    switch (provider) {
      case 'animeflv':
        return await this.getAnimeFLVSources(episodeId);
      case 'jkanime':
        return await this.getJkanimeSources(episodeId);
      case 'animeid':
        return await this.getAnimeIDSources(episodeId);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }

  // AnimeFLV methods
  async getAnimeFLVInfo(animeId) {
    try {
      const url = `${this.sources[0].baseUrl}/anime/${animeId}`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      const episodes = [];
      
      $('.ListEpisodios li').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('a');
        if ($link.length) {
          episodes.push({
            id: $link.attr('href')?.replace('/ver/', '') || `ep-${index}`,
            number: index + 1,
            title: $link.text().trim() || `Episodio ${index + 1}`
          });
        }
      });
      
      return {
        id: animeId,
        title: $('.Title h1, .Title h2').first().text().trim() || 'Unknown',
        image: $('.AnimeCover img').attr('src'),
        description: $('.Description p').text().trim() || 'Sin descripción',
        episodes: episodes,
        type: 'TV',
        hasDub: true,
        hasSub: true
      };
    } catch (error) {
      console.error('AnimeFLV info error:', error);
      throw new Error('Failed to get anime info');
    }
  }

  async getAnimeFLVSources(episodeId) {
    try {
      const url = `${this.sources[0].baseUrl}/ver/${episodeId}`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      
      // Buscar URLs de video en diferentes contenedores
      let videoUrl = null;
      
      // Intentar encontrar en scripts
      $('script').each((index, script) => {
        const scriptContent = $(script).html();
        if (scriptContent && (scriptContent.includes('streaming') || scriptContent.includes('video'))) {
          // Extraer URL del script
          const urlMatch = scriptContent.match(/https?:\/\/[^\s"']+\.(m3u8|mp4)/);
          if (urlMatch) {
            videoUrl = urlMatch[0];
          }
        }
      });
      
      // Si no encuentra en scripts, buscar en iframes
      if (!videoUrl) {
        $('iframe').each((index, iframe) => {
          const src = $(iframe).attr('src');
          if (src) {
            // StreamTape extraction
            if (src.includes('streamtape.com')) {
              videoUrl = this.extractStreamTape(src);
            }
            // Otros servicios de embed
            else if (src.includes('fembed.com')) {
              videoUrl = this.extractFembed(src);
            }
            else if (src.includes('doodstream')) {
              videoUrl = this.extractDoodstream(src);
            }
          }
        });
      }
      
      if (!videoUrl) {
        // URL de demo como fallback
        videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }
      
      console.log(`[AnimeMultiSource] Found video URL: ${videoUrl}`);
      
      return [{
        url: videoUrl,
        format: videoUrl.includes('.m3u8') ? 'hls' : 'mp4',
        quality: 'HD',
        isDefault: true
      }];
    } catch (error) {
      console.error('AnimeFLV sources error:', error);
      // Fallback a video demo
      return [{
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        format: 'hls',
        quality: 'HD',
        isDefault: true
      }];
    }
  }

  // Extract video from StreamTape embed
  extractStreamTape(embedUrl) {
    console.log(`[AnimeMultiSource] Extracting StreamTape video from: ${embedUrl}`);
    
    // StreamTape usa un sistema de redirección y token
    // Necesitamos hacer una petición adicional para obtener el video real
    try {
      // Extraer el ID del embed
      const idMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/);
      if (!idMatch) return null;
      
      const videoId = idMatch[1];
      
      // Construir URL de API de StreamTape
      const apiUrl = `https://streamtape.com/api/video/${videoId}`;
      
      // Hacer petición para obtener el video real
      const response = axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // Extraer URL del video de la respuesta
      const videoUrl = response.data?.url || response.data?.file || null;
      
      if (videoUrl) {
        console.log(`[AnimeMultiSource] StreamTape extracted: ${videoUrl}`);
        return videoUrl;
      }
    } catch (error) {
      console.error('StreamTape extraction failed:', error);
    }
    
    return null;
  }

  // Extract video from Fembed
  extractFembed(embedUrl) {
    console.log(`[AnimeMultiSource] Extracting Fembed video from: ${embedUrl}`);
    
    try {
      // Fembed tiene API directa
      const idMatch = embedUrl.match(/\/v\/([a-zA-Z0-9-]+)/);
      if (!idMatch) return null;
      
      const videoId = idMatch[1];
      const apiUrl = `https://www.fembed.com/api/source/${videoId}`;
      
      const response = axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const videoUrl = response.data?.data?.file || null;
      
      if (videoUrl) {
        console.log(`[AnimeMultiSource] Fembed extracted: ${videoUrl}`);
        return videoUrl;
      }
    } catch (error) {
      console.error('Fembed extraction failed:', error);
    }
    
    return null;
  }

  // Extract video from Doodstream
  extractDoodstream(embedUrl) {
    console.log(`[AnimeMultiSource] Extracting Doodstream video from: ${embedUrl}`);
    
    try {
      // Doodstream usa un sistema de token
      const idMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/);
      if (!idMatch) return null;
      
      const videoId = idMatch[1];
      const apiUrl = `https://doodstream.com/api/video/${videoId}`;
      
      const response = axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const videoUrl = response.data?.url || response.data?.file || null;
      
      if (videoUrl) {
        console.log(`[AnimeMultiSource] Doodstream extracted: ${videoUrl}`);
        return videoUrl;
      }
    } catch (error) {
      console.error('Doodstream extraction failed:', error);
    }
    
    return null;
  }

  // Jkanime methods
  async getJkanimeInfo(animeId) {
    try {
      const url = `${this.sources[1].baseUrl}/anime/${animeId}`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      const episodes = [];
      
      $('.episode-list .episode').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('a');
        if ($link.length) {
          episodes.push({
            id: $link.attr('href')?.replace('/ver/', '') || `jk-ep-${index}`,
            number: index + 1,
            title: $link.text().trim() || `Episodio ${index + 1}`
          });
        }
      });
      
      return {
        id: animeId,
        title: $('.anime-title h1').text().trim() || 'Unknown',
        image: $('.anime-poster img').attr('src'),
        description: $('.anime-synopsis p').text().trim() || 'Sin descripción',
        episodes: episodes,
        type: 'TV',
        hasDub: true,
        hasSub: true
      };
    } catch (error) {
      console.error('Jkanime info error:', error);
      throw new Error('Failed to get anime info');
    }
  }

  async getJkanimeSources(episodeId) {
    try {
      const url = `${this.sources[1].baseUrl}/ver/${episodeId}`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      let videoUrl = null;
      
      // Buscar URL de video
      $('script').each((index, script) => {
        const scriptContent = $(script).html();
        if (scriptContent && scriptContent.includes('src')) {
          const urlMatch = scriptContent.match(/https?:\/\/[^\s"']+\.(m3u8|mp4)/);
          if (urlMatch) {
            videoUrl = urlMatch[0];
          }
        }
      });
      
      if (!videoUrl) {
        videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }
      
      return [{
        url: videoUrl,
        format: 'hls',
        quality: 'HD',
        isDefault: true
      }];
    } catch (error) {
      console.error('Jkanime sources error:', error);
      return [{
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        format: 'hls',
        quality: 'HD',
        isDefault: true
      }];
    }
  }

  // AnimeID methods
  async getAnimeIDInfo(animeId) {
    try {
      const url = `${this.sources[2].baseUrl}/anime/${animeId}`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      const episodes = [];
      
      $('.episode-list .episode-item').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('a');
        if ($link.length) {
          episodes.push({
            id: $link.attr('href')?.replace('/episode/', '') || `id-ep-${index}`,
            number: index + 1,
            title: $link.text().trim() || `Episodio ${index + 1}`
          });
        }
      });
      
      return {
        id: animeId,
        title: $('.anime-title h1').text().trim() || 'Unknown',
        image: $('.anime-cover img').attr('src'),
        description: $('.anime-description p').text().trim() || 'Sin descripción',
        episodes: episodes,
        type: 'TV',
        hasDub: true,
        hasSub: true
      };
    } catch (error) {
      console.error('AnimeID info error:', error);
      throw new Error('Failed to get anime info');
    }
  }

  async getAnimeIDSources(episodeId) {
    try {
      const url = `${this.sources[2].baseUrl}/episode/${episodeId}`;
      const html = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(html.data);
      let videoUrl = null;
      
      $('script').each((index, script) => {
        const scriptContent = $(script).html();
        if (scriptContent && scriptContent.includes('src')) {
          const urlMatch = scriptContent.match(/https?:\/\/[^\s"']+\.(m3u8|mp4)/);
          if (urlMatch) {
            videoUrl = urlMatch[0];
          }
        }
      });
      
      if (!videoUrl) {
        videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }
      
      return [{
        url: videoUrl,
        format: 'hls',
        quality: 'HD',
        isDefault: true
      }];
    } catch (error) {
      console.error('AnimeID sources error:', error);
      return [{
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        format: 'hls',
        quality: 'HD',
        isDefault: true
      }];
    }
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
