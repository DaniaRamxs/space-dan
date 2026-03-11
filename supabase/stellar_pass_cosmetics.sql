-- ============================================================
-- STELLAR PASS COSMETICS :: Temporada 1
-- ============================================================

-- 1. Insertar items exclusivos en store_items
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, sort_order, metadata)
VALUES
  -- Marcos
  ('frame_stellar_hero', 'frame', 'Héroe del Horizonte', 'Un marco pulsante con energía cian del nexo.', 999999, 'epic', '💠', 100, '{"glow": "cyan"}'),
  ('frame_void_master', 'frame', 'Maestro del Vacío', 'Efecto de succión lumínica constante.', 999999, 'legendary', '🌑', 101, '{"effect": "blackhole"}'),
  
  -- Estilos de Nickname
  ('nick_starlight', 'nickname_style', 'Polvo de Estrellas', 'Tu nombre brilla con destellos plateados.', 999999, 'epic', '✨', 102, '{"animation": "shimmer"}'),
  ('nick_supernova', 'nickname_style', 'Supernova Viva', 'Colores explosivos que cambian con el tiempo.', 999999, 'legendary', '💥', 103, '{"animation": "rainbow_pulse"}'),
  
  -- Efectos de Chat
  ('chat_galactic_rain', 'chat_effect', 'Lluvia Galáctica', 'Estrellas caen sobre tus mensajes.', 999999, 'epic', '🌠', 104, '{"particles": "stars"}'),
  ('chat_nexus_glitch', 'chat_effect', 'Glitch del Nexo', 'Interferencias digitales premium en cada envío.', 999999, 'legendary', '👾', 105, '{"effect": "glitch_v2"}'),

  -- Insignias
  ('badge_pass_s1_elite', 'chat_badge', 'Élite S1', 'Insignia exclusiva de la primera temporada.', 999999, 'epic', '🛰️', 106, '{}'),
  ('badge_free_voyager', 'chat_badge', 'Viajero Incansable', 'Otorgado por completar el Pase Gratis S1.', 999999, 'epic', '🚀', 107, '{}'),

  -- HoloCards
  ('holo_stellar_core', 'holocard', 'Núcleo Estelar', 'Fondo dinámico del nexo en tiempo real.', 999999, 'epic', '🧿', 108, '{}')
ON CONFLICT (id) DO NOTHING;

-- 2. Actualizar Recompensas del Pase
DELETE FROM public.stellar_pass_rewards; -- Limpiamos para reconstruir con cosméticos

INSERT INTO public.stellar_pass_rewards (level, reward_type, reward_amount, reward_data, is_premium) VALUES
-- Bloque 1-10
(1, 'starlys', 1000, '{}', false),
(2, 'starlys', 5000, '{}', false),
(3, 'item', 0, '{"item_id": "badge_star", "item_title": "Estrella de Inicio", "icon": "⭐"}', false),
(4, 'starlys', 10000, '{}', true),
(5, 'item', 0, '{"item_id": "nick_minimal", "item_title": "Firma Minimalista", "icon": "🖊️", "description": "Una firma elegante escrita a mano en blanco nve."}', false),
(6, 'starlys', 15000, '{}', true),
(7, 'item', 0, '{"item_id": "frame_basic", "item_title": "Marco de Recluta", "icon": "⭕"}', true),
(8, 'starlys', 5000, '{}', false),
(9, 'starlys', 20000, '{}', true),
(10, 'item', 0, '{"item_id": "badge_pass_s1_elite", "item_title": "Insignia Élite S1", "icon": "🛰️"}', true),

-- Bloque 11-20
(12, 'starlys', 25000, '{}', true),
(15, 'item', 0, '{"item_id": "nick_starlight", "item_title": "Nickname Polvo de Estrellas", "icon": "✨"}', true),
(18, 'starlys', 30000, '{}', false),
(20, 'item', 0, '{"item_id": "chat_galactic_rain", "item_title": "Efecto Lluvia Galáctica", "icon": "🌠"}', true),

-- Bloque 21-40
(25, 'item', 0, '{"item_id": "frame_stellar_hero", "item_title": "Marco Héroe del Horizonte", "icon": "💠"}', true),
(30, 'starlys', 100000, '{}', true),
(35, 'item', 0, '{"item_id": "holo_stellar_core", "item_title": "HoloCard Núcleo Estelar", "icon": "🧿"}', false),
(40, 'item', 0, '{"item_id": "chat_nexus_glitch", "item_title": "Efecto Glitch del Nexo", "icon": "👾"}', true),

-- Recompensas Finales (NIVEL 50)
(50, 'item', 0, '{"item_id": "badge_free_voyager", "item_title": "Título: Viajero Incansable", "icon": "🚀"}', false), 
(50, 'item', 0, '{"item_id": "holo_nebula", "item_title": "HoloCard Nebula Viva", "icon": "🌌"}', false), 
(50, 'item', 0, '{"item_id": "nick_supernova", "item_title": "Nickname Supernova", "icon": "💥"}', true),
(50, 'item', 0, '{"item_id": "frame_void_master", "item_title": "Marco Maestro del Vacío", "icon": "🌑"}', true),
(50, 'starlys', 1000000, '{}', true);


-- 3. Actualizar la función award_pass_xp para dar items
CREATE OR REPLACE FUNCTION public.award_pass_xp(p_user_id uuid, p_xp integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_xp  integer;
    v_current_lvl integer;
    v_new_xp      integer;
    v_new_lvl     integer;
    v_xp_per_lvl  integer := 1000;
    v_rewards     RECORD;
    v_is_user_premium boolean;
BEGIN
    INSERT INTO public.stellar_pass_progression (user_id, level, xp)
    VALUES (p_user_id, 1, 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING xp, level, is_premium INTO v_current_xp, v_current_lvl, v_is_user_premium;

    v_new_xp := v_current_xp + p_xp;
    v_new_lvl := v_current_lvl;

    WHILE v_new_xp >= v_xp_per_lvl LOOP
        v_new_xp := v_new_xp - v_xp_per_lvl;
        v_new_lvl := v_new_lvl + 1;
        
        -- Entregar recompensas del nuevo nivel
        FOR v_rewards IN SELECT * FROM public.stellar_pass_rewards WHERE level = v_new_lvl LOOP
            IF v_rewards.is_premium = false OR v_is_user_premium = true THEN
                
                -- DAR STARLYS
                IF v_rewards.reward_type = 'starlys' THEN
                    PERFORM public.award_coins(p_user_id, v_rewards.reward_amount, 'pass_reward', 'lvl_' || v_new_lvl);
                
                -- DAR ITEM COSMETICO
                ELSIF v_rewards.reward_type = 'item' THEN
                    -- Insertar en user_items directamente ignorando precio si es del pase
                    INSERT INTO public.user_items (user_id, item_id)
                    VALUES (p_user_id, v_rewards.reward_data->>'item_id')
                    ON CONFLICT (user_id, item_id) DO NOTHING;
                END IF;

            END IF;
        END LOOP;
    END LOOP;

    UPDATE public.stellar_pass_progression 
    SET level = v_new_lvl, xp = v_new_xp 
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('level_up', v_new_lvl > v_current_lvl, 'new_level', v_new_lvl);
END;
$$;
