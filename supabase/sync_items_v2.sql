-- ============================================================
-- sync_items_v2.sql :: Sincronización Total de Catálogo
-- ============================================================

-- 1. Asegurar categorías
DO $$ 
BEGIN 
    ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_category_check;
    ALTER TABLE public.store_items ADD CONSTRAINT store_items_category_check 
    CHECK (category IN (
        'banner', 'frame', 'pet_accessory', 'cursor', 'theme', 'stars', 'radio',
        'nickname_style', 'profile_theme', 'role', 'ambient_sound'
    ));
END $$;

-- 2. Insertar/Actualizar TODOS los items de useShopItems.js
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, metadata)
VALUES 
-- CURSORES
('cursor_cyan', 'cursor', 'Trail Cian', 'Partículas cian eléctrico', 50, 'common', '💠', '{"colors": ["#00e5ff", "#00bcd4"]}'),
('cursor_green', 'cursor', 'Trail Matrix', 'Partículas verde hacker', 75, 'rare', '💚', '{"colors": ["#39ff14", "#00ff88"]}'),
('cursor_gold', 'cursor', 'Trail Dorado', 'Partículas dorado exclusivo', 100, 'rare', '✨', '{"colors": ["#ffd700", "#ffaa00"]}'),
('cursor_rainbow', 'cursor', 'Trail Arcoíris', 'Todos los colores a la vez', 200, 'epic', '🌈', '{"rainbow": true}'),
('cursor_pink', 'cursor', 'Trail Magenta', 'Partículas rosa eléctrico', 60, 'common', '🩷', '{"colors": ["#ff69b4", "#ff1493"]}'),
('cursor_white', 'cursor', 'Trail Blanco', 'Partículas blanco puro y suave', 45, 'common', '🤍', '{"colors": ["#f0f0f0", "#c0c0c0"]}'),

-- ESTRELLAS
('stars_blue', 'stars', 'Nebulosa Azul', 'Fondo estelar azul profundo', 80, 'common', '🔵', '{"colors": ["#64b4ff", "#0096ff"]}'),
('stars_green', 'stars', 'Estrellas Matrix', 'Fondo estelar verde hacker', 80, 'common', '🟢', '{"colors": ["#64ff82", "#00ff88"]}'),
('stars_red', 'stars', 'Inferno Stars', 'Fondo estelar rojo carmesí', 80, 'common', '🔴', '{"colors": ["#ff7850", "#ff3300"]}'),
('stars_purple', 'stars', 'Nebulosa Púrpura', 'Fondo estelar púrpura cósmico', 80, 'common', '🟣', '{"colors": ["#b464ff", "#8800ff"]}'),

-- RADIO
('radio_jcore', 'radio', 'J-Core Station', 'Anime beats y J-pop', 50, 'common', '🎌', '{"stream": "http://yp.shoutcast.com/jcore"}'),
('radio_groove', 'radio', 'Groove Salad', 'Ambient electronica relajante', 50, 'common', '🥗', '{"stream": "https://ice1.somafm.com/groovesalad-128-mp3"}'),
('radio_beatblender', 'radio', 'Beat Blender', 'Deep house e electro nocturno', 60, 'rare', '🎛️', '{"stream": "https://ice1.somafm.com/beatblender-128-mp3"}'),
('radio_dronezone', 'radio', 'Drone Zone', 'Ambient cósmico y espacial', 50, 'common', '🌌', '{"stream": "https://ice1.somafm.com/dronezone-128-mp3"}'),
('radio_secretagent', 'radio', 'Secret Agent', 'Spy jazz y lounge 60s', 55, 'common', '🕵️', '{"stream": "https://ice1.somafm.com/secretagent-128-mp3"}'),
('radio_kpop', 'radio', 'K-Pop Universe', 'Hits del K-Pop en vivo', 120, 'rare', '🇰🇷', '{"stream": "https://listen.moe/stream"}'),

-- TEMAS
('theme_forest', 'theme', 'Bosque Digital', 'Estética verde terminal selvática', 150, 'rare', '🌿', '{"vars": {"--accent": "#39ff14", "--accent2": "#00ff88"}}'),
('theme_ocean', 'theme', 'Deep Ocean', 'Gradiente oceánico profundo', 150, 'rare', '🌊', '{"vars": {"--accent": "#00c6ff", "--accent2": "#0072ff"}}'),
('theme_sunset', 'theme', 'Sunset Retrowave', 'Vibras 80s rosa y naranja', 200, 'epic', '🌅', '{"vars": {"--accent": "#ff6b35", "--accent2": "#ff0090"}}'),
('theme_hacker', 'theme', 'Terminal Verde', 'Verde fósforo puro sobre negro', 120, 'rare', '💻', '{"vars": {"--accent": "#39ff14", "--accent2": "#00ff00"}}'),
('theme_mono', 'theme', 'Mono Minimal', 'Escala de grises elegante', 100, 'common', '⬛', '{"vars": {"--accent": "#f0f0f0", "--accent2": "#888888"}}'),

-- BANNERS
('banner_galaxy', 'banner', 'Corazón de Galaxia', 'Gradiente profundo cosmos', 150, 'rare', '🌌', '{"gradient": ["#0d0221", "#240b36", "#c31432"], "fx": "stars"}'),
('banner_cyber', 'banner', 'Neon Overload', 'Cian y magenta fusionados', 120, 'rare', '🖼️', '{"gradient": ["#00d2ff", "#3a7bd5", "#ff00ff"]}'),
('banner_nebula', 'banner', 'Velo de Orión', 'Púrpuras y azules místicos', 150, 'rare', '🌌', '{"gradient": ["#6a11cb", "#2575fc"]}'),
('banner_gold', 'banner', 'Prestigio Áureo', 'Oro puro líquido', 200, 'epic', '✨', '{"gradient": ["#bf953f", "#fcf6ba", "#b38728", "#fbf5b7", "#aa771c"]}'),
('banner_matrix', 'banner', 'Source Code', 'Realidad binaria en cascada', 200, 'epic', '💻', '{"gradient": ["#000000", "#003300"], "fx": "matrix"}'),
('banner_aurora', 'banner', 'Aurora Boreal', 'Fenómeno atmosférico animado', 300, 'legendary', '✨', '{"gradient": ["#12c2e9", "#c471ed", "#f64f59"], "animated": true}'),
('banner_retro', 'banner', '8-Bit Nostalgia', 'Vibras arcade retro', 180, 'epic', '👾', '{"gradient": ["#23074d", "#cc5333"], "fx": "scanlines"}'),
('banner_void', 'banner', 'Vacío Absoluto', 'Negro profundo devorador de luz', 400, 'legendary', '🌑', '{"gradient": ["#000000", "#1a1a1a", "#000000"], "fx": "void"}'),
('banner_pink_nebula', 'banner', 'Nebulosa Rosa', 'Polvo estelar rosa brillante', 180, 'rare', '🌸', '{"gradient": ["#ff00cc", "#333399"], "fx": "stars"}'),

-- NICKNAMES
('nick_kawaii', 'nickname_style', 'Estilo Kawaii', '¿Te sientes muy onichan?', 250, 'rare', '🎀', '{}'),
('nick_goth', 'nickname_style', 'Estilo Gótico', 'Oscuridad y elegancia mística', 250, 'rare', '🦇', '{}'),
('nick_cyber', 'nickname_style', 'Estilo Cyber', 'Neon y glitches del futuro', 300, 'epic', '💾', '{}'),
('nick_royal', 'nickname_style', 'Estilo Real', 'Dorado y prestigio absoluto', 500, 'legendary', '👑', '{}'),
('nick_ghost', 'nickname_style', 'Estilo Espectro', 'Ethereal casi invisible', 200, 'rare', '👻', '{}'),
('nick_lollipop', 'nickname_style', 'Estilo Lollipop', 'Colores de caramelo dulces', 250, 'rare', '🍭', '{}'),
('nick_fairy', 'nickname_style', 'Estilo Fairy', 'Polvos mágicos y aleteo', 300, 'epic', '🧚', '{}'),
('nick_valentine', 'nickname_style', 'Estilo Valentine', 'Latido al lado de tu nombre', 280, 'rare', '💝', '{}'),
('nick_magic', 'nickname_style', 'Estilo Mágico', 'Aura divina cósmica', 350, 'epic', '🌌', '{}'),

-- ROLES
('role_creator', 'role', 'Creador Cósmico', 'Acceso a anclar posts semanales', 500, 'epic', '🎨', '{}'),
('role_mod', 'role', 'Moderador Solar', 'Gestión de paz en la comunidad', 400, 'rare', '🛡️', '{}'),
('role_scout', 'role', 'Explorador Estelar', 'Transmisiones básicas', 100, 'common', 'Scout', '{}'),
('role_warden', 'role', 'Vigilante del Cosmos', 'Reportes con prioridad', 300, 'rare', '🛡️', '{}'),
('role_nomad', 'role', 'Nómada Astral', 'Aura de color neón exclusivo', 450, 'rare', '🧗', '{}'),
('role_wizard', 'role', 'Mago de los Datos', 'Estadísticas avanzadas', 600, 'epic', '🧙', '{}'),
('role_goth_lord', 'role', 'Señor de la Noche', 'Sombra roja mística', 700, 'epic', '🦇', '{}'),
('role_hacker', 'role', 'Cyber Hacker', 'Efecto glitch digital', 750, 'epic', '💾', '{}'),
('role_deity', 'role', 'Deidad del Espacio', 'Rango supremo dorado', 1500, 'legendary', '👑', '{}'),
('role_pioneer', 'role', 'Pionero Espacial', 'Sala Alfa Central', 1000, 'rare', '🚩', '{}'),
('role_void', 'role', 'Caminante del Vacío', 'Aura de partículas oscuras', 2000, 'legendary', '🌑', '{}'),
('role_architect', 'role', 'Arquitecto', 'Especialista en personalización', 1200, 'epic', '📐', '{}')

ON CONFLICT (id) DO UPDATE SET
  category    = EXCLUDED.category,
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  price       = EXCLUDED.price,
  rarity      = EXCLUDED.rarity,
  icon        = EXCLUDED.icon,
  metadata    = EXCLUDED.metadata;
