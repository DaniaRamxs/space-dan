-- ============================================================
-- MIGRATION: categorías, vistas y fix RLS de reacciones
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Columna categoría en activity_posts
ALTER TABLE public.activity_posts
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- 2. Columna vistas en activity_posts  
ALTER TABLE public.activity_posts
  ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- 3. Actualizar función update_activity_post para incluir categoría
CREATE OR REPLACE FUNCTION public.update_activity_post(
  p_post_id  uuid,
  p_title    text DEFAULT NULL,
  p_content  text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_author_id uuid;
BEGIN
  SELECT author_id INTO v_author_id
  FROM public.activity_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post no encontrado';
  END IF;

  IF auth.uid() != v_author_id THEN
    RAISE EXCEPTION 'No autorizado para editar este post';
  END IF;

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
    category   = COALESCE(p_category, category),
    updated_at = now()
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id);
END;
$$;

-- 4. Función para incrementar vistas (idempotente por sesión no hay dedup aquí,
--    pero se puede extender con tabla de vistas únicas)
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.activity_posts
  SET views_count = views_count + 1
  WHERE id = p_post_id;
$$;

-- 5. FIX CRITICO: Políticas RLS de activity_reactions
--    (sin estos, los INSERT/DELETE fallan con 403/RLS error)

-- Habilitar RLS si no está activo
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;

-- Leer reacciones — cualquiera puede ver
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.activity_reactions;
CREATE POLICY "Anyone can view reactions"
ON public.activity_reactions FOR SELECT
USING (true);

-- Insertar reacción — solo el propio usuario
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.activity_reactions;
CREATE POLICY "Users can insert own reactions"
ON public.activity_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Eliminar reacción — solo el propio usuario
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.activity_reactions;
CREATE POLICY "Users can delete own reactions"
ON public.activity_reactions FOR DELETE
USING (auth.uid() = user_id);

-- 6. RLS para activity_posts — lectura pública
ALTER TABLE public.activity_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view posts" ON public.activity_posts;
CREATE POLICY "Anyone can view posts"
ON public.activity_posts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authors can insert posts" ON public.activity_posts;
CREATE POLICY "Authors can insert posts"
ON public.activity_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own activity posts" ON public.activity_posts;
CREATE POLICY "Authors can update own activity posts"
ON public.activity_posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own posts" ON public.activity_posts;
CREATE POLICY "Authors can delete own posts"
ON public.activity_posts FOR DELETE
USING (auth.uid() = author_id);

-- 7. Índice para categoría
CREATE INDEX IF NOT EXISTS idx_activity_posts_category ON public.activity_posts(category);
