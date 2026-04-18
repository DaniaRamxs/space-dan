import express from "express";
import ytSearch from "yt-search";

const router = express.Router();

// Simple TTL cache — replaces node-cache (removed with anime cleanup)
const _cache = new Map();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutos

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) { _cache.delete(key); return undefined; }
  return entry.value;
}

function cacheSet(key, value) {
  _cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

router.get("/youtube/search", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({
            error: "Missing query"
        });
    }

    const cacheKey = `yt_${query.toLowerCase().trim()}`;

    // 1️⃣ Revisar cache
    const cached = cacheGet(cacheKey);
    if (cached) {
        console.log(`[YouTube Search] Cache hit for: ${query}`);
        return res.json({
            source: "cache",
            data: cached
        });
    }

    try {
        // 2️⃣ Buscar en YouTube
        console.log(`[YouTube Search] Fetching from YouTube: ${query}`);
        const result = await ytSearch(query);

        const videos = result.videos.slice(0, 10).map(v => ({
            id: v.videoId,
            title: v.title,
            artist: v.author.name,
            channel: v.author.name,
            duration: v.timestamp,
            thumbnail: v.thumbnail,
            url: v.url
        }));

        // 3️⃣ Guardar cache
        cacheSet(cacheKey, videos);

        res.json({
            source: "youtube",
            data: videos
        });

    } catch (err) {
        console.error("[YouTube Search] Error:", err);

        res.status(500).json({
            error: "Search failed",
            message: err.message
        });
    }
});

export default router;
