-- Archivo para actualizar la logica de apertura de cofres para 
-- soportar drop de ítems exclusivos (is_active = false) o personajes (public.collectibles).

-- 1. Insertamos ítems exclusivos de cofre que no salen en la tienda
INSERT INTO public.store_items (id, category, title, description, price, rarity, icon, is_active)
VALUES
  ('frame_chest_hologram', 'frame', 'Holograma Glitch', 'Marco intermitente con estética de holograma dañado. (Exclusivo)', 200000, 'rare', '🔲', false),
  ('nick_chest_cursed', 'nickname_style', 'Señal Corrupta', 'Tu nombre se tuerce con símbolos incomprensibles. (Exclusivo)', 800000, 'epic', '🩸', false),
  ('radio_alien', 'radio', 'Frecuencia Desconocida', 'Captación de sonidos espaciales profundos. (Exclusivo)', 10000000, 'mythic', '🛸', false),
  ('chat_chest_gold', 'chat_effect', 'Polvo Estelar Puro', 'Mensajes envueltos en energía dorada. (Exclusivo)', 3000000, 'legendary', '✨', false),
  ('holo_chest_dark', 'holocard', 'Cristal Oscuro', 'Tarjeta forjada con materia oscura pura. (Exclusivo)', 3500000, 'legendary', '🔮', false)
ON CONFLICT (id) DO UPDATE SET is_active = false;

-- 2. Modificamos open_chest
CREATE OR REPLACE FUNCTION public.open_chest(
  p_user_id  uuid,
  p_chest_id text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_chest         public.store_items%ROWTYPE;
  v_rarity_roll   float;
  v_rarity_target text;
  v_type_roll     float;
  
  v_character     public.collectibles%ROWTYPE;
  v_exclusive     public.store_items%ROWTYPE;
  
  v_new_balance   integer;
  v_is_duplicate  boolean := false;
  v_recycle_value integer := 0;
  v_res_msg       text;
  v_drop_type     text;
  v_drop_data     jsonb;
BEGIN
  IF auth.uid() != p_user_id THEN RAISE EXCEPTION 'No autorizado'; END IF;

  -- 1. Validar cofre
  SELECT * INTO v_chest FROM public.store_items WHERE id = p_chest_id AND category = 'chest' AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cofre no encontrado o inactivo'; END IF;

  -- 2. Validar balance
  SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_new_balance < v_chest.price THEN RAISE EXCEPTION 'Starlys insuficientes'; END IF;

  -- 3. Tirada de Raridad
  v_rarity_roll := random() * 100;
  IF v_rarity_roll < 0.5 THEN v_rarity_target := 'mythic';
  ELSIF v_rarity_roll < 3.0 THEN v_rarity_target := 'legendary';
  ELSIF v_rarity_roll < 12.0 THEN v_rarity_target := 'epic';
  ELSIF v_rarity_roll < 35.0 THEN v_rarity_target := 'rare';
  ELSE v_rarity_target := 'common';
  END IF;

  -- 4. Decisión de Drop: 50% Personaje, 50% Ítem Exclusivo
  v_type_roll := random();
  
  IF v_type_roll < 0.5 THEN
    -- Intentar obtener ítem exclusivo (is_active = false, no p_chest_id, no chest)
    SELECT * INTO v_exclusive 
    FROM public.store_items 
    WHERE is_active = false 
      AND category != 'chest' 
      AND rarity = v_rarity_target 
    ORDER BY random() LIMIT 1;

    IF NOT FOUND THEN 
      -- Fallback si no hay de esa rareza
      SELECT * INTO v_exclusive FROM public.store_items WHERE is_active = false AND category != 'chest' ORDER BY random() LIMIT 1;
    END IF;
  END IF;

  -- Si se decidió por Personaje (>= 0.5) o falló la búsqueda del ítem
  IF v_type_roll >= 0.5 OR v_exclusive.id IS NULL THEN
    v_drop_type := 'character';
    SELECT * INTO v_character FROM public.collectibles WHERE rarity = v_rarity_target ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_character FROM public.collectibles WHERE rarity = 'common' ORDER BY random() LIMIT 1;
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'No hay coleccionables configurados'; END IF;
    
    -- Validar si ya lo tiene
    SELECT EXISTS(SELECT 1 FROM public.user_collectibles WHERE user_id = p_user_id AND collectible_id = v_character.id)
    INTO v_is_duplicate;
    v_drop_data := row_to_json(v_character);
  ELSE
    v_drop_type := 'item';
    -- Validar si el usuario ya tiene este item
    SELECT EXISTS(SELECT 1 FROM public.user_items WHERE user_id = p_user_id AND item_id = v_exclusive.id)
    INTO v_is_duplicate;
    v_drop_data := row_to_json(v_exclusive);
  END IF;

  -- 5. Gestionar duplicados
  IF v_is_duplicate THEN
     -- Reciclaje...
     CASE v_rarity_target
       WHEN 'common'    THEN v_recycle_value := 2000;
       WHEN 'rare'      THEN v_recycle_value := 10000;
       WHEN 'epic'      THEN v_recycle_value := 50000;
       WHEN 'legendary' THEN v_recycle_value := 200000;
       WHEN 'mythic'    THEN v_recycle_value := 1000000;
       ELSE v_recycle_value := 0;
     END CASE;

     v_res_msg := format('Duplicado: Reciclado por %s Starlys', v_recycle_value);
  ELSE
     v_res_msg := CASE WHEN v_drop_type = 'character' THEN '¡Personaje obtenido!' ELSE '¡Ítem especial obtenido!' END;
     
     -- Insertar en la tabla correspondiente
     IF v_drop_type = 'character' THEN
       INSERT INTO public.user_collectibles (user_id, collectible_id) VALUES (p_user_id, v_character.id);
     ELSE
       INSERT INTO public.user_items (user_id, item_id, purchased_at) VALUES (p_user_id, v_exclusive.id, now());
     END IF;
  END IF;

  v_new_balance := v_new_balance - v_chest.price + v_recycle_value;
  UPDATE public.profiles SET balance = v_new_balance WHERE id = p_user_id;

  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (p_user_id, -v_chest.price + v_recycle_value, v_new_balance, 'purchase', 
          CASE WHEN v_drop_type = 'character' THEN v_character.id ELSE v_exclusive.id END, 
          format('Abierto cofre %s: %s', v_chest.title, CASE WHEN v_drop_type = 'character' THEN v_character.name ELSE v_exclusive.title END),
          jsonb_build_object('type', v_drop_type, 'rarity', v_rarity_target, 'is_duplicate', v_is_duplicate));

  RETURN jsonb_build_object(
    'success', true,
    'drop_type', v_drop_type,
    'item', v_drop_data,
    'is_duplicate', v_is_duplicate,
    'recycle_value', v_recycle_value,
    'message', v_res_msg,
    'new_balance', v_new_balance
  );
END;
$$;
