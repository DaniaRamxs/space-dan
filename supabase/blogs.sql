-- ============================================================
-- Space Cabin :: Blogging System
-- ============================================================

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  slug text UNIQUE NOT NULL,
  content_markdown text DEFAULT '',
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  views bigint DEFAULT 0,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- RLS POLICIES
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer posts publicados (published)
CREATE POLICY "Public profiles can view published posts" ON public.posts
  FOR SELECT USING (status = 'published');

-- Los drafts solo los puede ver el autor
CREATE POLICY "Users can view own drafts" ON public.posts
  FOR SELECT USING (auth.uid() = user_id AND status = 'draft');

-- Los autores pueden crear posts
CREATE POLICY "Users can create posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Los autores pueden modificar sus posts
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Los autores pueden borrar sus posts
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Funciones helper
CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.posts
  SET views = views + 1
  WHERE id = p_post_id;
END;
$$;
