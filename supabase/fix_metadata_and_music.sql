-- ============================================================
-- Fix: Metadata Column and Music Support for Global Feed
-- ============================================================

-- 1. Add metadata column to activity_posts
ALTER TABLE public.activity_posts
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- 2. Update get_activity_feed to return metadata
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
            'title', op.title,
            'content', op.content,
            'created_at', op.created_at,
            'type', op.type,
            'metadata', op.metadata,
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

-- 3. Update update_activity_post to handle metadata
CREATE OR REPLACE FUNCTION public.update_activity_post(
  p_post_id   uuid,
  p_title     text DEFAULT NULL,
  p_content   text DEFAULT NULL,
  p_category  text DEFAULT NULL,
  p_metadata  jsonb DEFAULT NULL
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

  UPDATE public.activity_posts
  SET
    title      = COALESCE(p_title, title),
    content    = COALESCE(p_content, content),
    category   = COALESCE(p_category, category),
    metadata   = COALESCE(p_metadata, metadata),
    updated_at = now()
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id);
END;
$$;
