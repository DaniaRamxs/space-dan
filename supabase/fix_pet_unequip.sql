-- ============================================================
-- fix_pet_unequip.sql :: Corregir desequipamiento de mascotas
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- El problema: al desequipar un pet_accessory, el slot del pet_loadout
-- no se limpiaba, por lo que el accesorio persistía visualmente.

CREATE OR REPLACE FUNCTION public.equip_item(
  p_user_id uuid,
  p_item_id text,
  p_equip   boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_category text;
  v_owned    boolean;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Verificar que el usuario posee el item
  SELECT EXISTS(
    SELECT 1 FROM public.user_items
    WHERE user_id = p_user_id AND item_id = p_item_id
  ) INTO v_owned;
  IF NOT v_owned THEN
    RAISE EXCEPTION 'No posees este item';
  END IF;

  -- Obtener categoría
  SELECT category INTO v_category FROM public.store_items WHERE id = p_item_id;
  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Item no encontrado';
  END IF;

  IF p_equip THEN
    -- Desequipar otros items de la misma categoría
    UPDATE public.user_items SET is_equipped = false
    WHERE user_id = p_user_id
      AND item_id != p_item_id
      AND item_id IN (SELECT id FROM public.store_items WHERE category = v_category);

    -- Equipar el item actual
    UPDATE public.user_items SET is_equipped = true
    WHERE user_id = p_user_id AND item_id = p_item_id;

    -- Guardar en equipped_items jsonb
    UPDATE public.profiles
    SET equipped_items = jsonb_set(coalesce(equipped_items, '{}'), ARRAY[v_category], to_jsonb(p_item_id))
    WHERE id = p_user_id;

    -- Columnas específicas
    IF v_category = 'nickname_style' THEN
      UPDATE public.profiles SET equipped_nickname_style = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'profile_theme' OR v_category = 'theme' THEN
      UPDATE public.profiles SET equipped_theme = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'ambient_sound' THEN
      UPDATE public.profiles SET equipped_ambient_sound = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'role' THEN
      UPDATE public.profiles SET equipped_primary_role = p_item_id WHERE id = p_user_id;
    ELSIF v_category = 'banner' THEN
      UPDATE public.profiles SET banner_item_id = p_item_id, banner_color = NULL WHERE id = p_user_id;
    ELSIF v_category = 'frame' THEN
      UPDATE public.profiles SET frame_item_id = p_item_id WHERE id = p_user_id;
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
    -- ═══ DESEQUIPAR ═══
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
    ELSIF v_category = 'ambient_sound' THEN
      UPDATE public.profiles SET equipped_ambient_sound = NULL WHERE id = p_user_id;
    ELSIF v_category = 'role' THEN
      UPDATE public.profiles SET equipped_primary_role = NULL WHERE id = p_user_id;
    ELSIF v_category = 'banner' THEN
      UPDATE public.profiles SET banner_item_id = NULL WHERE id = p_user_id;
    ELSIF v_category = 'frame' THEN
      UPDATE public.profiles SET frame_item_id = NULL WHERE id = p_user_id;
    END IF;

    -- ✅ FIX: Limpiar slot de mascota al desequipar pet_accessory
    IF v_category = 'pet_accessory' THEN
      DECLARE v_slot text;
      BEGIN
        v_slot := (SELECT metadata->>'slot' FROM public.store_items WHERE id = p_item_id);
        IF v_slot IS NOT NULL THEN
          EXECUTE format(
            'UPDATE public.pet_loadouts SET %I = NULL, updated_at = now() WHERE user_id = $1',
            'slot_' || v_slot
          ) USING p_user_id;
        END IF;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'equipped', p_equip, 'item_id', p_item_id);
END;
$$;
