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
  // If id2 exists, we are in /watch/:animeId/:episodeId pattern
  // Otherwise, id1 is the episodeId in /watch/:episodeId pattern
  const { id1, id2 } = req.params;
  const episodeId = id2 || id1;

  if (!episodeId) return res.status(400).json({ error: 'Episode ID is required' });

  try {
    const sources = await animeService.getEpisodeSources(episodeId);
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get episode sources' });
  }
};
