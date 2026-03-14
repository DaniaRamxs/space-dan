import { Router } from 'express';
import * as animeController from './animeController.mjs';

const router = Router();

// ─── Stream proxy (bypasses CORS for AnimePahe CDN) ──────────────────────────
// Handles:
//   GET /api/anime/proxy?url=<encoded_url>                (m3u8 + ts + key files)
//   GET /api/anime/proxy/segment?url=<encoded_url>        (alias, same handler)
// The proxy:
//   1. Fetches the target URL with the correct Referer/UA headers
//   2. If it's a .m3u8 playlist, rewrites all segment/key URLs to go through the proxy
//   3. If it's a binary segment (.ts) or key file, pipes the response directly
router.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param required' });

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // validate it's a real URL
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://animepahe.ru/',
        'Origin': 'https://animepahe.ru',
        'Accept': '*/*',
      },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isPlaylist = targetUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL');

    if (isPlaylist) {
      // ── M3U8 playlist: rewrite internal URLs to go through this proxy ──
      const text = await upstream.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const proxyBase = '/api/anime/proxy?url=';

      const rewritten = text
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) {
            // Rewrite URI attributes inside tags like #EXT-X-KEY:...,URI="..."
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              const absolute = uri.startsWith('http') ? uri : baseUrl + uri;
              return `URI="${proxyBase}${encodeURIComponent(absolute)}"`;
            });
          }
          // Plain segment line (relative or absolute URL)
          const absolute = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
          return `${proxyBase}${encodeURIComponent(absolute)}`;
        })
        .join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send(rewritten);
    }

    // ── Binary segment (.ts) or encryption key: pipe directly ──
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    // Stream the response body
    const reader = upstream.body.getReader();
    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(Buffer.from(value));
      return pump();
    };
    return pump();

  } catch (err) {
    console.error('[AnimeProxy] Error:', err.message);
    res.status(502).json({ error: 'Proxy error', detail: err.message });
  }
});

router.get('/search', animeController.search);
router.get('/info/:id', animeController.getInfo);

// Supports /api/anime/watch/:animeId/:episodeId (Most specific first)
router.get('/watch/:animeId/:episodeId', animeController.watch);

// Supports /api/anime/watch/:episodeId
router.get('/watch/:episodeId', animeController.watch);

export default router;
