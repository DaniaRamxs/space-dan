-- ============================================================
-- space-dan :: Private Universe (Universo Privado)
-- ============================================================

-- 1. PARTNERSHIPS
CREATE TABLE IF NOT EXISTS public.partnerships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eclipse')),
    linked_at   timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT  canonical_order CHECK (user_a < user_b),
    UNIQUE (user_a, user_b)
);

ALTER TABLE public.partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partnerships are viewable by participants"
    ON public.partnerships FOR SELECT
    USING (auth.uid() = user_a OR auth.uid() = user_b);

-- 2. UNIVERSE STATS
CREATE TABLE IF NOT EXISTS public.universe_stats (
    partnership_id uuid PRIMARY KEY REFERENCES public.partnerships(id) ON DELETE CASCADE,
    visit_count    integer NOT NULL DEFAULT 0,
    evolution_level integer NOT NULL DEFAULT 1,
    sync_hits      integer NOT NULL DEFAULT 0,
    last_visit_at  timestamptz
);

ALTER TABLE public.universe_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stats viewable by participants"
    ON public.universe_stats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.partnerships p 
            WHERE p.id = partnership_id 
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
        )
    );

-- 3. VISITS
CREATE TABLE IF NOT EXISTS public.partnership_visits (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partnership_id uuid NOT NULL REFERENCES public.partnerships(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visits only by participants"
    ON public.partnership_visits FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.partnerships p 
            WHERE p.id = partnership_id 
            AND (p.user_a = auth.uid() OR p.user_b = auth.uid())
        )
    );

-- 4. FUNCTIONS

-- Get active partnership for a user
CREATE OR REPLACE FUNCTION public.get_active_partnership(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_partner RECORD;
BEGIN
    SELECT 
        p.id,
        p.linked_at,
        p.status,
        CASE WHEN p.user_a = p_user_id THEN p.user_b ELSE p.user_a END as partner_id,
        pr.username as partner_username,
        pr.avatar_url as partner_avatar,
        s.visit_count,
        s.evolution_level,
        s.sync_hits
    INTO v_partner
    FROM public.partnerships p
    JOIN public.profiles pr ON pr.id = (CASE WHEN p.user_a = p_user_id THEN p.user_b ELSE p.user_a END)
    LEFT JOIN public.universe_stats s ON s.partnership_id = p.id
    WHERE (p.user_a = p_user_id OR p.user_b = p_user_id)
    ORDER BY p.linked_at DESC
    LIMIT 1;

    IF v_partner IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_partner.id,
        'linked_at', v_partner.linked_at,
        'status', v_partner.status,
        'partner_id', v_partner.partner_id,
        'partner_username', v_partner.partner_username,
        'partner_avatar', v_partner.partner_avatar,
        'visit_count', COALESCE(v_partner.visit_count, 0),
        'evolution_level', COALESCE(v_partner.evolution_level, 1),
        'sync_hits', COALESCE(v_partner.sync_hits, 0)
    );
END;
$$;

-- Register a visit and update evolution
CREATE OR REPLACE FUNCTION public.register_universe_visit(p_partnership_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    -- Only participants
    IF NOT EXISTS (SELECT 1 FROM public.partnerships WHERE id = p_partnership_id AND (user_a = v_user_id OR user_b = v_user_id)) THEN
        RETURN;
    END IF;

    -- Log visit
    INSERT INTO public.partnership_visits (partnership_id, user_id)
    VALUES (p_partnership_id, v_user_id);

    -- Update stats
    INSERT INTO public.universe_stats (partnership_id, visit_count, last_visit_at)
    VALUES (p_partnership_id, 1, now())
    ON CONFLICT (partnership_id) DO UPDATE
    SET 
        visit_count = universe_stats.visit_count + 1,
        last_visit_at = now(),
        evolution_level = CASE 
            WHEN universe_stats.visit_count + 1 > 500 THEN 5
            WHEN universe_stats.visit_count + 1 > 200 THEN 4
            WHEN universe_stats.visit_count + 1 > 100 THEN 3
            WHEN universe_stats.visit_count + 1 > 30 THEN 2
            ELSE 1
        END;
END;
$$;
