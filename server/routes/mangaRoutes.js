import express from 'express';
import axios from 'axios';

const router = express.Router();

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

export default router;
