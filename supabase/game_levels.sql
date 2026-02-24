-- ============================================================
-- Plato-style Individual Game Levels System
-- ============================================================

-- 1. Table to track experience and stats per game per user
CREATE TABLE IF NOT EXISTS public.game_stats (
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id      text NOT NULL,
  experience   bigint DEFAULT 0,
  matches_played integer DEFAULT 0,
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, game_id)
);

-- Enable RLS
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_stats_public_read" ON public.game_stats FOR SELECT USING (true);

-- 2. Function to calculate level from XP
-- Formula: level = floor(sqrt(xp / 50)) + 1
-- Level 1: 0 XP
-- Level 2: 200 XP
-- Level 5: 1250 XP
-- Level 10: 5000 XP
-- Level 20: 20000 XP
CREATE OR REPLACE FUNCTION public.calculate_game_level(p_xp bigint)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT FLOOR(SQRT(p_xp / 50.0))::int + 1;
$$;

-- 3. Trigger function to update XP when a score is saved
CREATE OR REPLACE FUNCTION public.on_score_inserted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp_gain int;
BEGIN
  -- Base XP per match
  v_xp_gain := 50;
  
  -- Performance bonus (1 XP per 10 points, capped at 100 bonus)
  v_xp_gain := v_xp_gain + LEAST(100, FLOOR(NEW.score / 10.0)::int);

  INSERT INTO public.game_stats (user_id, game_id, experience, matches_played, updated_at)
  VALUES (NEW.user_id, NEW.game_id, v_xp_gain, 1, now())
  ON CONFLICT (user_id, game_id) DO UPDATE SET
    experience = game_stats.experience + v_xp_gain,
    matches_played = game_stats.matches_played + 1,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS tr_on_score_inserted ON public.scores;
CREATE TRIGGER tr_on_score_inserted
  AFTER INSERT ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.on_score_inserted();

-- 4. Update Game Leaderboard to include levels
DROP FUNCTION IF EXISTS public.get_leaderboard(text, int);
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_game_id text, p_limit int DEFAULT 10)
RETURNS TABLE (
    username text, 
    avatar_url text, 
    best_score int, 
    game_level int,
    matches_played int
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    p.username, 
    p.avatar_url, 
    MAX(s.score)::int AS best_score,
    COALESCE(public.calculate_game_level(gs.experience), 1) as game_level,
    COALESCE(gs.matches_played, 0) as matches_played
  FROM public.scores s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.game_stats gs ON gs.user_id = s.user_id AND gs.game_id = s.game_id
  WHERE s.game_id = p_game_id
  GROUP BY s.user_id, p.username, p.avatar_url, gs.experience, gs.matches_played
  ORDER BY best_score DESC
  LIMIT p_limit;
$$;

-- 5. Helper function to get a user's progress in a specific game
CREATE OR REPLACE FUNCTION public.get_user_game_stats(p_user_id uuid, p_game_id text)
RETURNS TABLE (
    level int,
    xp bigint,
    xp_to_next_level bigint,
    progress_percent float,
    matches_played int
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_xp bigint;
  v_level int;
  v_next_level_xp bigint;
  v_current_level_xp bigint;
BEGIN
  SELECT experience, matches_played INTO v_xp, v_current_level_xp 
  FROM public.game_stats 
  WHERE user_id = p_user_id AND game_id = p_game_id;
  
  IF v_xp IS NULL THEN
    RETURN QUERY SELECT 1, 0::bigint, 50::bigint, 0.0, 0;
    RETURN;
  END IF;

  v_level := public.calculate_game_level(v_xp);
  v_current_level_xp := (POWER(v_level - 1, 2) * 50)::bigint;
  v_next_level_xp := (POWER(v_level, 2) * 50)::bigint;

  RETURN QUERY SELECT 
    v_level, 
    v_xp, 
    v_next_level_xp,
    ((v_xp - v_current_level_xp)::float / NULLIF(v_next_level_xp - v_current_level_xp, 0)) * 100.0,
    v_current_level_xp::int; -- matches_played variable reuse or just select directly
END;
$$;

-- 6. Improved function for user specific game ranks with individual game level
DROP FUNCTION IF EXISTS public.get_user_game_ranks(uuid);
CREATE OR REPLACE FUNCTION public.get_user_game_ranks(p_user_id uuid)
RETURNS TABLE (game_id text, max_score int, user_position bigint, game_level int)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH user_best AS (
    SELECT s.game_id, s.user_id, MAX(s.score)::int as max_score
    FROM public.scores s
    GROUP BY s.game_id, s.user_id
  ),
  ranked AS (
    SELECT ub.game_id, ub.user_id, ub.max_score,
           RANK() OVER (
             PARTITION BY ub.game_id 
             ORDER BY ub.max_score DESC, public.get_user_xp(ub.user_id) DESC
           ) as user_position
    FROM user_best ub
  )
  SELECT 
    r.game_id, 
    r.max_score, 
    r.user_position,
    public.calculate_game_level(COALESCE(gs.experience, 0)) as game_level
  FROM ranked r
  LEFT JOIN public.game_stats gs ON gs.user_id = r.user_id AND gs.game_id = r.game_id
  WHERE r.user_id = p_user_id;
END;
$$;

-- 7. Backfill existing scores into game_stats
INSERT INTO public.game_stats (user_id, game_id, experience, matches_played)
SELECT 
  user_id, 
  game_id, 
  COUNT(*) * 50 + SUM(score) / 10 as experience,
  COUNT(*) as matches_played
FROM public.scores
WHERE user_id IS NOT NULL
GROUP BY user_id, game_id
ON CONFLICT (user_id, game_id) DO NOTHING;
