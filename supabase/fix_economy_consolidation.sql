-- ============================================================
-- MASTER ECONOMY PATCH :: space-dan
-- Corrección de Ledger, Unificación de AwardCoins y Snapshots
-- ============================================================

-- 1. CORRECCIÓN DE TRANSFER_COINS (Evitar doble comisión en historial)
CREATE OR REPLACE FUNCTION public.transfer_coins(
  p_from_user_id uuid,
  p_to_user_id   uuid,
  p_amount       integer,
  p_message      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_fee            integer;
  v_net            integer;
  v_from_balance   integer;
  v_to_balance     integer;
  v_transfer_id    uuid;
  v_hourly_count   integer;
  v_hourly_volume  integer;
  v_pact_active    boolean;
  v_is_tycoon      boolean;
  v_MAX_TRANSFER   integer := 5000;
  v_MAX_HOURLY_VOL integer := 10000;
  v_MAX_HOURLY_TXS integer := 10;
  v_tycoon_tax     integer := 0;
BEGIN
  -- Validaciones de seguridad y límites
  SELECT EXISTS(SELECT 1 FROM public.galactic_tycoons WHERE user_id = p_from_user_id AND is_active = true) INTO v_is_tycoon;
  IF v_is_tycoon THEN
    v_MAX_TRANSFER := 50000000;
    v_MAX_HOURLY_VOL := 100000000;
  END IF;

  SELECT stellar_pact_active INTO v_pact_active FROM public.profiles WHERE id = p_from_user_id;
  IF COALESCE(v_pact_active, false) THEN
    v_MAX_TRANSFER := 100;
    v_MAX_HOURLY_VOL := 200;
    v_MAX_HOURLY_TXS := 3;
  END IF;

  IF auth.uid() != p_from_user_id THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_from_user_id = p_to_user_id THEN RAISE EXCEPTION 'No puedes enviarte a ti mismo'; END IF;
  
  -- Rate limiting
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO v_hourly_count, v_hourly_volume
  FROM public.transfers WHERE from_user_id = p_from_user_id AND created_at > now() - interval '1 hour';
  IF v_hourly_count >= v_MAX_HOURLY_TXS THEN RAISE EXCEPTION 'Límite de transferencias horario alcanzado'; END IF;

  -- Comisiones
  v_fee := floor(p_amount * 0.05);
  IF v_is_tycoon AND p_amount >= 1000000 THEN v_fee := v_fee + floor(p_amount * 0.02); END IF;
  v_net := p_amount - v_fee;

  -- Transacción atómica
  UPDATE public.profiles SET balance = balance - p_amount 
  WHERE id = p_from_user_id AND balance >= p_amount
  RETURNING balance INTO v_from_balance;

  IF v_from_balance IS NULL THEN RAISE EXCEPTION 'Balance insuficiente'; END IF;

  UPDATE public.profiles SET balance = balance + v_net WHERE id = p_to_user_id
  RETURNING balance INTO v_to_balance;

  INSERT INTO public.transfers (from_user_id, to_user_id, amount, fee, net_amount, message)
  VALUES (p_from_user_id, p_to_user_id, p_amount, v_fee, v_net, p_message)
  RETURNING id INTO v_transfer_id;

  -- LEDGER CORREGIDO: v_net + v_fee = p_amount
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description)
  VALUES
    (p_from_user_id, -v_net, v_from_balance + v_fee, 'transfer_out', v_transfer_id::text, 'Envío de Starlys'),
    (p_from_user_id, -v_fee, v_from_balance, 'transfer_fee', v_transfer_id::text, 'Comisión de red'),
    (p_to_user_id, v_net, v_to_balance, 'transfer_in', v_transfer_id::text, 'Transferencia recibida');

  PERFORM public.upsert_weekly_snapshot(p_from_user_id, v_from_balance);
  PERFORM public.upsert_weekly_snapshot(p_to_user_id, v_to_balance);

  RETURN jsonb_build_object('success', true, 'new_balance', v_from_balance);
END;
$$;

-- 2. CORRECCIÓN DE DEDUCT_COINS (Registrar delta real)
CREATE OR REPLACE FUNCTION public.deduct_coins(
    p_user_id   uuid,
    p_amount    int,
    p_type      text,
    p_desc      text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old_bal int;
    v_new_bal int;
    v_actual_diff int;
BEGIN
    SELECT balance INTO v_old_bal FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    
    v_new_bal := GREATEST(0, v_old_bal - p_amount);
    v_actual_diff := v_old_bal - v_new_bal;

    UPDATE public.profiles SET balance = v_new_bal WHERE id = p_user_id;

    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, -v_actual_diff, v_new_bal, p_type, p_desc);

    PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_bal);
    RETURN jsonb_build_object('success', true, 'balance', v_new_bal);
END;
$$;

-- 3. UNIFICACIÓN MAESTRA DE AWARD_COINS (Límites, Nocturno, Eclipses, Préstamos, Tycoons y Snapshots)
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
  v_multiplier   numeric := 1.0;
  v_final_reward integer;
  v_withheld     integer := 0;
  v_new_balance  integer;
  v_daily_earned integer;
  v_active_loan  RECORD;
  v_pact_active  boolean;
  v_eclipse      boolean;
  v_hour         int;
  v_sub_tier     int;
  v_sub_multi    numeric := 1.0;
  v_withhold_rate numeric := 0.25;
  -- Límites diarios anti-abuso
  v_daily_cap     integer := CASE p_type
    WHEN 'page_visit'   THEN 10000 
    WHEN 'game_reward'  THEN 1000000 
    WHEN 'daily_bonus'  THEN 10000 
    ELSE NULL
  END;
BEGIN
  -- 1. Multiplicador Nocturno (x1.5 entre 00:00 y 05:00 UTC)
  v_hour := extract(hour from (now() AT TIME ZONE 'UTC'));
  IF p_type = 'game_reward' AND (v_hour >= 0 AND v_hour < 5) THEN
    v_multiplier := v_multiplier + 0.5;
  END IF;

  -- 2. Multiplicador Eclipse Galáctico (x3)
  SELECT EXISTS (SELECT 1 FROM public.bot_events WHERE type = 'eclipse' AND status = 'active' AND expires_at > now()) INTO v_eclipse;
  IF v_eclipse THEN v_multiplier := v_multiplier * 3.0; END IF;

  -- 2.5 Multiplicador por Suscripción (Tier 1+: x1.2 en misiones/juegos)
  SELECT sub_tier INTO v_sub_tier FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_sub_tier, 0) >= 1 AND (p_type = 'game_reward' OR p_type = 'work_mission' OR p_type = 'work_bonus' OR p_type = 'page_visit') THEN
    v_sub_multi := 1.2;
    v_multiplier := v_multiplier * v_sub_multi;
  END IF;

  v_final_reward := floor(p_amount * v_multiplier);

  -- 3. Verificar Cap Diario
  IF v_daily_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_earned
    FROM public.transactions
    WHERE user_id = p_user_id AND type = p_type AND created_at >= (now() AT TIME ZONE 'UTC')::date;

    IF v_daily_earned >= v_daily_cap THEN
      SELECT balance INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
      RETURN jsonb_build_object('success', false, 'reason', 'daily_cap_reached', 'balance', v_new_balance);
    END IF;
    v_final_reward := LEAST(v_final_reward, v_daily_cap - v_daily_earned);
  END IF;

  -- 4. Retenciones (Impuesto Tycoon 2% si > 1M)
  IF p_amount >= 1000000 AND EXISTS(SELECT 1 FROM public.galactic_tycoons WHERE user_id = p_user_id AND is_active = true) THEN
    v_withheld := floor(v_final_reward * 0.02);
  END IF;

  -- 5. Pacto Estelar y Préstamos
  SELECT stellar_pact_active INTO v_pact_active FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_pact_active, false) THEN v_withhold_rate := 0.50; END IF;

  SELECT * INTO v_active_loan FROM public.user_loans WHERE user_id = p_user_id AND status = 'active' LIMIT 1;
  IF FOUND THEN
    DECLARE v_loan_cut integer;
    BEGIN
      v_loan_cut := floor(v_final_reward * v_withhold_rate);
      IF v_loan_cut > v_active_loan.remaining_debt THEN v_loan_cut := v_active_loan.remaining_debt; END IF;
      v_withheld := v_withheld + v_loan_cut;

      UPDATE public.user_loans SET 
        remaining_debt = remaining_debt - v_loan_cut,
        status = CASE WHEN remaining_debt - v_loan_cut <= 0 THEN 'paid' ELSE 'active' END
      WHERE id = v_active_loan.id;

      IF (v_active_loan.remaining_debt - v_loan_cut) <= 0 THEN
        UPDATE public.profiles SET stellar_pact_active = false WHERE id = p_user_id;
      END IF;
    END;
  END IF;

  v_final_reward := v_final_reward - v_withheld;

  -- 6. Actualizar Balance Global
  UPDATE public.profiles SET balance = balance + v_final_reward, updated_at = now() 
  WHERE id = p_user_id RETURNING balance INTO v_new_balance;

  -- 7. Ledger Contable
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (
    p_user_id, 
    v_final_reward, 
    v_new_balance, 
    p_type, 
    p_reference, 
    COALESCE(p_description, p_type) || CASE WHEN v_eclipse THEN ' [ECLIPSE x3]' WHEN v_hour < 5 THEN ' [NOCHE x1.5]' ELSE '' END, 
    p_metadata || jsonb_build_object('multiplier', v_multiplier, 'withheld', v_withheld)
  );

  -- 8. Sincronizar Snapshot Semanal
  PERFORM public.upsert_weekly_snapshot(p_user_id, v_new_balance);

  RETURN jsonb_build_object(
    'success', true, 
    'awarded', v_final_reward, 
    'withheld', v_withheld,
    'multiplier', v_multiplier,
    'new_balance', v_new_balance
  );
END;
$$;

-- 4. CORRECCIÓN DE ROB_USER (Evitar discrepancias en multas y robos)
CREATE OR REPLACE FUNCTION public.rob_user(p_from_user_id uuid, p_target_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_target_id     uuid;
    v_target_bal    int;
    v_success       boolean;
    v_amount        int;
    v_penalty       int := 100;
    v_new_bal       int;
    v_actual_penalty int;
    v_cooldown      interval := '2 hours';
    v_last_rob      timestamptz;
BEGIN
    SELECT last_rob_at INTO v_last_rob FROM public.profiles WHERE id = p_from_user_id;
    IF v_last_rob IS NOT NULL AND v_last_rob > now() - v_cooldown THEN
        RETURN jsonb_build_object('success', false, 'reason', 'cooldown', 'next', v_last_rob + v_cooldown);
    END IF;

    SELECT id, balance INTO v_target_id, v_target_bal FROM public.profiles 
    WHERE lower(username) = lower(p_target_username);

    IF v_target_id IS NULL THEN RAISE EXCEPTION 'Objetivo no encontrado'; END IF;
    IF v_target_id = p_from_user_id THEN RAISE EXCEPTION 'No puedes robarte a ti mismo'; END IF;
    IF v_target_bal < 100 THEN RAISE EXCEPTION 'Objetivo demasiado pobre'; END IF;

    v_success := random() > 0.65; 

    IF v_success THEN
        v_amount := floor(v_target_bal * 0.15)::int;
        UPDATE public.profiles SET balance = balance - v_amount WHERE id = v_target_id;
        UPDATE public.profiles SET balance = balance + v_amount, last_rob_at = now() 
        WHERE id = p_from_user_id RETURNING balance INTO v_new_bal;

        INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
        VALUES 
            (v_target_id, -v_amount, v_target_bal - v_amount, 'transfer_out', 'Víctima de robo'),
            (p_from_user_id, v_amount, v_new_bal, 'transfer_in', 'Robo exitoso');

        PERFORM public.upsert_weekly_snapshot(p_from_user_id, v_new_bal);
        PERFORM public.upsert_weekly_snapshot(v_target_id, v_target_bal - v_amount);

        RETURN jsonb_build_object('success', true, 'amount', v_amount, 'new_balance', v_new_bal);
    ELSE
        -- Multa protegida contra balance insuficiente
        SELECT balance INTO v_new_bal FROM public.profiles WHERE id = p_from_user_id FOR UPDATE;
        v_actual_penalty := LEAST(v_penalty, v_new_bal);
        
        UPDATE public.profiles SET 
            balance = balance - v_actual_penalty, 
            last_rob_at = now() 
        WHERE id = p_from_user_id RETURNING balance INTO v_new_bal;
        
        UPDATE public.profiles SET balance = balance + v_actual_penalty WHERE id = v_target_id;

        INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
        VALUES 
            (p_from_user_id, -v_actual_penalty, v_new_bal, 'transfer_out', 'Multa por robo fallido'),
            (v_target_id, v_actual_penalty, v_target_bal + v_actual_penalty, 'transfer_in', 'Compensación por robo');

        PERFORM public.upsert_weekly_snapshot(p_from_user_id, v_new_bal);
        RETURN jsonb_build_object('success', false, 'reason', 'caught', 'penalty', v_actual_penalty);
    END IF;
END;
$$;

-- 5. CORRECCIÓN DE PROCESS_PREMIUM_PURCHASE (Integración con Ledger)
CREATE OR REPLACE FUNCTION public.process_premium_purchase(p_user_id uuid, p_product_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_prod RECORD;
    v_new_bal integer;
BEGIN
    SELECT * INTO v_prod FROM public.premium_products WHERE id = p_product_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'product_not_found'); END IF;

    -- Registrar compra física
    INSERT INTO public.user_purchases (user_id, product_id, amount_paid)
    VALUES (p_user_id, p_product_id, v_prod.price);

    -- Aplicar recompensas de Starlys vía AWARD_COINS (para asegurar Ledger y Snapshots)
    IF v_prod.reward_starlys > 0 THEN
        PERFORM public.award_coins(
            p_user_id, 
            v_prod.reward_starlys::integer, 
            'admin_grant', 
            p_product_id, 
            'Compra Premium: ' || v_prod.name
        );
    END IF;

    -- Aplicar beneficios específicos
    IF p_product_id = 'sub_citizen' THEN
        UPDATE public.profiles SET 
            is_stellar_citizen = true,
            redemption_tickets = redemption_tickets + 1,
            betting_insurance = betting_insurance + 1
        WHERE id = p_user_id;
    ELSIF p_product_id = 'bank_contract' THEN
        INSERT INTO public.active_effects (user_id, effect_type, expires_at)
        VALUES (p_user_id, 'bankruptcy_protection', now() + interval '24 hours');
    ELSIF p_product_id = 'pack_tycoon' THEN
        UPDATE public.profiles SET equipped_title = 'Magnate Emergente' WHERE id = p_user_id;
    ELSIF p_product_id = 'pack_empire' THEN
        UPDATE public.profiles SET 
            equipped_title = 'Arquitecto del Imperio',
            betting_insurance = betting_insurance + 1
        WHERE id = p_user_id;
        INSERT INTO public.active_effects (user_id, effect_type, expires_at)
        VALUES (p_user_id, 'casino_bonus', now() + interval '24 hours');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. CORRECCIÓN DE EXECUTE_BLACK_MARKET_TRADE (Integración con Ledger)
CREATE OR REPLACE FUNCTION public.execute_black_market_trade(
    p_user_id uuid,
    p_type text,
    p_merchant text,
    p_cost integer,
    p_reward integer,
    p_risk_factor numeric
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance integer;
    v_roll numeric;
    v_result text;
    v_final_reward integer := 0;
    v_raid_roll numeric;
    v_new_bal integer;
BEGIN
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF v_balance < p_cost THEN RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds'); END IF;

    -- Roll de Raid (5% probabilidad)
    v_raid_roll := random();
    IF v_raid_roll < 0.05 THEN
        -- Multa del 20%
        v_final_reward := floor(v_balance * 0.2);
        PERFORM public.deduct_coins(p_user_id, p_cost + v_final_reward, 'admin_deduct', 'Redada en el Mercado Negro (' || p_merchant || ')');
        
        INSERT INTO public.black_market_transactions (user_id, type, merchant, amount_offered, amount_received, result, risk_level)
        VALUES (p_user_id, p_type, p_merchant, p_cost, 0, 'raid', p_risk_factor);
        
        RETURN jsonb_build_object('success', false, 'reason', 'raid_detected', 'penalty', v_final_reward);
    END IF;

    v_roll := random();
    IF v_roll < 0.60 THEN v_result := 'success'; v_final_reward := p_reward;
    ELSIF v_roll < 0.85 THEN v_result := 'fee'; v_final_reward := floor(p_reward * 0.8);
    ELSIF v_roll < 0.95 THEN v_result := 'partial_scam'; v_final_reward := floor(p_reward * 0.3);
    ELSE v_result := 'total_scam'; v_final_reward := 0; END IF;

    -- Aplicar a través del Ledger
    IF p_cost > 0 THEN
        PERFORM public.deduct_coins(p_user_id, p_cost, 'purchase', 'Gasto en Mercado Negro: ' || p_merchant);
    END IF;
    
    IF v_final_reward > 0 THEN
        PERFORM public.award_coins(p_user_id, v_final_reward, 'game_reward', p_merchant, 'Ganancia en Mercado Negro (' || v_result || ')');
    END IF;

    -- Log específico del mercado negro
    UPDATE public.profiles SET 
        stealth_reputation = stealth_reputation + (CASE WHEN v_result = 'success' THEN 10 ELSE -5 END),
        last_black_market_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.black_market_transactions (user_id, type, merchant, amount_offered, amount_received, result, risk_level)
    VALUES (p_user_id, p_type, p_merchant, p_cost, v_final_reward, v_result, p_risk_factor);

    SELECT balance INTO v_new_bal FROM public.profiles WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'result', v_result, 'received', v_final_reward, 'new_balance', v_new_bal);
END;
$$;
