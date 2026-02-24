-- ============================================================
-- space-dan :: Partnership Requests (Solicitudes de Vínculo)
-- ============================================================

-- 1. Table for pending requests
CREATE TABLE IF NOT EXISTS public.partnership_requests (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (sender_id, receiver_id)
);

ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

-- Idempotent: drop policies first
DROP POLICY IF EXISTS "Requests visible by sender or receiver" ON public.partnership_requests;
DROP POLICY IF EXISTS "Users can send requests" ON public.partnership_requests;
DROP POLICY IF EXISTS "Receivers can update requests" ON public.partnership_requests;

CREATE POLICY "Requests visible by sender or receiver"
    ON public.partnership_requests FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send requests"
    ON public.partnership_requests FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can update requests"
    ON public.partnership_requests FOR UPDATE
    USING (auth.uid() = receiver_id);

-- 2. Update notifications type constraint (safeguard for existing data)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

UPDATE public.notifications 
SET type = 'system' 
WHERE type NOT IN ('achievement', 'record', 'system', 'letter', 'room_invite', 'partnership_request');

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('achievement', 'record', 'system', 'letter', 'room_invite', 'partnership_request'));

-- 3. Trigger to notify receiver on new request
CREATE OR REPLACE FUNCTION public.on_partnership_request_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, message, reference_id)
    VALUES (
        NEW.receiver_id, 
        'partnership_request', 
        (SELECT username FROM public.profiles WHERE id = NEW.sender_id) || ' te ha enviado una solicitud para vincular sus universos.',
        NEW.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first if exists, then recreate
DROP TRIGGER IF EXISTS tr_on_partnership_request_insert ON public.partnership_requests;
CREATE TRIGGER tr_on_partnership_request_insert
    AFTER INSERT ON public.partnership_requests
    FOR EACH ROW EXECUTE FUNCTION public.on_partnership_request_insert();


-- 4. Function to accept request and create partnership
CREATE OR REPLACE FUNCTION public.accept_partnership_request(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_request RECORD;
    v_user_a uuid;
    v_user_b uuid;
    v_partnership_id uuid;
BEGIN
    -- Get and verify request
    SELECT * INTO v_request 
    FROM public.partnership_requests 
    WHERE id = p_request_id AND status = 'pending';

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Solicitud no encontrada o ya procesada';
    END IF;

    IF v_request.receiver_id != auth.uid() THEN
        RAISE EXCEPTION 'No tienes permiso para aceptar esta solicitud';
    END IF;

    -- Canonical order for partnership
    IF v_request.sender_id < v_request.receiver_id THEN
        v_user_a := v_request.sender_id;
        v_user_b := v_request.receiver_id;
    ELSE
        v_user_a := v_request.receiver_id;
        v_user_b := v_request.sender_id;
    END IF;

    -- Update request status
    UPDATE public.partnership_requests 
    SET status = 'accepted', updated_at = now() 
    WHERE id = p_request_id;

    -- Create partnership
    INSERT INTO public.partnerships (user_a, user_b, status)
    VALUES (v_user_a, v_user_b, 'active')
    ON CONFLICT (user_a, user_b) DO UPDATE SET status = 'active'
    RETURNING id INTO v_partnership_id;

    -- Initialize stats
    INSERT INTO public.universe_stats (partnership_id, visit_count, evolution_level)
    VALUES (v_partnership_id, 0, 1)
    ON CONFLICT (partnership_id) DO NOTHING;

    -- Notify sender
    INSERT INTO public.notifications (user_id, type, message)
    VALUES (
        v_request.sender_id,
        'system',
        (SELECT username FROM public.profiles WHERE id = v_request.receiver_id) || ' ha aceptado tu solicitud de vínculo.'
    );

    RETURN jsonb_build_object('success', true, 'partnership_id', v_partnership_id);
END;
$$;
