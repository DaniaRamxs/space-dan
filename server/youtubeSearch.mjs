import express from "express";
import ytSearch from "yt-search";
import NodeCache from "node-cache";

const router = express.Router();

// Cache 20 minutos
const cache = new NodeCache({ stdTTL: 1200 });

router.get("/youtube/search", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({
            error: "Missing query"
        });
    }

    const cacheKey = `yt_${query.toLowerCase().trim()}`;

    // 1️⃣ Revisar cache
    const cached = cache.get(cacheKey);
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
        cache.set(cacheKey, videos);

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
