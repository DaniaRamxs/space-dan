-- ============================================================
-- hyperbot_progression.sql :: Prestige, Títulos y XP Boost
-- ============================================================

-- 1. Nuevas columnas en profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS prestige_level  int DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_title      text,
ADD COLUMN IF NOT EXISTS xp_boost_until timestamptz;

-- 2. prestige_user — Resetea XP a cambio de un badge de Prestige
DROP FUNCTION IF EXISTS public.prestige_user(uuid);
CREATE OR REPLACE FUNCTION public.prestige_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_lvl_stellar int;
    v_lvl_activity int;
    v_prestige int;
BEGIN
    SELECT level, activity_level, COALESCE(prestige_level, 0)
    INTO v_lvl_stellar, v_lvl_activity, v_prestige
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    -- Requisito: Nivel Estelar o Actividad >= 50 (ajustable)
    IF v_lvl_stellar < 50 AND v_lvl_activity < 50 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'level_too_low',
            'current_level', v_lvl_stellar
        );
    END IF;

    v_prestige := v_prestige + 1;

    -- Reinicio total
    UPDATE public.profiles
    SET activity_xp    = 0,
        activity_level = 1,
        level          = 1,
        prestige_level = v_prestige,
        updated_at     = now()
    WHERE id = p_user_id;

    -- Reiniciar también progreso del pase si existe
    UPDATE public.stellar_pass_progression
    SET xp = 0,
        level = 1,
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success',        true,
        'prestige_level', v_prestige,
        'xp_bonus',       v_prestige * 10,
        'starlys_bonus',  v_prestige * 5
    );
END;
$$;

-- 3. buy_xp_boost — Gasta 200 ◈ para ×2 XP durante 1 hora
DROP FUNCTION IF EXISTS public.buy_xp_boost(uuid);
CREATE OR REPLACE FUNCTION public.buy_xp_boost(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance     int;
    v_boost_until timestamptz;
    v_cost        int := 200;
BEGIN
    SELECT balance, xp_boost_until
    INTO v_balance, v_boost_until
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    IF v_boost_until IS NOT NULL AND v_boost_until > now() THEN
        RETURN jsonb_build_object(
            'success',    false,
            'reason',     'already_active',
            'expires_at', v_boost_until
        );
    END IF;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'insufficient_funds',
            'balance', v_balance,
            'cost',    v_cost
        );
    END IF;

    UPDATE public.profiles
    SET balance        = balance - v_cost,
        xp_boost_until = now() + interval '1 hour',
        updated_at     = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success',    true,
        'expires_at', (now() + interval '1 hour'),
        'cost',       v_cost
    );
END;
$$;

-- 4. set_user_title — Guarda el título equipado
DROP FUNCTION IF EXISTS public.set_user_title(uuid, text);
CREATE OR REPLACE FUNCTION public.set_user_title(p_user_id uuid, p_title text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles
    SET chat_title = p_title,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'title', p_title);
END;
$$;

-- 5. award_activity_xp — Reemplaza la versión original para incluir ×2 boost
DROP FUNCTION IF EXISTS public.award_activity_xp(uuid, int, text);
CREATE OR REPLACE FUNCTION public.award_activity_xp(
    p_user_id uuid,
    p_amount  int,
    p_source  text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old_xp       int;
    v_new_xp       int;
    v_old_lvl      int;
    v_new_lvl      int;
    v_level_up     boolean := false;
    v_boost        boolean := false;
    v_prestige     int;
    v_actual_amount int;
BEGIN
    SELECT activity_xp, activity_level, COALESCE(prestige_level, 0),
           (xp_boost_until IS NOT NULL AND xp_boost_until > now())
    INTO v_old_xp, v_old_lvl, v_prestige, v_boost
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    v_actual_amount := p_amount;
    
    -- Aplicar boost temporal
    IF v_boost THEN
        v_actual_amount := v_actual_amount * 2;
    END IF;

    -- Aplicar multiplicador permanente de Renacimiento (+10% por nivel)
    v_actual_amount := v_actual_amount * (1 + (v_prestige * 0.10));

    v_new_xp  := v_old_xp + v_actual_amount;
    v_new_lvl := floor(sqrt(v_new_xp / 10.0))::int + 1;

    IF v_new_lvl > v_old_lvl THEN
        v_level_up := true;
    END IF;

    UPDATE public.profiles
    SET activity_xp    = v_new_xp,
        activity_level = v_new_lvl,
        updated_at     = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success',        true,
        'old_xp',         v_old_xp,
        'activity_xp',    v_new_xp,
        'old_level',      v_old_lvl,
        'activity_level', v_new_lvl,
        'level_up',       v_level_up,
        'xp_boost',       v_boost,
        'prestige_level', v_prestige,
        'xp_earned',      v_actual_amount
    );
END;
$$;
