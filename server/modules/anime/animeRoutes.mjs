import { Router } from 'express';
import * as animeController from './animeController.mjs';

const router = Router();

// ─── HLS Stream Proxy ─────────────────────────────────────────────────────────
// Routes anime streams through the server to bypass CORS restrictions.
// AnimePahe CDN blocks direct browser requests but allows server-side fetches
// with the correct Referer/Origin headers.
//
// Flow:
//   browser → /api/anime/proxy?url=<m3u8>   ← this server   → CDN
//   browser ← rewritten m3u8                ← this server   ← CDN
//   browser → /api/anime/proxy?url=<seg.ts> ← this server   → CDN  (piped)

// CORS helper — always call this first, even before sending errors
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
}

// Build request headers for the CDN based on the target URL's hostname.
// Each CDN checks the Referer header to verify the request comes from a known site.
function buildCdnHeaders(targetUrl) {
  let referer = 'https://animeunity.so/';
  let origin  = 'https://animeunity.so';
  
  try {
    const { hostname } = new URL(targetUrl);
    if (hostname.includes('uwucdn') || hostname.includes('owocdn') || hostname.includes('animepahe')) {
      referer = 'https://animepahe.ru/';
      origin  = 'https://animepahe.ru';
    } else if (hostname.includes('vixcloud') || hostname.includes('animeunity')) {
      referer = 'https://animeunity.so/';
      origin  = 'https://animeunity.so';
    }
  } catch { /* keep defaults */ }

  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': referer,
    'Origin': origin,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  };
}

// Handle OPTIONS preflight (CORS pre-flight requests from browsers)
router.options('/proxy', (req, res) => {
  setCorsHeaders(res);
  res.status(204).end();
});

router.get('/proxy', async (req, res) => {
  setCorsHeaders(res); // ← ALWAYS first, before any potential error

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url query param' });

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // throws if malformed
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  console.log(`[AnimeProxy] → ${targetUrl.substring(0, 100)}`);

  let upstream;
  try {
    upstream = await fetch(targetUrl, { headers: buildCdnHeaders(targetUrl) });
  } catch (fetchErr) {
    console.error('[AnimeProxy] fetch() threw:', fetchErr.message);
    return res.status(502).json({ error: 'Could not reach CDN', detail: fetchErr.message });
  }

  console.log(`[AnimeProxy] ← status ${upstream.status} | type: ${upstream.headers.get('content-type') || 'unknown'}`);

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => '');
    console.error(`[AnimeProxy] CDN returned ${upstream.status}:`, body.substring(0, 200));
    return res.status(upstream.status).json({ 
      error: `CDN returned ${upstream.status}`,
      hint: upstream.status === 403 ? 'CDN may have expired the session or requires different headers' : undefined
    });
  }

  const contentType = upstream.headers.get('content-type') || '';
  const isM3U8 = targetUrl.includes('.m3u8') || 
                 contentType.includes('mpegurl') || 
                 contentType.includes('x-mpegURL');

  if (isM3U8) {
    // ── Playlist: read, rewrite all URLs, return ──────────────────────────────
    const text = await upstream.text();
    const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
    const proxyBase = '/api/anime/proxy?url=';

    const rewritten = text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();

        // Empty line — preserve
        if (!trimmed) return line;

        // Tag line — only rewrite URI="..." attributes (e.g., AES-128 key URIs)
        if (trimmed.startsWith('#')) {
          return line.replace(/URI="([^"]+)"/g, (_, uri) => {
            const abs = uri.startsWith('http') ? uri : baseUrl + uri;
            return `URI="${proxyBase}${encodeURIComponent(abs)}"`;
          });
        }

        // Segment line (absolute or relative URL)
        const abs = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
        return `${proxyBase}${encodeURIComponent(abs)}`;
      })
      .join('\n');

    console.log(`[AnimeProxy] M3U8 rewritten (${rewritten.split('\n').length} lines)`);
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    return res.send(rewritten);
  }

  // ── Binary segment (.ts) or AES key: stream directly ─────────────────────
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);

  // Use Node.js stream pipeline for efficiency (avoids memory spikes on large .ts files)
  try {
    const { Readable } = await import('stream');
    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.pipe(res);
    nodeStream.on('error', (err) => {
      console.error('[AnimeProxy] Stream error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });
  } catch (pipeErr) {
    console.error('[AnimeProxy] Pipe error:', pipeErr.message);
    if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
  }
});


router.get('/search', animeController.search);
router.get('/info/:id', animeController.getInfo);
router.get('/watch', animeController.watch);

// Supports /api/anime/watch/:animeId/:episodeId (Most specific first)
router.get('/watch/:animeId/:episodeId', animeController.watch);

// Supports /api/anime/watch/:episodeId
router.get('/watch/:episodeId', animeController.watch);

export default router;
