-- ============================================================
-- mission_streaks.sql :: Racha de misiones y bonus
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_mission_streaks (
    user_id       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    best_streak    integer DEFAULT 0,
    last_completion_date date,
    updated_at     timestamptz DEFAULT now()
);

-- Función para actualizar racha al completar misiones
CREATE OR REPLACE FUNCTION public.update_mission_streak(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_streak RECORD;
    v_today date := CURRENT_DATE;
    v_bonus integer := 0;
BEGIN
    INSERT INTO public.user_mission_streaks (user_id, current_streak, best_streak, last_completion_date)
    VALUES (p_user_id, 1, 1, v_today)
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = CASE 
            WHEN public.user_mission_streaks.last_completion_date = v_today THEN public.user_mission_streaks.current_streak -- Ya contó hoy
            WHEN public.user_mission_streaks.last_completion_date = v_today - 1 THEN public.user_mission_streaks.current_streak + 1
            ELSE 1
        END,
        best_streak = GREATEST(
            public.user_mission_streaks.best_streak, 
            CASE 
                WHEN public.user_mission_streaks.last_completion_date = v_today - 1 THEN public.user_mission_streaks.current_streak + 1
                ELSE 1
            END
        ),
        last_completion_date = v_today,
        updated_at = now()
    RETURNING * INTO v_streak;

    -- Sincronizar con profiles para que el frontend lo vea fácil
    UPDATE public.profiles 
    SET streak = v_streak.current_streak,
        best_streak = v_streak.best_streak
    WHERE id = p_user_id;

    -- Bonus cada 7 días
    IF v_streak.current_streak % 7 = 0 AND v_streak.last_completion_date = v_today AND v_streak.current_streak > 0 THEN
        v_bonus := 500; -- Bonus de 500 Starlys
        PERFORM public.award_coins(p_user_id, v_bonus, 'streak_bonus', NULL, 'Bonus de Racha: ' || v_streak.current_streak || ' días seguidos');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'current_streak', v_streak.current_streak,
        'bonus', v_bonus
    );
END;
$$;
