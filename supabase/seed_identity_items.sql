-- ============================================================
-- seed_identity_items.sql :: Seeding Nickname Styles, Themes and Roles
-- ============================================================

-- 1. UPDATE CATEGORY CONSTRAINT
-- We need to drop and recreative the check constraint to include new categories
DO $$ 
BEGIN 
    ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_category_check;
    ALTER TABLE public.store_items ADD CONSTRAINT store_items_category_check 
    CHECK (category IN (
        'banner', 'frame', 'pet_accessory', 'cursor', 'theme', 'stars', 'radio',
        'nickname_style', 'profile_theme', 'role', 'ambient_sound'
    ));
END $$;

-- 2. SEED NICKNAME STYLES
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, metadata)
VALUES 
('nick_vortex', 'nickname_style', 'Vortex Digital', 'Efecto de partículas cian en movimiento constante.', 250, 'rare', '🧬', '{"css_class": "nick-style-vortex"}'),
('nick_orbit', 'nickname_style', 'Órbita Orbital', 'Subrayado cinético magenta con halo de luz.', 200, 'rare', '🛰️', '{"css_class": "nick-style-orbit"}'),
('nick_terminal', 'nickname_style', 'Terminal 98', 'Estilo hacker clásico con cursor parpadeante.', 150, 'common', '💻', '{"css_class": "nick-style-terminal"}'),
('nick_nebula', 'nickname_style', 'Nébula Aura', 'Resplandor envolvente en tonos púrpura y rosa.', 350, 'epic', '✨', '{"css_class": "nick-style-nebula"}')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, metadata = EXCLUDED.metadata;

-- 3. SEED PROFILE THEMES
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, metadata)
VALUES 
('theme_minimal', 'profile_theme', 'Arquitecto Minimal', 'Líneas finas, blanco sobre negro profundo y espacios vacíos.', 500, 'epic', '🏗️', '{
    "vars": {
        "--u-bg": "#050505",
        "--u-accent": "#ffffff",
        "--u-card-bg": "rgba(255,255,255,0.03)",
        "--u-text": "#f0f0f0",
        "--u-text-dim": "#666666"
    }
}'),
('theme_nebula', 'profile_theme', 'Nebulosa Profunda', 'Estética espacial con tonos violetas y cian translúcidos.', 600, 'legendary', '🌌', '{
    "vars": {
        "--u-bg": "#0a021a",
        "--u-accent": "#a855f7",
        "--u-card-bg": "rgba(168, 85, 247, 0.1)",
        "--u-text": "#ffffff",
        "--u-text-dim": "rgba(255,255,255,0.5)"
    }
}'),
('theme_terminal', 'profile_theme', 'Matrix Loop', 'Verde fósforo sobre negro, fuentes monoespaciadas.', 400, 'rare', '📟', '{
    "vars": {
        "--u-bg": "#000500",
        "--u-accent": "#00ff41",
        "--u-card-bg": "rgba(0, 255, 65, 0.05)",
        "--u-text": "#00ff41",
        "--u-text-dim": "rgba(0, 255, 65, 0.4)"
    }
}')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, metadata = EXCLUDED.metadata;

-- 4. SEED ROLES
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, metadata)
VALUES 
('role_pioneer', 'role', 'Pionero Espacial', 'Para los primeros exploradores de Space Dan.', 1000, 'limited', '🚩', '{"badge": "Pioneer"}'),
('role_architect', 'role', 'Arquitecto de Realidad', 'Constructores de universos personales.', 1500, 'epic', '📐', '{"badge": "Architect"}'),
('role_void_walker', 'role', 'Caminante del Vacío', 'Habitantes de las profundidades de la red.', 2000, 'legendary', '🌑', '{"badge": "Void Walker"}')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, metadata = EXCLUDED.metadata;

-- 5. SEED AMBIENT SOUNDS
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, metadata)
VALUES 
('sound_rain', 'ambient_sound', 'Lluvia en el Domo', 'Sonido relajante de lluvia sobre cristal espacial.', 300, 'rare', '🌧️', '{"url": "https://assets.mixkit.co/sfx/preview/mixkit-light-rain-loop-2393.mp3"}'),
('sound_void', 'ambient_sound', 'Frecuencia del Vacío', 'Hum sutil de una estación espacial abandonada.', 400, 'epic', '🛸', '{"url": "https://assets.mixkit.co/sfx/preview/mixkit-space-ambience-loop-1493.mp3"}')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, metadata = EXCLUDED.metadata;

