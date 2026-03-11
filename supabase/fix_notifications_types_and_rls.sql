-- ============================================================
-- FIX: Tipos de notificación + RLS para notificaciones cruzadas
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Expandir el CHECK constraint con todos los tipos que usa la app
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'achievement',
    'record',
    'system',
    'letter',
    'room_invite',
    'partnership_request',
    'social',
    'mention',
    'reaction',
    'repost',
    'quote',
    'comment',
    'follow'
  ));

-- 2. Función SECURITY DEFINER para insertar notificaciones para cualquier usuario
--    Cualquier usuario autenticado puede notificar a otro usuario.
--    Al ser SECURITY DEFINER, bypasea RLS y corre con permisos del owner del schema.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id    uuid,
  p_type       text,
  p_message    text,
  p_reference_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Requiere autenticación
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, reference_id)
  VALUES (
    p_user_id,
    p_type,
    p_message,
    CASE WHEN p_reference_id IS NOT NULL AND p_reference_id != ''
         THEN p_reference_id::uuid
         ELSE NULL
    END
  );
END;
$$;

-- Permitir que usuarios autenticados ejecuten esta función
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) TO authenticated;
