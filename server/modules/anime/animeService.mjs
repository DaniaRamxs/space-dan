import pkg from '@consumet/extensions';

const { ANIME } = pkg;

// Print detected providers for debugging (useful when library updates)
console.log('[AnimeService] Available ANIME providers:', Object.keys(ANIME || {}));

/**
 * Detection of available providers using prioritized list
 * We prefer Gogoanime/AnimePahe for faster scraping, Zoro/Hianime for quality/subtitles
 */
// AnimeUnity is the primary provider — its CDN (vixcloud.co) is accessible
// from server-side requests (Railway) without Cloudflare blocking.
// AnimePahe's CDN (uwucdn.top) blocks server IPs even with correct Referer headers.
const GogoProvider = ANIME.AnimeUnity || ANIME.AnimePahe || ANIME.Hianime;
const ZoroProvider = ANIME.AnimePahe || ANIME.Hianime;

if (!GogoProvider) {
    console.error('[AnimeService] NO PRIMARY PROVIDER DETECTED! Check @consumet/extensions version.');
}

const gogoanime = GogoProvider ? new GogoProvider() : null;
const zoro = ZoroProvider ? new ZoroProvider() : null;

// Memory cache for successful results (3 min TTL to avoid expired stream tokens)
const sourceCache = new Map();

/**
 * Normalizes the response from different providers to have a consistent structure
 */
const normalizeSources = (data, providerName) => {
  const sources = data.sources || [];
  const subtitles = data.subtitles || [];
  
  // Try to find Spanish subtitles and move to front/mark as default
  const spanishSub = subtitles.find(s => 
    s.lang?.toLowerCase().includes('spanish') || 
    s.lang?.toLowerCase().includes('español') ||
    s.lang?.toLowerCase() === 'es-es' ||
    s.lang?.toLowerCase() === 'es'
  );

  // Move Spanish sub to the front if found
  if (spanishSub) {
    const others = subtitles.filter(s => s !== spanishSub);
    subtitles.length = 0;
    subtitles.push(spanishSub, ...others);
  }

  return {
    sources,
    subtitles,
    spanishSubFound: !!spanishSub,
    headers: data.headers || {},
    intro: data.intro || null,
    outro: data.outro || null,
    provider: providerName,
    success: true,
    timestamp: Date.now()
  };
};

/**
 * Search anime by query
 */
export const searchAnime = async (query) => {
  try {
    if (!gogoanime) throw new Error("No primary provider available for search");
    console.log(`[AnimeService] Search primary: ${query}`);
    let results = await gogoanime.search(query);
    let list = results.results || results || [];
    
    // Fallback search if primary returned nothing
    if (list.length === 0 && zoro) {
        console.warn(`[AnimeService] Primary search empty, trying fallback...`);
        results = await zoro.search(query);
        list = results.results || results || [];
    }

    // Normalize images and structure
    return list.map(anime => ({
        ...anime,
        image: anime.image || anime.img || anime.cover
    }));
  } catch (error) {
    console.error('[AnimeService] Search error:', error.message);
    // Silent fallback if first failed
    if (zoro) {
       try {
           const res = await zoro.search(query);
           const list = res.results || res || [];
           return list.map(anime => ({ ...anime, image: anime.image || anime.img || anime.cover }));
       } catch (e) {
           throw error;
       }
    }
    throw error;
  }
};

/**
 * Get anime info and episodes
 */
export const getAnimeInfo = async (animeId) => {
  console.log(`[AnimeService] getAnimeInfo: ${animeId}`);
  try {
    if (!gogoanime) throw new Error("No provider available for info");
    const fetchFn = gogoanime.fetchAnimeInfo || gogoanime.getAnimeInfo || gogoanime.fetchInfo;
    if (!fetchFn) throw new Error("Primary provider does not support fetching anime info");
    const info = await fetchFn.call(gogoanime, animeId);
    
    // Normalize image in info
    if (info) {
        info.image = info.image || info.img || info.cover;
    }
    return info;
  } catch (error) {
    console.error('[AnimeService] Info error (primary):', error.message);
    
    // Fallback to secondary provider
    if (zoro) {
        try {
            console.warn('[AnimeService] Trying fallback provider for info...');
            const fetchFn2 = zoro.fetchAnimeInfo || zoro.getAnimeInfo || zoro.fetchInfo;
            if (!fetchFn2) throw new Error("Fallback provider does not support fetching anime info");
            const info2 = await fetchFn2.call(zoro, animeId);
            if (info2) info2.image = info2.image || info2.img || info2.cover;
            return info2;
        } catch (err2) {
            console.error('[AnimeService] Info error (fallback):', err2.message);
        }
    }
    throw error;
  }
};

/**
 * Get streaming sources for an episode with fallback and safety checks
 */
export const getEpisodeSources = async (episodeId) => {
  // 1. Check Cache (3 min TTL is safe for HLS sessions)
  if (sourceCache.has(episodeId)) {
    const cached = sourceCache.get(episodeId);
    // Extra safety: check age even if TTL handles it
    if (Date.now() - cached.timestamp < 180000) {
        return cached;
    }
    sourceCache.delete(episodeId);
  }

  try {
    let response = null;

    // 2. Primary Provider (Gogo)
    if (gogoanime) {
        try {
          const fetchFn = gogoanime.fetchEpisodeSources || gogoanime.getEpisodeSources;
          if (!fetchFn) throw new Error("Primary provider cannot fetch sources");
          
          const res = await fetchFn.call(gogoanime, episodeId);
          if (res?.sources?.length > 0) {
            response = normalizeSources(res, 'gogoanime');
          } else {
            throw new Error("Gogo returned empty sources list");
          }
        } catch (err) {
          console.warn(`[AnimeService] Gogo fallback triggered for ${episodeId}:`, err.message);
        }
    }

    // 3. Fallback Provider
    if (!response && zoro) {
      try {
        console.warn(`[AnimeService] Attempting fallback provider...`);
        const fetchFn = zoro.fetchEpisodeSources || zoro.getEpisodeSources;
        if (!fetchFn) throw new Error("Fallback provider cannot fetch sources");

        const zoroRes = await fetchFn.call(zoro, episodeId);
        if (zoroRes?.sources?.length > 0) {
          response = normalizeSources(zoroRes, 'fallback');
        } else {
          throw new Error("Fallback also returned empty sources");
        }
      } catch (zoroErr) {
        console.error(`[AnimeService] All providers failed for ${episodeId}:`, zoroErr.message);
      }
    }

    // 4. Return or Error Object
    if (response) {
      console.log(`[AnimeService] Success! Found ${response.sources.length} sources and ${response.subtitles.length} subs.`);
      sourceCache.set(episodeId, response);
      setTimeout(() => sourceCache.delete(episodeId), 180000); 
      return response;
    }

    return {
      sources: [],
      subtitles: [],
      success: false,
      message: "Este episodio no está disponible actualmente. No se encontraron fuentes de video funcionando."
    };

  } catch (error) {
    console.error('[AnimeService] Terminal sources error:', error.message);
    return {
      sources: [],
      subtitles: [],
      success: false,
      message: "Error técnico al intentar obtener el video: " + error.message
    };
  }
};
