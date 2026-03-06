-- ============================================================
-- POBLAMIENTO INICIAL TIENDA SPACELY V2.1 (Expanded)
-- ============================================================

-- 1. Cosméticos (Expanded Catalog)
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, sort_order)
VALUES
  -- Nicknames
  ('nick_minimal', 'nickname_style', 'Minimalismo Blanco', 'Sencillez y elegancia pura.', 30000, 'common', '⚪', 1),
  ('nick_gradient', 'nickname_style', 'Gradiente Espacial', 'Un flujo cromático inspirado en las nébulas.', 100000, 'rare', '🌈', 2),
  ('nick_neon', 'nickname_style', 'Neón Cibernético', 'Luz de gas neón para destacar en la ciudad.', 120000, 'rare', '💡', 3),
  ('nick_ember', 'nickname_style', 'Ascuas Estelares', 'Partículas de fuego espacial y calor térmico.', 350000, 'epic', '🔥', 4),
  ('nick_glitch', 'nickname_style', 'Inestabilidad Glitch', 'Efectos de interferencia digital avanzada.', 500000, 'epic', '👾', 5),
  ('nick_holographic', 'nickname_style', 'Proyección Holográfica', 'Efecto 3D parpadeante de alta tecnología.', 1500000, 'legendary', '🛰️', 6),
  ('nick_spectral', 'nickname_style', 'Espectro de Datos', 'Un aura de interferencia verde esmeralda y desincronización.', 2000000, 'legendary', '👻', 7),
  ('nick_mythic_singularity', 'nickname_style', 'Singularidad Mítica', 'Tu nombre es un evento gravitatorio que distorsiona el chat.', 8000000, 'mythic', '💠', 8),
  ('nick_void_pulse', 'nickname_style', 'Pulso del Vacío', 'Tu nombre late con energía oscura y desvanece el entorno.', 10000000, 'mythic', '💠', 9),
  
  -- Marcos
  ('frame_basic', 'frame', 'Anillo Estándar', 'Contorno de seguridad básico.', 25000, 'common', '⚪', 10),
  ('frame_neon', 'frame', 'Anillo de Neón', 'Círculo de luz vibrante para tu perfil.', 90000, 'rare', '⭕', 11),
  ('frame_angelic', 'frame', 'Halo de Plasma', 'Aura divina de energía blanca y pura.', 450000, 'epic', '😇', 12),
  ('frame_galaxy', 'frame', 'Nébulas Profundas', 'Animación sutil de estrellas en tu marco.', 600000, 'epic', '🌌', 13),
  ('frame_hacker', 'frame', 'Código Fuente', 'Barras de datos en constante movimiento y escaneos verdes.', 1800000, 'legendary', '💻', 14),
  ('frame_golden', 'frame', 'Prestigio Áureo', 'Para los verdaderos señores del Starly.', 2500000, 'legendary', '👑', 15),
  ('frame_prism', 'frame', 'Prisma Mítico', 'Refracta toda la luz del servidor.', 7000000, 'mythic', '💠', 16),
  ('frame_void', 'frame', 'Singularidad', 'Un agujero negro masivo que absorbe la luz a su alrededor.', 9500000, 'mythic', '🌑', 17),
  
  -- Roles
  ('role_pioneer', 'role', 'Pionero Galáctico', 'De los primeros exploradores del vacío.', 40000, 'common', '🚀', 18),
  ('role_guardian', 'role', 'Guardián Estelar', 'Protector del nexo de Spacely.', 150000, 'rare', '🛡️', 19),
  ('role_technomancer', 'role', 'Tecnomante', 'Maestro en la manipulación de flujos de energía.', 400000, 'epic', '🧙', 20),
  ('role_phantom', 'role', 'Fantasma del Código', 'Una entidad que opera entre las sombras.', 550000, 'epic', '👤', 21),
  ('role_overlord', 'role', 'Soberano de Datos', 'Control total sobre el flujo de información.', 2000000, 'legendary', '👁️', 22),
  ('role_specter', 'role', 'Espectro de la Red', 'Inalcanzable, invisible, omnipresente.', 2800000, 'legendary', '👻', 23),
  ('role_archon', 'role', 'Arcón del Nexo', 'Gobernador supremo de la realidad digital.', 12000000, 'mythic', '🏛️', 24),
  
  -- Chat Effects
  ('chat_pulse', 'chat_effect', 'Pulso Estelar', 'Ondas de luz al enviar tus mensajes.', 110000, 'rare', '💫', 25),
  ('chat_kawaii', 'chat_effect', 'Dulce Galaxia', 'Rosa pastel, destellos y una aura de ternura.', 180000, 'rare', '🎀', 26),
  ('chat_plasma', 'chat_effect', 'Incendio de Plasma', 'Tu texto arde con energía azul neón y destellos violetas.', 450000, 'epic', '🔥', 27),
  ('chat_eco', 'chat_effect', 'Eco Cósmico', 'Efecto de desvanecimiento fantasmal.', 500000, 'epic', '🗣️', 28),
  ('chat_goth', 'chat_effect', 'Espectro Gótico', 'Sombras profundas y un aura carmesí inquietante.', 600000, 'epic', 'Bat', 29),
  ('chat_stars', 'chat_effect', 'Lluvia de Novas', 'Cada mensaje es una supernova visual constante.', 1500000, 'legendary', '💥', 30),
  ('chat_cyberpunky', 'chat_effect', 'Nexo Cyberpunk', 'Líneas de datos cian y circuitos neón activados.', 2000000, 'legendary', '🔌', 31),
  ('chat_matrix', 'chat_effect', 'Cascada Digital', 'Lluvia de código verde descendiendo sobre tus palabras.', 3000000, 'legendary', '🟢', 32),
  ('chat_void', 'chat_effect', 'Colapso del Vacío', 'Tus mensajes aparecen de una singularidad oscura con distorsión masiva.', 15000000, 'mythic', '🌑', 33),
  
  -- Emblemas
  ('badge_star', 'chat_badge', 'Estrella Fugaz', 'Pequeño destello de clase estelar.', 20000, 'common', '⭐', 34),
  ('badge_heart', 'chat_badge', 'Pulso Vital', 'Diseño orgánico en un mundo digital.', 25000, 'common', '❤️', 35),
  ('badge_skull', 'chat_badge', 'Skull System', 'Advertencia de sistema en peligro.', 85000, 'rare', '💀', 36),
  ('badge_bolt', 'chat_badge', 'Rayo de Energía', 'Poder puro junto a tu nombre.', 100000, 'rare', '⚡', 37),
  ('badge_planet', 'chat_badge', 'Anillos de Saturno', 'Órbita planetaria miniatura.', 320000, 'epic', '🪐', 38),
  ('badge_alien', 'chat_badge', 'Visitante de Orión', 'Contacto extraterrestre confirmado.', 380000, 'epic', '👽', 39),
  ('badge_crown', 'chat_badge', 'Corona de Datos', 'Emblema de realeza en el nexo.', 1500000, 'legendary', '👑', 40),
  ('badge_skull_gold', 'chat_badge', 'Cráneo Dorado', 'Símbolo de maestría y longevidad.', 2200000, 'legendary', '💀', 41),
  ('badge_singularity', 'chat_badge', 'Ojo del Nexo', 'La insignia definitiva de control.', 8500000, 'mythic', '👁️', 42),
  
  -- Radios
  ('radio_lofi', 'radio', 'Beats de Vacío', 'Música relajante para contemplar el nexo.', 35000, 'common', '🎧', 43),
  ('radio_retro', 'radio', 'Frecuencia FM', 'Sonido nostálgico de radios antiguas.', 130000, 'rare', '📻', 44),
  ('radio_synthwave', 'radio', 'Synth 80s', 'Paisajes sonoros de neón y sintetizadores.', 200000, 'rare', '🎹', 45),
  ('radio_cyberpunk', 'radio', 'Nivel Crítico', 'BPMs altos para sesiones intensas.', 400000, 'epic', '🔊', 46),
  ('radio_urbano', 'radio', 'Nexo Urbano', 'Los mejores ritmos de reggaetón y género urbano.', 500000, 'epic', '🔥', 47),
  ('radio_yeye', 'radio', 'Radio Yeye', 'Rock y pop internacional, desde clásicos hasta Maneskin.', 1500000, 'legendary', '🎸', 48),
  ('radio_dark', 'radio', 'Frecuencias Oscuras', 'Ambientación industrial y misteriosa.', 1800000, 'legendary', '🕯️', 49),
  
  -- HoloCards
  ('holo_minimal', 'holocard', 'Nexo Blanco', 'Claridad y luz para tu identidad.', 50000, 'common', '⬜', 48),
  ('holo_cyber', 'holocard', 'Interfaz Cyber', 'Estética industrial y cables integrados.', 250000, 'rare', '🔌', 49),
  ('holo_glass', 'holocard', 'Cristal Espectral', 'Tarjeta con transparencia máxima.', 800000, 'epic', '💎', 50),
  ('holo_gold', 'holocard', 'Oro Líquido', 'Elegancia suprema metalizada.', 3500000, 'legendary', '💰', 51),
  ('holo_matrix', 'holocard', 'Sistema Raíz', 'Visualización de flujos de datos en tiempo real.', 3000000, 'legendary', '🟢', 52),
  ('holo_void', 'holocard', 'Velo del Vacío', 'Minimalismo oscuro absoluto.', 9000000, 'mythic', '⬛', 53),
  ('holo_nebula', 'holocard', 'Nébula Vivida', 'Un fondo animado de nubes estelares en constante cambio.', 12000000, 'mythic', '🌌', 54)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, description = EXCLUDED.description, rarity = EXCLUDED.rarity, icon = EXCLUDED.icon;

-- 2. Cofres
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, sort_order)
VALUES
  ('chest_scrap', 'chest', 'Cofre de Chatarra', 'Suministros básicos rescatados del cinturón de asteroides.', 80000, 'common', '📦', 55),
  ('chest_nebula', 'chest', 'Cofre Nécula', 'Contenedor de alta energía con personajes raros.', 500000, 'epic', '💎', 56),
  ('chest_magnate', 'chest', 'Cofre del Magnate', 'Suministros de lujo con alta probabilidad de legendarios.', 2000000, 'mythic', '👑', 57)
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;
