// Manga Party — curated ambient music library
// To use: replace null URLs with:
//   YouTube → 'https://www.youtube.com/watch?v=VIDEO_ID'
//   Local   → '/music/filename.mp3'

export const ATMOSPHERE_META = {
  rain:   { label: 'Lluvia',  emoji: '🌧️', color: '#60a5fa' },
  lofi:   { label: 'Lo-Fi',   emoji: '🎧', color: '#a78bfa' },
  piano:  { label: 'Piano',   emoji: '🎹', color: '#f9a8d4' },
  forest: { label: 'Bosque',  emoji: '🌲', color: '#4ade80' },
  anime:  { label: 'Anime',   emoji: '🌸', color: '#f472b6' },
  city:   { label: 'Ciudad',  emoji: '🌃', color: '#fbbf24' },
};

export const MANGA_TRACKS = [
  // Rain (4 tracks)
  { id: 'rain-01', title: 'Heavy Rain & Thunder',  category: 'rain',   url: null },
  { id: 'rain-02', title: 'Soft Rain on Window',   category: 'rain',   url: null },
  { id: 'rain-03', title: 'Rain at Night',         category: 'rain',   url: null },
  { id: 'rain-04', title: 'Storm from Far Away',   category: 'rain',   url: null },
  // Lo-Fi (4 tracks)
  { id: 'lofi-01', title: 'Lo-Fi Chill Beats',     category: 'lofi',   url: null },
  { id: 'lofi-02', title: 'Late Night Study',      category: 'lofi',   url: null },
  { id: 'lofi-03', title: 'Rainy Day Lo-Fi',       category: 'lofi',   url: null },
  { id: 'lofi-04', title: 'Coffee Shop Beats',     category: 'lofi',   url: null },
  // Piano (4 tracks)
  { id: 'piano-01', title: 'Peaceful Piano',       category: 'piano',  url: null },
  { id: 'piano-02', title: 'Midnight Sonata',      category: 'piano',  url: null },
  { id: 'piano-03', title: 'Soft Melodies',        category: 'piano',  url: null },
  { id: 'piano-04', title: 'Ghibli Piano Covers',  category: 'piano',  url: null },
  // Forest (4 tracks)
  { id: 'forest-01', title: 'Forest Night Sounds', category: 'forest', url: null },
  { id: 'forest-02', title: 'Crickets & Wind',     category: 'forest', url: null },
  { id: 'forest-03', title: 'River & Birds',       category: 'forest', url: null },
  { id: 'forest-04', title: 'Deep Jungle',         category: 'forest', url: null },
  // Anime (4 tracks)
  { id: 'anime-01', title: 'Anime Instrumental Mix', category: 'anime', url: null },
  { id: 'anime-02', title: 'Peaceful Village OST',   category: 'anime', url: null },
  { id: 'anime-03', title: 'Quiet Afternoon',        category: 'anime', url: null },
  { id: 'anime-04', title: 'Wistful Memories',       category: 'anime', url: null },
  // Night City (4 tracks)
  { id: 'city-01', title: 'Tokyo Night Walk',      category: 'city',  url: null },
  { id: 'city-02', title: 'Rain on Asphalt',       category: 'city',  url: null },
  { id: 'city-03', title: 'Late Night Train',      category: 'city',  url: null },
  { id: 'city-04', title: 'Neon Street Ambience',  category: 'city',  url: null },
];
