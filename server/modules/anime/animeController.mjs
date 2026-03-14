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

  try {
    const info = await animeService.getAnimeInfo(id);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get anime info' });
  }
};

export const watch = async (req, res) => {
  // episodeId will be present in both /watch/:episodeId and /watch/:animeId/:episodeId
  const { episodeId } = req.params;

  if (!episodeId || episodeId.length < 5) {
    return res.status(400).json({ success: false, message: 'Invalid or missing Episode ID' });
  }

  try {
    const data = await animeService.getEpisodeSources(episodeId);
    
    if (!data?.sources?.length) {
      return res.json({
        success: false,
        message: "No streaming sources available for this episode."
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get episode sources' });
  }
};
