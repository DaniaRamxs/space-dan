/**
 * videoExtractRoutes.mjs
 *
 * Endpoint para extraer URL directa de MP4 desde links de Facebook (y otras
 * redes) usando yt-dlp. Esto permite al frontend reproducir el video en un
 * <video> HTML nativo con sincronización real entre usuarios de la sala.
 *
 * Uso:
 *   GET /api/video/health  → diagnóstico de yt-dlp / youtube-dl-exec
 *   GET /api/video/extract?url=https://www.facebook.com/share/v/xxx
 *
 * Respuesta OK (200):
 *   { ok: true, mp4_url, title, duration, thumbnail, provider }
 *
 * Implementación:
 *   1er intento: `youtube-dl-exec` (npm package, trae binary propio)
 *   2do intento: `yt-dlp` del sistema via spawn (si está en PATH)
 */

import express from 'express';
import { spawn } from 'node:child_process';

const router = express.Router();

// ── Lazy-load de youtube-dl-exec para NO crashear el server al importar ──────
// Si el binary no se descargó (por ej. Railway build sin postinstall), no
// queremos que el require rompa el arranque del servidor completo.
let youtubeDl = null;
let youtubeDlLoadError = null;
async function loadYoutubeDl() {
  if (youtubeDl) return youtubeDl;
  if (youtubeDlLoadError) throw youtubeDlLoadError;
  try {
    const mod = await import('youtube-dl-exec');
    youtubeDl = mod.default || mod;
    return youtubeDl;
  } catch (err) {
    youtubeDlLoadError = err;
    throw err;
  }
}

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

// ── Fallback: yt-dlp via spawn (si está en PATH del sistema) ─────────────────
function extractWithSystemYtDlp(url, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--format', 'best[ext=mp4]/best',
      '--no-check-certificate',
      '--user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url,
    ];
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      reject(new Error('yt-dlp (system) timeout'));
    }, timeoutMs);
    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`system yt-dlp spawn: ${err.code || err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`system yt-dlp exit ${code}: ${stderr.slice(0, 400)}`));
      try { resolve(JSON.parse(stdout)); }
      catch (err) { reject(new Error(`system yt-dlp parse: ${err.message}`)); }
    });
  });
}

async function extractVideo(url) {
  // 1er intento: youtube-dl-exec (npm package con binary bundle)
  try {
    const ytdl = await loadYoutubeDl();
    const info = await ytdl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noPlaylist: true,
      format: 'best[ext=mp4]/best',
      noCheckCertificates: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    return { info, source: 'youtube-dl-exec' };
  } catch (err1) {
    console.warn('[videoExtract] youtube-dl-exec falló:', err1?.message?.slice(0, 200));
    // 2do intento: yt-dlp del sistema
    try {
      const info = await extractWithSystemYtDlp(url);
      return { info, source: 'system-yt-dlp' };
    } catch (err2) {
      // Lanzar el error más informativo (el de youtube-dl-exec tiene stderr del yt-dlp real)
      const err = new Error(
        `Both extractors failed. 1) ${err1?.message || err1}. 2) ${err2?.message || err2}`
      );
      err.stderr = err1?.stderr || err2?.stderr || '';
      throw err;
    }
  }
}

// ── GET /api/video/health ─────────────────────────────────────────────────────
// Diagnostica si youtube-dl-exec y/o yt-dlp del sistema están disponibles.
router.get('/health', async (_req, res) => {
  const result = {
    ok: false,
    youtubeDlExec: { available: false, version: null, error: null },
    systemYtDlp: { available: false, version: null, error: null },
  };

  // Check youtube-dl-exec
  try {
    const ytdl = await loadYoutubeDl();
    try {
      const version = await ytdl('--version', { dumpJson: false }).catch(() => null);
      result.youtubeDlExec.available = true;
      result.youtubeDlExec.version = typeof version === 'string' ? version.trim() : 'ok';
    } catch (err) {
      // Si el wrapper importa bien pero falla al ejecutar, aún lo contamos como disponible
      result.youtubeDlExec.available = true;
      result.youtubeDlExec.version = 'loaded-but-exec-failed';
      result.youtubeDlExec.error = String(err?.message || err).slice(0, 300);
    }
  } catch (err) {
    result.youtubeDlExec.error = String(err?.message || err).slice(0, 300);
  }

  // Check system yt-dlp
  try {
    const v = await new Promise((resolve, reject) => {
      const c = spawn('yt-dlp', ['--version']);
      let out = '';
      c.stdout.on('data', (d) => { out += d.toString(); });
      c.on('error', (e) => reject(e));
      c.on('close', (code) => code === 0 ? resolve(out.trim()) : reject(new Error(`exit ${code}`)));
      setTimeout(() => { try { c.kill(); } catch {} reject(new Error('timeout')); }, 5000);
    });
    result.systemYtDlp.available = true;
    result.systemYtDlp.version = v;
  } catch (err) {
    result.systemYtDlp.error = String(err?.message || err).slice(0, 200);
  }

  result.ok = result.youtubeDlExec.available || result.systemYtDlp.available;
  res.status(result.ok ? 200 : 503).json(result);
});

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
      detail:
        'Supported: Facebook, Twitter/X, Instagram, TikTok, Twitch, Vimeo, Dailymotion, Reddit',
    });
  }

  try {
    const { info, source } = await extractVideo(url);

    const mp4_url = info.url || info.requested_formats?.[0]?.url;
    if (!mp4_url) {
      return res.status(502).json({
        ok: false,
        error: 'No direct video URL available',
        detail:
          'Provider may require login, video may be DRM-protected, or private',
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
      expires_hint_sec: 3600,
      extracted_by: source,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    const stderr = err?.stderr || '';
    const combined = `${msg}\n${stderr}`;
    console.error('[videoExtract] error:', combined.slice(0, 1000));

    // Heurística para dar mejor error al frontend
    if (/python/i.test(combined) && /not found|ENOENT/i.test(combined)) {
      return res.status(500).json({
        ok: false,
        error: 'Python runtime missing on server',
        detail:
          'yt-dlp requires Python 3. Install python3 in the server image',
      });
    }
    if (/private|login|sign in|cookies/i.test(combined)) {
      return res.status(403).json({
        ok: false,
        error: 'Video requires login',
        detail: 'This video is private or the provider wants authentication',
      });
    }
    if (/DRM|protected/i.test(combined)) {
      return res.status(451).json({
        ok: false,
        error: 'Video is DRM-protected',
        detail: 'Cannot extract DRM-protected content',
      });
    }
    if (/unsupported URL|no video formats/i.test(combined)) {
      return res.status(400).json({
        ok: false,
        error: 'Unsupported URL',
        detail: 'Could not find a video at this link',
      });
    }
    return res.status(502).json({
      ok: false,
      error: 'Extraction failed',
      detail: msg.slice(0, 400),
    });
  }
});

// ── GET /api/video/proxy?url=... ──────────────────────────────────────────────
router.get('/proxy', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!url) return res.status(400).json({ error: 'Missing url' });

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
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (range) upstreamHeaders.Range = range;

    const upstream = await fetch(url, { headers: upstreamHeaders });

    const passHeaders = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'last-modified', 'etag',
    ];
    passHeaders.forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(upstream.status);

    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    const pump = () =>
      reader.read().then(({ done, value }) => {
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
