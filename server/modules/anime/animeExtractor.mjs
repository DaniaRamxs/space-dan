/**
 * animeExtractor.mjs
 *
 * Server-side extraction of direct HLS/MP4 URLs from video embed services.
 * AnimeFLV (and other Latin American sites) embed their videos in third-party
 * players. This module fetches those embed pages server-side and extracts the
 * real streamable URL so the native HLS player can play it directly.
 *
 * Supported services:
 *  - ok.ru (Odnoklassniki) — primary AnimeFLV server
 *  - YourupLoad
 *  - StreamWish / FileLions / StreamHide variants
 *  - Streamtape (partial)
 *  - Generic .m3u8/.mp4 passthrough
 */

import axios from 'axios';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const httpGet = (url, headers = {}) =>
  axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': UA, ...headers },
    maxRedirects: 5,
  });

// ── ok.ru ──────────────────────────────────────────────────────────────────────
// ok.ru embeds store the manifest URL inside a JSON blob in the `data-options`
// attribute of the player container. After HTML-entity decoding it has the shape:
//   { "flashvars": { "hlsManifestUrl": "https://mycdn.me/...", ... }, ... }
export async function extractOkru(embedUrl, referer = 'https://www3.animeflv.net/') {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const resp = await httpGet(fullUrl, {
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
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        const obj = JSON.parse(raw);
        const hls =
          obj?.flashvars?.hlsManifestUrl ||
          obj?.flashvars?.hlsMasterUrl ||
          obj?.hlsManifestUrl;
        if (hls) {
          console.log('[extractor] ok.ru method1 OK');
          return hls;
        }
      } catch (_) {}
    }

    // Method 2: raw "hlsManifestUrl":"..." in any script
    const m2 = html.match(/"hlsManifestUrl"\s*:\s*"([^"]+)"/);
    if (m2) {
      console.log('[extractor] ok.ru method2 OK');
      return m2[1].replace(/\\\//g, '/');
    }

    // Method 3: any inline .m3u8 URL
    const m3 = html.match(/(https?:(?:\\\/\\\/|\/\/)[^"'\\]+\.m3u8[^"'\\]*)/);
    if (m3) {
      console.log('[extractor] ok.ru method3 OK');
      return m3[1].replace(/\\\//g, '/');
    }

    console.warn('[extractor] ok.ru: no HLS found in page');
  } catch (err) {
    console.warn('[extractor] ok.ru failed:', err.message);
  }
  return null;
}

// ── YourupLoad ─────────────────────────────────────────────────────────────────
export async function extractYourupload(embedUrl, referer = 'https://www3.animeflv.net/') {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const resp = await httpGet(fullUrl, { Referer: referer });
    const html = resp.data;

    // jwplayer / video.js setup — look for file property
    const fm = html.match(/file\s*:\s*['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i);
    if (fm) { console.log('[extractor] yourupload OK'); return fm[1]; }

    const sm = html.match(/<source[^>]+src=['"]([^'"]+\.(?:m3u8|mp4)[^'"]*)['"]/i);
    if (sm) { console.log('[extractor] yourupload <source> OK'); return sm[1]; }
  } catch (err) {
    console.warn('[extractor] YourupLoad failed:', err.message);
  }
  return null;
}

// ── StreamWish / FileLions / StreamHide ────────────────────────────────────────
// These services put the HLS source inside a jwplayer or JWPlayer setup call.
export async function extractStreamWish(embedUrl, referer = 'https://www3.animeflv.net/') {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const resp = await httpGet(fullUrl, { Referer: referer });
    const html = resp.data;

    // jwplayer sources array
    const srcMatch = html.match(/sources\s*:\s*\[\s*\{[^}]*file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (srcMatch) { console.log('[extractor] streamwish sources OK'); return srcMatch[1]; }

    // Plain file: "url"
    const fileMatch = html.match(/file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
    if (fileMatch) { console.log('[extractor] streamwish file OK'); return fileMatch[1]; }

    // var sources / var player with hls
    const varMatch = html.match(/["']file["']\s*:\s*["']([^"']+\.m3u8[^"']*)/i);
    if (varMatch) { console.log('[extractor] streamwish var OK'); return varMatch[1]; }
  } catch (err) {
    console.warn('[extractor] StreamWish failed:', err.message);
  }
  return null;
}

// ── Streamtape ─────────────────────────────────────────────────────────────────
// Streamtape uses JS-level obfuscation; we try a best-effort regex approach.
export async function extractStreamtape(embedUrl) {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const resp = await httpGet(fullUrl);
    const html = resp.data;

    // The download link is built as document.getElementById('idecon').innerHTML concatenation.
    // Try to capture the assembled URL from the helper script block.
    const block = html.match(/document\.getElementById\('norobotlink'\)[^<]+/);
    if (block) {
      const urlParts = block[0].match(/https?:\/\/[^"'\s]+/g);
      if (urlParts) { console.log('[extractor] streamtape OK'); return urlParts[0]; }
    }
    const direct = html.match(/https:\/\/streamtape\.com\/get_video\?[^"'\s]+/);
    if (direct) return direct[0];
  } catch (err) {
    console.warn('[extractor] Streamtape failed:', err.message);
  }
  return null;
}

// ── Doodstream ─────────────────────────────────────────────────────────────────
// Doodstream builds the URL client-side; extraction requires two requests.
export async function extractDoodstream(embedUrl) {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const resp = await httpGet(fullUrl, { Referer: 'https://dood.to/' });
    const html = resp.data;

    // Pass token approach: /pass_md5/{id}/{token}
    const passMatch = html.match(/\/pass_md5\/([^'"?]+)/);
    if (!passMatch) return null;

    const passUrl = 'https://dood.to' + passMatch[0];
    const passResp = await httpGet(passUrl, { Referer: fullUrl });
    const base = passResp.data; // partial URL

    // Dood appends a random token param and timestamp
    const token = html.match(/\?token=([^&'"]+)/)?.[1] || '';
    if (base && base.startsWith('http')) {
      const finalUrl = `${base}?token=${token}&expiry=${Date.now()}`;
      console.log('[extractor] doodstream OK');
      return finalUrl;
    }
  } catch (err) {
    console.warn('[extractor] Doodstream failed:', err.message);
  }
  return null;
}

// ── Generic fallback ───────────────────────────────────────────────────────────
async function extractGeneric(embedUrl, referer) {
  try {
    const fullUrl = embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
    const resp = await httpGet(fullUrl, { Referer: referer });
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
 * @param {string} serverName  AnimeFLV server identifier (e.g. "okru", "mega")
 * @param {string} embedUrl    Embed/code URL for that server
 * @param {string} [referer]   Referer to send when fetching the embed page
 * @returns {Promise<string|null>} Direct .m3u8 or .mp4 URL, or null
 */
export async function extractEmbedUrl(serverName, embedUrl, referer = 'https://www3.animeflv.net/') {
  const server = (serverName || '').toLowerCase();
  const raw = (embedUrl || '').trim();
  const fullUrl = raw.startsWith('//') ? 'https:' + raw : raw;

  if (!fullUrl || !fullUrl.startsWith('http')) return null;

  // Already a direct stream — return as-is
  if (fullUrl.includes('.m3u8') || fullUrl.includes('.mp4')) return fullUrl;

  console.log(`[animeExtractor] ${server} → ${fullUrl.substring(0, 90)}`);

  if (server === 'okru' || server === 'ok' || fullUrl.includes('ok.ru')) {
    return extractOkru(fullUrl, referer);
  }
  if (server === 'yourupload' || fullUrl.includes('yourupload.com')) {
    return extractYourupload(fullUrl, referer);
  }
  if (
    server === 'sw' ||
    server === 'streamwish' ||
    server === 'filelions' ||
    server === 'streamhide' ||
    fullUrl.includes('streamwish') ||
    fullUrl.includes('filelions') ||
    fullUrl.includes('streamhide')
  ) {
    return extractStreamWish(fullUrl, referer);
  }
  if (server === 'streamtape' || server === 'tape' || fullUrl.includes('streamtape')) {
    return extractStreamtape(fullUrl);
  }
  if (server === 'doodstream' || server === 'dood' || fullUrl.includes('dood')) {
    return extractDoodstream(fullUrl);
  }

  return extractGeneric(fullUrl, referer);
}

/**
 * Given a list of sources with format='embed', resolve all embed URLs to direct
 * HLS/MP4 streams concurrently (with a per-source timeout safety net).
 *
 * @param {Array} sources  Array of source objects { server, url|directUrl, isDub, ... }
 * @param {string} referer Referer header for CDN requests
 * @returns {Promise<Array>} Sources with format/url updated to direct streams
 */
export async function resolveEmbedSources(sources, referer = 'https://www3.animeflv.net/') {
  const settled = await Promise.allSettled(
    sources.map(async (src) => {
      const embedUrl = src.url || src.directUrl || src.code;
      const serverName = src.server || '';

      // Already direct
      if (src.format !== 'embed' && src.sourceType !== 'embed') return src;

      const directUrl = await extractEmbedUrl(serverName, embedUrl, referer);
      if (!directUrl) return null;

      return {
        ...src,
        url: directUrl,
        format: directUrl.includes('.m3u8') ? 'hls' : 'mp4',
        sourceType: directUrl.includes('.m3u8') ? 'hls' : 'mp4',
      };
    })
  );

  return settled
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
}
