-- ============================================================
-- Agrega columna title a activity_posts y permite edición
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna title (nullable para no romper posts existentes)
ALTER TABLE public.activity_posts
  ADD COLUMN IF NOT EXISTS title text DEFAULT NULL;

-- 2. Política UPDATE — el autor puede editar sus propios posts
DROP POLICY IF EXISTS "Authors can update own activity posts" ON public.activity_posts;
CREATE POLICY "Authors can update own activity posts"
ON public.activity_posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- 3. Actualizar RPC get_activity_feed para incluir title en resultados
-- (Solo datos — la query ya devuelve p.* que incluye la nueva columna)
-- No necesita cambios si usamos p.*

-- 4. Función auxiliar para editar un post (más segura que UPDATE directo)
CREATE OR REPLACE FUNCTION public.update_activity_post(
  p_post_id  uuid,
  p_title    text DEFAULT NULL,
  p_content  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id uuid;
BEGIN
  -- Verificar que el post pertenece al usuario autenticado
  SELECT author_id INTO v_author_id
  FROM public.activity_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post no encontrado';
  END IF;

  IF auth.uid() != v_author_id THEN
    RAISE EXCEPTION 'No autorizado para editar este post';
  END IF;

  -- Solo se pueden editar posts tipo "post" (no reposts ni citas)
  IF EXISTS (
    SELECT 1 FROM public.activity_posts
    WHERE id = p_post_id AND type != 'post'
  ) THEN
    RAISE EXCEPTION 'Solo se pueden editar posts originales';
  END IF;

  UPDATE public.activity_posts
  SET
    title      = COALESCE(p_title, title),
    content    = COALESCE(p_content, content),
    updated_at = now()
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id);
END;
$$;
