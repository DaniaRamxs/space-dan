-- ============================================================
-- space-dan :: Supabase Schema
-- Ejecutar completo en Supabase > SQL Editor
-- ============================================================

-- ── 1. PROFILES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text,
  avatar_url text,
  bio        text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. SEASONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasons (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz,
  is_active  boolean DEFAULT true
);

-- Insertar Season 1 solo si no existe ninguna
INSERT INTO public.seasons (name, started_at)
SELECT 'Season 1', now()
WHERE NOT EXISTS (SELECT 1 FROM public.seasons);

-- ── 3. SCORES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  game_id    text NOT NULL,
  score      integer NOT NULL DEFAULT 0,
  season_id  integer REFERENCES public.seasons(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores_game ON public.scores (game_id);
CREATE INDEX IF NOT EXISTS idx_scores_user ON public.scores (user_id);
CREATE INDEX IF NOT EXISTS idx_scores_rank ON public.scores (game_id, score DESC);

-- Función leaderboard: mejor score por usuario por juego
DROP FUNCTION IF EXISTS public.get_leaderboard(text, int);
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_game_id text, p_limit int DEFAULT 10)
RETURNS TABLE (username text, avatar_url text, best_score int, equipped_nickname_style text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT p.username, p.avatar_url, MAX(s.score)::int AS best_score, p.equipped_nickname_style
  FROM public.scores s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.game_id = p_game_id
  GROUP BY s.user_id, p.username, p.avatar_url, p.equipped_nickname_style
  ORDER BY best_score DESC
  LIMIT p_limit;
$$;

-- ── 4. ACHIEVEMENTS CATALOG ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.achievements (
  id          text PRIMARY KEY,
  icon        text,
  title       text NOT NULL,
  description text,
  coins       integer DEFAULT 0
);

INSERT INTO public.achievements (id, icon, title, description, coins) VALUES
  ('first_visit',       '🌟', 'Bienvenid@',       'Visita el sitio por primera vez',              20),
  ('explorer',          '🗺️', 'Explorador/a',      'Visita 10 secciones diferentes',               50),
  ('completionist',     '🏆', 'Completista',        'Visita todas las secciones',                   200),
  ('gamer',             '🎮', 'Gamer',              'Juega 5 juegos diferentes',                    40),
  ('highscore',         '💥', 'Récord Roto',        'Consigue un nuevo récord en cualquier juego',  50),
  ('konami',            '⬆️', 'Konami Master',      'Activa el código Konami secreto',              100),
  ('social',            '📝', 'Sociable',           'Firma el libro de visitas',                    30),
  ('night_owl',         '🦉', 'Noctámbul@',         'Visita entre medianoche y las 5am',            75),
  ('music_lover',       '🎵', 'Music Lover',        'Abre el reproductor de música',                20),
  ('radio_listener',    '📻', 'Radio Listener',     'Escucha la radio en vivo',                     30),
  ('capsule_opener',    '⏳', 'Viajero del Tiempo', 'Visita la cápsula del tiempo',                 30),
  ('secret_finder',     '🔮', 'Secreto Desvelado',  'Encuentra la página secreta',                  100),
  ('shopper',           '🛍️', 'De Compras',         'Compra algo en la tienda',                     25),
  ('rich',              '💰', 'Dan-Rico/a',         'Acumula 500 Dancoins',                         0),
  ('os_user',           '🖥️', 'Usuario del OS',     'Abre una ventana en el OS Desktop',            20),
  ('os_hacker',         '💀', 'Hacker',             'Escribe un comando en la terminal del OS',     30),
  ('os_multitask',      '🪟', 'Multitarea',         'Abre 5 ventanas a la vez en el OS',            50),
  ('os_dev',            '🧮', 'Dev Mode',           'Usa la calculadora del OS',                    15),
  ('five_achievements', '🎖️', 'Coleccionista',      'Desbloquea 5 logros',                          60),
  ('all_achievements',  '👑', 'Leyenda',            'Desbloquea todos los logros',                  500)
ON CONFLICT (id) DO NOTHING;

-- ── 5. USER ACHIEVEMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id),
  unlocked_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_ua_user ON public.user_achievements (user_id);

-- ── 6. COMMENTS (para posts del blog) ───────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    text NOT NULL,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON public.comments (post_id, created_at);

-- ── 7. GUESTBOOK: agregar is_anonymous ──────────────────────
ALTER TABLE public.guestbook ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false;

-- ── 8. ROW LEVEL SECURITY ───────────────────────────────────

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_public_read"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_public_read"  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- scores
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores_public_read" ON public.scores;
DROP POLICY IF EXISTS "scores_auth_insert" ON public.scores;
CREATE POLICY "scores_public_read" ON public.scores FOR SELECT USING (true);
CREATE POLICY "scores_auth_insert" ON public.scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_public_read" ON public.achievements;
CREATE POLICY "achievements_public_read" ON public.achievements FOR SELECT USING (true);

-- user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ua_public_read"  ON public.user_achievements;
DROP POLICY IF EXISTS "ua_owner_insert" ON public.user_achievements;
CREATE POLICY "ua_public_read"  ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "ua_owner_insert" ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_public_read"  ON public.comments;
DROP POLICY IF EXISTS "comments_auth_insert"  ON public.comments;
DROP POLICY IF EXISTS "comments_owner_delete" ON public.comments;
CREATE POLICY "comments_public_read"  ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_auth_insert"  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_owner_delete" ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- guestbook: permite anónimos pero no suplantación de user_id
ALTER TABLE public.guestbook ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guestbook_public_read"   ON public.guestbook;
DROP POLICY IF EXISTS "guestbook_anyone_insert" ON public.guestbook;
DROP POLICY IF EXISTS "guestbook_insert"        ON public.guestbook;
CREATE POLICY "guestbook_public_read" ON public.guestbook FOR SELECT USING (true);
CREATE POLICY "guestbook_insert"      ON public.guestbook FOR INSERT
  WITH CHECK (
    (user_id IS NULL) OR (auth.uid() = user_id)
  );

-- ============================================================
-- Supabase Schema Updates for Profile, Ranks & Global Leaderboard
-- PLEASE EXECUTE THIS IN SUPABASE SQL EDITOR
-- ============================================================

-- 1. Function to get a specific user's best score and rank across all games
DROP FUNCTION IF EXISTS public.get_user_game_ranks(uuid);
CREATE OR REPLACE FUNCTION public.get_user_game_ranks(p_user_id uuid)
RETURNS TABLE (game_id text, max_score int, user_position bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH user_best AS (
    SELECT s.game_id, s.user_id, MAX(s.score)::int as max_score
    FROM public.scores s
    GROUP BY s.game_id, s.user_id
  ),
  ranked AS (
    SELECT ub.game_id, ub.user_id, ub.max_score,
           RANK() OVER (PARTITION BY ub.game_id ORDER BY ub.max_score DESC) as user_position
    FROM user_best ub
  )
  SELECT r.game_id, r.max_score, r.user_position
  FROM ranked r
  WHERE r.user_id = p_user_id;
$$;

-- 2. Function for Global Leaderboard (Total of best scores per user)
DROP FUNCTION IF EXISTS public.get_global_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, username text, avatar_url text, total_score bigint, equipped_nickname_style text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH user_best AS (
    SELECT s.game_id, s.user_id, MAX(s.score)::int as max_score
    FROM public.scores s
    GROUP BY s.game_id, s.user_id
  )
  SELECT ub.user_id, p.username, p.avatar_url, SUM(ub.max_score)::bigint as total_score, p.equipped_nickname_style
  FROM user_best ub
  JOIN public.profiles p ON p.id = ub.user_id
  GROUP BY ub.user_id, p.username, p.avatar_url, p.equipped_nickname_style
  ORDER BY total_score DESC
  LIMIT p_limit;
$$;
