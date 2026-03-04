-- Sistema de Banca Estelar: Préstamos, Créditos y Pacto Estelar
CREATE TABLE IF NOT EXISTS public.user_loans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_borrowed integer NOT NULL,
    total_debt integer NOT NULL, -- Incluye interés
    remaining_debt integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted'))
);

-- Extender perfiles para el Pacto Estelar
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stellar_pact_active boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stellar_pact_start timestamptz DEFAULT NULL;

-- Índice para optimizar cobros automáticos
CREATE INDEX IF NOT EXISTS idx_active_loans ON public.user_loans(user_id) WHERE status = 'active';

-- Función para solicitar un préstamo
CREATE OR REPLACE FUNCTION public.request_loan(p_user_id uuid, p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_active_loan RECORD;
    v_user_level integer;
    v_max_loan integer;
    v_interest_rate numeric := 0.15; -- 15% de interés
    v_total_debt integer;
    v_pact_active boolean;
    v_new_balance integer;
BEGIN
    -- 0. Verificar si tiene el Pacto Estelar activo (Bloquea nuevos préstamos)
    SELECT stellar_pact_active INTO v_pact_active FROM public.profiles WHERE id = p_user_id;
    IF COALESCE(v_pact_active, false) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'stellar_pact_active');
    END IF;

    -- 1. Verificar si ya tiene una deuda activa
    SELECT * INTO v_active_loan FROM public.user_loans WHERE user_id = p_user_id AND status = 'active';
    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_has_loan', 'remaining', v_active_loan.remaining_debt);
    END IF;

    -- 2. Calcular límite (Máximo 15M)
    v_max_loan := 15000000;

    IF p_amount > v_max_loan THEN
        RETURN jsonb_build_object('success', false, 'reason', 'limit_exceeded', 'limit', v_max_loan);
    END IF;

    IF p_amount < 100 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'minimum_amount', 'min', 100);
    END IF;
    v_total_debt := floor(p_amount * (1 + v_interest_rate));
    
    INSERT INTO public.user_loans (user_id, amount_borrowed, total_debt, remaining_debt)
    VALUES (p_user_id, p_amount, v_total_debt, v_total_debt);

    -- 4. Entregar los Starlys inmediatamente
    UPDATE public.profiles SET balance = balance + p_amount WHERE id = p_user_id RETURNING balance INTO v_new_balance;

    -- 5. Registrar transacción
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, p_amount, v_new_balance, 'admin_grant', 'Préstamo bancario aprobado');

    RETURN jsonb_build_object(
        'success', true, 
        'borrowed', p_amount, 
        'total_debt', v_total_debt,
        'interest', floor(p_amount * v_interest_rate)::int,
        'balance', v_new_balance
    );
END;
$$;

-- Función para comprobar si un usuario es elegible para el Pacto Estelar
CREATE OR REPLACE FUNCTION public.check_stellar_pact_eligibility(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance integer;
    v_active_loan_debt integer;
    v_pact_active boolean;
BEGIN
    -- Verificar si tiene PROTECCIÓN PREMIUM (Contrato del Banco)
    IF EXISTS(SELECT 1 FROM public.active_effects WHERE user_id = p_user_id AND effect_type = 'bankruptcy_protection' AND expires_at > now()) THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'premium_protection_active');
    END IF;

    SELECT balance, stellar_pact_active INTO v_balance, v_pact_active FROM public.profiles WHERE id = p_user_id;
    
    -- Si ya lo tiene activo, no es elegible para "activarlo" de nuevo
    IF COALESCE(v_pact_active, false) THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'already_active');
    END IF;

    SELECT remaining_debt INTO v_active_loan_debt FROM public.user_loans WHERE user_id = p_user_id AND status = 'active';
    v_active_loan_debt := COALESCE(v_active_loan_debt, 0);

    -- Condiciones: Deuda > Balance o Balance = 0 con deuda
    IF (v_active_loan_debt > v_balance) OR (v_balance = 0 AND v_active_loan_debt > 0) THEN
        RETURN jsonb_build_object('eligible', true, 'reason', 'financial_crisis', 'debt', v_active_loan_debt, 'balance', v_balance);
    END IF;

    RETURN jsonb_build_object('eligible', false);
END;
$$;

-- Función para aceptar el Pacto Estelar
CREATE OR REPLACE FUNCTION public.accept_stellar_pact(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_is_eligible boolean;
    v_active_loan RECORD;
    v_impulse_amount integer;
    v_new_balance integer;
BEGIN
    -- Verificar elegibilidad
    SELECT (check_stellar_pact_eligibility(p_user_id)->>'eligible')::boolean INTO v_is_eligible;
    
    IF NOT COALESCE(v_is_eligible, false) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_eligible');
    END IF;

    -- Activar estado de Pacto
    UPDATE public.profiles 
    SET stellar_pact_active = true, 
        stellar_pact_start = now() 
    WHERE id = p_user_id;

    -- Entregar Impulso Estelar: 10% de la deuda o 100 Starlys (el mayor)
    SELECT * INTO v_active_loan FROM public.user_loans WHERE user_id = p_user_id AND status = 'active';
    v_impulse_amount := GREATEST(floor(v_active_loan.remaining_debt * 0.10), 100);
    
    UPDATE public.profiles SET balance = balance + v_impulse_amount WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;
    
    -- Registrar el impulso como transacción
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, v_impulse_amount, v_new_balance, 'stellar_impulse', 'Impulso Estelar: Pacto de recuperación financiera');

    RETURN jsonb_build_object('success', true, 'impulse', v_impulse_amount, 'balance', v_new_balance);
END;
$$;

-- Función para pagar manualmente (con limpieza de Pacto)
CREATE OR REPLACE FUNCTION public.pay_loan(p_user_id uuid, p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_active_loan RECORD;
    v_user_balance integer;
    v_payment integer;
BEGIN
    SELECT * INTO v_active_loan FROM public.user_loans WHERE user_id = p_user_id AND status = 'active';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_active_loan');
    END IF;

    SELECT balance INTO v_user_balance FROM public.profiles WHERE id = p_user_id;
    
    v_payment := least(p_amount, v_user_balance, v_active_loan.remaining_debt);
    
    IF v_payment <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds');
    END IF;

    -- Actualizar deuda
    UPDATE public.user_loans 
    SET remaining_debt = remaining_debt - v_payment,
        status = CASE WHEN remaining_debt - v_payment <= 0 THEN 'paid' ELSE 'active' END
    WHERE id = v_active_loan.id;

    -- Restar balance
    UPDATE public.profiles SET balance = balance - v_payment WHERE id = p_user_id RETURNING balance INTO v_user_balance;

    -- Registrar transacción de pago
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, -v_payment, v_user_balance, 'purchase', 'Pago manual de préstamo');

    -- Si se saldó la deuda, desactivamos el pacto automáticamente
    IF (v_active_loan.remaining_debt - v_payment) <= 0 THEN
        UPDATE public.profiles SET stellar_pact_active = false WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'paid', v_payment, 'remaining', (v_active_loan.remaining_debt - v_payment), 'balance', v_user_balance);
END;
$$;

-- Actualizar award_coins para incluir retención por deuda y Pacto Estelar
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
  v_final_amount integer := p_amount;
  v_withheld     integer := 0;
  v_active_loan  RECORD;
  v_multiplier   numeric := 1.0;
  v_hour         integer;
  v_pact_active  boolean;
  v_withhold_rate numeric := 0.25; -- Por defecto 25%
BEGIN
  -- 1. Multiplicador Estacional / Nocturno (si aplica)
  v_hour := extract(hour from (now() at time zone 'utc'));
  IF p_type = 'game_reward' AND v_hour >= 0 AND v_hour < 5 THEN
    v_multiplier := 1.5;
  END IF;

  -- Bono de Casino Premium (+10% si tiene efecto activo)
  IF p_type = 'casino_win' AND EXISTS(SELECT 1 FROM public.active_effects WHERE user_id = p_user_id AND effect_type = 'casino_bonus' AND expires_at > now()) THEN
    v_multiplier := v_multiplier + 0.10;
  END IF;

  v_final_amount := floor(p_amount * v_multiplier);

  -- 2. Verificar estado de Pacto Estelar y Magnate
  SELECT stellar_pact_active INTO v_pact_active FROM public.profiles WHERE id = p_user_id;
  
  -- Retención Magnate (2% en premios > 1M)
  IF p_amount >= 1000000 AND EXISTS(SELECT 1 FROM public.galactic_tycoons WHERE user_id = p_user_id AND is_active = true) THEN
    v_withheld := v_withheld + floor(v_final_amount * 0.02);
  END IF;

  IF COALESCE(v_pact_active, false) THEN
    v_withhold_rate := 0.50; -- Si hay pacto, retenemos 50%
  END IF;

  -- 3. Retención por PRESTAMO
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

    -- Si se saldó la deuda, desactivamos el pacto automáticamente
    IF (v_active_loan.remaining_debt - v_withheld) <= 0 THEN
        UPDATE public.profiles SET stellar_pact_active = false WHERE id = p_user_id;
    END IF;
  ELSE
    -- Limpiar flag de pacto si no hay deuda activa
    IF COALESCE(v_pact_active, false) THEN
        UPDATE public.profiles SET stellar_pact_active = false WHERE id = p_user_id;
    END IF;
  END IF;

  -- 4. Actualizar Balance Global
  UPDATE public.profiles
  SET balance = balance + v_final_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING balance INTO v_hour; -- Reutilizamos v_hour para el balance actual

  -- 5. Registrar Transacción
  INSERT INTO public.transactions (user_id, amount, balance_after, type, reference_id, description, metadata)
  VALUES (p_user_id, v_final_amount, v_hour, p_type, p_reference, p_description, p_metadata);

  RETURN jsonb_build_object(
    'success', true, 
    'awarded', v_final_amount, 
    'withheld', v_withheld,
    'multiplier', v_multiplier,
    'pact_active', COALESCE(v_pact_active, false),
    'balance', v_hour
  );
END;
$$;
