/**
 * animeMultiSource.js
 *
 * Multi-provider scraper for Latin American anime sites (Spanish sub/dub).
 * Providers:
 *  1. AnimeFLV  — https://www3.animeflv.net  (SUB español + LAT doblaje)
 *  2. TioAnime  — https://tioanime.com        (SUB español)
 *  3. Jkanime   — https://jkanime.net          (SUB/DUB español)
 *  4. Latanime  — https://latanime.org         (SUB/DUB castellano, uses Doodstream/Filemoon)
 *
 * Source extraction:
 *  AnimeFLV stores video server data in a `var videos = [...]` JS variable.
 *  Each entry is [type, serverName, embedUrl]. We use animeExtractor to resolve
 *  those embed URLs to direct HLS/MP4 streams for the native player.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractEmbedUrl } from '../modules/anime/animeExtractor.mjs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const DEMO_SOURCE = {
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  format: 'mp4',
  quality: 'Demo',
  server: 'demo',
  isDub: false,
  isDefault: true,
};

const get = (url, extraHeaders = {}) =>
  axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': UA, ...extraHeaders },
  });

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extract and parse the `var videos = ...` JS variable from a page's HTML */
function parseVideosVar(html) {
  // Match array or object form, across newlines
  const m = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*;/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (_) {
    return null;
  }
}

/** Normalise the videos var to [{type, server, url}] regardless of format */
function normalizeVideosVar(data) {
  if (!data) return [];
  const entries = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      if (Array.isArray(item) && item.length >= 3) {
        entries.push({ type: String(item[0]).toUpperCase(), server: item[1], url: item[2] });
      } else if (Array.isArray(item) && item.length === 2) {
        // TioAnime: [serverName, url]
        entries.push({ type: 'SUB', server: item[0], url: item[1] });
      }
    }
  } else if (typeof data === 'object') {
    for (const [type, list] of Object.entries(data)) {
      for (const item of list || []) {
        entries.push({
          type: type.toUpperCase(),
          server: item.server || item.s || '',
          url: item.url || item.code || item.u || '',
        });
      }
    }
  }
  return entries;
}

/** Resolve an array of {type, server, url} entries to direct HLS/MP4 sources */
async function resolveEntries(entries, referer) {
  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      const directUrl = await extractEmbedUrl(entry.server, entry.url, referer);
      if (!directUrl) return null;
      return {
        url: directUrl,
        format: directUrl.includes('.m3u8') ? 'hls' : 'mp4',
        sourceType: directUrl.includes('.m3u8') ? 'hls' : 'mp4',
        quality: entry.type === 'LAT' ? 'Latino' : 'Subtitulado',
        server: entry.server || 'auto',
        isDub: entry.type === 'LAT',
        lang: entry.type === 'LAT' ? 'es-LAT' : 'es',
        isDefault: entry.type === 'LAT', // prefer dub if available
      };
    })
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
}

// ═══════════════════════════════════════════════════════════════════════════════
class AnimeMultiSource {
  constructor() {
    this.sources = [
      {
        name: 'AnimeFLV',
        baseUrl: 'https://www3.animeflv.net',
        priority: 1,
        features: ['doblado español', 'subtitulado español', 'HD', 'okru'],
      },
      {
        name: 'Latanime',
        baseUrl: 'https://latanime.org',
        priority: 2,
        features: ['castellano', 'doblado', 'subtitulado', 'doodstream', 'filemoon'],
      },
    ];
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  async searchAll(query) {
    console.log(`[AnimeMultiSource] Search: "${query}"`);
    const tasks = this.sources.map(async (src) => {
      try {
        const results = await this.searchInSource(src, query);
        return { source: src.name, results, priority: src.priority };
      } catch (err) {
        console.warn(`[AnimeMultiSource] ${src.name} search failed:`, err.message);
        return { source: src.name, results: [], priority: src.priority };
      }
    });
    const all = await Promise.allSettled(tasks);
    const groups = all
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
    return this.mergeResults(groups);
  }

  async searchInSource(source, query) {
    switch (source.name) {
      case 'AnimeFLV': return this.searchAnimeFLV(query);
      case 'TioAnime': return this.searchTioAnime(query);
      case 'Jkanime': return this.searchJkanime(query);
      case 'Latanime': return this.searchLatanime(query);
      default: return [];
    }
  }

  // ── AnimeFLV search ─────────────────────────────────────────────────────────
  async searchAnimeFLV(query) {
    const flv = this.sources.find((s) => s.name === 'AnimeFLV');
    const url = `${flv.baseUrl}/browse?search=${encodeURIComponent(query)}`;
    const html = (await get(url)).data;
    return this._parseAnimeFLVList(html).map((a) => ({
      ...a,
      provider: 'animeflv',
      source: 'AnimeFLV',
      hasDub: true,
      hasSub: true,
    }));
  }

  // ── TioAnime search ─────────────────────────────────────────────────────────
  async searchTioAnime(query) {
    const url = `${this.sources[1].baseUrl}/directorio?q=${encodeURIComponent(query)}`;
    const html = (await get(url)).data;
    return this._parseTioAnimeList(html).map((a) => ({
      ...a,
      provider: 'tioanime',
      source: 'TioAnime',
      hasDub: false,
      hasSub: true,
    }));
  }

  // ── Latanime search ──────────────────────────────────────────────────────────
  async searchLatanime(query) {
    const lat = this.sources.find((s) => s.name === 'Latanime');
    const url = `${lat.baseUrl}/buscar?q=${encodeURIComponent(query)}`;
    const html = (await get(url, { Referer: lat.baseUrl + '/' })).data;
    return this._parseLatanimeList(html).map((a) => ({
      ...a,
      provider: 'latanime',
      source: 'Latanime',
      hasDub: true,
      hasSub: true,
    }));
  }

  // ── Jkanime search ──────────────────────────────────────────────────────────
  async searchJkanime(query) {
    const url = `${this.sources[2].baseUrl}/buscar?q=${encodeURIComponent(query)}`;
    const html = (await get(url)).data;
    return this._parseJkanimeList(html).map((a) => ({
      ...a,
      provider: 'jkanime',
      source: 'Jkanime',
      hasDub: true,
      hasSub: true,
    }));
  }

  // ── Directories ─────────────────────────────────────────────────────────────

  /**
   * Fetch pages 1..maxPages in parallel, stop collecting once a page is empty.
   * Returns all items merged from all successful pages.
   */
  async _fetchPaginatedDirectory(pageUrlFn, parseFn, decorateFn, maxPages = 8) {
    const pageNums = Array.from({ length: maxPages }, (_, i) => i + 1);
    const results = await Promise.allSettled(
      pageNums.map(async (page) => {
        try {
          const html = (await get(pageUrlFn(page))).data;
          return parseFn(html);
        } catch {
          return [];
        }
      })
    );

    const all = [];
    for (const r of results) {
      const items = r.status === 'fulfilled' ? r.value : [];
      // Stop as soon as a page returned 0 items (end of catalogue)
      if (items.length === 0) break;
      all.push(...items.map(decorateFn));
    }
    return all;
  }

  async getAnimeDirectory() {
    const tasks = this.sources.map(async (src) => {
      try {
        return await this.getDirectoryFromSource(src);
      } catch (err) {
        console.warn(`[AnimeMultiSource] ${src.name} directory failed:`, err.message);
        return [];
      }
    });
    const groups = await Promise.allSettled(tasks);
    const all = groups
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value);
    return this.mergeResults([{ results: all, priority: 1 }]);
  }

  async getDirectoryFromSource(source) {
    switch (source.name) {
      case 'AnimeFLV': return this.getAnimeFLVDirectory();
      case 'TioAnime': return this.getTioAnimeDirectory();
      case 'Jkanime': return this.getJkanimeDirectory();
      case 'Latanime': return this.getLatanimeDirectory();
      default: return [];
    }
  }

  async getAnimeFLVDirectory() {
    const flv = this.sources.find((s) => s.name === 'AnimeFLV');
    // AnimeFLV paginates with ?page=N, ~24 items per page
    return this._fetchPaginatedDirectory(
      (page) => `${flv.baseUrl}/browse?page=${page}`,
      (html) => this._parseAnimeFLVList(html),
      (a) => ({ ...a, provider: 'animeflv', source: 'AnimeFLV', hasDub: true, hasSub: true }),
      8
    );
  }

  async getTioAnimeDirectory() {
    // TioAnime paginates with ?p=N
    return this._fetchPaginatedDirectory(
      (page) => `${this.sources[1].baseUrl}/directorio?p=${page}`,
      (html) => this._parseTioAnimeList(html),
      (a) => ({ ...a, provider: 'tioanime', source: 'TioAnime', hasDub: false, hasSub: true }),
      6
    );
  }

  async getJkanimeDirectory() {
    // Jkanime paginates with /directorio/N/
    return this._fetchPaginatedDirectory(
      (page) => `${this.sources[2].baseUrl}/directorio/${page}/`,
      (html) => this._parseJkanimeList(html),
      (a) => ({ ...a, provider: 'jkanime', source: 'Jkanime', hasDub: true, hasSub: true }),
      6
    );
  }

  async getLatanimeDirectory() {
    const lat = this.sources.find((s) => s.name === 'Latanime');
    return this._fetchPaginatedDirectory(
      (page) => `${lat.baseUrl}/animes?page=${page}`,
      (html) => this._parseLatanimeList(html),
      (a) => ({ ...a, provider: 'latanime', source: 'Latanime', hasDub: true, hasSub: true }),
      8
    );
  }

  // ── Anime info + episodes ───────────────────────────────────────────────────

  async getAnimeInfo(animeId, provider) {
    console.log(`[AnimeMultiSource] getAnimeInfo: ${animeId} (${provider})`);
    switch (provider) {
      case 'animeflv': return this.getAnimeFLVInfo(animeId);
      case 'tioanime': return this.getTioAnimeInfo(animeId);
      case 'jkanime': return this.getJkanimeInfo(animeId);
      case 'latanime': return this.getLatanimeInfo(animeId);
      default: throw new Error(`Provider "${provider}" not supported`);
    }
  }

  async getAnimeFLVInfo(animeId) {
    const flv = this.sources.find((s) => s.name === 'AnimeFLV');
    const url = `${flv.baseUrl}/anime/${animeId}`;
    const html = (await get(url)).data;
    const $ = cheerio.load(html);

    const episodes = [];
    $('.ListEpisodios li').each((i, el) => {
      const $a = $(el).find('a');
      if ($a.length) {
        const href = $a.attr('href') || '';
        const id = href.replace('/ver/', '').replace(/^\//, '');
        const numText = $a.find('.Num, .num').text().trim();
        const num = parseInt(numText) || i + 1;
        episodes.push({ id, number: num, title: `Episodio ${num}`, provider: 'animeflv' });
      }
    });
    // AnimeFLV lists newest first — reverse to ascending
    episodes.reverse();

    return {
      id: animeId,
      title: $('.Title h1, h1.Title, h2.Title').first().text().trim() || 'Desconocido',
      image: $('.AnimeCover img, .Image img').first().attr('src'),
      description: $('.Description p, .sinopsis p').first().text().trim() || 'Sin descripción',
      episodes,
      type: 'TV',
      hasDub: true,
      hasSub: true,
      provider: 'animeflv',
    };
  }

  async getTioAnimeInfo(animeId) {
    const url = `${this.sources[1].baseUrl}/anime/${animeId}`;
    const html = (await get(url, { Referer: this.sources[1].baseUrl })).data;
    const $ = cheerio.load(html);

    const title =
      $('h1.anime-title, h1').first().text().trim() ||
      $('title').text().split('|')[0].trim() ||
      animeId;

    const image =
      $('.anime-cover img, .cover img, .thumb img').first().attr('src') ||
      $('.poster img').first().attr('src');

    const description =
      $('.sinopsis p, .description p, .anime-description').first().text().trim() ||
      'Sin descripción';

    const episodes = [];
    // TioAnime lists episodes as <ul class="episodes-list"> <li> <a href="/ver/slug-N">
    $('ul.episodes-list li a, .episodes-list a, .list-eps a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const slug = href.replace('/ver/', '').replace(/^\//, '');
      const numMatch = slug.match(/[\-_](\d+)$/);
      const num = numMatch ? parseInt(numMatch[1]) : i + 1;
      if (slug) episodes.push({ id: slug, number: num, title: `Episodio ${num}`, provider: 'tioanime' });
    });
    episodes.sort((a, b) => a.number - b.number);

    return {
      id: animeId,
      title,
      image,
      description,
      episodes,
      type: 'TV',
      hasDub: false,
      hasSub: true,
      provider: 'tioanime',
    };
  }

  async getJkanimeInfo(animeId) {
    const url = `${this.sources[2].baseUrl}/${animeId}`;
    const html = (await get(url)).data;
    const $ = cheerio.load(html);

    const episodes = [];
    // Jkanime uses numeric episode list in the page
    const totalEps = parseInt($('.anime-info .episodes, .info-anime strong').text()) || 0;
    for (let n = 1; n <= totalEps; n++) {
      episodes.push({
        id: `${animeId}/${n}`,
        number: n,
        title: `Episodio ${n}`,
        provider: 'jkanime',
      });
    }

    // If total not found, try listing links
    if (episodes.length === 0) {
      $('ul.list-episodes a, .episodes-container a').each((i, el) => {
        const href = $(el).attr('href') || '';
        const slug = href.replace(/^\//, '');
        if (slug) episodes.push({ id: slug, number: i + 1, title: `Episodio ${i + 1}`, provider: 'jkanime' });
      });
    }

    return {
      id: animeId,
      title: $('h1.title, h1').first().text().trim() || animeId,
      image: $('.anime-poster img, .cover img').first().attr('src'),
      description: $('.anime-synopsis p, .sinopsis').first().text().trim() || 'Sin descripción',
      episodes,
      type: 'TV',
      hasDub: true,
      hasSub: true,
      provider: 'jkanime',
    };
  }

  // ── Episode sources ─────────────────────────────────────────────────────────

  async getEpisodeSources(episodeId, provider) {
    console.log(`[AnimeMultiSource] getEpisodeSources: ${episodeId} (${provider})`);
    switch (provider) {
      case 'animeflv': return this.getAnimeFLVSources(episodeId);
      case 'tioanime': return this.getTioAnimeSources(episodeId);
      case 'jkanime': return this.getJkanimeSources(episodeId);
      case 'latanime': return this.getLatanimeSources(episodeId);
      default: throw new Error(`Provider "${provider}" not supported`);
    }
  }

  async getAnimeFLVSources(episodeId) {
    const flv = this.sources.find((s) => s.name === 'AnimeFLV');
    const referer = flv.baseUrl + '/';
    try {
      const url = `${flv.baseUrl}/ver/${episodeId}`;
      const html = (await get(url, { Referer: referer })).data;

      const videosData = parseVideosVar(html);
      if (!videosData) {
        console.warn('[AnimeFLV] var videos not found in page');
        return [DEMO_SOURCE];
      }

      const entries = normalizeVideosVar(videosData);
      console.log(
        `[AnimeFLV] Found ${entries.length} server entries:`,
        entries.map((e) => `${e.type}:${e.server}`).join(', ')
      );

      const sources = await resolveEntries(entries, referer);
      if (sources.length === 0) {
        console.warn('[AnimeFLV] All server extractions failed — using demo');
        return [DEMO_SOURCE];
      }

      return sources;
    } catch (err) {
      console.error('[AnimeFLV] getAnimeFLVSources error:', err.message);
      return [DEMO_SOURCE];
    }
  }

  async getTioAnimeSources(episodeId) {
    const referer = this.sources[1].baseUrl + '/';
    try {
      const url = `${this.sources[1].baseUrl}/ver/${episodeId}`;
      const html = (await get(url, { Referer: referer })).data;

      const videosData = parseVideosVar(html);
      if (!videosData) {
        console.warn('[TioAnime] var videos not found');
        return [DEMO_SOURCE];
      }

      const entries = normalizeVideosVar(videosData);
      console.log(
        `[TioAnime] Found ${entries.length} entries:`,
        entries.map((e) => `${e.server}`).join(', ')
      );

      const sources = await resolveEntries(entries, referer);
      return sources.length > 0 ? sources : [DEMO_SOURCE];
    } catch (err) {
      console.error('[TioAnime] getTioAnimeSources error:', err.message);
      return [DEMO_SOURCE];
    }
  }

  async getJkanimeSources(episodeId) {
    const referer = this.sources[2].baseUrl + '/';
    try {
      const url = `${this.sources[2].baseUrl}/${episodeId}`;
      const html = (await get(url, { Referer: referer })).data;
      const $ = cheerio.load(html);

      // Jkanime puts video source in a script: var video = [{...}]
      let videoUrl = null;
      $('script').each((_, el) => {
        const src = $(el).html() || '';
        const m = src.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m && !videoUrl) videoUrl = m[0];
        // Also try var video = [{file:'...'}]
        const fm = src.match(/file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
        if (fm && !videoUrl) videoUrl = fm[1];
      });

      if (videoUrl) {
        return [{
          url: videoUrl,
          format: 'hls',
          sourceType: 'hls',
          quality: 'HD',
          server: 'jkanime',
          isDub: false,
          isDefault: true,
        }];
      }

      // Fallback: try iframe embeds
      const iframeSrc = $('iframe').first().attr('src');
      if (iframeSrc) {
        const extracted = await extractEmbedUrl('', iframeSrc, referer);
        if (extracted) {
          return [{
            url: extracted,
            format: extracted.includes('.m3u8') ? 'hls' : 'mp4',
            sourceType: 'hls',
            quality: 'HD',
            server: 'jkanime',
            isDub: false,
            isDefault: true,
          }];
        }
      }

      return [DEMO_SOURCE];
    } catch (err) {
      console.error('[Jkanime] getJkanimeSources error:', err.message);
      return [DEMO_SOURCE];
    }
  }

  // ── Latanime info + sources ──────────────────────────────────────────────────

  async getLatanimeInfo(animeId) {
    const lat = this.sources.find((s) => s.name === 'Latanime');
    const url = `${lat.baseUrl}/anime/${animeId}`;
    const html = (await get(url, { Referer: lat.baseUrl + '/' })).data;
    const $ = cheerio.load(html);

    const title =
      $('h1.title, h1').first().text().trim() ||
      $('title').text().split('|')[0].trim() ||
      animeId;

    const image =
      $('.poster img, .cover img, .anime-image img').first().attr('src') ||
      $('img[alt]').first().attr('src');

    const description =
      $('.sinopsis, .description, .synopsis').first().text().trim() || 'Sin descripción';

    const episodes = [];
    $('a[href*="/ver/"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      // latanime episode slugs: /ver/{animeId}-episodio-{N}
      const slug = href.replace(lat.baseUrl, '').replace('/ver/', '').replace(/^\//, '');
      const numMatch = slug.match(/episodio-(\d+)$/i) || slug.match(/[\-_](\d+)$/);
      const num = numMatch ? parseInt(numMatch[1]) : i + 1;
      if (slug && !episodes.find((e) => e.number === num)) {
        episodes.push({ id: slug, number: num, title: `Episodio ${num}`, provider: 'latanime' });
      }
    });
    episodes.sort((a, b) => a.number - b.number);

    return { id: animeId, title, image, description, episodes, type: 'TV', hasDub: true, hasSub: true, provider: 'latanime' };
  }

  async getLatanimeSources(episodeId) {
    const lat = this.sources.find((s) => s.name === 'Latanime');
    const referer = lat.baseUrl + '/';
    try {
      const url = `${lat.baseUrl}/ver/${episodeId}`;
      const html = (await get(url, { Referer: referer })).data;
      const $ = cheerio.load(html);

      // Latanime stores embed URLs as base64 in data-player attributes
      const entries = [];
      $('[data-player]').each((_, el) => {
        const b64 = $(el).attr('data-player') || '';
        try {
          const decoded = Buffer.from(b64, 'base64').toString('utf-8');
          if (decoded.startsWith('http')) {
            const serverName = $(el).text().trim().toLowerCase() || 'generic';
            entries.push({ type: 'SUB', server: serverName, url: decoded });
          }
        } catch (_) {}
      });

      console.log(`[Latanime] Found ${entries.length} data-player entries:`, entries.map((e) => `${e.server}`).join(', '));

      if (entries.length > 0) {
        const sources = await resolveEntries(entries, referer);
        if (sources.length > 0) return sources;
      }

      console.warn('[Latanime] All extractions failed — using demo');
      return [DEMO_SOURCE];
    } catch (err) {
      console.error('[Latanime] getLatanimeSources error:', err.message);
      return [DEMO_SOURCE];
    }
  }

  // ── HTML parsers ────────────────────────────────────────────────────────────

  _parseLatanimeList(html) {
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();

    // Latanime structure: <div class="col-6 ..."><a href="https://latanime.org/anime/{slug}">
    $('a[href*="/anime/"]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const id = href.replace('https://latanime.org/anime/', '').replace('/anime/', '').replace(/^\//, '').replace(/\/$/, '');
      const $img = $a.find('img').first();
      const title =
        $img.attr('alt') ||
        $a.find('h3').text().trim() ||
        '';

      if (id && title && title.length > 1 && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          title,
          image: $img.attr('data-src') || $img.attr('src'),
          type: 'TV',
          episodes: '?',
          quality: 'HD',
          format: 'hls',
        });
      }
    });

    return results;
  }

  _parseAnimeFLVList(html) {
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();

    $('.AnimeList .item, .ListAnimes article, ul.ListAnimes li').each((_, el) => {
      const $item = $(el);
      const $a = $item.find('a').first();
      const $img = $item.find('img').first();
      const href = $a.attr('href') || '';
      const id = href.replace('/anime/', '').replace(/^\//, '');
      const title =
        $img.attr('alt') ||
        $item.find('.Title, h3').text().trim() ||
        $a.attr('title') || '';

      if (id && title && title.length > 1 && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          title,
          image: $img.attr('src') || $img.attr('data-src'),
          type: $item.find('.Type').text().trim() || 'TV',
          episodes: $item.find('.Eps').text().trim() || '?',
          quality: 'HD',
          format: 'hls',
        });
      }
    });

    return results;
  }

  _parseTioAnimeList(html) {
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();

    // TioAnime search results: .animes .row .col-6 or similar
    $('ul.animes li, .animes li, .row .col-6, .row .col-md-4, .anime-item').each((_, el) => {
      const $item = $(el);
      const $a = $item.find('a').first();
      const $img = $item.find('img').first();
      const href = $a.attr('href') || '';
      const id = href.replace('/anime/', '').replace(/^\//, '');
      const title = $img.attr('alt') || $item.find('h3, .title, p').first().text().trim();

      if (id && title && title.length > 1 && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          title,
          image: $img.attr('src') || $img.attr('data-src'),
          type: 'TV',
          episodes: '?',
          quality: 'HD',
          format: 'hls',
        });
      }
    });

    return results;
  }

  _parseJkanimeList(html) {
    const $ = cheerio.load(html);
    const results = [];
    const seen = new Set();

    $('.hermes .items .item, .anime-item, article.anime').each((_, el) => {
      const $item = $(el);
      const $a = $item.find('a').first();
      const $img = $item.find('img').first();
      const href = $a.attr('href') || '';
      // jkanime uses /slug/ paths
      const id = href.replace(/^\//, '').replace(/\/$/, '');
      const title = $img.attr('alt') || $item.find('.title, h3').text().trim();

      if (id && title && title.length > 1 && !seen.has(id)) {
        seen.add(id);
        results.push({
          id,
          title,
          image: $img.attr('src') || $img.attr('data-src'),
          type: 'TV',
          episodes: '?',
          quality: 'HD',
          format: 'hls',
        });
      }
    });

    return results;
  }

  // ── Dedup merge ─────────────────────────────────────────────────────────────
  mergeResults(sourceResults) {
    const seen = new Set();
    const out = [];
    const sorted = [...sourceResults].sort((a, b) => a.priority - b.priority);
    for (const group of sorted) {
      for (const anime of group.results || []) {
        const key = anime.title.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(anime);
        }
      }
    }
    return out;
  }
}

export default AnimeMultiSource;
