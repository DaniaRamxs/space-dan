-- ============================================================
-- Space Dan :: Social Activity System
-- ============================================================

-- 1. Types
DO $$ BEGIN
    CREATE TYPE public.post_type AS ENUM ('post', 'repost', 'quote');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.social_reaction_type AS ENUM (
      'connection',
      'impact',
      'represent',
      'think',
      'underrated'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tables (Using activity_ prefix to avoid conflict with existing blog 'posts')
CREATE TABLE IF NOT EXISTS public.activity_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text,
  type public.post_type NOT NULL DEFAULT 'post',
  original_post_id uuid REFERENCES public.activity_posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_posts_author ON public.activity_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_activity_posts_type ON public.activity_posts(type);
CREATE INDEX IF NOT EXISTS idx_activity_posts_original ON public.activity_posts(original_post_id);
CREATE INDEX IF NOT EXISTS idx_activity_posts_created_at ON public.activity_posts(created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.activity_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type public.social_reaction_type NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_activity_reactions_post ON public.activity_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_activity_reactions_type ON public.activity_reactions(reaction_type);

-- 3. RLS
ALTER TABLE public.activity_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public activity posts readable" ON public.activity_posts;
CREATE POLICY "Public activity posts readable"
ON public.activity_posts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert activity posts" ON public.activity_posts;
CREATE POLICY "Authenticated can insert activity posts"
ON public.activity_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authenticated can react to activity" ON public.activity_reactions;
CREATE POLICY "Authenticated can react to activity"
ON public.activity_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activity reactions" ON public.activity_reactions;
CREATE POLICY "Users can delete own activity reactions"
ON public.activity_reactions FOR DELETE
USING (auth.uid() = user_id);

-- 4. RPC for Optimized Feed
CREATE OR REPLACE FUNCTION public.get_activity_feed(
  p_viewer_id uuid,
  p_filter_type text DEFAULT 'all',
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_results jsonb;
BEGIN
  SELECT json_agg(t)
  INTO v_results
  FROM (
    SELECT 
      p.*,
      json_build_object(
        'username', prof.username,
        'avatar_url', prof.avatar_url,
        'frame_item_id', prof.frame_item_id
      ) as author,
      (
        SELECT jsonb_build_object(
          'total_count', count(*),
          'top_reactions', coalesce(
            (
              SELECT jsonb_agg(r_top)
              FROM (
                SELECT reaction_type, count(*) as count
                FROM public.activity_reactions r2
                WHERE r2.post_id = p.id
                GROUP BY reaction_type
                ORDER BY count DESC
                LIMIT 2
              ) r_top
            ), '[]'::jsonb
          ),
          'user_reaction', (
            SELECT reaction_type 
            FROM public.activity_reactions r3 
            WHERE r3.post_id = p.id AND r3.user_id = p_viewer_id
            LIMIT 1
          )
        )
        FROM public.activity_reactions r
        WHERE r.post_id = p.id
      ) as reactions_metadata,
      CASE 
        WHEN p.original_post_id IS NOT NULL THEN (
          SELECT jsonb_build_object(
            'id', op.id,
            'content', op.content,
            'created_at', op.created_at,
            'type', op.type,
            'author', jsonb_build_object(
              'username', opro.username,
              'avatar_url', opro.avatar_url
            )
          )
          FROM public.activity_posts op
          JOIN public.profiles opro ON opro.id = op.author_id
          WHERE op.id = p.original_post_id
        )
        ELSE NULL
      END as original_post
    FROM public.activity_posts p
    JOIN public.profiles prof ON prof.id = p.author_id
    WHERE 
      (p_filter_type = 'all' OR p.type::text = p_filter_type)
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN COALESCE(v_results, '[]'::jsonb);
END;
$$;
