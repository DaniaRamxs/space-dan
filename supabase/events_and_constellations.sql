
-- 🌌 space-dan :: Constelaciones de Afinidad & Auras Estelares

-- 1. Tabla para estados de Auras (Modo Supernova, etc)
CREATE TABLE IF NOT EXISTS public.user_auras (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    aura_type text NOT NULL, -- 'supernova', 'nebula', 'void'
    expires_at timestamp with time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_auras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auras visibles para todos" ON public.user_auras
    FOR SELECT USING (true);

-- 2. Función para Activar Aura (Quemar Starlys)
CREATE OR REPLACE FUNCTION public.activate_user_aura(
    p_user_id uuid,
    p_aura_type text,
    p_cost integer,
    p_duration_hours integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_balance integer;
    v_expires_at timestamp with time zone;
BEGIN
    -- Validar autor
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- Verificar balance
    SELECT balance INTO v_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF v_balance < p_cost THEN
        RAISE EXCEPTION 'Balance insuficiente para activar el aura %', p_aura_type;
    END IF;

    -- Calcular expiración
    v_expires_at := now() + (p_duration_hours || ' hours')::interval;

    -- Restar Starlys (Quemar)
    UPDATE public.profiles SET balance = balance - p_cost WHERE id = p_user_id;

    -- Insertar o actualizar Aura
    INSERT INTO public.user_auras (user_id, aura_type, expires_at, metadata)
    VALUES (p_user_id, p_aura_type, v_expires_at, jsonb_build_object('cost', p_cost, 'activated_at', now()))
    ON CONFLICT (user_id) DO UPDATE 
    SET aura_type = EXCLUDED.aura_type,
        expires_at = EXCLUDED.expires_at,
        metadata = public.user_auras.metadata || EXCLUDED.metadata;

    -- Registrar transacción para el Ledger
    INSERT INTO public.transactions (user_id, amount, balance_after, type, description)
    VALUES (p_user_id, -p_cost, v_balance - p_cost, 'aura_activation', 'Activación de Aura: ' || p_aura_type);

    -- Anuncio en el Feed
    INSERT INTO public.activity_posts (author_id, content)
    VALUES (p_user_id, format('¡Ha alcanzado el estado de **%s** quemando %s Starlys! ⚡✨', upper(p_aura_type), p_cost));

    RETURN jsonb_build_object(
        'success', true, 
        'aura_type', p_aura_type, 
        'expires_at', v_expires_at,
        'new_balance', v_balance - p_cost
    );
END;
$$;

-- 3. Vista de Afinidad (Calculada por transferencias/apoyo)
-- Determina la fuerza del vínculo entre usuarios
CREATE OR REPLACE VIEW public.user_affinities AS
WITH combined_support AS (
    -- Transferencias directas
    SELECT from_user_id as user_a, to_user_id as user_b, amount FROM public.transfers
    UNION ALL
    -- Contribuciones a deudas
    SELECT donor_id as user_a, recipient_id as user_b, amount FROM public.debt_contributions
)
SELECT 
    LEAST(user_a, user_b) as user_1,
    GREATEST(user_a, user_b) as user_2,
    SUM(amount) as affinity_score,
    COUNT(*) as interaction_count
FROM combined_support
GROUP BY 1, 2
HAVING SUM(amount) >= 1000; -- Mínimo para ser una "constelación"

-- 4. Función para obtener constelación de un usuario
CREATE OR REPLACE FUNCTION public.get_user_constellation(p_user_id uuid)
RETURNS TABLE (
    friend_id uuid,
    friend_username text,
    friend_avatar text,
    strength numeric,
    rank integer
) LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN ua.user_1 = p_user_id THEN ua.user_2 ELSE ua.user_1 END as friend_id,
        p.username as friend_username,
        p.avatar_url as friend_avatar,
        ua.affinity_score::numeric as strength,
        ROW_NUMBER() OVER (ORDER BY ua.affinity_score DESC)::integer as rank
    FROM public.user_affinities ua
    JOIN public.profiles p ON p.id = (CASE WHEN ua.user_1 = p_user_id THEN ua.user_2 ELSE ua.user_1 END)
    WHERE ua.user_1 = p_user_id OR ua.user_2 = p_user_id
    ORDER BY strength DESC
    LIMIT 5; -- Top 5 estrellas en su constelación
END;
$$;
