-- ============================================================
-- stellar_economy_v2.sql :: Seguro, Inversiones, Inflación,
--                           Efectos de Chat, Badge, Tutorial,
--                           Racha de Misiones
-- ============================================================

-- 1. Nuevas columnas en profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS badge_color         text DEFAULT '#7c3aed',
ADD COLUMN IF NOT EXISTS chat_effect         text,          -- 'fire' | 'stars' | 'glitch' | null
ADD COLUMN IF NOT EXISTS tutorial_completed  boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mission_streak      int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_mission_date   date;

-- 2. Seguro Espacial
CREATE TABLE IF NOT EXISTS public.user_insurance (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    premium    integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (user_id)
);

ALTER TABLE public.user_insurance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_self" ON public.user_insurance;
CREATE POLICY "insurance_self" ON public.user_insurance
    FOR ALL USING (auth.uid() = user_id);

-- 3. Inversiones Estelares
CREATE TABLE IF NOT EXISTS public.user_investments (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount     integer NOT NULL,
    matures_at timestamptz NOT NULL,
    rate       numeric,    -- calculado al reclamar
    payout     integer,
    status     text DEFAULT 'active' CHECK (status IN ('active', 'claimed')),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investments_self" ON public.user_investments;
CREATE POLICY "investments_self" ON public.user_investments
    FOR ALL USING (auth.uid() = user_id);

-- 4. Precios Dinámicos (Inflación)
CREATE TABLE IF NOT EXISTS public.economy_prices (
    item_id         text PRIMARY KEY,
    base_price      integer NOT NULL,
    purchases_today integer DEFAULT 0,
    price_date      date DEFAULT CURRENT_DATE
);

INSERT INTO public.economy_prices (item_id, base_price) VALUES
    ('insurance',  100),
    ('xp_boost',   200),
    ('chat_fire',  300),
    ('chat_stars', 250),
    ('chat_glitch',400)
ON CONFLICT DO NOTHING;

ALTER TABLE public.economy_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prices_public_read" ON public.economy_prices;
CREATE POLICY "prices_public_read" ON public.economy_prices FOR SELECT USING (true);

-- ============================================================
-- RPCs
-- ============================================================

-- 5. get_item_price — precio con inflación +15% por cada 5 compras del día
DROP FUNCTION IF EXISTS public.get_item_price(text);
CREATE OR REPLACE FUNCTION public.get_item_price(p_item_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_row   public.economy_prices%ROWTYPE;
    v_price integer;
BEGIN
    SELECT * INTO v_row FROM public.economy_prices WHERE item_id = p_item_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unknown_item');
    END IF;

    -- Reset diario
    IF v_row.price_date < CURRENT_DATE THEN
        UPDATE public.economy_prices
        SET purchases_today = 0, price_date = CURRENT_DATE
        WHERE item_id = p_item_id;
        v_row.purchases_today := 0;
    END IF;

    v_price := floor(v_row.base_price * (1 + floor(v_row.purchases_today / 5.0) * 0.15));

    RETURN jsonb_build_object(
        'success',          true,
        'item_id',          p_item_id,
        'price',            v_price,
        'base_price',       v_row.base_price,
        'purchases_today',  v_row.purchases_today
    );
END;
$$;

-- 6. buy_insurance
DROP FUNCTION IF EXISTS public.buy_insurance(uuid);
CREATE OR REPLACE FUNCTION public.buy_insurance(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_price_data  jsonb;
    v_price       integer;
    v_balance     integer;
    v_expires_at  timestamptz;
BEGIN
    -- Precio dinámico
    SELECT public.get_item_price('insurance') INTO v_price_data;
    v_price := (v_price_data->>'price')::integer;

    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;

    -- Seguro ya activo?
    SELECT expires_at INTO v_expires_at FROM public.user_insurance
    WHERE user_id = p_user_id;

    IF FOUND AND v_expires_at > now() THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_active', 'expires_at', v_expires_at);
    END IF;

    IF v_balance < v_price THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds', 'balance', v_balance, 'price', v_price);
    END IF;

    v_expires_at := now() + interval '24 hours';

    INSERT INTO public.user_insurance (user_id, expires_at, premium)
    VALUES (p_user_id, v_expires_at, v_price)
    ON CONFLICT (user_id) DO UPDATE
        SET expires_at = EXCLUDED.expires_at,
            premium    = EXCLUDED.premium,
            created_at = now();

    UPDATE public.profiles SET balance = balance - v_price WHERE id = p_user_id;

    UPDATE public.economy_prices
    SET purchases_today = purchases_today + 1, price_date = CURRENT_DATE
    WHERE item_id = 'insurance';

    RETURN jsonb_build_object('success', true, 'price', v_price, 'expires_at', v_expires_at);
END;
$$;

-- 7. rob_with_insurance — wrapper de rob_user con protección de seguro
DROP FUNCTION IF EXISTS public.rob_with_insurance(uuid, text);
CREATE OR REPLACE FUNCTION public.rob_with_insurance(p_from_user_id uuid, p_target_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_rob_result    jsonb;
    v_target_id     uuid;
    v_has_insurance boolean := false;
    v_amount        integer;
BEGIN
    SELECT public.rob_user(p_from_user_id, p_target_username) INTO v_rob_result;

    IF NOT (v_rob_result->>'success')::boolean THEN
        RETURN v_rob_result;
    END IF;

    v_amount := (v_rob_result->>'amount')::integer;

    SELECT id INTO v_target_id FROM public.profiles WHERE username = p_target_username;

    IF v_target_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.user_insurance
            WHERE user_id = v_target_id AND expires_at > now()
        ) INTO v_has_insurance;
    END IF;

    IF v_has_insurance THEN
        -- Devolver dinero a víctima
        PERFORM public.award_coins(
            v_target_id, v_amount, 'insurance_claim',
            NULL, 'Seguro espacial activado: robo cubierto'
        );
        -- Consumir el seguro
        DELETE FROM public.user_insurance WHERE user_id = v_target_id;

        RETURN v_rob_result || jsonb_build_object('insured', true);
    END IF;

    RETURN v_rob_result || jsonb_build_object('insured', false);
END;
$$;

-- 8. buy_investment
DROP FUNCTION IF EXISTS public.buy_investment(uuid, int, int);
CREATE OR REPLACE FUNCTION public.buy_investment(p_user_id uuid, p_amount int, p_hours int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance  integer;
    v_hours    int;
    v_inv_id   uuid;
    v_matures  timestamptz;
BEGIN
    IF p_amount < 50 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'minimum_amount', 'min', 50);
    END IF;

    v_hours  := CASE WHEN p_hours = 48 THEN 48 ELSE 24 END;
    v_matures := now() + (v_hours || ' hours')::interval;

    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds', 'balance', v_balance);
    END IF;

    UPDATE public.profiles SET balance = balance - p_amount WHERE id = p_user_id;

    INSERT INTO public.user_investments (user_id, amount, matures_at)
    VALUES (p_user_id, p_amount, v_matures)
    RETURNING id INTO v_inv_id;

    RETURN jsonb_build_object(
        'success',    true,
        'id',         v_inv_id,
        'amount',     p_amount,
        'hours',      v_hours,
        'matures_at', v_matures
    );
END;
$$;

-- 9. claim_investment — rendimiento aleatorio determinista (-20% a +50%)
DROP FUNCTION IF EXISTS public.claim_investment(uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_investment(p_user_id uuid, p_investment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_inv    public.user_investments%ROWTYPE;
    v_rate   numeric;
    v_payout integer;
    v_seed   double precision;
BEGIN
    SELECT * INTO v_inv FROM public.user_investments
    WHERE id = p_investment_id AND user_id = p_user_id AND status = 'active';
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'not_found'); END IF;

    IF v_inv.matures_at > now() THEN
        RETURN jsonb_build_object('success', false, 'reason', 'not_mature', 'matures_at', v_inv.matures_at);
    END IF;

    -- Seed determinista basada en UUID + timestamp para resultado consistente
    v_seed := mod(abs(('x' || left(p_investment_id::text, 8))::bit(32)::bigint +
                      extract(epoch from v_inv.matures_at)::bigint), 1000000) / 1000000.0;
    PERFORM setseed(v_seed - 0.5); -- setseed acepta -1 a 1

    v_rate   := -0.20 + random() * 0.70; -- entre -20% y +50%
    v_payout := greatest(1, floor(v_inv.amount * (1 + v_rate))::int);

    UPDATE public.user_investments
    SET status = 'claimed', rate = v_rate, payout = v_payout
    WHERE id = p_investment_id;

    UPDATE public.profiles SET balance = balance + v_payout WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'amount',  v_inv.amount,
        'payout',  v_payout,
        'rate',    round(v_rate * 100),
        'profit',  v_payout - v_inv.amount
    );
END;
$$;

-- 10. buy_chat_effect — compra efecto de mensaje con inflación
DROP FUNCTION IF EXISTS public.buy_chat_effect(uuid, text);
CREATE OR REPLACE FUNCTION public.buy_chat_effect(p_user_id uuid, p_effect text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_item_id    text;
    v_price_data jsonb;
    v_price      integer;
    v_balance    integer;
BEGIN
    v_item_id := 'chat_' || p_effect;

    SELECT public.get_item_price(v_item_id) INTO v_price_data;
    IF NOT (v_price_data->>'success')::boolean THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unknown_effect');
    END IF;

    v_price := (v_price_data->>'price')::integer;
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id;

    IF v_balance < v_price THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds', 'balance', v_balance, 'price', v_price);
    END IF;

    UPDATE public.profiles
    SET balance = balance - v_price, chat_effect = p_effect
    WHERE id = p_user_id;

    UPDATE public.economy_prices
    SET purchases_today = purchases_today + 1, price_date = CURRENT_DATE
    WHERE item_id = v_item_id;

    RETURN jsonb_build_object('success', true, 'effect', p_effect, 'price', v_price);
END;
$$;

-- 11. set_badge_color
DROP FUNCTION IF EXISTS public.set_badge_color(uuid, text);
CREATE OR REPLACE FUNCTION public.set_badge_color(p_user_id uuid, p_color text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Validar formato hex básico
    IF p_color !~ '^#[0-9a-fA-F]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_color');
    END IF;

    UPDATE public.profiles SET badge_color = p_color WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true, 'color', p_color);
END;
$$;

-- 12. complete_tutorial — marca tutorial como completado y da bonus
DROP FUNCTION IF EXISTS public.complete_tutorial(uuid);
CREATE OR REPLACE FUNCTION public.complete_tutorial(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_already boolean;
BEGIN
    SELECT tutorial_completed INTO v_already FROM public.profiles WHERE id = p_user_id;
    IF v_already THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_completed');
    END IF;

    UPDATE public.profiles SET tutorial_completed = true WHERE id = p_user_id;
    PERFORM public.award_coins(p_user_id, 100, 'tutorial_reward', NULL, '¡Bienvenido a Spacely! Bonus de tutorial');

    RETURN jsonb_build_object('success', true, 'bonus', 100);
END;
$$;

-- 13. update_mission_streak — llamar cuando el usuario reclama todas las misiones del día
DROP FUNCTION IF EXISTS public.update_mission_streak(uuid);
CREATE OR REPLACE FUNCTION public.update_mission_streak(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_today         date := CURRENT_DATE;
    v_last_date     date;
    v_streak        int;
    v_all_claimed   boolean;
BEGIN
    -- ¿Todas las misiones de hoy están reclamadas?
    SELECT NOT EXISTS (
        SELECT 1 FROM public.user_missions
        WHERE user_id = p_user_id
          AND assigned_date = v_today
          AND is_claimed = false
    ) INTO v_all_claimed;

    IF NOT v_all_claimed THEN
        RETURN jsonb_build_object('success', false, 'reason', 'missions_pending');
    END IF;

    SELECT last_mission_date, mission_streak INTO v_last_date, v_streak
    FROM public.profiles WHERE id = p_user_id;

    -- Ya registrado hoy?
    IF v_last_date = v_today THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_counted', 'streak', v_streak);
    END IF;

    -- Racha continúa si fue ayer
    IF v_last_date = v_today - 1 THEN
        v_streak := COALESCE(v_streak, 0) + 1;
    ELSE
        v_streak := 1; -- Reset
    END IF;

    UPDATE public.profiles
    SET mission_streak = v_streak, last_mission_date = v_today
    WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true, 'streak', v_streak);
END;
$$;
