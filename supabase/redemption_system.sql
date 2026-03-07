-- ============================================================
-- redemption_system.sql :: Juegos de Redención
-- Mecánica secreta para usuarios con deuda bancaria
-- ============================================================

-- 1. Tabla de Historial de Juegos de Redención
CREATE TABLE IF NOT EXISTS public.redemption_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    result text NOT NULL CHECK (result IN ('win', 'lose')),
    games_completed integer DEFAULT 0,
    debt_before integer NOT NULL,
    played_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.redemption_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own redemption history" ON public.redemption_history
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Función para verificar elegibilidad
CREATE OR REPLACE FUNCTION public.check_redemption_eligibility(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_total_debt integer;
    v_balance    integer;
    v_last_played timestamptz;
    v_cooldown interval := interval '24 hours';
BEGIN
    -- 1. Verificar deuda activa
    SELECT COALESCE(SUM(remaining_debt), 0) INTO v_total_debt
    FROM public.user_loans
    WHERE user_id = p_user_id AND status = 'active';

    IF v_total_debt <= 0 THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'no_debt');
    END IF;

    -- 2. Safety Check: Si el usuario tiene suficiente balance para pagar, no es elegible.
    -- Esto previene la pérdida accidental de balances grandes por deudas pequeñas.
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    IF v_balance >= v_total_debt THEN
        RETURN jsonb_build_object(
            'eligible', false, 
            'reason', 'solvent', 
            'debt', v_total_debt, 
            'balance', v_balance,
            'message', 'No necesitas redención. Tienes suficiente balance para saldar tu deuda.'
        );
    END IF;

    -- Verificar cooldown
    SELECT played_at INTO v_last_played
    FROM public.redemption_history
    WHERE user_id = p_user_id
    ORDER BY played_at DESC
    LIMIT 1;

    IF v_last_played IS NOT NULL AND v_last_played > (now() - v_cooldown) THEN
        RETURN jsonb_build_object(
            'eligible', false, 
            'reason', 'cooldown_active', 
            'next_available', (v_last_played + v_cooldown)
        );
    END IF;

    RETURN jsonb_build_object(
        'eligible', true, 
        'debt', v_total_debt,
        'balance', v_balance
    );
END;
$$;

-- 3. Función para procesar resultado
CREATE OR REPLACE FUNCTION public.process_redemption_result(
    p_user_id uuid,
    p_result text, -- 'win' or 'lose'
    p_games_completed integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_total_debt integer;
    v_balance_before integer;
    v_new_balance integer := 0;
BEGIN
    -- 1. Obtener deuda actual
    SELECT COALESCE(SUM(remaining_debt), 0) INTO v_total_debt
    FROM public.user_loans
    WHERE user_id = p_user_id AND status = 'active';

    IF v_total_debt <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'no_debt');
    END IF;

    -- 2. Safety Check: Si el balance es mayor que la deuda, bloquear redención
    SELECT balance INTO v_balance_before FROM public.profiles WHERE id = p_user_id;
    IF v_balance_before >= v_total_debt THEN
        RETURN jsonb_build_object('success', false, 'reason', 'solvent', 'message', 'Balance superior a la deuda. Paga tu deuda normalmente.');
    END IF;

    -- 2. Registrar en historial
    INSERT INTO public.redemption_history (user_id, result, games_completed, debt_before)
    VALUES (p_user_id, p_result, p_games_completed, v_total_debt);

    -- 3. Aplicar efectos de VICTORIA
    IF p_result = 'win' THEN
        -- Saldar todas las deudas activas
        UPDATE public.user_loans
        SET remaining_debt = 0,
            status = 'paid'
        WHERE user_id = p_user_id AND status = 'active';

        -- Reset balance a 0 (el universo cobra su precio)
        UPDATE public.profiles
        SET balance = 0,
            stellar_pact_active = false
        WHERE id = p_user_id;

        -- Registrar transacción de vaciado con el monto exacto perdido
        INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
        VALUES (p_user_id, -v_balance_before, 0, 'purchase', 'Redención Estelar: Sacrificio de balance para eliminar deuda de ' || v_total_debt);

        RETURN jsonb_build_object(
            'success', true, 
            'result', 'win', 
            'message', 'Has sido redimido. Tu deuda es 0, tu balance es 0.'
        );
    END IF;

    -- 4. Efectos de DERROTA (Solo registro)
    RETURN jsonb_build_object(
        'success', true, 
        'result', 'lose', 
        'message', 'El vacio te ha rechazado. La deuda permanece.'
    );
END;
$$;
