-- Actualización de arquitectura emocional para soportar Markdown y GIFs largos
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_mood_text_check;

ALTER TABLE public.profiles
  ALTER COLUMN mood_text TYPE text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_mood_text_check CHECK (char_length(mood_text) <= 1000);

-- Asegurar que la función set_user_mood sea resiliente
CREATE OR REPLACE FUNCTION public.set_user_mood(
    p_text text,
    p_emoji text DEFAULT NULL,
    p_duration_hours integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

    -- Upsert del mood del usuario
    UPDATE public.profiles
    SET 
        mood_text = p_text,
        mood_emoji = p_emoji,
        mood_expires_at = CASE WHEN p_duration_hours IS NULL THEN NULL ELSE now() + (p_duration_hours || ' hours')::interval END,
        updated_at = now()
    WHERE id = auth.uid();

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Asegurar que profile_blocks tenga una política de upsert correcta
DROP POLICY IF EXISTS "Users can manage their own profile blocks" ON profile_blocks;
CREATE POLICY "Users can manage their own profile blocks" ON profile_blocks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
