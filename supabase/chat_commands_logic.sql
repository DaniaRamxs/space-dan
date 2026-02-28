
-- 🚀 space-dan :: Chat Commands Backend
-- Sistema de Comandos Avanzados para HyperBot

-- 1. Extensión de Perfiles para nuevos comandos
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mood           text          DEFAULT NULL,
ADD COLUMN IF NOT EXISTS married_to     uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_work_at   timestamptz   DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_rob_at    timestamptz   DEFAULT NULL;

-- 2. Leaderboard: Los más ricos de la galaxia
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit int DEFAULT 5)
RETURNS TABLE (
    username text,
    balance int,
    avatar_url text
) LANGUAGE sql STABLE AS $$
    SELECT username, balance, avatar_url
    FROM public.profiles
    WHERE username IS NOT NULL
    ORDER BY balance DESC
    LIMIT p_limit;
$$;

-- 3. Misión de Trabajo (Work)
CREATE OR REPLACE FUNCTION public.work_mission(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_cooldown      interval := '4 hours';
    v_last_work     timestamptz;
    v_reward        int;
    v_new_balance   int;
BEGIN
    SELECT last_work_at INTO v_last_work FROM public.profiles WHERE id = p_user_id;
    
    IF v_last_work IS NOT NULL AND v_last_work > now() - v_cooldown THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'cooldown',
            'next_available', v_last_work + v_cooldown
        );
    END IF;

    v_reward := floor(random() * (150 - 50 + 1) + 50)::int; -- Entre 50 y 150

    UPDATE public.profiles 
    SET balance = balance + v_reward,
        last_work_at = now()
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    -- Registrar en Ledger
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, v_reward, v_new_balance, 'game_reward', 'Misión espacial completada');

    RETURN jsonb_build_object(
        'success', true,
        'reward', v_reward,
        'new_balance', v_new_balance
    );
END;
$$;

-- 4. Función para Descontar Monedas (Utility for Tax / Slots Loss)
CREATE OR REPLACE FUNCTION public.deduct_coins(
    p_user_id   uuid,
    p_amount    int,
    p_type      text,
    p_desc      text
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_new_balance int;
BEGIN
    UPDATE public.profiles 
    SET balance = GREATEST(0, balance - p_amount)
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, -p_amount, v_new_balance, p_type, p_desc);

    RETURN v_new_balance;
END;
$$;

-- 5. Robar a un Usuario (Rob)
CREATE OR REPLACE FUNCTION public.rob_user(p_from_user_id uuid, p_target_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_target_id     uuid;
    v_target_bal    int;
    v_success       boolean;
    v_amount        int;
    v_penalty       int;
    v_new_bal       int;
    v_cooldown      interval := '2 hours';
    v_last_rob      timestamptz;
BEGIN
    -- Cooldown check
    SELECT last_rob_at INTO v_last_rob FROM public.profiles WHERE id = p_from_user_id;
    IF v_last_rob IS NOT NULL AND v_last_rob > now() - v_cooldown THEN
        RETURN jsonb_build_object('success', false, 'reason', 'cooldown', 'next', v_last_rob + v_cooldown);
    END IF;

    -- Buscar objetivo
    SELECT id, balance INTO v_target_id, v_target_bal 
    FROM public.profiles 
    WHERE lower(username) = lower(p_target_username);

    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'Usuario objetivo no encontrado';
    END IF;

    IF v_target_id = p_from_user_id THEN
        RAISE EXCEPTION 'No puedes robarte a ti mismo';
    END IF;

    IF v_target_bal < 100 THEN
        RAISE EXCEPTION 'Este usuario es demasiado pobre para robarle';
    END IF;

    v_success := random() > 0.65; -- 35% de éxito

    IF v_success THEN
        v_amount := floor(v_target_bal * 0.15)::int; -- Roba el 15%
        
        UPDATE public.profiles SET balance = balance - v_amount WHERE id = v_target_id;
        UPDATE public.profiles SET balance = balance + v_amount, last_rob_at = now() 
        WHERE id = p_from_user_id RETURNING balance INTO v_new_bal;

        INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
        VALUES 
            (v_target_id, -v_amount, v_target_bal - v_amount, 'transfer_out', 'Víctima de robo galáctico'),
            (p_from_user_id, v_amount, v_new_bal, 'transfer_in', 'Robo galáctico exitoso');

        RETURN jsonb_build_object('success', true, 'amount', v_amount, 'new_balance', v_new_bal);
    ELSE
        v_penalty := 100; -- Multa fija por fallar
        
        UPDATE public.profiles SET balance = GREATEST(0, balance - v_penalty), last_rob_at = now() 
        WHERE id = p_from_user_id RETURNING balance INTO v_new_bal;
        
        UPDATE public.profiles SET balance = balance + v_penalty WHERE id = v_target_id;

        INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
        VALUES 
            (p_from_user_id, -v_penalty, v_new_bal, 'transfer_out', 'Multa por robo fallido'),
            (v_target_id, v_penalty, v_target_bal + v_penalty, 'transfer_in', 'Compensación por intento de robo');

        RETURN jsonb_build_object('success', false, 'reason', 'caught', 'penalty', v_penalty, 'new_balance', v_new_bal);
    END IF;
END;
$$;

-- 6. Limpiar Canal (Admin Only)
CREATE OR REPLACE FUNCTION public.clear_channel_messages(p_channel_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verificar que el llamador sea admin en profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    DELETE FROM public.global_chat WHERE channel_id = p_channel_id;
END;
$$;
