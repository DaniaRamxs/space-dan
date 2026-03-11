-- ============================================================
-- stellar_missions.sql :: Daily Progress & Rewards
-- ============================================================

-- 1. Mission Catalog: Template of possible missions
CREATE TABLE IF NOT EXISTS public.mission_templates (
    id           text PRIMARY KEY,
    title        text NOT NULL,
    description  text NOT NULL,
    category     text NOT NULL CHECK (category IN ('social', 'gaming', 'productivity', 'exploration')),
    target_value integer NOT NULL,
    reward_starlys integer DEFAULT 50,
    reward_xp      integer DEFAULT 100,
    icon           text DEFAULT 'Star'
);

-- 2. User Missions: Active assignments for each user
CREATE TABLE IF NOT EXISTS public.user_missions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id   text NOT NULL REFERENCES public.mission_templates(id),
    progress      integer DEFAULT 0,
    is_completed  boolean DEFAULT false,
    is_claimed    boolean DEFAULT false,
    assigned_at   timestamptz DEFAULT now(),
    assigned_date date DEFAULT CURRENT_DATE, -- Nueva columna para constraint único determinista
    expires_at    timestamptz NOT NULL,
    UNIQUE (user_id, template_id, assigned_date)
);

-- Index for fast lookup of active missions
CREATE INDEX IF NOT EXISTS idx_user_missions_active 
ON public.user_missions (user_id, is_claimed) 
WHERE is_claimed = false;

-- 3. Seed some initial templates
INSERT INTO public.mission_templates (id, title, description, category, target_value, reward_starlys, reward_xp, icon)
VALUES 
('msg_5', 'Voz del Vacío', 'Envía 5 mensajes en el Chat Global', 'social', 5, 50, 100, 'MessageSquare'),
('game_record', 'Rompe el Límite', 'Bate tu propio récord en cualquier juego', 'gaming', 1, 100, 200, 'Trophy'),
('daily_claim', 'Constancia Estelar', 'Reclama tu bonus diario', 'exploration', 1, 30, 50, 'Coins'),
('voice_10', 'Ecos en el Éter', 'Pasa 10 minutos en una Sala de Voz', 'social', 10, 80, 150, 'Mic'),
('focus_25', 'Meditación Cósmica', 'Completa una sesión de 25 minutos de Enfoque', 'productivity', 1, 100, 250, 'Timer')
ON CONFLICT (id) DO NOTHING;

-- 4. Function to assign missions daily
DROP FUNCTION IF EXISTS public.get_or_assign_daily_missions(uuid);
CREATE OR REPLACE FUNCTION public.get_or_assign_daily_missions(p_user_id uuid)
RETURNS SETOF public.user_missions
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Verificar si ya existen misiones para la fecha actual UTC
    IF NOT EXISTS (
        SELECT 1 FROM public.user_missions 
        WHERE user_id = p_user_id 
          AND assigned_date = CURRENT_DATE
    ) THEN
        INSERT INTO public.user_missions (user_id, template_id, assigned_date, expires_at)
        SELECT 
            p_user_id, 
            id, 
            CURRENT_DATE,
            (CURRENT_DATE + interval '1 day')
        FROM public.mission_templates
        ORDER BY random()
        LIMIT 3
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN QUERY 
    SELECT * FROM public.user_missions 
    WHERE user_id = p_user_id 
      AND assigned_date = CURRENT_DATE;
END;
$$;

-- 5. RPC to claim reward
DROP FUNCTION IF EXISTS public.claim_mission_reward(uuid);
CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_mission_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_mission public.user_missions%ROWTYPE;
    v_template public.mission_templates%ROWTYPE;
BEGIN
    SELECT * INTO v_mission FROM public.user_missions WHERE id = p_mission_id AND user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'Misión no encontrada'; END IF;
    IF v_mission.is_claimed THEN RAISE EXCEPTION 'Ya reclamaste esta recompensa'; END IF;
    IF NOT v_mission.is_completed THEN RAISE EXCEPTION 'Misión no completada aún'; END IF;

    SELECT * INTO v_template FROM public.mission_templates WHERE id = v_mission.template_id;

    UPDATE public.user_missions SET is_claimed = true WHERE id = p_mission_id;

    IF v_template.reward_starlys > 0 THEN
        PERFORM public.award_coins(auth.uid(), v_template.reward_starlys, 'game_reward', v_mission.id::text, 'Misión Diaria: ' || v_template.title);
    END IF;

    IF v_template.reward_xp > 0 THEN
        PERFORM public.award_activity_xp(auth.uid(), v_template.reward_xp, 'mission');
    END IF;

    -- Actualizar Racha ( Bonus de 7 días )
    PERFORM public.update_mission_streak(auth.uid());

    RETURN jsonb_build_object(
        'success', true, 
        'starlys', v_template.reward_starlys, 
        'xp', v_template.reward_xp
    );
END;
$$;
