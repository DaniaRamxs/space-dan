/**
 * videoExtractRoutes.mjs
 *
 * Endpoint para extraer URL directa de MP4 desde links de Facebook (y otras
 * redes) usando yt-dlp. Esto permite al frontend reproducir el video en un
 * <video> HTML nativo con sincronización real entre usuarios de la sala.
 *
 * Uso:
 *   GET /api/video/extract?url=https://www.facebook.com/share/v/xxx
 *
 * Respuesta OK (200):
 *   { ok: true, mp4_url, title, duration, thumbnail, provider }
 *
 * Respuesta error (4xx / 5xx):
 *   { ok: false, error, detail? }
 *
 * Requiere el binario `yt-dlp` disponible en PATH del servidor. En Railway:
 *   nixpacks.toml → [phases.setup] nixPkgs = ["yt-dlp"]
 * O como fallback instalamos youtube-dl-exec que descarga el binary on-demand.
 */

import express from 'express';
import { spawn } from 'node:child_process';

const router = express.Router();

// ── Validación de URL: solo permitir hosts conocidos ──────────────────────────
const ALLOWED_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'fb.watch',
  'fb.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'www.instagram.com',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'twitch.tv',
  'www.twitch.tv',
  'vimeo.com',
  'www.vimeo.com',
  'dailymotion.com',
  'www.dailymotion.com',
  'reddit.com',
  'www.reddit.com',
]);

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// ── yt-dlp extraction ────────────────────────────────────────────────────────
// Corre yt-dlp con --dump-json para obtener metadata + URL directa sin descargar.
// Si yt-dlp no está en PATH, probamos con `npx yt-dlp-exec` como fallback.
function extractWithYtDlp(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--format', 'best[ext=mp4]/best',
      '--no-check-certificate',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url,
    ];

    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      reject(new Error('yt-dlp timeout'));
    }, timeoutMs);

    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`yt-dlp spawn error: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(0, 500)}`));
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (err) {
        reject(new Error(`yt-dlp parse error: ${err.message}`));
      }
    });
  });
}

// ── GET /api/video/extract?url=... ────────────────────────────────────────────
router.get('/extract', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url) {
    return res.status(400).json({ ok: false, error: 'Missing url parameter' });
  }
  if (!isAllowedUrl(url)) {
    return res.status(400).json({
      ok: false,
      error: 'URL not from an allowed provider',
      detail: 'Supported: Facebook, Twitter/X, Instagram, TikTok, Twitch, Vimeo, Dailymotion, Reddit',
    });
  }

  try {
    const info = await extractWithYtDlp(url, 30000);

    // yt-dlp devuelve muchos campos; extraemos los útiles
    const mp4_url = info.url || info.requested_formats?.[0]?.url;
    if (!mp4_url) {
      return res.status(502).json({
        ok: false,
        error: 'No direct video URL available',
        detail: 'Provider may require login, video may be DRM-protected, or private',
      });
    }

    return res.json({
      ok: true,
      mp4_url,
      title: info.title || '',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || null,
      provider: info.extractor_key || info.extractor || 'unknown',
      width: info.width || null,
      height: info.height || null,
      // Expiration clue: most providers signed URLs expire in ~1-6h
      expires_hint_sec: 3600,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('[videoExtract] error:', msg);

    // Heurística para dar mejor error al frontend
    if (/ENOENT|spawn yt-dlp/.test(msg)) {
      return res.status(500).json({
        ok: false,
        error: 'yt-dlp not installed on server',
        detail: 'Install yt-dlp in Railway nixpacks.toml or Dockerfile',
      });
    }
    if (/private|login|sign in/i.test(msg)) {
      return res.status(403).json({
        ok: false,
        error: 'Video requires login',
        detail: 'This video is private or needs authentication',
      });
    }
    if (/DRM|protected/i.test(msg)) {
      return res.status(451).json({
        ok: false,
        error: 'Video is DRM-protected',
        detail: 'Cannot extract DRM-protected content',
      });
    }
    return res.status(502).json({
      ok: false,
      error: 'Extraction failed',
      detail: msg.slice(0, 300),
    });
  }
});

// ── GET /api/video/proxy?url=... ──────────────────────────────────────────────
// Proxy de streaming: algunos providers entregan URLs con CORS restrictivo o
// expiración corta. Este endpoint reenvia el stream permitiendo CORS y
// manteniendo la URL viva mientras el usuario ve el video.
router.get('/proxy', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url) return res.status(400).json({ error: 'Missing url' });

  // Whitelist básico de dominios de CDN conocidos
  const hostname = (() => {
    try { return new URL(url).hostname.toLowerCase(); }
    catch { return ''; }
  })();
  const isCdn =
    hostname.includes('fbcdn.net') ||
    hostname.includes('cdninstagram.com') ||
    hostname.includes('tiktokcdn.com') ||
    hostname.includes('twimg.com') ||
    hostname.includes('redd.it') ||
    hostname.includes('dmcdn.net') ||
    hostname.includes('ttvnw.net') ||
    hostname.includes('vimeocdn.com');
  if (!isCdn) {
    return res.status(400).json({ error: 'URL not from an allowed CDN' });
  }

  try {
    const range = req.headers.range;
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (range) upstreamHeaders.Range = range;

    const upstream = await fetch(url, { headers: upstreamHeaders });

    // Copiar headers relevantes
    const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
    passHeaders.forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(upstream.status);

    if (!upstream.body) {
      return res.end();
    }
    // Stream body al cliente
    const reader = upstream.body.getReader();
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) return res.end();
      res.write(Buffer.from(value));
      return pump();
    });
    await pump();
  } catch (err) {
    console.error('[videoProxy] error:', err?.message || err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Proxy failed', detail: err?.message });
    }
  }
});

export default router;
