
-- 🛡️ Seguridad para el Canal de Anuncios
-- Ejecuta este script para que solo los administradores puedan publicar noticias oficiales

-- 1. Añadir el campo de administrador si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Asegurar que RLS esté activo
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;

-- 3. Borrar políticas de inserción previas para limpiar la configuración
DROP POLICY IF EXISTS "allow_insert" ON global_chat;
DROP POLICY IF EXISTS "global_chat_insert_policy" ON global_chat;
DROP POLICY IF EXISTS "anuncios_restriction" ON global_chat;

-- 4. Nueva Política Maestra de Inserción:
-- - Si el canal NO es 'anuncios', cualquier usuario autenticado puede escribir.
-- - Si el canal ES 'anuncios', solo usuarios con is_admin = true pueden escribir.
CREATE POLICY "anuncios_restriction" ON global_chat
FOR INSERT 
TO authenticated
WITH CHECK (
  (channel_id != 'avisos') OR 
  (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ))
);

-- 5. AUTO-ADMIN PARA LA CREADORA 👑
-- Esto te dará permisos automáticamente si ejecutas el script.
UPDATE public.profiles SET is_admin = true WHERE id = auth.uid();

-- Comentario informativo
COMMENT ON COLUMN profiles.is_admin IS 'Permite escribir en canales restringidos como #anuncios';
