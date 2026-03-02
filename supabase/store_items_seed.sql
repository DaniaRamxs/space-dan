-- ============================================================
-- space-dan :: Store Items Seed
-- Migra los items existentes de useShopItems.js a la DB
-- + Nuevos items: banners, frames, pet accessories
-- Ejecutar DESPUÉS de economy.sql
-- ============================================================

INSERT INTO public.store_items
  (id, category, title, description, price, rarity, icon, metadata, sort_order)
VALUES

-- ── CURSORES (existentes) ────────────────────────────────────
('cursor_cyan',    'cursor', 'Trail Cian',     'Partículas cian eléctrico',       50,  'common',    '💠',
 '{"colors": ["#00e5ff","#00bcd4"]}', 10),

('cursor_white',   'cursor', 'Trail Blanco',   'Partículas blanco puro y suave',  45,  'common',    '🤍',
 '{"colors": ["#f0f0f0","#c0c0c0"]}', 11),

('cursor_pink',    'cursor', 'Trail Magenta',  'Partículas rosa eléctrico',       60,  'common',    '🩷',
 '{"colors": ["#ff69b4","#ff1493"]}', 12),

('cursor_green',   'cursor', 'Trail Matrix',   'Partículas verde hacker',         75,  'rare',      '💚',
 '{"colors": ["#39ff14","#00ff88"]}', 13),

('cursor_gold',    'cursor', 'Trail Dorado',   'Partículas dorado exclusivo',     100, 'rare',      '✨',
 '{"colors": ["#ffd700","#ffaa00"]}', 14),

('cursor_rainbow', 'cursor', 'Trail Arcoíris', 'Todos los colores a la vez',      200, 'epic',      '🌈',
 '{"rainbow": true}', 15),

-- ── SCREENSAVERS (existentes) ───────────────────────────────
('saver_dvd',      'screensaver', 'DVD Bounce',  'Logo clásico rebotando',        80,  'common',    '📀',
 '{}', 20),

('saver_matrix',   'screensaver', 'Matrix Rain', 'Lluvia de código verde',        100, 'rare',      '🟩',
 '{}', 21),

('saver_pipes',    'screensaver', 'Tuberías 3D', 'Clásico Windows 95/98',         120, 'rare',      '🔧',
 '{}', 22),

-- ── ESTRELLAS (existentes) ──────────────────────────────────
('stars_blue',     'stars', 'Nebulosa Azul',     'Fondo estelar azul profundo',   80,  'common',    '🔵',
 '{"colors": ["#64b4ff","#0096ff"]}', 30),

('stars_green',    'stars', 'Estrellas Matrix',  'Fondo estelar verde hacker',    80,  'common',    '🟢',
 '{"colors": ["#64ff82","#00ff88"]}', 31),

('stars_red',      'stars', 'Inferno Stars',     'Fondo estelar rojo carmesí',    80,  'common',    '🔴',
 '{"colors": ["#ff7850","#ff3300"]}', 32),

('stars_purple',   'stars', 'Nebulosa Púrpura',  'Fondo estelar púrpura cósmico', 80,  'common',    '🟣',
 '{"colors": ["#b464ff","#8800ff"]}', 33),

-- ── RADIO (existentes) ──────────────────────────────────────
('radio_jcore',       'radio', 'J-Core Station', 'Anime beats y J-pop',           50,  'common',    '🎌',
 '{"stream": "http://yp.shoutcast.com/jcore"}', 40),

('radio_groove',      'radio', 'Groove Salad',   'Ambient electronica relajante', 50,  'common',    '🥗',
 '{"stream": "https://ice1.somafm.com/groovesalad-128-mp3"}', 41),

('radio_beatblender', 'radio', 'Beat Blender',   'Deep house y electro nocturno', 60,  'rare',      '🎛️',
 '{"stream": "https://ice1.somafm.com/beatblender-128-mp3"}', 42),

('radio_dronezone',   'radio', 'Drone Zone',     'Ambient cósmico y espacial',    50,  'common',    '🌌',
 '{"stream": "https://ice1.somafm.com/dronezone-128-mp3"}', 43),

('radio_secretagent', 'radio', 'Secret Agent',   'Spy jazz y lounge 60s',         55,  'common',    '🕵️',
 '{"stream": "https://ice1.somafm.com/secretagent-128-mp3"}', 44),

-- ── TEMAS (existentes) ──────────────────────────────────────
('theme_mono',    'theme', 'Mono Minimal',     'Escala de grises, sin colores',    100, 'common',    '⬛',
 '{"vars": {"--accent": "#f0f0f0", "--accent2": "#888888"}}', 50),

('theme_hacker',  'theme', 'Terminal Verde',   'Negro puro y verde terminal',      120, 'rare',      '💻',
 '{"vars": {"--accent": "#39ff14", "--accent2": "#00ff00"}}', 51),

('theme_forest',  'theme', 'Bosque Digital',   'Verde hacker sobre negro bosque',  150, 'rare',      '🌿',
 '{"vars": {"--accent": "#39ff14", "--accent2": "#00ff88"}}', 52),

('theme_ocean',   'theme', 'Deep Ocean',       'Azul celeste sobre azul profundo', 150, 'rare',      '🌊',
 '{"vars": {"--accent": "#00c6ff", "--accent2": "#0072ff"}}', 53),

('theme_sunset',  'theme', 'Sunset Retrowave', 'Naranja y hot pink, vibes 80s',    200, 'epic',      '🌅',
 '{"vars": {"--accent": "#ff6b35", "--accent2": "#ff0090"}}', 54),

-- ── BANNERS (nuevos) ─────────────────────────────────────────
('banner_galaxy',  'banner', 'Galaxia',      'Fondo con gradiente cosmos profundo y estrellas',   150, 'rare',      '🌌',
 '{"gradient": ["#0d0221","#190b3d","#4a1a6e"], "fx": "stars"}', 60),

('banner_cyber',   'banner', 'Cyber',        'Gradiente cian y magenta eléctrico',    120, 'rare',      '🖼️',
 '{"gradient": ["#00e5ff","#ff00ff"]}', 61),

('banner_nebula',  'banner', 'Nebulosa',     'Profundo púrpura cósmico',              150, 'rare',      '🌌',
 '{"gradient": ["#4c1d95","#1e1b4b"]}', 62),

('banner_gold',    'banner', 'Áureo',        'Elegancia en dorado y ámbar',           200, 'epic',      '✨',
 '{"gradient": ["#f59e0b","#78350f"]}', 63),

('banner_sunset',  'banner', 'Atardecer',    'Gradiente naranja-rosa cálido',         150, 'rare',      '🌅',
 '{"gradient": ["#f5a623","#f0588b"]}', 64),

('banner_matrix',  'banner', 'Matrix',       'Fondo oscuro con lluvia de código',     200, 'epic',      '💻',
 '{"gradient": ["#001a00","#003300"], "fx": "matrix"}', 65),

('banner_aurora',  'banner', 'Aurora',       'Efecto aurora boreal animado',          300, 'legendary', '✨',
 '{"gradient": ["#00c9ff","#92fe9d","#f7971e"], "animated": true}', 66),

('banner_retro',   'banner', 'Retro Pixel',  'Pixel art 8-bit nostálgico',            180, 'epic',      '👾',
 '{"gradient": ["#000033","#1a0033"], "fx": "scanlines"}', 67),

-- ── FRAMES / MARCOS (nuevos) ────────────────────────────────
('frame_stars',    'frame', 'Marco Estelar',   'Estrellas doradas animadas',      100, 'rare',   '⭐',
 '{"border": "animated-stars", "color": "#ffd700"}', 70),

('frame_neon',     'frame', 'Marco Neón',      'Borde de neón pulsante',          120, 'rare',   '💡',
 '{"border": "neon-pulse", "color": "#00e5ff"}', 71),

('frame_pixel',    'frame', 'Marco Pixel',     'Borde de pixel art retro',        80,  'common', '🟫',
 '{"border": "pixel", "color": "#ff6b35"}', 72),

('frame_holo',     'frame', 'Marco Holográfico','Efecto holográfico iridiscente',  250, 'epic',   '🌈',
 '{"border": "holographic", "animated": true}', 73),

('frame_crown',    'frame', 'Marco Corona',    'Solo para los más ricos',          500, 'legendary','👑',
 '{"border": "crown", "color": "#ffd700", "animated": true}', 74),

-- ── PET ACCESSORIES (nuevos) ────────────────────────────────
-- slot: head | body | hand | bg | extra
('pet_hat_cap',      'pet_accessory', 'Gorra',          'Una gorra simple y chill',            80,  'common',    '🧢',
 '{"slot": "head", "svg_id": "hat_cap"}', 80),

('pet_hat_wizard',   'pet_accessory', 'Sombrero Mago',  'Para los magos de la mazmorra',       150, 'rare',      '🧙',
 '{"slot": "head", "svg_id": "hat_wizard"}', 81),

('pet_hat_crown',    'pet_accessory', 'Corona',         'La mascota merece lo mejor',          300, 'epic',      '👑',
 '{"slot": "head", "svg_id": "hat_crown"}', 82),

('pet_glasses_nerd', 'pet_accessory', 'Gafas Nerd',     'Que no falte el intelecto',           90,  'common',    '🤓',
 '{"slot": "extra", "svg_id": "glasses_nerd"}', 83),

('pet_scarf',        'pet_accessory', 'Bufanda',        'Para los días de frío digital',       70,  'common',    '🧣',
 '{"slot": "body", "svg_id": "scarf"}', 84),

('pet_cape_hero',    'pet_accessory', 'Capa Héroe',     'Con gran poder, etc.',                200, 'epic',      '🦸',
 '{"slot": "body", "svg_id": "cape_hero"}', 85),

('pet_wand',         'pet_accessory', 'Varita Mágica',  'Hace POOF y aparecen Starlys',       120, 'rare',      '🪄',
 '{"slot": "hand", "svg_id": "wand"}', 86),

('pet_laptop',       'pet_accessory', 'Laptop',         'La mascota también trabaja',           150, 'rare',      '💻',
 '{"slot": "hand", "svg_id": "laptop"}', 87),

('pet_bg_space',     'pet_accessory', 'Fondo Espacio',  'La mascota flota en el cosmos',       100, 'rare',      '🌌',
 '{"slot": "bg", "svg_id": "bg_space"}', 88),

('pet_bg_forest',    'pet_accessory', 'Fondo Bosque',   'La mascota en el bosque digital',     100, 'rare',      '🌿',
 '{"slot": "bg", "svg_id": "bg_forest"}', 89)

ON CONFLICT (id) DO UPDATE SET
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  metadata    = EXCLUDED.metadata,
  sort_order  = EXCLUDED.sort_order;


-- ── Primer fondo comunitario de ejemplo ─────────────────────
INSERT INTO public.community_fund
  (name, description, goal, reward_type, reward_coins, status)
VALUES (
  'Fondo de Lanzamiento',
  'El primer fondo comunitario de space-dan. ¡Colabora para desbloquear una recompensa global para todos!',
  5000,
  'proportional',   -- Más justo: quien más dona, más recibe
  200,              -- Cada contribuidor recibe hasta 200 Starlys proporcional a su donación
  'active'
)
ON CONFLICT DO NOTHING;
