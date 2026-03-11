-- ============================================================
-- hyperbot_events.sql :: Auto-Eventos de HyperBot
-- ============================================================

-- Tabla de eventos activos del bot (Lluvia de Meteoritos, Jefe, Crash de Mercado)
CREATE TABLE IF NOT EXISTS public.bot_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type       text NOT NULL, -- 'meteor', 'boss', 'market_crash'
    status     text NOT NULL DEFAULT 'active', -- 'active', 'completed'
    data       jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bot_events_active
    ON public.bot_events (type, status, expires_at);

-- RLS
ALTER TABLE public.bot_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_events_public_read"           ON public.bot_events;
DROP POLICY IF EXISTS "bot_events_authenticated_insert"  ON public.bot_events;
DROP POLICY IF EXISTS "bot_events_authenticated_update"  ON public.bot_events;

CREATE POLICY "bot_events_public_read"
    ON public.bot_events FOR SELECT USING (true);

CREATE POLICY "bot_events_authenticated_insert"
    ON public.bot_events FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "bot_events_authenticated_update"
    ON public.bot_events FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ── Iniciar evento (con prevención de duplicados atómica) ──────
DROP FUNCTION IF EXISTS public.start_bot_event(text, jsonb, int);
CREATE OR REPLACE FUNCTION public.start_bot_event(
    p_type     text,
    p_data     jsonb,
    p_duration int DEFAULT 10  -- minutos
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_id uuid;
BEGIN
    -- Evitar duplicados: rechazar si hay uno activo del mismo tipo
    IF EXISTS (
        SELECT 1 FROM public.bot_events
        WHERE type = p_type AND status = 'active' AND expires_at > now()
    ) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_active');
    END IF;

    INSERT INTO public.bot_events (type, data, expires_at)
    VALUES (p_type, p_data, now() + (p_duration || ' minutes')::interval)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- ── Reclamar meteorito (solo el primero gana) ──────────────────
DROP FUNCTION IF EXISTS public.claim_meteor_event(uuid, uuid);
CREATE OR REPLACE FUNCTION public.claim_meteor_event(
    p_event_id uuid,
    p_user_id  uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_event public.bot_events;
    v_reward int;
BEGIN
    SELECT * INTO v_event
    FROM public.bot_events
    WHERE id = p_event_id
      AND type = 'meteor'
      AND status = 'active'
      AND expires_at > now()
    FOR UPDATE;

    -- No encontrado o ya fue reclamado
    IF NOT FOUND OR (v_event.data ? 'winner_id') THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_claimed');
    END IF;

    v_reward := (v_event.data->>'reward')::int;

    UPDATE public.bot_events
    SET status = 'completed',
        data   = data || jsonb_build_object('winner_id', p_user_id::text)
    WHERE id = p_event_id;

    RETURN jsonb_build_object('success', true, 'reward', v_reward);
END;
$$;

-- ── Atacar al jefe (devuelve estado actualizado, el cliente distribuye el premio) ──
DROP FUNCTION IF EXISTS public.attack_boss_event(uuid, uuid, text, int);
CREATE OR REPLACE FUNCTION public.attack_boss_event(
    p_event_id uuid,
    p_user_id  uuid,
    p_username text,
    p_damage   int
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_event     public.bot_events;
    v_hp        int;
    v_max_hp    int;
    v_new_hp    int;
    v_reward    int;
    v_attackers jsonb;
BEGIN
    SELECT * INTO v_event
    FROM public.bot_events
    WHERE id = p_event_id
      AND type = 'boss'
      AND status = 'active'
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'event_not_found');
    END IF;

    v_hp        := (v_event.data->>'hp')::int;
    v_max_hp    := (v_event.data->>'max_hp')::int;
    v_reward    := (v_event.data->>'reward')::int;
    v_attackers := COALESCE(v_event.data->'attackers', '{}');

    IF v_hp <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'boss_dead');
    END IF;

    v_new_hp    := GREATEST(0, v_hp - p_damage);
    v_attackers := jsonb_set(v_attackers, ARRAY[p_user_id::text], to_jsonb(p_username));

    UPDATE public.bot_events
    SET status = CASE WHEN v_new_hp <= 0 THEN 'completed' ELSE 'active' END,
        data   = data || jsonb_build_object('hp', v_new_hp, 'attackers', v_attackers)
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success',   true,
        'defeated',  v_new_hp <= 0,
        'damage',    p_damage,
        'new_hp',    v_new_hp,
        'max_hp',    v_max_hp,
        'reward',    v_reward,
        'attackers', v_attackers
    );
END;
$$;
