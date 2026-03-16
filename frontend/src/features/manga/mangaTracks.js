// Manga Party — curated ambient music library
//
// Track shape:
//   id        — unique string
//   title     — display name
//   category  — key in ATMOSPHERE_META
//   url       — YouTube / MP3 URL  (null = not configured)
//   generated — true = played via Web Audio API (no URL needed)
//   credit    — optional attribution string
//
// To activate a null-URL track, paste a YouTube URL in the music player
// or replace null with 'https://www.youtube.com/watch?v=VIDEO_ID'

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
  // rain-01: Web Audio generator (works offline, no URL needed)
  { id: 'rain-01', title: 'Lluvia suave · Web Audio',  category: 'rain', generated: true,  url: null, credit: 'Generado localmente' },
  { id: 'rain-02', title: 'Heavy Rain & Thunder',       category: 'rain', generated: false, url: null },
  { id: 'rain-03', title: 'Rain at Night',              category: 'rain', generated: false, url: null },
  { id: 'rain-04', title: 'Storm from Far Away',        category: 'rain', generated: false, url: null },

  // ── Lo-Fi ─────────────────────────────────────────────────────────────────
  // lofi-01: Lofi Girl 24/7 radio — one of the most-watched YouTube live streams
  { id: 'lofi-01', title: 'Lofi Girl · beats to relax/study', category: 'lofi', generated: false, url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', credit: 'Lofi Girl' },
  { id: 'lofi-02', title: 'Late Night Study',                 category: 'lofi', generated: false, url: null },
  { id: 'lofi-03', title: 'Rainy Day Lo-Fi',                  category: 'lofi', generated: false, url: null },
  { id: 'lofi-04', title: 'Coffee Shop Beats',                category: 'lofi', generated: false, url: null },

  // ── Piano ─────────────────────────────────────────────────────────────────
  { id: 'piano-01', title: 'Peaceful Piano',      category: 'piano', generated: false, url: null },
  { id: 'piano-02', title: 'Midnight Sonata',     category: 'piano', generated: false, url: null },
  { id: 'piano-03', title: 'Soft Melodies',       category: 'piano', generated: false, url: null },
  { id: 'piano-04', title: 'Ghibli Piano Covers', category: 'piano', generated: false, url: null },

  // ── Forest ────────────────────────────────────────────────────────────────
  // forest-01: Web Audio generator (works offline, no URL needed)
  { id: 'forest-01', title: 'Bosque nocturno · Web Audio', category: 'forest', generated: true,  url: null, credit: 'Generado localmente' },
  { id: 'forest-02', title: 'Crickets & Wind',             category: 'forest', generated: false, url: null },
  { id: 'forest-03', title: 'River & Birds',               category: 'forest', generated: false, url: null },
  { id: 'forest-04', title: 'Deep Jungle',                 category: 'forest', generated: false, url: null },

  // ── Anime ─────────────────────────────────────────────────────────────────
  { id: 'anime-01', title: 'Anime Instrumental Mix', category: 'anime', generated: false, url: null },
  { id: 'anime-02', title: 'Peaceful Village OST',   category: 'anime', generated: false, url: null },
  { id: 'anime-03', title: 'Quiet Afternoon',        category: 'anime', generated: false, url: null },
  { id: 'anime-04', title: 'Wistful Memories',       category: 'anime', generated: false, url: null },

  // ── Night City ────────────────────────────────────────────────────────────
  // city-01: Web Audio generator
  { id: 'city-01', title: 'Ciudad nocturna · Web Audio', category: 'city', generated: true,  url: null, credit: 'Generado localmente' },
  { id: 'city-02', title: 'Rain on Asphalt',             category: 'city', generated: false, url: null },
  { id: 'city-03', title: 'Late Night Train',            category: 'city', generated: false, url: null },
  { id: 'city-04', title: 'Neon Street Ambience',        category: 'city', generated: false, url: null },
];
