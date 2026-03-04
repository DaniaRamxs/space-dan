-- ============================================================
-- activity_system.sql :: Social Activity & XP Backend
-- ============================================================

-- 1. Extend Profiles with Levels and XP
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS activity_level  integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS activity_xp     integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level           integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS xp               integer DEFAULT 0;

-- 2. Ensure transactions can be negative (Drop if wrong constraint exists)
DO $$ 
BEGIN
    -- This constraint is likely what's causing the error for expenses
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS check_positive_amount;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 3. RPC to award Activity XP
DROP FUNCTION IF EXISTS public.award_activity_xp(uuid, int, text);
CREATE OR REPLACE FUNCTION public.award_activity_xp(
    p_user_id uuid,
    p_amount int,
    p_source text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old_xp int;
    v_new_xp int;
    v_old_lvl int;
    v_new_lvl int;
    v_level_up boolean := false;
BEGIN
    -- 1. Get current stats
    SELECT activity_xp, activity_level INTO v_old_xp, v_old_lvl
    FROM public.profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;

    -- 2. Update XP
    v_new_xp := v_old_xp + p_amount;
    
    -- 3. Calculate new level (Logarithmic or linear)
    -- Simple formula: Level = floor(sqrt(xp / 10)) + 1
    v_new_lvl := floor(sqrt(v_new_xp / 10.0))::int + 1;

    IF v_new_lvl > v_old_lvl THEN
        v_level_up := true;
    END IF;

    -- 4. Update profile
    UPDATE public.profiles
    SET activity_xp = v_new_xp,
        activity_level = v_new_lvl,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'old_xp', v_old_xp,
        'activity_xp', v_new_xp,
        'old_level', v_old_lvl,
        'activity_level', v_new_lvl,
        'level_up', v_level_up
    );
END;
$$;

-- 4. Chat Stats Integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_level    integer DEFAULT 1;

DROP FUNCTION IF EXISTS public.increment_chat_stats(uuid);
CREATE OR REPLACE FUNCTION public.increment_chat_stats(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_old_count int;
    v_new_count int;
    v_old_lvl int;
    v_new_lvl int;
    v_level_up boolean := false;
BEGIN
    SELECT message_count, chat_level INTO v_old_count, v_old_lvl
    FROM public.profiles WHERE id = p_user_id;

    v_new_count := v_old_count + 1;
    -- Level up every 50 messages
    v_new_lvl := (v_new_count / 50) + 1;

    IF v_new_lvl > v_old_lvl THEN
        v_level_up := true;
    END IF;

    UPDATE public.profiles
    SET message_count = v_new_count,
        chat_level = v_new_lvl
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'message_count', v_new_count,
        'chat_level', v_new_lvl,
        'level_up', v_level_up
    );
END;
$$;

-- 5. Stellar Level Sync (The "Bolt" Icon)
-- This keeps the static columns in 'profiles' updated with the dynamic XP calculation
CREATE OR REPLACE FUNCTION public.sync_profile_level()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_xp float;
    v_lvl int;
    v_user_id uuid;
BEGIN
    -- Determine user_id based on the table acting on
    IF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
    ELSIF (TG_TABLE_NAME = 'profiles') THEN
        v_user_id := NEW.id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    -- Calculate current dynamic XP
    SELECT public.get_user_xp(v_user_id) INTO v_xp;
    
    -- Calculate level: floor(0.1 * sqrt(xp))
    v_lvl := floor(0.1 * sqrt(COALESCE(v_xp, 0)))::int;
    IF v_lvl < 1 THEN v_lvl := 1; END IF;

    -- Update the static columns (using a separate update to avoid recursion if on profiles)
    -- We only update if we are NOT on the profiles table or if we are but only level/xp changed
    IF (TG_TABLE_NAME != 'profiles') THEN
        UPDATE public.profiles 
        SET xp = v_xp::int,
            level = v_lvl
        WHERE id = v_user_id;
    END IF;

    RETURN NULL;
END;
$$;

-- Triggers to fire the sync
DROP TRIGGER IF EXISTS tr_sync_level_scores ON public.scores;
CREATE TRIGGER tr_sync_level_scores 
AFTER INSERT OR UPDATE OR DELETE ON public.scores 
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_level();

DROP TRIGGER IF EXISTS tr_sync_level_achievements ON public.user_achievements;
CREATE TRIGGER tr_sync_level_achievements 
AFTER INSERT OR DELETE ON public.user_achievements 
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_level();

-- Trigger for balance changes
DROP TRIGGER IF EXISTS tr_sync_level_balance ON public.profiles;
CREATE TRIGGER tr_sync_level_balance 
AFTER UPDATE OF balance ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_level();
