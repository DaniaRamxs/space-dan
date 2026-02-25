-- Migración para sincronizar items ya equipados en el JSONB con las columnas directas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id, equipped_items FROM public.profiles WHERE equipped_items IS NOT NULL) LOOP
        -- Nickname Style
        IF r.equipped_items ? 'nickname_style' THEN
            UPDATE public.profiles SET equipped_nickname_style = (r.equipped_items->>'nickname_style') WHERE id = r.id;
        END IF;

        -- Profile Theme
        IF r.equipped_items ? 'profile_theme' THEN
            UPDATE public.profiles SET equipped_theme = (r.equipped_items->>'profile_theme') WHERE id = r.id;
        ELSIF r.equipped_items ? 'theme' THEN
            UPDATE public.profiles SET equipped_theme = (r.equipped_items->>'theme') WHERE id = r.id;
        END IF;

        -- Ambient Sound
        IF r.equipped_items ? 'ambient_sound' THEN
            UPDATE public.profiles SET equipped_ambient_sound = (r.equipped_items->>'ambient_sound') WHERE id = r.id;
        END IF;

        -- Role
        IF r.equipped_items ? 'role' THEN
            UPDATE public.profiles SET equipped_primary_role = (r.equipped_items->>'role') WHERE id = r.id;
        END IF;
    END LOOP;
END $$;
