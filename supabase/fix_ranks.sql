CREATE OR REPLACE FUNCTION public.get_user_game_ranks(p_user_id uuid)
RETURNS TABLE (game_id text, max_score int, user_position bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$$
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
$$$;
