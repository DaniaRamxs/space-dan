-- ============================================================
-- great_stellar_houses.sql :: Grandes Casas Estelares
-- Mecánica económica avanzada para magnates (high-net-worth)
-- ============================================================

-- 1. Registro de Magnates
CREATE TABLE IF NOT EXISTS public.galactic_tycoons (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    net_worth_peak bigint DEFAULT 0,
    house_level integer DEFAULT 1,
    influence_points integer DEFAULT 0,
    is_active boolean DEFAULT true,
    joined_at timestamptz DEFAULT now()
);

-- 2. Proyectos de Inversión Galáctica
CREATE TABLE IF NOT EXISTS public.galactic_investments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_type text NOT NULL, -- 'asteroid_mine', 'orbital_station', 'trade_portal'
    amount_invested bigint NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    profit_generated bigint DEFAULT 0,
    risk_factor numeric DEFAULT 0.3, -- Probabilidad de fallo
    payout_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.galactic_tycoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galactic_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tycoons are public" ON public.galactic_tycoons FOR SELECT USING (true);
CREATE POLICY "Investments are private" ON public.galactic_investments FOR SELECT USING (auth.uid() = user_id);

-- 3. Registro de Auditorías Bancarias
CREATE TABLE IF NOT EXISTS public.galactic_audits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance_at_audit bigint NOT NULL,
    result text NOT NULL CHECK (result IN ('clear', 'fine', 'confiscation', 'reward')),
    penalty_reward_amount bigint DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 4. Función para UNIRSE a las Grandes Casas
CREATE OR REPLACE FUNCTION public.join_great_houses(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance bigint;
    v_threshold bigint := 50000000; -- 50M Starlys
BEGIN
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;

    IF v_balance < v_threshold THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_fortune', 'needed', v_threshold);
    END IF;

    INSERT INTO public.galactic_tycoons (user_id, net_worth_peak)
    VALUES (p_user_id, v_balance)
    ON CONFLICT (user_id) DO UPDATE SET is_active = true;

    RETURN jsonb_build_object('success', true, 'message', 'Bienvenido a la élite galáctica.');
END;
$$;

-- 5. Lógica de Inversión
CREATE OR REPLACE FUNCTION public.start_galactic_investment(
    p_user_id uuid,
    p_project_type text,
    p_amount bigint
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance bigint;
    v_risk numeric;
    v_duration interval;
    v_is_tycoon boolean;
BEGIN
    -- Verificar si es Magnate
    SELECT EXISTS(SELECT 1 FROM public.galactic_tycoons WHERE user_id = p_user_id AND is_active = true) INTO v_is_tycoon;
    IF NOT v_is_tycoon THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_a_tycoon');
    END IF;

    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds');
    END IF;

    -- Parámetros por proyecto
    CASE p_project_type
        WHEN 'asteroid_mine' THEN
            v_risk := 0.2; v_duration := interval '24 hours';
        WHEN 'orbital_station' THEN
            v_risk := 0.3; v_duration := interval '48 hours';
        WHEN 'trade_portal' THEN
            v_risk := 0.45; v_duration := interval '72 hours';
        ELSE
            RETURN jsonb_build_object('success', false, 'reason', 'invalid_project');
    END CASE;

    -- Cobrar inversión
    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_user_id;
    
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, -p_amount, (v_balance - p_amount), 'purchase', 'Inversión Galáctica: ' || p_project_type);

    INSERT INTO public.galactic_investments (user_id, project_type, amount_invested, risk_factor, payout_at)
    VALUES (p_user_id, p_project_type, p_amount, v_risk, now() + v_duration);

    RETURN jsonb_build_object('success', true, 'payout_at', (now() + v_duration));
END;
$$;

-- 6. RPC para procesar cobros de inversión (llamar periódicamente o al abrir dashboard)
CREATE OR REPLACE FUNCTION public.collect_investment_profits(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_inv RECORD;
    v_total_profit bigint := 0;
    v_roll numeric;
    v_multiplier numeric;
    v_current_balance bigint;
BEGIN
    FOR v_inv IN 
        SELECT * FROM public.galactic_investments 
        WHERE user_id = p_user_id AND status = 'active' AND payout_at <= now()
    LOOP
        v_roll := random();
        IF v_roll < v_inv.risk_factor THEN
            -- Fracaso
            UPDATE public.galactic_investments SET status = 'failed' WHERE id = v_inv.id;
        ELSE
            -- Éxito (1.5x a 3.0x dependiendo del riesgo)
            v_multiplier := 1.2 + (v_inv.risk_factor * 3);
            v_total_profit := floor(v_inv.amount_invested * v_multiplier);
            
            UPDATE public.galactic_investments SET 
                status = 'completed', 
                profit_generated = v_total_profit 
            WHERE id = v_inv.id;
            
            UPDATE public.profiles SET balance = balance + v_total_profit WHERE id = p_user_id;
            
            SELECT balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;
            
            INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
            VALUES (p_user_id, v_total_profit, v_current_balance, 'investment_profit', 'Retorno de Inversión Galáctica');
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'processed', true);
END;
$$;

-- 7. Ranking de Magnates
CREATE OR REPLACE VIEW public.magnate_leaderboard AS
    SELECT 
        p.id,
        p.username,
        p.avatar_url,
        p.balance as net_worth,
        COALESCE(t.influence_points, 0) as influence,
        COALESCE(t.house_level, 1) as house_level,
        (SELECT COUNT(*) FROM public.galactic_investments i WHERE i.user_id = p.id AND i.status = 'active') as active_investments
    FROM public.profiles p
    LEFT JOIN public.galactic_tycoons t ON t.user_id = p.id
    WHERE p.balance >= 1000000 OR t.user_id IS NOT NULL
    ORDER BY p.balance DESC
    LIMIT 100;

-- 8. Lógica de Auditoría Aleatoria (Trigger o RPC)
CREATE OR REPLACE FUNCTION public.trigger_random_audit(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance bigint;
    v_roll numeric;
    v_amount bigint;
    v_result text;
BEGIN
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    IF v_balance < 10000000 THEN RETURN jsonb_build_object('success', false, 'reason', 'too_poor_for_audit'); END IF;

    v_roll := random();
    
    IF v_roll < 0.6 THEN
        v_result := 'clear'; v_amount := 0;
    ELSIF v_roll < 0.85 THEN
        v_result := 'fine'; v_amount := floor(v_balance * 0.05);
        UPDATE public.profiles SET balance = balance - v_amount WHERE id = p_user_id;
    ELSIF v_roll < 0.95 THEN
        v_result := 'confiscation'; v_amount := floor(v_balance * 0.15);
        UPDATE public.profiles SET balance = balance - v_amount WHERE id = p_user_id;
    ELSE
        v_result := 'reward'; v_amount := 1000000; -- Premio por buen comportamiento
        UPDATE public.profiles SET balance = balance + v_amount WHERE id = p_user_id;
    END IF;

    INSERT INTO public.galactic_audits (user_id, balance_at_audit, result, penalty_reward_amount)
    VALUES (p_user_id, v_balance, v_result, v_amount);

    RETURN jsonb_build_object('result', v_result, 'amount', v_amount);
END;
$$;
