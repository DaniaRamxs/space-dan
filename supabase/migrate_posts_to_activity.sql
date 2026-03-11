-- Migrate old "posts" (bitacora) to the new "activity_posts" table

INSERT INTO public.activity_posts (id, author_id, content, type, created_at, updated_at)
SELECT 
  id,
  user_id AS author_id,  -- posts table uses user_id, not author_id
  -- We include title, subtitle and content_markdown if they exist
  COALESCE(title, '') || 
  CASE WHEN subtitle IS NOT NULL THEN E'\n\n' || subtitle ELSE '' END ||
  CASE WHEN content_markdown IS NOT NULL AND content_markdown != '' THEN E'\n\n' || content_markdown ELSE '' END AS content,
  'post'::public.post_type,
  created_at,
  updated_at
FROM public.posts
ON CONFLICT (id) DO NOTHING;

-- Note: The id matches the old posts id, which allows maintaining referential logic in edge cases if any.
