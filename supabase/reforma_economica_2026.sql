-- ============================================================
-- REDISEÑO ECONÓMICO Y DE TIENDA 2026 - REFORMA TOTAL (V2)
-- ============================================================

-- 1. Limpieza PREVIA de datos para evitar violaciones de restricción y foreign keys
-- Primero eliminamos las posesiones de usuarios de items que van a desaparecer
DELETE FROM public.user_items
WHERE item_id IN (
    SELECT id FROM public.store_items 
    WHERE category NOT IN (
        'nickname_style', 'frame', 'role', 'chat_effect', 
        'chat_badge', 'radio', 'holocard', 'chest', 'character'
    )
    OR rarity NOT IN (
        'common', 'rare', 'epic', 'legendary', 'mythic'
    )
);

-- Ahora eliminamos los items del catálogo que ya no existirán
DELETE FROM public.store_items 
WHERE category NOT IN (
    'nickname_style', 'frame', 'role', 'chat_effect', 
    'chat_badge', 'radio', 'holocard', 'chest', 'character'
);

DELETE FROM public.store_items 
WHERE rarity NOT IN (
    'common', 'rare', 'epic', 'legendary', 'mythic'
);

-- 2. Actualizar restricciones de categorías y rarezas en store_items
ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_category_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_category_check 
  CHECK (category IN (
    'nickname_style', 'frame', 'role', 'chat_effect', 
    'chat_badge', 'radio', 'holocard', 'chest', 'character'
  ));

ALTER TABLE public.store_items DROP CONSTRAINT IF EXISTS store_items_rarity_check;
ALTER TABLE public.store_items ADD CONSTRAINT store_items_rarity_check 
  CHECK (rarity IN (
    'common', 'rare', 'epic', 'legendary', 'mythic'
  ));

-- 2. Sistema de Coleccionables (Anime Characters)
CREATE TABLE IF NOT EXISTS public.collectibles (
  id          text        PRIMARY KEY,
  name        text        NOT NULL,
  series      text        NOT NULL,
  rarity      text        NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
  image_url   text        NOT NULL,
  gif_url     text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_collectibles (
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  collectible_id text     NOT NULL REFERENCES public.collectibles(id) ON DELETE CASCADE,
  obtained_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collectible_id)
);

-- 3. Función de Apertura de Cofres (Gacha)
CREATE OR REPLACE FUNCTION public.open_chest(
  p_user_id  uuid,
  p_chest_id text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chest       public.store_items%ROWTYPE;
  v_rarity_roll float;
  v_rarity_target text;
  v_character   public.collectibles%ROWTYPE;
  v_new_balance integer;
  v_is_duplicate boolean;
  v_recycle_value integer;
  v_res_msg      text;
BEGIN
  IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'No autorizado'; END IF;

  -- 1. Validar cofre
  SELECT * INTO v_chest FROM public.store_items WHERE id = p_chest_id AND category = 'chest' AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cofre no encontrado o inactivo'; END IF;

  -- 2. Validar balance
  SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_new_balance < v_chest.price THEN RAISE EXCEPTION 'Starlys insuficientes'; END IF;

  -- 3. Tirada de Raridad (Basada en los requerimientos)
  -- común 65% | raro 23% | épico 9% | legendario 2.5% | mítico 0.5%
  v_rarity_roll := random() * 100;
  
  IF v_rarity_roll < 0.5 THEN v_rarity_target := 'mythic';
  ELSIF v_rarity_roll < 3.0 THEN v_rarity_target := 'legendary';
  ELSIF v_rarity_roll < 12.0 THEN v_rarity_target := 'epic';
  ELSIF v_rarity_roll < 35.0 THEN v_rarity_target := 'rare';
  ELSE v_rarity_target := 'common';
  END IF;

  -- 4. Seleccionar personaje aleatorio de esa raridad
  -- (Si no hay de esa rareza, bajamos a común como fallback)
  SELECT * INTO v_character FROM public.collectibles WHERE rarity = v_rarity_target ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_character FROM public.collectibles WHERE rarity = 'common' ORDER BY random() LIMIT 1;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'No hay coleccionables configurados en la base de datos'; END IF;

  -- 5. Gestionar duplicados
  SELECT EXISTS(SELECT 1 FROM public.user_collectibles WHERE user_id = p_user_id AND collectible_id = v_character.id)
  INTO v_is_duplicate;

  IF v_is_duplicate THEN
    -- Reciclaje: común->2k, raro->10k, épico->50k, legendario->200k, mítico->1m
    CASE v_character.rarity
      WHEN 'common'    THEN v_recycle_value := 2000;
      WHEN 'rare'      THEN v_recycle_value := 10000;
      WHEN 'epic'      THEN v_recycle_value := 50000;
      WHEN 'legendary' THEN v_recycle_value := 200000;
      WHEN 'mythic'    THEN v_recycle_value := 1000000;
      ELSE v_recycle_value := 0;
    END CASE;
    
    v_new_balance := v_new_balance - v_chest.price + v_recycle_value;
    v_res_msg := format('Duplicado: Reciclado por %s Starlys', v_recycle_value);
  ELSE
    v_new_balance := v_new_balance - v_chest.price;
    v_recycle_value := 0;
    v_res_msg := 'Nuevo personaje obtenido';
    INSERT INTO public.user_collectibles (user_id, collectible_id) VALUES (p_user_id, v_character.id);
  END IF;

  -- 6. Actualizar balance y registrar transacción
  UPDATE public.profiles SET balance = v_new_balance WHERE id = p_user_id;
  
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (p_user_id, -v_chest.price + v_recycle_value, v_new_balance, 'purchase', v_character.id, 
          format('Abierto cofre %s: %s', v_chest.title, v_character.name),
          jsonb_build_object('character_name', v_character.name, 'rarity', v_character.rarity, 'is_duplicate', v_is_duplicate));

  RETURN jsonb_build_object(
    'success', true,
    'character', row_to_json(v_character),
    'is_duplicate', v_is_duplicate,
    'recycle_value', v_recycle_value,
    'message', v_res_msg,
    'new_balance', v_new_balance
  );
END;
$$;

-- 4. Otros procedimientos de limpieza
DROP TABLE IF EXISTS public.pet_loadouts CASCADE;

-- 5. Semillas de Contenido Inicial (Estructura de Cofres Oficial)
INSERT INTO public.store_items (id, category, title, price, rarity, icon, description, sort_order)
VALUES 
  ('chest_scrap', 'chest', 'Cofre de Chatarra', 80000, 'common', '📦', 'Contiene piezas básicas de sectores exteriores.', 1),
  ('chest_nebula', 'chest', 'Cofre de Nebulosa', 500000, 'epic', '🔮', 'Probabilidad alta de personajes estilo anime raros.', 2),
  ('chest_magnate', 'chest', 'Cofre Magnate', 2000000, 'mythic', '🔱', 'Objetos exclusivos y personajes legendarios garantizados.', 3)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title, 
  price = EXCLUDED.price, 
  description = EXCLUDED.description;

-- Ejemplo de personajes coleccionables base
INSERT INTO public.collectibles (id, name, series, rarity, image_url, description)
VALUES 
  ('char_001', 'Neon Rebel', 'Neo-Tokyo', 'rare', 'https://api.placeholder.com/400/600', 'Hacker solitaria de los suburbios.'),
  ('char_002', 'Void Knight', 'Abyss Chronicles', 'legendary', 'https://api.placeholder.com/400/600', 'Guardián de los portales olvidados.'),
  ('char_003', 'Lunar Goddess', 'First Dawn', 'mythic', 'https://api.placeholder.com/400/600', 'Entidad primordial que forjó el primer Starly.')
ON CONFLICT (id) DO NOTHING;
