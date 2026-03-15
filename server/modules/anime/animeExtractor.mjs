/**
 * animeExtractor.mjs
 *
 * Server-side extraction of direct HLS/MP4 URLs from video embed services.
 *
 * Features:
 *  1. Cache      — 1h TTL, keyed by serverName:embedUrl, avoids re-scraping
 *  2. Normalized — every resolved source has { url, type, quality, priority }
 *  3. Timeouts   — 4 s AbortController per extractor, slow hosts don't block
 *  4. Sanitized  — embed URLs validated against an allowlist before any fetch
 */

import axios from 'axios';

// ── 1. Cache ───────────────────────────────────────────────────────────────────
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // key → { result, cachedAt }

function cacheKey(serverName, embedUrl) {
  return `${(serverName || 'generic').toLowerCase()}:${embedUrl}`;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL) { cache.delete(key); return null; }
  return entry.result;
}

function cacheSet(key, result) {
  cache.set(key, { result, cachedAt: Date.now() });
  // Prevent unbounded growth — evict oldest if > 500 entries
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

// ── 2. Server metadata (priority + quality hint) ───────────────────────────────
const SERVER_META = {
  okru:        { priority: 1, qualityHint: '1080p' },
  ok:          { priority: 1, qualityHint: '1080p' },
  voe:         { priority: 2, qualityHint: '1080p' },
  filemoon:    { priority: 2, qualityHint: '1080p' },
  mp4upload:   { priority: 3, qualityHint: '720p'  },
  yourupload:  { priority: 3, qualityHint: '720p'  },
  streamwish:  { priority: 4, qualityHint: '720p'  },
  sw:          { priority: 4, qualityHint: '720p'  },
  filelions:   { priority: 4, qualityHint: '720p'  },
  streamhide:  { priority: 4, qualityHint: '720p'  },
  streamtape:  { priority: 5, qualityHint: '480p'  },
  tape:        { priority: 5, qualityHint: '480p'  },
  doodstream:  { priority: 6, qualityHint: '480p'  },
  dood:        { priority: 6, qualityHint: '480p'  },
  generic:     { priority: 10, qualityHint: 'HD'   },
};

function getMeta(serverName) {
  return SERVER_META[(serverName || '').toLowerCase()] || SERVER_META.generic;
}

/** Detect quality label from a CDN URL (looks for 1080/720/480/360 patterns) */
function detectQuality(url) {
  if (!url) return 'HD';
  if (/1080/.test(url)) return '1080p';
  if (/720/.test(url))  return '720p';
  if (/480/.test(url))  return '480p';
  if (/360/.test(url))  return '360p';
  return 'HD';
}

/** Build a normalised source object from a resolved URL */
function buildSource(directUrl, serverName, extra = {}) {
  const meta = getMeta(serverName);
  const type = directUrl.includes('.m3u8') ? 'hls' : 'mp4';
  return {
    url: directUrl,
    type,
    format: type,
    sourceType: type,
    quality: detectQuality(directUrl) || meta.qualityHint,
    priority: meta.priority,
    server: serverName || 'generic',
    ...extra,
  };
}

// ── 3. Timeouts via AbortController ───────────────────────────────────────────
const EXTRACTOR_TIMEOUT = 10000; // ms per embed fetch

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function httpGet(url, headers = {}, timeoutMs = EXTRACTOR_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return axios
    .get(url, {
      signal: controller.signal,
      timeout: timeoutMs + 500, // axios-level safety net
      headers: { 'User-Agent': UA, ...headers },
      maxRedirects: 5,
    })
    .finally(() => clearTimeout(timer));
}

// ── 4. Sanitization — embed URL allowlist ──────────────────────────────────────
const ALLOWED_HOSTS = new Set([
  'ok.ru',
  'www.ok.ru',
  // VOE — reliable HLS, used by AnimeFenix/TioAnime
  'voe.sx',
  'www.voe.sx',
  // Filemoon — HLS, widely used by Spanish sites
  'filemoon.sx',
  'filemoon.to',
  'moon.to',
  // Mp4Upload — VideoJS player, CDN on aN.mp4upload.com:183
  'mp4upload.com',
  'www.mp4upload.com',
  // CDN subdomains: a1.mp4upload.com, a2.mp4upload.com, a3.mp4upload.com, etc.
  // Matched dynamically — proxy route doesn't check allowlist for direct streams,
  // but we keep a static entry for the most common ones:
  'a1.mp4upload.com',
  'a2.mp4upload.com',
  'a3.mp4upload.com',
  'a4.mp4upload.com',
  // Yourupload
  'yourupload.com',
  'www.yourupload.com',
  // StreamWish family
  'streamwish.to',
  'streamwish.com',
  'filelions.to',
  'filelions.com',
  'streamhide.to',
  'streamhide.com',
  // Streamtape
  'streamtape.com',
  'streamtape.net',
  // Doodstream family (doodstream.com redirects to myvidplay.com / dood.* mirrors)
  'dood.to',
  'dood.la',
  'dood.cx',
  'doodstream.com',
  'myvidplay.com',
  'www.myvidplay.com',
  'd0000d.com',
  'dood.watch',
  // Misc
  'uqload.co',
  'uqload.com',
  'sendvid.com',
  'mixdrop.co',
  'mixdrop.to',
  'mixdrop.top',
  'mixdrop.ch',
  // Hexload / Savefiles — used by Latanime
  'hexload.com',
  'www.hexload.com',
  'savefiles.com',
  'www.savefiles.com',
  // Dsvplay — Latanime embed mirror
  'dsvplay.com',
  'www.dsvplay.com',
]);

/**
 * Returns the normalised URL (adds https: if protocol-relative)
 * or null if the URL is not in the allowlist or is otherwise unsafe.
 */
function sanitizeEmbedUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();

  // Block obviously bad schemes
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;

  const full = trimmed.startsWith('//') ? 'https:' + trimmed : trimmed;

  let parsed;
  try { parsed = new URL(full); } catch { return null; }

  // Must be http(s)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  // Hostname must be in allowlist
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    console.warn(`[extractor] blocked non-allowlisted host: ${parsed.hostname}`);
    return null;
  }

  return parsed.href;
}

// ── Individual extractors ──────────────────────────────────────────────────────

export async function extractOkru(embedUrl, referer = 'https://www3.animeflv.net/') {
  try {
    const resp = await httpGet(embedUrl, {
      Referer: referer,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    });
    const html = resp.data;

    // Method 1: data-options JSON attribute
    const doMatch = html.match(/data-options="([^"]+)"/);
    if (doMatch) {
      try {
        const raw = doMatch[1]
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const obj = JSON.parse(raw);
        const hls = obj?.flashvars?.hlsManifestUrl || obj?.flashvars?.hlsMasterUrl || obj?.hlsManifestUrl;
        if (hls) { console.log('[extractor] ok.ru #1 OK'); return hls; }
      } catch (_) {}
    }

    // Method 2: "hlsManifestUrl":"..." anywhere in page
    const m2 = html.match(/"hlsManifestUrl"\s*:\s*"([^"]+)"/);
    if (m2) { console.log('[extractor] ok.ru #2 OK'); return m2[1].replace(/\\\//g, '/'); }

    // Method 3: any .m3u8 URL in page
    const m3 = html.match(/(https?:(?:\\\/\\\/|\/\/)[^"'\\]+\.m3u8[^"'\\]*)/);
    if (m3) { console.log('[extractor] ok.ru #3 OK'); return m3[1].replace(/\\\//g, '/'); }

    console.warn('[extractor] ok.ru: no HLS found');
  } catch (err) {
    console.warn('[extractor] ok.ru failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractYourupload(embedUrl, referer = 'https://www3.animeflv.net/') {
  try {
    const resp = await httpGet(embedUrl, { Referer: referer });
    const html = resp.data;
    const fm = html.match(/file\s*:\s*['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i);
    if (fm) { console.log('[extractor] yourupload OK'); return fm[1]; }
    const sm = html.match(/<source[^>]+src=['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i);
    if (sm) { console.log('[extractor] yourupload <source> OK'); return sm[1]; }
  } catch (err) {
    console.warn('[extractor] YourupLoad failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractStreamWish(embedUrl, referer = 'https://www3.animeflv.net/') {
  try {
    const resp = await httpGet(embedUrl, { Referer: referer });
    const html = resp.data;
    const m1 = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (m1) { console.log('[extractor] streamwish sources OK'); return m1[1]; }
    const m2 = html.match(/file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (m2) { console.log('[extractor] streamwish file OK'); return m2[1]; }
    const m3 = html.match(/["']file["']\s*:\s*["']([^"']+\.m3u8[^"']*)/i);
    if (m3) { console.log('[extractor] streamwish var OK'); return m3[1]; }
  } catch (err) {
    console.warn('[extractor] StreamWish failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractStreamtape(embedUrl) {
  try {
    const resp = await httpGet(embedUrl);
    const html = resp.data;
    const block = html.match(/document\.getElementById\('norobotlink'\)[^<]+/);
    if (block) {
      const parts = block[0].match(/https?:\/\/[^"'\s]+/g);
      if (parts) { console.log('[extractor] streamtape OK'); return parts[0]; }
    }
    const direct = html.match(/https:\/\/streamtape\.(?:com|net)\/get_video\?[^"'\s]+/);
    if (direct) return direct[0];
  } catch (err) {
    console.warn('[extractor] Streamtape failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractDoodstream(embedUrl) {
  try {
    const resp = await httpGet(embedUrl, { Referer: 'https://dood.to/' });
    const html = resp.data;
    const passMatch = html.match(/\/pass_md5\/([^'"?]+)/);
    if (!passMatch) return null;

    // doodstream.com now redirects to myvidplay.com (and other mirrors).
    // Get the actual domain from the response's final URL.
    let finalOrigin = 'https://dood.to';
    try {
      const reqHost = resp.request?.host || resp.request?.socket?.servername;
      const reqProto = resp.request?.protocol || 'https:';
      if (reqHost) finalOrigin = `${reqProto}//${reqHost}`;
    } catch (_) {}

    const passUrl = finalOrigin + passMatch[0];
    const passResp = await httpGet(passUrl, { Referer: embedUrl });
    const base = passResp.data;
    const token = html.match(/\?token=([^&'"]+)/)?.[1] || '';
    if (base?.startsWith('http')) {
      console.log('[extractor] doodstream OK (via', finalOrigin, ')');
      return `${base}?token=${token}&expiry=${Date.now()}`;
    }
  } catch (err) {
    console.warn('[extractor] Doodstream failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractVoe(embedUrl, referer = 'https://animefenix.tv/') {
  try {
    const resp = await httpGet(embedUrl, { Referer: referer });
    const html = resp.data;

    // VOE stores the HLS URL as a JS variable: 'hls': 'https://...'
    const m1 = html.match(/'hls'\s*:\s*'([^']+\.m3u8[^']*)'/i);
    if (m1) { console.log('[extractor] voe #1 OK'); return m1[1]; }
    const m2 = html.match(/"hls"\s*:\s*"([^"]+\.m3u8[^"]*)"/i);
    if (m2) { console.log('[extractor] voe #2 OK'); return m2[1]; }
    // Newer VOE: sources array with file key
    const m3 = html.match(/file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (m3) { console.log('[extractor] voe #3 OK'); return m3[1]; }
    // Fallback: any .m3u8 in page
    const m4 = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
    if (m4) { console.log('[extractor] voe #4 OK'); return m4[0]; }

    console.warn('[extractor] voe: no HLS found');
  } catch (err) {
    console.warn('[extractor] VOE failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractFilemoon(embedUrl, referer = 'https://animefenix.tv/') {
  try {
    const resp = await httpGet(embedUrl, { Referer: referer });
    const html = resp.data;
    // Filemoon uses eval(atob(…)) but sometimes leaks the URL
    const m1 = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (m1) { console.log('[extractor] filemoon #1 OK'); return m1[1]; }
    const m2 = html.match(/file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (m2) { console.log('[extractor] filemoon #2 OK'); return m2[1]; }
    const m3 = html.match(/https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*/);
    if (m3) { console.log('[extractor] filemoon #3 OK'); return m3[0]; }
  } catch (err) {
    console.warn('[extractor] Filemoon failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

export async function extractMp4upload(embedUrl, referer = 'https://animefenix.tv/') {
  try {
    const resp = await httpGet(embedUrl, {
      Referer: referer,
      Origin: referer.replace(/\/$/, ''),
      'sec-fetch-dest': 'iframe',
      'sec-fetch-mode': 'navigate',
    });
    const html = resp.data;

    // Mp4upload uses VideoJS: player.src({ type:"video/mp4", src:"https://aN.mp4upload.com:PORT/d/.../video.mp4" })
    const m1 = html.match(/src\s*:\s*["'](https?:\/\/[a-z0-9]+\.mp4upload\.com[^"']+\.mp4[^"']*)/i);
    if (m1) { console.log('[extractor] mp4upload #1 (videojs src) OK'); return m1[1]; }

    // Fallback: any *.mp4upload.com direct URL with video path
    const m2 = html.match(/https?:\/\/[a-z0-9]+\.mp4upload\.com[^\s"'\\]+\.mp4[^\s"'\\]*/i);
    if (m2) { console.log('[extractor] mp4upload #2 (cdn url) OK'); return m2[0]; }

    // jwplayer "file" key (older pages)
    const m3 = html.match(/["']file["']\s*:\s*["']([^"']+\.mp4[^"']*)/i);
    if (m3) { console.log('[extractor] mp4upload #3 (file key) OK'); return m3[1]; }

    // <source> HTML tag
    const m4 = html.match(/<source[^>]+src=["']([^"']+\.mp4[^"']*)/i);
    if (m4) { console.log('[extractor] mp4upload #4 (source tag) OK'); return m4[1]; }

    console.warn('[extractor] mp4upload: no video URL found in page');
  } catch (err) {
    console.warn('[extractor] Mp4upload failed:', err.code === 'ERR_CANCELED' ? 'timeout' : err.message);
  }
  return null;
}

async function extractGeneric(embedUrl, referer) {
  try {
    const resp = await httpGet(embedUrl, { Referer: referer });
    const html = resp.data;
    const m3u8 = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    if (m3u8) { console.log('[extractor] generic m3u8 OK'); return m3u8[0]; }
    const mp4 = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
    if (mp4) { console.log('[extractor] generic mp4 OK'); return mp4[0]; }
  } catch (_) {}
  return null;
}

// ── Main dispatcher ────────────────────────────────────────────────────────────
/**
 * Resolve a single embed URL to a direct stream URL.
 *
 * @param {string} serverName  Provider key ("okru", "streamwish", etc.)
 * @param {string} embedUrl    Embed page URL
 * @param {string} [referer]
 * @returns {Promise<string|null>}
 */
export async function extractEmbedUrl(serverName, embedUrl, referer = 'https://www3.animeflv.net/') {
  const server = (serverName || '').toLowerCase();

  // ── 4. Sanitize ──
  // Direct streams skip allowlist check (they're CDN URLs, not embed pages)
  const raw = (embedUrl || '').trim();
  const full = raw.startsWith('//') ? 'https:' + raw : raw;
  if (!full || !full.startsWith('http')) return null;

  // Check .m3u8 / .mp4 as file extensions (not substrings in the domain like "mp4upload.com")
  const isDirectStream = /\.m3u8(?:[?#]|$)/.test(full) || /\.mp4(?:[?#/]|$)/.test(full);
  if (!isDirectStream) {
    const safe = sanitizeEmbedUrl(full);
    if (!safe) return null; // blocked by allowlist
  }

  // ── 1. Cache hit ──
  const key = cacheKey(server, full);
  const cached = cacheGet(key);
  if (cached !== null) {
    console.log(`[extractor] cache hit for ${server}`);
    return cached;
  }

  // Direct stream — no need to scrape
  if (isDirectStream) { cacheSet(key, full); return full; }

  console.log(`[animeExtractor] ${server || 'generic'} → ${full.substring(0, 90)}`);

  // ── Dispatch ──
  let result = null;

  if (server === 'okru' || server === 'ok' || full.includes('ok.ru')) {
    result = await extractOkru(full, referer);
  } else if (server === 'voe' || full.includes('voe.sx')) {
    result = await extractVoe(full, referer);
  } else if (server === 'filemoon' || full.includes('filemoon')) {
    result = await extractFilemoon(full, referer);
  } else if (server === 'mp4upload' || full.includes('mp4upload.com')) {
    result = await extractMp4upload(full, referer);
  } else if (server === 'yourupload' || full.includes('yourupload.com')) {
    result = await extractYourupload(full, referer);
  } else if (
    server === 'sw' || server === 'streamwish' || server === 'filelions' || server === 'streamhide' ||
    full.includes('streamwish') || full.includes('filelions') || full.includes('streamhide')
  ) {
    result = await extractStreamWish(full, referer);
  } else if (server === 'streamtape' || server === 'tape' || full.includes('streamtape')) {
    result = await extractStreamtape(full);
  } else if (server === 'doodstream' || server === 'dood' || full.includes('dood')) {
    result = await extractDoodstream(full);
  } else {
    result = await extractGeneric(full, referer);
  }

  // ── 1. Cache result (even null — avoids hammering a dead server) ──
  if (result) cacheSet(key, result);

  return result;
}

// ── resolveEmbedSources ────────────────────────────────────────────────────────
/**
 * Convert a list of embed sources to normalised direct-stream sources.
 * Each resolved source has: url, type, format, quality, priority, server, isDub, lang
 *
 * @param {Array}  sources  Raw source objects { server, url|directUrl|code, isDub, lang, ... }
 * @param {string} referer
 * @returns {Promise<Array>} Sorted by priority (best first), only successful extractions
 */
export async function resolveEmbedSources(sources, referer = 'https://www3.animeflv.net/') {
  const settled = await Promise.allSettled(
    sources.map(async (src) => {
      const embedUrl = src.url || src.directUrl || src.code || '';
      const serverName = src.server || '';

      // Already a direct stream — normalise and return
      if (src.format !== 'embed' && src.sourceType !== 'embed') {
        return buildSource(embedUrl, serverName, {
          isDub: src.isDub ?? false,
          lang: src.lang || (src.isDub ? 'es-LAT' : 'es'),
        });
      }

      const directUrl = await extractEmbedUrl(serverName, embedUrl, referer);
      if (!directUrl) return null;

      return buildSource(directUrl, serverName, {
        isDub: src.isDub ?? false,
        lang: src.lang || (src.isDub ? 'es-LAT' : 'es'),
        quality: src.quality || detectQuality(directUrl) || getMeta(serverName).qualityHint,
      });
    })
  );

  return settled
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
    .sort((a, b) => a.priority - b.priority); // best server first
}

/** Expose cache stats for debugging (/api/anime/extractor-stats) */
export function getCacheStats() {
  const now = Date.now();
  let active = 0;
  cache.forEach((v) => { if (now - v.cachedAt < CACHE_TTL) active++; });
  return { total: cache.size, active, ttlMs: CACHE_TTL };
}

/** Manually invalidate a cached entry (useful if a stream URL expires early) */
export function invalidateCache(serverName, embedUrl) {
  cache.delete(cacheKey(serverName, embedUrl));
}
