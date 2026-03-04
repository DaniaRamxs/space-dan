-- ============================================================
-- onboarding_logic.sql :: Tutorial & New Player Onboarding
-- ============================================================

-- 1. Añadir campos de racha, tutorial y personalización a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS streak             integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak        integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS badge_color        text    DEFAULT '#7c3aed',
ADD COLUMN IF NOT EXISTS chat_effect       text    DEFAULT NULL,
ADD COLUMN IF NOT EXISTS xp_boost_until    timestamptz DEFAULT NULL;

-- 2. RPC para completar tutorial y dar recompensa inicial
CREATE OR REPLACE FUNCTION public.complete_tutorial(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_reward integer := 100;
BEGIN
    -- Solo permitir si no se ha completado antes
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND tutorial_completed = true) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'already_completed');
    END IF;

    -- Marcar como completado
    UPDATE public.profiles 
    SET tutorial_completed = true 
    WHERE id = p_user_id;

    -- Entregar recompensa de 100 Starlys
    PERFORM public.award_coins(
        p_user_id, 
        v_reward, 
        'achievement', 
        'onboarding_complete', 
        '¡Bienvenido a Spacely! Recompensa de iniciación.'
    );

    RETURN jsonb_build_object('success', true, 'reward', v_reward);
END;
$$;

-- 3. RPC para actualizar color de insignia
CREATE OR REPLACE FUNCTION public.set_badge_color(p_user_id uuid, p_color text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF auth.uid() != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
    END IF;

    UPDATE public.profiles SET badge_color = p_color WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
