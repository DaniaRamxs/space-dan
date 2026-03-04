-- ============================================================
-- stellar_expansion.sql :: Features de Nueva Generación
-- ============================================================

-- 1. Extensiones de Perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS prestige_level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_title     text,
ADD COLUMN IF NOT EXISTS xp_boost_until timestamptz;

-- 2. Sistema de Prestige
DROP FUNCTION IF EXISTS public.prestige_user(uuid);
CREATE OR REPLACE FUNCTION public.prestige_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_level int;
    v_prestige int;
BEGIN
    SELECT activity_level, prestige_level INTO v_level, v_prestige
    FROM public.profiles WHERE id = p_user_id;

    IF COALESCE(v_level, 1) < 10 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'low_level');
    END IF;

    UPDATE public.profiles
    SET activity_level = 1,
        activity_xp = 0,
        prestige_level = COALESCE(v_prestige, 0) + 1,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'new_prestige', COALESCE(v_prestige, 0) + 1);
END;
$$;

-- 3. Sistema de Títulos
DROP FUNCTION IF EXISTS public.set_user_title(uuid, text);
CREATE OR REPLACE FUNCTION public.set_user_title(p_user_id uuid, p_title text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles SET chat_title = p_title WHERE id = p_user_id;
END;
$$;

-- 4. Sistema de Boost de XP
DROP FUNCTION IF EXISTS public.buy_xp_boost(uuid);
CREATE OR REPLACE FUNCTION public.buy_xp_boost(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance int;
    v_boost_until timestamptz;
BEGIN
    SELECT balance, xp_boost_until INTO v_balance, v_boost_until
    FROM public.profiles WHERE id = p_user_id;

    IF v_boost_until IS NOT NULL AND v_boost_until > now() THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_active', 'expires_at', v_boost_until);
    END IF;

    IF COALESCE(v_balance, 0) < 200 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds', 'balance', v_balance);
    END IF;

    UPDATE public.profiles 
    SET balance = balance - 200,
        xp_boost_until = now() + interval '1 hour'
    WHERE id = p_user_id;

    -- Registrar la transaccion para el ledger
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, -200, v_balance - 200, 'purchase', 'XP Boost x2 (1 hora)');

    RETURN jsonb_build_object('success', true, 'expires_at', now() + interval '1 hour');
END;
$$;

-- 5. Multiplicador de Noche (The Dark Side) y Boost de XP
-- Sobreescribimos award_activity_xp para incluir el boost
CREATE OR REPLACE FUNCTION public.award_activity_xp(
    p_user_id uuid,
    p_amount int,
    p_source text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old_xp int;
    v_new_xp int;
    v_old_lvl int;
    v_new_lvl int;
    v_level_up boolean := false;
    v_boost_until timestamptz;
BEGIN
    SELECT activity_xp, activity_level, xp_boost_until 
    INTO v_old_xp, v_old_lvl, v_boost_until
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;

    -- Aplicar boost si esta activo
    IF v_boost_until IS NOT NULL AND v_boost_until > now() THEN
        p_amount := p_amount * 2;
    END IF;

    v_new_xp := COALESCE(v_old_xp, 0) + p_amount;
    v_new_lvl := floor(sqrt(v_new_xp / 10.0))::int + 1;

    IF v_new_lvl > v_old_lvl THEN v_level_up := true; END IF;

    UPDATE public.profiles
    SET activity_xp = v_new_xp,
        activity_level = v_new_lvl,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'activity_xp', v_new_xp,
        'activity_level', v_new_lvl,
        'level_up', v_level_up,
        'awarded', p_amount
    );
END;
$$;

-- Actualizar award_coins para multiplicador nocturno
DROP FUNCTION IF EXISTS public.award_coins(uuid, integer, text, text, text, jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.award_coins(
  p_user_id    uuid,
  p_amount     integer,
  p_type       text,
  p_reference  text    DEFAULT NULL,
  p_description text   DEFAULT NULL,
  p_metadata   jsonb   DEFAULT '{}'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance   integer;
  v_daily_earned  integer;
  v_daily_cap     integer := CASE p_type
    WHEN 'page_visit'   THEN 100
    WHEN 'game_reward'  THEN 500
    WHEN 'achievement'  THEN NULL
    WHEN 'daily_bonus'  THEN 30
    ELSE NULL
  END;
  v_hour int := extract(hour from (now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota'); -- Ajustar a horario local si es posible, o usar UTC
BEGIN
    -- Multiplicador nocturno (00:00 - 05:00) x1.5 para juegos
    IF p_type = 'game_reward' AND (v_hour >= 0 AND v_hour < 5) THEN
        p_amount := floor(p_amount * 1.5);
        p_description := COALESCE(p_description, '') || ' [Bonificación Nocturna x1.5 🌑]';
    END IF;

    IF p_type NOT IN ('achievement','daily_bonus','game_reward','page_visit','admin_grant','community_reward','migration','productivity','mission') THEN
        RAISE EXCEPTION 'Tipo inválido para award_coins: %', p_type;
    END IF;

    IF p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser positivo'; END IF;

    IF v_daily_cap IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_daily_earned
        FROM public.transactions
        WHERE user_id = p_user_id AND type = p_type AND created_at >= (now() AT TIME ZONE 'UTC')::date;

        IF v_daily_earned >= v_daily_cap THEN
            SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
            RETURN jsonb_build_object('success', false, 'reason', 'daily_cap_reached', 'balance', v_new_balance);
        END IF;
        p_amount := LEAST(p_amount, v_daily_cap - v_daily_earned);
    END IF;

    UPDATE public.profiles SET balance = balance + p_amount WHERE id = p_user_id RETURNING balance INTO v_new_balance;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;

    INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
    VALUES (p_user_id, p_amount, v_new_balance, p_type, p_reference, p_description, p_metadata);

    RETURN jsonb_build_object('success', true, 'awarded', p_amount, 'balance', v_new_balance);
END;
$$;

-- 6. Hall of Fame (Top 3 Mejorados)
DROP FUNCTION IF EXISTS public.get_hall_of_fame();
CREATE OR REPLACE FUNCTION public.get_hall_of_fame()
RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    prestige_level int,
    activity_level int,
    chat_title text,
    rank int
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        id as user_id,
        username,
        avatar_url,
        prestige_level,
        activity_level,
        chat_title,
        ROW_NUMBER() OVER(ORDER BY prestige_level DESC, activity_level DESC, activity_xp DESC)::int as rank
    FROM public.profiles
    WHERE username IS NOT NULL
    LIMIT 3;
$$;

-- 7. Stellar Map Data (V3)
DROP FUNCTION IF EXISTS public.get_stellar_map_data();
CREATE OR REPLACE FUNCTION public.get_stellar_map_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_data jsonb;
BEGIN
    SELECT json_build_object(
        'users', (
            SELECT json_agg(
                json_build_object(
                    'id', p.id,
                    'username', p.username,
                    'avatar_url', p.avatar_url,
                    'level', COALESCE(p.level, 1),
                    'activity_level', COALESCE(p.activity_level, 1),
                    'prestige_level', COALESCE(p.prestige_level, 0),
                    'chat_title', p.chat_title,
                    'is_playing', COALESCE(mss.is_playing, false),
                    'music_mood', mss.emotional_label,
                    'xp_boost', (p.xp_boost_until IS NOT NULL AND p.xp_boost_until > now()),
                    'badge_color', p.badge_color
                )
            )
            FROM public.profiles p
            LEFT JOIN public.user_sound_state mss ON mss.user_id = p.id
            WHERE p.username IS NOT NULL
            LIMIT 150
        ),
        'hall_of_fame', (SELECT json_agg(h) FROM (SELECT * FROM public.get_hall_of_fame()) h)
    ) INTO v_data;

    RETURN v_data;
END;
$$;
