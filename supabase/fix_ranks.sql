-- 1. Helper function to calculate Power Level (XP) matching frontend logic
CREATE OR REPLACE FUNCTION public.get_user_xp(p_user_id uuid)
RETURNS float LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    (COALESCE(p.balance, 0) + 
    (SELECT COUNT(*) FROM public.user_achievements ua WHERE ua.user_id = p_user_id) * 150 +
    (SELECT COUNT(DISTINCT s.game_id) FROM public.scores s WHERE s.user_id = p_user_id) * 200 +
    COALESCE((SELECT cs.total_focus_minutes FROM public.cabin_stats cs WHERE cs.user_id = p_user_id), 0) * 2)::float
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

-- 2. Improved function for user specific game ranks with tie-breaker
DROP FUNCTION IF EXISTS public.get_user_game_ranks(uuid);
CREATE OR REPLACE FUNCTION public.get_user_game_ranks(p_user_id uuid)
RETURNS TABLE (game_id text, max_score int, user_position bigint)
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
  SELECT r.game_id, r.max_score, r.user_position
  FROM ranked r
  WHERE r.user_id = p_user_id;
END;
$$;

-- 3. Improved Global Leaderboard (Total scores) with Level and Rank
DROP FUNCTION IF EXISTS public.get_global_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  user_id uuid, 
  username text, 
  avatar_url text, 
  total_score bigint, 
  user_level int,
  rank bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH user_metrics AS (
    SELECT 
      p.id,
      p.username,
      p.avatar_url,
      public.get_user_xp(p.id) as xp,
      (SELECT SUM(ms) FROM (
        SELECT MAX(s.score) as ms 
        FROM public.scores s 
        WHERE s.user_id = p.id 
        GROUP BY s.game_id
      ) t) as total_game_score
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.id)
  )
  SELECT 
    id, 
    username, 
    avatar_url, 
    COALESCE(total_game_score, 0)::bigint as total_score,
    FLOOR(0.1 * SQRT(xp))::int as user_level,
    RANK() OVER (ORDER BY COALESCE(total_game_score, 0) DESC, xp DESC)::bigint as rank
  FROM user_metrics
  ORDER BY rank ASC
  LIMIT p_limit;
$$;

