-- ============================================================
-- tester_mode.sql :: Monedas Infinitas y Exclusión de Rankings
-- ============================================================

-- 1. Agregar columna de control a perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_tester boolean DEFAULT false;

-- 2. Función para activar/desactivar modo tester y dar monedas
CREATE OR REPLACE FUNCTION public.set_tester_status(p_user_id uuid, p_is_tester boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles 
    SET is_tester = p_is_tester,
        balance = CASE WHEN p_is_tester THEN 999999999 ELSE balance END
    WHERE id = p_user_id;
END;
$$;

-- 3. Modificar purchase_item para no cobrar a los testers
CREATE OR REPLACE FUNCTION public.purchase_item(
  p_user_id uuid,
  p_item_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item         record;
  v_new_balance  integer;
  v_is_tester    boolean;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT is_tester INTO v_is_tester FROM public.profiles WHERE id = p_user_id;

  SELECT * INTO v_item
  FROM public.store_items
  WHERE id = p_item_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item no encontrado o inactivo: %', p_item_id;
  END IF;

  IF v_item.available_until IS NOT NULL AND v_item.available_until < now() THEN
    RAISE EXCEPTION 'Este item ya no está disponible';
  END IF;

  IF v_item.max_supply IS NOT NULL AND v_item.sold_count >= v_item.max_supply THEN
    RAISE EXCEPTION 'Agotado: % (stock: %/%)', v_item.title, v_item.sold_count, v_item.max_supply;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_items WHERE user_id = p_user_id AND item_id = p_item_id) THEN
    RAISE EXCEPTION 'Ya tienes este item: %', v_item.title;
  END IF;

  -- Si es tester, el precio es 0 para el proceso
  IF v_is_tester THEN
    v_item.price := 0;
  END IF;

  SELECT balance INTO v_new_balance FROM public.profiles
  WHERE id = p_user_id FOR UPDATE;

  IF v_new_balance < v_item.price THEN
    RAISE EXCEPTION 'Balance insuficiente: tienes % ◈, el item cuesta % ◈',
      v_new_balance, v_item.price;
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_item.price
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.user_items (user_id, item_id)
  VALUES (p_user_id, p_item_id);

  UPDATE public.store_items
  SET sold_count = sold_count + 1
  WHERE id = p_item_id;

  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
  VALUES (p_user_id, -v_item.price, v_new_balance, 'purchase', p_item_id,
          format('Comprado%s: %s', CASE WHEN v_is_tester THEN ' (Tester)' ELSE '' END, v_item.title));

  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object(
    'success',     true,
    'item_id',     p_item_id,
    'item_title',  v_item.title,
    'price',       v_item.price,
    'new_balance', v_new_balance,
    'tester',      v_is_tester
  );
END;
$$;

-- 4. Redefinir Leaderboards para excluir testers

-- 4. Redefinir Leaderboards para excluir testers

-- Riqueza
DROP FUNCTION IF EXISTS public.get_wealth_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_wealth_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, username text, avatar_url text, balance int, equipped_nickname_style text, user_level int, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT p.id, p.username, p.avatar_url, p.balance, p.equipped_nickname_style,
    FLOOR(0.1 * SQRT(public.get_user_xp(p.id)))::int as user_level,
    RANK() OVER (ORDER BY p.balance DESC, public.get_user_xp(p.id) DESC)::bigint as rank
  FROM public.profiles p
  WHERE p.balance > 0 AND p.is_tester = false
  ORDER BY p.balance DESC, public.get_user_xp(p.id) DESC
  LIMIT p_limit;
$$;

-- Global Scores
DROP FUNCTION IF EXISTS public.get_global_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, username text, avatar_url text, total_score bigint, user_level int, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH user_metrics AS (
    SELECT p.id, p.username, p.avatar_url, public.get_user_xp(p.id) as xp,
      (SELECT SUM(ms) FROM (SELECT MAX(s.score) as ms FROM public.scores s WHERE s.user_id = p.id GROUP BY s.game_id) t) as total_game_score
    FROM public.profiles p
    WHERE p.is_tester = false AND EXISTS (SELECT 1 FROM public.scores s WHERE s.user_id = p.id)
  )
  SELECT id, username, avatar_url, COALESCE(total_game_score, 0)::bigint as total_score,
    FLOOR(0.1 * SQRT(xp))::int as user_level,
    RANK() OVER (ORDER BY COALESCE(total_game_score, 0) DESC, xp DESC)::bigint as rank
  FROM user_metrics
  ORDER BY rank ASC
  LIMIT p_limit;
$$;

-- Individual Game Leaderboard
DROP FUNCTION IF EXISTS public.get_leaderboard(text, int);
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_game_id text, p_limit int DEFAULT 10)
RETURNS TABLE (user_id uuid, username text, avatar_url text, best_score int)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT s.user_id, p.username, p.avatar_url, MAX(s.score)::int AS best_score
  FROM public.scores s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE s.game_id = p_game_id AND p.is_tester = false
  GROUP BY s.user_id, p.username, p.avatar_url
  ORDER BY best_score DESC, public.get_user_xp(s.user_id) DESC
  LIMIT p_limit;
$$;

-- Streak Leaderboard
DROP FUNCTION IF EXISTS get_streak_leaderboard(int);
CREATE OR REPLACE FUNCTION get_streak_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (id UUID, username TEXT, avatar_url TEXT, streak INTEGER, best_streak INTEGER, last_active_date DATE, rank BIGINT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.username, p.avatar_url, p.streak, p.best_streak, p.last_active_date,
        RANK() OVER (ORDER BY p.streak DESC, p.best_streak DESC, p.id ASC) as rank
    FROM profiles p
    WHERE p.streak > 0 AND p.is_tester = false
    ORDER BY p.streak DESC, p.best_streak DESC
    LIMIT p_limit;
END;
$$;

-- Focus Leaderboard
DROP FUNCTION IF EXISTS public.get_focus_leaderboard(integer);
CREATE OR REPLACE FUNCTION public.get_focus_leaderboard(p_limit integer)
RETURNS TABLE (user_id uuid, username text, avatar_url text, total_minutes bigint, total_sessions integer, equipped_nickname_style text, user_level int, rank bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT s.user_id, p.username, p.avatar_url, s.total_focus_minutes as total_minutes, s.total_sessions, p.equipped_nickname_style,
        FLOOR(0.1 * SQRT(public.get_user_xp(p.id)))::int as user_level,
        RANK() OVER (ORDER BY s.total_focus_minutes DESC, public.get_user_xp(p.id) DESC) as rank
    FROM public.cabin_stats s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE p.is_tester = false
    ORDER BY s.total_focus_minutes DESC, public.get_user_xp(p.id) DESC
    LIMIT p_limit;
END;
$$;

-- Competitive Leaderboard
DROP FUNCTION IF EXISTS public.get_competitive_leaderboard(int);
CREATE OR REPLACE FUNCTION public.get_competitive_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (id uuid, username text, avatar_url text, season_balance int, user_level int, equipped_nickname_style text, rank bigint) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH user_xp_calc AS (
    SELECT p.id as uid,
      (COALESCE(p.balance, 0) + 
      COALESCE((SELECT count(*) * 150 FROM public.user_achievements WHERE user_id = p.id), 0) +
      COALESCE((SELECT count(DISTINCT game_id) * 200 FROM public.scores WHERE user_id = p.id), 0) +
      COALESCE((SELECT total_focus_minutes * 2 FROM public.cabin_stats WHERE user_id = p.id), 0))::float as xp
    FROM public.profiles p
    WHERE p.season_balance > 0 AND p.is_tester = false
  )
  SELECT p.id, p.username, p.avatar_url, p.season_balance, FLOOR(0.1 * SQRT(ux.xp))::int as user_level, p.equipped_nickname_style,
    RANK() OVER (ORDER BY p.season_balance DESC) as rank
  FROM public.profiles p
  JOIN user_xp_calc ux ON p.id = ux.uid
  ORDER BY p.season_balance DESC
  LIMIT p_limit;
END;
$$;
