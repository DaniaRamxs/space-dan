-- ============================================================
-- Fix Relationship for blog_posts and profiles
-- This allows PostgREST (Supabase) to perform joins between these tables
-- ============================================================

-- 1. Fix blog_posts
ALTER TABLE public.blog_posts 
DROP CONSTRAINT IF EXISTS blog_posts_user_id_fkey;

ALTER TABLE public.blog_posts
ADD CONSTRAINT blog_posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. Fix profile_themes (optional but recommended for consistency)
ALTER TABLE public.profile_themes
DROP CONSTRAINT IF EXISTS profile_themes_user_id_fkey;

ALTER TABLE public.profile_themes
ADD CONSTRAINT profile_themes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. Fix profile_blocks
ALTER TABLE public.profile_blocks
DROP CONSTRAINT IF EXISTS profile_blocks_user_id_fkey;

ALTER TABLE public.profile_blocks
ADD CONSTRAINT profile_blocks_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 4. Fix spotify_connections
ALTER TABLE public.spotify_connections
DROP CONSTRAINT IF EXISTS spotify_connections_user_id_fkey;

ALTER TABLE public.spotify_connections
ADD CONSTRAINT spotify_connections_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;
