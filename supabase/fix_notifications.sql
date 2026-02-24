-- ============================================================
-- FIX: Orbit Letters Notifications & App Stability
-- ============================================================

-- 1. Update notifications table to allow 'letter' and 'room_invite'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('achievement', 'record', 'system', 'letter', 'room_invite'));

-- 2. Create the create_notification function in PL/pgSQL
-- This is used by send_letter and create_private_room
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_message text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (p_user_id, p_type, p_message);
END;
$$;

-- 3. Ensure the check_social_achievement function exists to avoid errors
-- (It should exist from social.sql, but we ensure it a bit better)
-- No changes needed if social.sql was run.

-- 4. Audit send_letter in social.sql to ensure it uses the function correctly
-- (It already does, but now the function exists)
