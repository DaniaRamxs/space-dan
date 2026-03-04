-- ============================================================
-- stellar_economy_v3.sql :: Eclipse, Boosts, Retención y Refinamiento
-- ============================================================

-- 1. Actualizar award_activity_xp para soportar multiplicadores (Eclipse y Boosts)
DROP FUNCTION IF EXISTS public.award_activity_xp(uuid, int, text);
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
    v_multiplier numeric := 1.0;
    v_boost_active boolean;
    v_eclipse_active boolean;
BEGIN
    -- Verificar Boost Individual (1h)
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id AND xp_boost_until > now()
    ) INTO v_boost_active;
    
    -- Verificar Eclipse Galáctico (Evento Global)
    SELECT EXISTS (
        SELECT 1 FROM public.bot_events 
        WHERE type = 'eclipse' AND status = 'active' AND expires_at > now()
    ) INTO v_eclipse_active;

    IF v_eclipse_active THEN v_multiplier := v_multiplier * 3.0; END IF;
    IF v_boost_active THEN v_multiplier := v_multiplier * 2.0; END IF;

    p_amount := floor(p_amount * v_multiplier);

    SELECT activity_xp, activity_level INTO v_old_xp, v_old_lvl
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'user_not_found'); END IF;

    v_new_xp := v_old_xp + p_amount;
    v_new_lvl := floor(sqrt(v_new_xp / 10.0))::int + 1;

    IF v_new_lvl > v_old_lvl THEN
        v_level_up := true;
    END IF;

    UPDATE public.profiles
    SET activity_xp = v_new_xp,
        activity_level = v_new_lvl,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'awarded', p_amount,
        'multiplier', v_multiplier,
        'activity_level', v_new_lvl,
        'level_up', v_level_up
    );
END;
$$;

-- 2. Actualizar award_coins para incluir Eclipse Galáctico
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
  v_final_amount integer := p_amount;
  v_withheld     integer := 0;
  v_active_loan  RECORD;
  v_multiplier   numeric := 1.0;
  v_pact_active  boolean;
  v_eclipse_active boolean;
  v_withhold_rate numeric := 0.25; 
  v_new_balance  integer;
BEGIN
  -- Verificar Eclipse Galáctico (x3)
  SELECT EXISTS (
      SELECT 1 FROM public.bot_events 
      WHERE type = 'eclipse' AND status = 'active' AND expires_at > now()
  ) INTO v_eclipse_active;

  IF v_eclipse_active THEN v_multiplier := 3.0; END IF;

  v_final_amount := floor(p_amount * v_multiplier);

  -- Retención por Pacto Estelar (50%) o Crédito Normal (25%)
  SELECT stellar_pact_active INTO v_pact_active FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_pact_active, false) THEN
    v_withhold_rate := 0.50;
  END IF;

  SELECT * INTO v_active_loan FROM public.user_loans 
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    v_withheld := floor(v_final_amount * v_withhold_rate);
    IF v_withheld > v_active_loan.remaining_debt THEN
      v_withheld := v_active_loan.remaining_debt;
    END IF;

    UPDATE public.user_loans 
    SET remaining_debt = remaining_debt - v_withheld,
        status = CASE WHEN remaining_debt - v_withheld <= 0 THEN 'paid' ELSE 'active' END
    WHERE id = v_active_loan.id;

    v_final_amount := v_final_amount - v_withheld;

    -- Deactivar pacto si se saldó la deuda
    IF (v_active_loan.remaining_debt - v_withheld) <= 0 THEN
        UPDATE public.profiles SET stellar_pact_active = false WHERE id = p_user_id;
    END IF;
  END IF;

  UPDATE public.profiles SET balance = balance + v_final_amount WHERE id = p_user_id RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (p_user_id, v_final_amount, v_new_balance, p_type, p_reference, p_description, p_metadata);

  RETURN jsonb_build_object(
    'success', true, 
    'awarded', v_final_amount, 
    'withheld', v_withheld,
    'multiplier', v_multiplier,
    'eclipse', v_eclipse_active
  );
END;
$$;

-- 3. Trigger manual del Eclipse (solo para admins o simulado)
CREATE OR REPLACE FUNCTION public.trigger_galactic_eclipse()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Iniciar evento de 2 horas
    RETURN public.start_bot_event('eclipse', '{"title": "Eclipse Galáctico", "msg": "XP y Starlys x3 ACTIVADOS"}'::jsonb, 120);
END;
$$;
