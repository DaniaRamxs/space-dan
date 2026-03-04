-- ============================================================
-- space-dan :: Mercado Negro System
-- Economía Clandestina, Comerciantes NPC y Riesgo Galáctico
-- ============================================================

-- 1. TABLA DE TRANSACCIONES DEL MERCADO NEGRO
CREATE TABLE IF NOT EXISTS public.black_market_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('buy', 'sell', 'item')),
    merchant text NOT NULL, -- El Comerciante Fantasma, La Contrabandista, etc.
    amount_offered integer NOT NULL,
    amount_received integer NOT NULL,
    result text NOT NULL CHECK (result IN ('success', 'fee', 'partial_scam', 'total_scam', 'raid')),
    risk_level numeric DEFAULT 0.4, -- Probabilidad de fallo
    created_at timestamp with time zone DEFAULT now()
);

-- 2. EXTENSIÓN DE PERFILES PARA EL MERCADO NEGRO
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stealth_reputation integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_black_market_at timestamptz DEFAULT NULL;

-- 3. FUNCIÓN PARA OBTENER OFERTAS DINÁMICAS (Simuladas en SQL para persistencia)
-- Esto podría ser manejado en frontend, pero tener una función que genere "tickets" asegura integridad
CREATE OR REPLACE FUNCTION public.get_black_market_offers(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_offers jsonb;
BEGIN
    v_offers := jsonb_build_array(
        jsonb_build_object(
            'id', 'ghost_buy_1',
            'merchant', 'El Comerciante Fantasma',
            'type', 'buy',
            'title', 'Inyección de Créditos Fantasma',
            'description', 'Compra un lote de 1,000,000 ◈ por solo 700,000 ◈.',
            'cost', 700000,
            'reward', 1000000,
            'risk', 0.4,
            'risk_desc', 'Riesgo Medio: Probabilidad de estafa del 15%.'
        ),
        jsonb_build_object(
            'id', 'smuggler_sell_1',
            'merchant', 'La Contrabandista',
            'type', 'sell',
            'title', 'Liquidación de Emergencia',
            'description', 'Vende 500,000 ◈ y recibe 450,000 ◈ de forma "anónima".',
            'cost', 500000,
            'reward', 450000,
            'risk', 0.2,
            'risk_desc', 'Riesgo Bajo: Operación rápida y relativamente segura.'
        ),
        jsonb_build_object(
            'id', 'collector_item_1',
            'merchant', 'El Coleccionista',
            'type', 'item',
            'title', 'Seguro de Casino Clandestino',
            'description', 'Cubre el 50% de tus pérdidas en la próxima apuesta.',
            'cost', 50000,
            'reward', 1, -- Representa 1 unidad del item
            'risk', 0.1,
            'risk_desc', 'Casi seguro.'
        )
    );
    
    RETURN v_offers;
END;
$$;

-- 4. FUNCIÓN PARA EJECUTAR TRANSACCIÓN CON RIESGO
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
    v_actual_cost integer := p_cost;
    v_raid_roll numeric;
    v_is_raid boolean := false;
BEGIN
    -- 1. Verificar Balance
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    IF v_balance < p_cost THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds');
    END IF;

    -- 2. Roll de Raid (5% probabilidad)
    v_raid_roll := random();
    IF v_raid_roll < 0.05 THEN
        v_is_raid := true;
        v_result := 'raid';
        v_final_reward := 0;
        -- Multa del 20% del balance adicional al costo
        UPDATE public.profiles SET balance = GREATEST(0, balance - p_cost - floor(balance * 0.2)) WHERE id = p_user_id;
        
        INSERT INTO public.black_market_transactions (user_id, type, merchant, amount_offered, amount_received, result, risk_level)
        VALUES (p_user_id, p_type, p_merchant, p_cost, 0, 'raid', p_risk_factor);
        
        RETURN jsonb_build_object('success', false, 'reason', 'raid_detected', 'penalty', floor(v_balance * 0.2));
    END IF;

    -- 3. Roll de Transacción
    v_roll := random();
    
    -- 60% Exito, 25% Comision, 10% Parcial, 5% Total
    IF v_roll < 0.60 THEN
        v_result := 'success';
        v_final_reward := p_reward;
    ELSIF v_roll < 0.85 THEN
        v_result := 'fee';
        v_final_reward := floor(p_reward * 0.8); -- 20% de comisión extra
    ELSIF v_roll < 0.95 THEN
        v_result := 'partial_scam';
        v_final_reward := floor(p_reward * 0.3); -- Solo recibes el 30%
    ELSE
        v_result := 'total_scam';
        v_final_reward := 0; -- Estafa total
    END IF;

    -- 4. Aplicar Cambios
    IF p_type = 'buy' OR p_type = 'item' THEN
        -- Restas costo, sumas recompensa
        UPDATE public.profiles SET balance = balance - p_cost + v_final_reward WHERE id = p_user_id;
    ELSIF p_type = 'sell' THEN
        -- Restas cantidad a vender (costo), sumas pago (recompensa)
        -- Nota: En sell, el reward es el dinero que recibes.
        UPDATE public.profiles SET balance = balance - p_cost + v_final_reward WHERE id = p_user_id;
    END IF;

    -- 5. Actualizar Reputación y Log
    UPDATE public.profiles SET 
        stealth_reputation = stealth_reputation + (CASE WHEN v_result = 'success' THEN 10 ELSE -5 END),
        last_black_market_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.black_market_transactions (user_id, type, merchant, amount_offered, amount_received, result, risk_level)
    VALUES (p_user_id, p_type, p_merchant, p_cost, v_final_reward, v_result, p_risk_factor);

    RETURN jsonb_build_object(
        'success', true,
        'result', v_result,
        'received', v_final_reward,
        'cost', p_cost
    );
END;
$$;

-- 5. RANKING CLANDESTINO
CREATE OR REPLACE FUNCTION public.get_clandestine_leaderboard(p_limit int DEFAULT 10)
RETURNS TABLE (
    username text,
    avatar_url text,
    total_volume bigint,
    reputation integer
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT 
        p.username, 
        p.avatar_url, 
        COALESCE(SUM(bmt.amount_offered)::bigint, 0) as total_volume,
        p.stealth_reputation
    FROM public.profiles p
    LEFT JOIN public.black_market_transactions bmt ON bmt.user_id = p.id
    WHERE p.username IS NOT NULL
    GROUP BY p.id, p.username, p.avatar_url, p.stealth_reputation
    HAVING COUNT(bmt.id) > 0
    ORDER BY total_volume DESC
    LIMIT p_limit;
$$;
