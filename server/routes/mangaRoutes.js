import express from 'express';
import axios from 'axios';
import dns from 'node:dns/promises';

const router = express.Router();

// ── SSRF protection helpers ───────────────────────────────────────────────────
function isPrivateHost(ip) {
  return (
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    ip === '::1' ||
    ip === '0.0.0.0'
  );
}

async function isPrivateHostByDns(hostname) {
  // Literal IP — check directly without DNS
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return isPrivateHost(hostname);
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    return addresses.some(({ address }) => isPrivateHost(address));
  } catch {
    // DNS resolution failed — block by default
    return true;
  }
}

const MANGADEX = 'https://api.mangadex.org';

const HEADERS = {
  'User-Agent': 'Spacely/1.0 (https://joinspacely.com)',
  'Accept': 'application/json',
};

// Build URL manually to keep literal brackets — URLSearchParams encodes [] as %5B%5D
// which MangaDex does not accept.
function buildUrl(base, params) {
  const parts = [];
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      v.forEach((val) => parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`));
    } else if (v !== undefined && v !== null && v !== '') {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  }
  return `${base}?${parts.join('&')}`;
}

// ── GET /api/manga/search?title=...&limit=20 ──────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { title = '', limit = 20 } = req.query;
    const url = buildUrl(`${MANGADEX}/manga`, {
      title,
      limit,
      'includes[]':      ['cover_art'],
      'contentRating[]': ['safe', 'suggestive'],
    });
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    res.json(data);
  } catch (err) {
    console.error('[MangaProxy] search error:', err.message);
    res.status(502).json({ error: 'MangaDex search failed', detail: err.message });
  }
});

// ── GET /api/manga/:mangaId/chapters?limit=100&offset=0 ───────────────────────
// Fetches ES + ES-LA + EN chapters so there's always content to show.
router.get('/:mangaId/chapters', async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { limit = 500, offset = 0 } = req.query;
    const url = buildUrl(`${MANGADEX}/chapter`, {
      manga:                mangaId,
      limit,
      offset,
      'order[chapter]':     'asc',
      'translatedLanguage[]': ['es', 'es-la', 'en'],
    });
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    res.json(data);
  } catch (err) {
    console.error('[MangaProxy] chapters error:', err.message);
    res.status(502).json({ error: 'MangaDex chapters failed', detail: err.message });
  }
});

// ── GET /api/manga/pages/:chapterId ───────────────────────────────────────────
// Returns page image URLs proxied through this server to avoid CDN CORS issues.
router.get('/pages/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { data } = await axios.get(
      `${MANGADEX}/at-home/server/${chapterId}`,
      { headers: HEADERS, timeout: 10000 },
    );
    const { baseUrl, chapter } = data;
    // Return proxied URLs so images go through /api/manga/image and avoid CORS
    const API_BASE = process.env.API_BASE_URL || 'https://spacely-server-production.up.railway.app';
    const pages = chapter.data.map(
      (f) => `${API_BASE}/api/manga/image?url=${encodeURIComponent(`${baseUrl}/data/${chapter.hash}/${f}`)}`,
    );
    res.json({ pages, hash: chapter.hash });
  } catch (err) {
    console.error('[MangaProxy] pages error:', err.message);
    res.status(502).json({ error: 'MangaDex pages failed', detail: err.message });
  }
});

// ── GET /api/manga/image?url=... — proxy CDN images (avoids CORS on img src) ──
router.get('/image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url');

    const decoded = decodeURIComponent(url);
    // MangaDex at-home uses dynamic CDN hostnames (*.mangadex.network, *.mangadex.org)
    // Allow any subdomain/host from these two domains only.
    let parsedHost;
    try { parsedHost = new URL(decoded).hostname; } catch { return res.status(400).send('Invalid url'); }
    const allowed = parsedHost.endsWith('.mangadex.org') || parsedHost === 'mangadex.org'
      || parsedHost.endsWith('.mangadex.network') || parsedHost === 'mangadex.network';
    if (!allowed) {
      return res.status(400).send('URL not allowed');
    }

    const response = await axios.get(decoded, {
      responseType: 'stream',
      headers: { ...HEADERS, Accept: 'image/*' },
      timeout: 20000,
    });

    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    response.data.pipe(res);
  } catch (err) {
    console.error('[MangaProxy] image error:', err.message);
    res.status(502).send('Image proxy failed');
  }
});

// ── GET /api/manga/scrape?url=... — extract chapter images from any manga site ──
router.get('/scrape', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url' });

    const decoded = decodeURIComponent(url);
    let parsed;
    try { parsed = new URL(decoded); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }

    const { data: html } = await axios.get(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': parsed.origin + '/',
      },
      timeout: 15000,
    });

    const pages = extractMangaImages(html, decoded);
    if (pages.length === 0) return res.json({ pages: [] });

    const API_BASE = process.env.API_BASE_URL || 'https://spacely-server-production.up.railway.app';
    const proxied = pages.map(
      (u) => `${API_BASE}/api/manga/ext-image?url=${encodeURIComponent(u)}&ref=${encodeURIComponent(parsed.origin)}`,
    );
    res.json({ pages: proxied });
  } catch (err) {
    console.error('[MangaProxy] scrape error:', err.message);
    res.status(502).json({ error: 'Scrape failed', detail: err.message });
  }
});

function extractMangaImages(html, pageUrl) {
  const base = new URL(pageUrl).origin;
  const images = [];
  const seen = new Set();

  const add = (src) => {
    const resolved = resolveUrl(src?.trim(), base);
    if (resolved && isMangaImage(resolved) && !seen.has(resolved)) {
      seen.add(resolved);
      images.push(resolved);
    }
  };

  // img tags with src or data-* lazy-load attributes
  const imgRe = /<img[^>]+?(?:data-lazy-src|data-original|data-src|src)\s*=\s*["']([^"'>\s]+)["'][^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) add(m[1]);

  // Script tags — JSON-embedded image URLs (common in React/Next manga sites)
  const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    const sc = m[1];
    const jsonImgRe = /["'`](https?:\/\/[^"'`<>\s]+\.(?:jpe?g|png|webp)(?:\?[^"'`<>\s]*)?)["'`]/gi;
    let jm;
    while ((jm = jsonImgRe.exec(sc)) !== null) add(jm[1]);
  }

  // Any remaining https image literals anywhere in HTML
  const anyRe = /["'`](https?:\/\/[^"'`<>\s]+\.(?:jpe?g|png|webp)(?:\?[^"'`<>\s]*)?)["'`]/gi;
  while ((m = anyRe.exec(html)) !== null) add(m[1]);

  return images;
}

function isMangaImage(src) {
  if (!src || src.startsWith('data:')) return false;
  const lower = src.toLowerCase();
  if (/avatar|logo|icon|banner|sprite|pixel|blank|placeholder|favicon|button|bg-/.test(lower)) return false;
  return /\.(jpe?g|png|webp)(\?.*)?$/i.test(lower);
}

function resolveUrl(src, base) {
  if (!src) return null;
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `${base}${src}`;
  return null;
}

// ── GET /api/manga/ext-image?url=...&ref=... — proxy any external manga image ──
// Security: blocks SSRF via private-IP check + DNS resolution + manual redirect handling.
// Domain whitelist intentionally omitted — scraped sites use arbitrary CDN hostnames.
router.get('/ext-image', async (req, res) => {
  try {
    const { url, ref } = req.query;
    if (!url) return res.status(400).send('Missing url');

    const decoded = decodeURIComponent(url);
    let parsed;
    try { parsed = new URL(decoded); } catch { return res.status(400).send('Invalid url'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).send('Invalid URL');

    // Block requests targeting private/internal IP ranges (SSRF protection)
    if (await isPrivateHostByDns(parsed.hostname)) {
      return res.status(403).send('URL not allowed');
    }

    const referer = ref ? decodeURIComponent(ref) + '/' : parsed.origin + '/';
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': referer,
    };

    let response;
    try {
      response = await axios.get(decoded, {
        responseType: 'stream',
        headers: reqHeaders,
        timeout: 20000,
        // Disable automatic redirect following — validate redirect targets manually
        maxRedirects: 0,
      });
    } catch (err) {
      // axios throws on 3xx when maxRedirects:0 — handle one redirect hop
      if (err.response && err.response.status >= 300 && err.response.status < 400) {
        const location = err.response.headers['location'];
        if (!location) return res.status(403).send('Redirect without Location header');

        let locParsed;
        try { locParsed = new URL(location); } catch { return res.status(403).send('Invalid redirect target'); }
        if (!['http:', 'https:'].includes(locParsed.protocol)) return res.status(403).send('Invalid redirect protocol');
        if (await isPrivateHostByDns(locParsed.hostname)) return res.status(403).send('Redirect target not allowed');

        response = await axios.get(location, {
          responseType: 'stream',
          headers: reqHeaders,
          timeout: 20000,
          maxRedirects: 0,
        });
      } else {
        throw err;
      }
    }

    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    response.data.pipe(res);
  } catch (err) {
    console.error('[MangaProxy] ext-image error:', err.message);
    res.status(502).send('Image proxy failed');
  }
});

export default router;
