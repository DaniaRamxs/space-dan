-- Migración: Racha Estelar
-- Ejecutar en la consola de Supabase (SQL Editor)

-- 1. Agregar columnas a la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- 2. Función para actualizar la racha (Segura y Atómica)
-- Esta función incrementa la racha si ayer fue el último día activo,
-- la reinicia a 1 si ha pasado más tiempo,
-- y no hace nada si hoy ya se registró actividad.
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_active DATE;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT last_active_date INTO v_last_active
    FROM profiles
    WHERE id = p_user_id;

    IF v_last_active IS NULL THEN
        -- Primera actividad registrada
        UPDATE profiles
        SET streak = 1,
            best_streak = GREATEST(best_streak, 1),
            last_active_date = v_today
        WHERE id = p_user_id;
    ELSIF v_last_active = v_today - 1 THEN
        -- Consecutivo: incrementamos racha
        UPDATE profiles
        SET streak = streak + 1,
            best_streak = GREATEST(best_streak, streak + 1),
            last_active_date = v_today
        WHERE id = p_user_id;
    ELSIF v_last_active < v_today - 1 THEN
        -- Se rompió la racha: reiniciamos a 1
        UPDATE profiles
        SET streak = 1,
            best_streak = GREATEST(best_streak, 1),
            last_active_date = v_today
        WHERE id = p_user_id;
    END IF;
    -- Si v_last_active = v_today, ya se contó hoy. No hacemos nada.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC para obtener el ranking de rachas (Top 50)
CREATE OR REPLACE FUNCTION get_streak_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    username TEXT,
    avatar_url TEXT,
    streak INTEGER,
    best_streak INTEGER,
    last_active_date DATE,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.avatar_url,
        p.streak,
        p.best_streak,
        p.last_active_date,
        RANK() OVER (ORDER BY p.streak DESC, p.best_streak DESC, p.id ASC) as rank
    FROM profiles p
    WHERE p.streak > 0
    ORDER BY p.streak DESC, p.best_streak DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
