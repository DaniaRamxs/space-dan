-- Sincronización de nuevos items y metadatos premium
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, metadata, sort_order)
VALUES
  ('banner_galaxy', 'banner', 'Corazón de Galaxia', 'Un gradiente profundo que evoca el centro de un sistema solar en colapso.', 150, 'rare', '🌌', '{"gradient": ["#0d0221", "#240b36", "#c31432"], "fx": "stars"}', 60),
  ('banner_cyber', 'banner', 'Neon Overload', 'Cian eléctrico y magenta neón fusionados en una explosión cyberpunk.', 120, 'rare', '🖼️', '{"gradient": ["#00d2ff", "#3a7bd5", "#ff00ff"]}', 61),
  ('banner_nebula', 'banner', 'Velo de Orión', 'Púrpuras y azules místicos que envuelven tu perfil en un aura espacial.', 150, 'rare', '🌌', '{"gradient": ["#6a11cb", "#2575fc"]}', 62),
  ('banner_gold', 'banner', 'Prestigio Áureo', 'El banner definitivo de la nobleza espacial. Oro puro líquido.', 200, 'epic', '✨', '{"gradient": ["#bf953f", "#fcf6ba", "#b38728", "#fbf5b7", "#aa771c"]}', 63),
  ('banner_matrix', 'banner', 'Source Code', 'Observa la realidad binaria con este fondo de código en cascada.', 200, 'epic', '💻', '{"gradient": ["#000000", "#003300"], "fx": "matrix"}', 65),
  ('banner_aurora', 'banner', 'Aurora Boreal', 'Fenómeno atmosférico legendario plasmado en tu cabecera.', 300, 'legendary', '✨', '{"gradient": ["#12c2e9", "#c471ed", "#f64f59"], "animated": true}', 66),
  ('banner_retro', 'banner', '8-Bit Nostalgia', 'Vibras de sala arcade con scanlines y estética retro de los 80.', 180, 'epic', '👾', '{"gradient": ["#23074d", "#cc5333"], "fx": "scanlines"}', 67),
  ('banner_void', 'banner', 'Vacío Absoluto', 'Para los que no temen a la nada. Un negro tan profundo que devora la luz.', 400, 'legendary', '🌑', '{"gradient": ["#000000", "#1a1a1a", "#000000"], "fx": "void"}', 68),
  ('banner_pink_nebula', 'banner', 'Nebulosa Rosa', 'Una explosión de polvo estelar rosa para los perfiles más brillantes.', 180, 'rare', '🌸', '{"gradient": ["#ff00cc", "#333399"], "fx": "stars"}', 69),
  ('radio_kpop', 'radio', 'K-Pop Universe', 'Los mejores hits del K-Pop en vivo las 24hs con toda la energía Hallyu.', 120, 'rare', '🎶', '{"stream": "https://ice1.somafm.com/kpop-128-mp3", "svg": "kpop"}', 45)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  rarity = EXCLUDED.rarity,
  icon = EXCLUDED.icon,
  metadata = EXCLUDED.metadata;
