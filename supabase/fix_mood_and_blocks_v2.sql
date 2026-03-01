-- SOLUCIÓN: Reconstrucción de la vista dependiente para permitir el cambio de tipo de datos
-- 1. Eliminar temporalmente la vista que bloquea el cambio
DROP VIEW IF EXISTS public.active_profiles;

-- 2. Eliminar la restricción antigua
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_mood_text_check;

-- 3. Ampliar el tipo de dato y el límite (ahora sin bloqueos)
ALTER TABLE public.profiles
  ALTER COLUMN mood_text TYPE text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_mood_text_check CHECK (char_length(mood_text) <= 1000);

-- 4. Recrear la vista con el nuevo tipo de dato
CREATE OR REPLACE VIEW public.active_profiles AS
SELECT *, 
       CASE WHEN mood_expires_at < now() THEN NULL ELSE mood_text END as effective_mood_text,
       CASE WHEN mood_expires_at < now() THEN NULL ELSE mood_emoji END as effective_mood_emoji
FROM public.profiles;

-- 5. Asegurar que la función set_user_mood use los nuevos parámetros
CREATE OR REPLACE FUNCTION public.set_user_mood(
    p_text text,
    p_emoji text DEFAULT NULL,
    p_duration_hours integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

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
