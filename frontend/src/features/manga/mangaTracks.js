// Manga Party — curated ambient music library
//
// Track shape:
//   id        — unique string
//   title     — display name
//   category  — key in ATMOSPHERE_META
//   url       — YouTube / MP3 URL  (null = placeholder, user must add URL)
//   credit    — optional attribution string
//
// Tracks with url: null appear greyed-out in the list.
// Users (host) can paste their own YouTube URLs via the Add URL button.

export const ATMOSPHERE_META = {
  rain:   { label: 'Lluvia',  emoji: '🌧️', color: '#60a5fa' },
  lofi:   { label: 'Lo-Fi',   emoji: '🎧', color: '#a78bfa' },
  piano:  { label: 'Piano',   emoji: '🎹', color: '#f9a8d4' },
  forest: { label: 'Bosque',  emoji: '🌲', color: '#4ade80' },
  anime:  { label: 'Anime',   emoji: '🌸', color: '#f472b6' },
  city:   { label: 'Ciudad',  emoji: '🌃', color: '#fbbf24' },
};

export const MANGA_TRACKS = [

  // ── Rain ──────────────────────────────────────────────────────────────────
  { id: 'rain-01', title: 'Rain & Thunder Ambience',  category: 'rain', url: 'https://www.youtube.com/watch?v=q76bMs-NwRk', credit: 'Ambient Sounds' },
  { id: 'rain-02', title: 'Heavy Rain & Thunder',     category: 'rain', url: null },
  { id: 'rain-03', title: 'Rain at Night',            category: 'rain', url: null },
  { id: 'rain-04', title: 'Storm from Far Away',      category: 'rain', url: null },

  // ── Lo-Fi ─────────────────────────────────────────────────────────────────
  { id: 'lofi-01', title: 'Lofi Girl · beats to relax/study', category: 'lofi', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', credit: 'Lofi Girl' },
  { id: 'lofi-02', title: 'Late Night Study',                 category: 'lofi', url: null },
  { id: 'lofi-03', title: 'Rainy Day Lo-Fi',                  category: 'lofi', url: null },
  { id: 'lofi-04', title: 'Coffee Shop Beats',                category: 'lofi', url: null },

  // ── Piano ─────────────────────────────────────────────────────────────────
  { id: 'piano-01', title: 'Peaceful Piano',      category: 'piano', url: null },
  { id: 'piano-02', title: 'Midnight Sonata',     category: 'piano', url: null },
  { id: 'piano-03', title: 'Soft Melodies',       category: 'piano', url: null },
  { id: 'piano-04', title: 'Ghibli Piano Covers', category: 'piano', url: null },

  // ── Forest ────────────────────────────────────────────────────────────────
  { id: 'forest-01', title: 'Forest Birds & Wind',  category: 'forest', url: 'https://www.youtube.com/watch?v=xNN7iTA57jM', credit: 'Nature Sounds' },
  { id: 'forest-02', title: 'Crickets & Wind',      category: 'forest', url: null },
  { id: 'forest-03', title: 'River & Birds',        category: 'forest', url: null },
  { id: 'forest-04', title: 'Deep Jungle',          category: 'forest', url: null },

  // ── Anime ─────────────────────────────────────────────────────────────────
  { id: 'anime-01', title: 'Anime Instrumental Mix', category: 'anime', url: null },
  { id: 'anime-02', title: 'Peaceful Village OST',   category: 'anime', url: null },
  { id: 'anime-03', title: 'Quiet Afternoon',        category: 'anime', url: null },
  { id: 'anime-04', title: 'Wistful Memories',       category: 'anime', url: null },

  // ── Night City ────────────────────────────────────────────────────────────
  { id: 'city-01', title: 'NYC City Ambience',    category: 'city', url: 'https://www.youtube.com/watch?v=7ROByNhNRN4', credit: 'City Sounds' },
  { id: 'city-02', title: 'Rain on Asphalt',      category: 'city', url: null },
  { id: 'city-03', title: 'Late Night Train',     category: 'city', url: null },
  { id: 'city-04', title: 'Neon Street Ambience', category: 'city', url: null },
];
