import * as animeService from './animeService.mjs';

export const search = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

  try {
    const results = await animeService.searchAnime(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search anime' });
  }
};

export const getInfo = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Anime ID is required' });

  console.log(`[AnimeController] getInfo: ${id}`);

  try {
    const info = await animeService.getAnimeInfo(id);
    res.json(info);
  } catch (error) {
    console.error('[AnimeController] getInfo error:', error.message);
    res.status(500).json({ error: 'Failed to get anime info', detail: error.message });
  }
};

export const watch = async (req, res) => {
  // AnimePahe uses a composite format: animeId/sessionToken
  // When the route is /watch/:animeId/:episodeId, Express splits it into two params.
  // We rejoin them to reconstruct the full episodeId.
  const { animeId, episodeId } = req.params;
  
  // Reconstruct composite ID if both parts are present
  const fullEpisodeId = animeId && episodeId ? `${animeId}/${episodeId}` : (episodeId || animeId);

  if (!fullEpisodeId || fullEpisodeId.length < 5) {
    return res.status(400).json({ success: false, message: 'Invalid or missing Episode ID' });
  }

  console.log(`[AnimeController] watch: ${fullEpisodeId}`);

  try {
    const data = await animeService.getEpisodeSources(fullEpisodeId);
    
    if (!data?.sources?.length) {
      return res.json({
        success: false,
        message: data?.message || "No streaming sources available for this episode."
      });
    }

    res.json(data);
  } catch (error) {
    console.error('[AnimeController] watch error:', error.message);
    res.status(500).json({ error: 'Failed to get episode sources', detail: error.message });
  }
};
