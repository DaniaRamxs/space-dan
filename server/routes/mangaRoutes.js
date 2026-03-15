import express from 'express';
import axios from 'axios';

const router = express.Router();

const MANGADEX   = 'https://api.mangadex.org';
const UPLOADS    = 'https://uploads.mangadex.org';

const HEADERS = {
  'User-Agent': 'Spacely/1.0 (https://joinspacely.com)',
  'Accept': 'application/json',
};

// ── GET /api/manga/search?title=...&limit=20 ──────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { title = '', limit = 20 } = req.query;
    const params = new URLSearchParams({
      title,
      limit,
      'includes[]': 'cover_art',
      'contentRating[]': 'safe',
    });
    // contentRating[] can appear twice — append manually
    params.append('contentRating[]', 'suggestive');

    const { data } = await axios.get(`${MANGADEX}/manga?${params}`, { headers: HEADERS, timeout: 10000 });
    res.json(data);
  } catch (err) {
    console.error('[MangaProxy] search error:', err.message);
    res.status(502).json({ error: 'MangaDex search failed', detail: err.message });
  }
});

// ── GET /api/manga/:mangaId/chapters?lang=es&limit=100&offset=0 ───────────────
router.get('/:mangaId/chapters', async (req, res) => {
  try {
    const { mangaId } = req.params;
    const { lang = 'es', limit = 100, offset = 0 } = req.query;
    const params = new URLSearchParams({
      manga: mangaId,
      limit,
      offset,
      'order[chapter]': 'asc',
    });
    params.append('translatedLanguage[]', lang);
    if (lang !== 'en') params.append('translatedLanguage[]', 'en');

    const { data } = await axios.get(`${MANGADEX}/chapter?${params}`, { headers: HEADERS, timeout: 10000 });
    res.json(data);
  } catch (err) {
    console.error('[MangaProxy] chapters error:', err.message);
    res.status(502).json({ error: 'MangaDex chapters failed', detail: err.message });
  }
});

// ── GET /api/manga/pages/:chapterId ───────────────────────────────────────────
router.get('/pages/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { data } = await axios.get(`${MANGADEX}/at-home/server/${chapterId}`, { headers: HEADERS, timeout: 10000 });
    const { baseUrl, chapter } = data;
    const pages = chapter.data.map(f => `${baseUrl}/data/${chapter.hash}/${f}`);
    res.json({ pages, hash: chapter.hash, baseUrl });
  } catch (err) {
    console.error('[MangaProxy] pages error:', err.message);
    res.status(502).json({ error: 'MangaDex pages failed', detail: err.message });
  }
});

// ── GET /api/manga/image?url=... — proxy individual page images ────────────────
// Needed when MangaDex data-saver CDN doesn't set CORS headers itself.
router.get('/image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || (!url.startsWith('https://uploads.mangadex.org') && !url.startsWith('https://cmdxd98sb0x3yprd.mangadex.network'))) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }
    const response = await axios.get(url, { responseType: 'stream', headers: HEADERS, timeout: 15000 });
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    console.error('[MangaProxy] image error:', err.message);
    res.status(502).send('Image proxy failed');
  }
});

export default router;
