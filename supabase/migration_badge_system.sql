-- ============================================================
-- migration_badge_system.sql :: Soporte para Emblemas/Badges 
-- ============================================================

-- 1. Añadir columna equipped_badge a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_badge text DEFAULT NULL;

-- 2. Actualizar la función public.equip_item para manejar chat_badge
CREATE OR REPLACE FUNCTION public.equip_item(
  p_user_id   uuid,
  p_item_id   text,
  p_equip     boolean DEFAULT true   -- false = desequipar
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_category text;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Verificar que el usuario tiene el item
  IF NOT EXISTS (SELECT 1 FROM public.user_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'No tienes este item en tu inventario';
  END IF;

  -- Obtener categoría
  SELECT category INTO v_category FROM public.store_items WHERE id = p_item_id;

  IF p_equip THEN
    -- Desequipar cualquier otro item de la misma categoría
    UPDATE public.user_items
    SET is_equipped = false
    WHERE user_id = p_user_id
      AND item_id IN (SELECT id FROM public.store_items WHERE category = v_category)
      AND item_id != p_item_id;

    -- Equipar el nuevo
    UPDATE public.user_items SET is_equipped = true
    WHERE user_id = p_user_id AND item_id = p_item_id;

    -- Actualizar equipped_items en profiles para acceso rápido
    UPDATE public.profiles
    SET equipped_items = COALESCE(equipped_items, '{}'::jsonb) || jsonb_build_object(v_category, p_item_id)
    WHERE id = p_user_id;

    -- Sincronizar con columnas específicas para JOINS rápidos en el frontend
    IF v_category = 'nickname_style' THEN
      UPDATE public.profiles SET equipped_nickname_style = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'profile_theme' OR v_category = 'theme' THEN
      UPDATE public.profiles SET equipped_theme = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'ambient_sound' OR v_category = 'radio' THEN
      UPDATE public.profiles SET equipped_ambient_sound = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'role' THEN
      UPDATE public.profiles SET equipped_primary_role = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'banner' THEN
      UPDATE public.profiles SET banner_item_id = p_item_id, banner_color = NULL WHERE id = p_user_id;
    ELSIF v_category = 'frame' THEN
      UPDATE public.profiles SET frame_item_id = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'chat_badge' THEN
      -- Sincronizar columna equipada de badge con el icono del item
      UPDATE public.profiles 
      SET equipped_badge = (SELECT icon FROM public.store_items WHERE id = p_item_id)
      WHERE id = p_user_id;
    END IF;

    -- Si es accesorio de mascota, actualizar pet_loadout
    IF v_category = 'pet_accessory' THEN
      DECLARE v_slot text;
      BEGIN
        v_slot := (SELECT metadata->>'slot' FROM public.store_items WHERE id = p_item_id);
        IF v_slot IS NOT NULL THEN
          INSERT INTO public.pet_loadouts (user_id)
          VALUES (p_user_id)
          ON CONFLICT (user_id) DO NOTHING;

          EXECUTE format(
            'UPDATE public.pet_loadouts SET %I = $1, updated_at = now() WHERE user_id = $2',
            'slot_' || v_slot
          ) USING p_item_id, p_user_id;
        END IF;
      END;
    END IF;
  ELSE
    -- Desequipar
    UPDATE public.user_items SET is_equipped = false
    WHERE user_id = p_user_id AND item_id = p_item_id;

    UPDATE public.profiles
    SET equipped_items = equipped_items - v_category
    WHERE id = p_user_id;

    -- Limpiar columnas específicas
    IF v_category = 'nickname_style' THEN
      UPDATE public.profiles SET equipped_nickname_style = NULL WHERE id = p_user_id;
    ELSIF v_category = 'profile_theme' OR v_category = 'theme' THEN
      UPDATE public.profiles SET equipped_theme = NULL WHERE id = p_user_id;
    ELSIF v_category = 'ambient_sound' OR v_category = 'radio' THEN
      UPDATE public.profiles SET equipped_ambient_sound = NULL WHERE id = p_user_id;
    ELSIF v_category = 'role' THEN
      UPDATE public.profiles SET equipped_primary_role = NULL WHERE id = p_user_id;
    ELSIF v_category = 'banner' THEN
      UPDATE public.profiles SET banner_item_id = NULL WHERE id = p_user_id;
    ELSIF v_category = 'frame' THEN
      UPDATE public.profiles SET frame_item_id = NULL WHERE id = p_user_id;
    ELSIF v_category = 'chat_badge' THEN
      UPDATE public.profiles SET equipped_badge = NULL WHERE id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'equipped', p_equip, 'item_id', p_item_id);
END;
$$;
