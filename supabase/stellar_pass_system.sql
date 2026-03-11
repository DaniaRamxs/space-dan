-- ============================================================
-- STELLAR PASS SYSTEM :: space-dan
-- Implementación de Niveles, Recompensas y Progresión
-- ============================================================

-- 1. TABLAS DEL PASE ESTELAR
CREATE TABLE IF NOT EXISTS public.stellar_pass_progression (
    user_id       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    level         integer DEFAULT 1,
    xp            integer DEFAULT 0,
    is_premium    boolean DEFAULT false,
    updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stellar_pass_rewards (
    id            serial PRIMARY KEY,
    level         integer NOT NULL,
    reward_type   text NOT NULL, -- 'starlys', 'badge', 'title', 'item'
    reward_amount integer DEFAULT 0,
    reward_data   jsonb DEFAULT '{}',
    is_premium    boolean DEFAULT false
);

-- 2. RECOMPENSAS DE TEMPORADA 1 (1-50)
INSERT INTO public.stellar_pass_rewards (level, reward_type, reward_amount, is_premium) VALUES
(1, 'starlys', 1000, false),
(2, 'starlys', 5000, false),
(3, 'starlys', 10000, true),
(4, 'starlys', 2000, false),
(5, 'title', 0, false), -- Recompensa de título manejada por metadata si se extiende
(6, 'starlys', 3000, false),
(7, 'starlys', 15000, true),
(8, 'starlys', 4000, false),
(9, 'starlys', 5000, false),
(10, 'starlys', 100000, true),
(15, 'starlys', 50000, false),
(20, 'starlys', 250000, true),
(30, 'starlys', 500000, true),
(40, 'starlys', 1000000, true),
(50, 'starlys', 5000000, true)
ON CONFLICT DO NOTHING;

-- 3. FUNCIÓN PARA OTORGAR XP DE PASE (Se llama desde award_coins)
CREATE OR REPLACE FUNCTION public.award_pass_xp(p_user_id uuid, p_xp integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_xp  integer;
    v_current_lvl integer;
    v_new_xp      integer;
    v_new_lvl     integer;
    v_xp_per_lvl  integer := 1000; -- XP fija por nivel para el pase
    v_rewards     RECORD;
BEGIN
    INSERT INTO public.stellar_pass_progression (user_id, level, xp)
    VALUES (p_user_id, 1, 0)
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
    RETURNING xp, level INTO v_current_xp, v_current_lvl;

    v_new_xp := v_current_xp + p_xp;
    v_new_lvl := v_current_lvl;

    -- Level up logic
    WHILE v_new_xp >= v_xp_per_lvl LOOP
        v_new_xp := v_new_xp - v_xp_per_lvl;
        v_new_lvl := v_new_lvl + 1;
        
        -- Entregar recompensas del nuevo nivel
        FOR v_rewards IN SELECT * FROM public.stellar_pass_rewards WHERE level = v_new_lvl LOOP
            -- Solo dar premios premium si el usuario ha pagado el pase
            IF v_rewards.is_premium = false OR (SELECT is_premium FROM public.stellar_pass_progression WHERE user_id = p_user_id) = true THEN
                IF v_rewards.reward_type = 'starlys' THEN
                    PERFORM public.award_coins(p_user_id, v_rewards.reward_amount, 'pass_reward', 'lvl_' || v_new_lvl);
                END IF;
                -- (Aquí se pueden añadir más tipos de premios como items o títulos)
            END IF;
        END LOOP;
    END LOOP;

    UPDATE public.stellar_pass_progression 
    SET level = v_new_lvl, xp = v_new_xp 
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('level_up', v_new_lvl > v_current_lvl, 'new_level', v_new_lvl);
END;
$$;

