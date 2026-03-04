-- ============================================================
-- stellar_store.sql :: Tienda Galáctica Premium
-- Productos integrados con Dinero Real y Economía de Starlys
-- ============================================================

-- 1. Tablas de la Tienda Galáctica Premium
CREATE TABLE IF NOT EXISTS public.premium_products (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric NOT NULL, -- USD
    type text NOT NULL CHECK (type IN ('subscription', 'pack', 'item')),
    reward_starlys bigint DEFAULT 0,
    metadata jsonb DEFAULT '{}', -- Para tickets, seguros, etc.
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_purchases (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.premium_products(id),
    amount_paid numeric NOT NULL,
    currency text DEFAULT 'USD',
    status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.active_effects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    effect_type text NOT NULL, -- 'bankruptcy_protection', 'casino_bonus'
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.premium_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_effects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public products" ON public.premium_products FOR SELECT USING (true);
CREATE POLICY "My purchases" ON public.user_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "My effects" ON public.active_effects FOR SELECT USING (auth.uid() = user_id);

-- 2. Modificar Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_stellar_citizen boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS redemption_tickets integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS betting_insurance integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS equipped_title text;

-- 3. Sembrar Productos
INSERT INTO public.premium_products (id, name, description, price, type, reward_starlys, metadata) VALUES
('sub_citizen', 'Ciudadano Estelar', 'El Banco Estelar reconoce a quienes sostienen la economía de la galaxia.', 2.99, 'subscription', 1500000, '{"insurance": 1, "redemption_ticket": 1, "badge": "citizen"}'),
('bank_contract', 'Contrato del Banco Estelar', 'Protección contra bancarrota por 24 horas.', 1.99, 'pack', 0, '{"effect": "bankruptcy_protection", "duration": "24 hours"}'),
('pack_tycoon', 'Pack Magnate', 'Un pequeño paso hacia el poder financiero.', 4.99, 'pack', 4000000, '{"title": "Magnate Emergente", "early_access": "tycoon_house"}'),
('pack_empire', 'Pack Imperio', 'Los verdaderos imperios se construyen con visión.', 9.99, 'pack', 10000000, '{"title": "Architect of the Empire", "insurance": 1, "effect": "casino_bonus", "duration": "24 hours"}')
ON CONFLICT (id) DO NOTHING;

-- 4. Modificar Lógica de Redención para usar Tickets
CREATE OR REPLACE FUNCTION public.check_redemption_eligibility(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_total_debt integer;
    v_last_played timestamptz;
    v_cooldown interval := interval '24 hours';
    v_tickets integer;
BEGIN
    -- Verificar deuda activa
    SELECT COALESCE(SUM(remaining_debt), 0) INTO v_total_debt
    FROM public.user_loans
    WHERE user_id = p_user_id AND status = 'active';

    IF v_total_debt <= 0 THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'no_debt');
    END IF;

    -- Verificar si tiene tickets de redención
    SELECT COALESCE(redemption_tickets, 0) INTO v_tickets FROM public.profiles WHERE id = p_user_id;

    IF v_tickets > 0 THEN
        RETURN jsonb_build_object(
            'eligible', true, 
            'debt', v_total_debt,
            'can_use_ticket', true
        );
    END IF;

    -- Verificar cooldown normal
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
        'can_use_ticket', false
    );
END;
$$;

-- 5. Función de Compra Premium
CREATE OR REPLACE FUNCTION public.process_premium_purchase(p_user_id uuid, p_product_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_prod RECORD;
    v_current_balance bigint;
BEGIN
    SELECT * INTO v_prod FROM public.premium_products WHERE id = p_product_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'product_not_found'); END IF;

    -- Registrar compra
    INSERT INTO public.user_purchases (user_id, product_id, amount_paid)
    VALUES (p_user_id, p_product_id, v_prod.price);

    -- Aplicar recompensas de Starlys
    IF v_prod.reward_starlys > 0 THEN
        UPDATE public.profiles SET balance = balance + v_prod.reward_starlys WHERE id = p_user_id;
        
        SELECT balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;
        
        INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
        VALUES (p_user_id, v_prod.reward_starlys, v_current_balance, 'reward', 'Compra Premium: ' || v_prod.name);
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

-- 6. Modificar el acceso a las Grandes Casas para permitir acceso anticipado por pago
CREATE OR REPLACE FUNCTION public.join_great_houses(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance bigint;
    v_threshold bigint := 50000000; -- 50M Starlys
    v_has_early_access boolean;
BEGIN
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    
    -- Verificar si tiene el pack Tycoon (early access en metadata)
    SELECT EXISTS(
        SELECT 1 FROM public.user_purchases 
        WHERE user_id = p_user_id AND product_id = 'pack_tycoon' 
        AND status = 'completed'
    ) INTO v_has_early_access;

    IF v_balance < v_threshold AND NOT v_has_early_access THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_fortune', 'needed', v_threshold);
    END IF;

    INSERT INTO public.galactic_tycoons (user_id, net_worth_peak)
    VALUES (p_user_id, v_balance)
    ON CONFLICT (user_id) DO UPDATE SET is_active = true;

    RETURN jsonb_build_object('success', true, 'message', 'Bienvenido a la élite galáctica.');
END;
$$;
