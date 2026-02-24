-- ============================================================
-- Supabase Schema for Notifications System
-- PLEASE EXECUTE THIS IN SUPABASE SQL EDITOR
-- ============================================================

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('achievement', 'record', 'system', 'letter', 'room_invite', 'partnership_request')),
  message text NOT NULL,
  reference_id uuid, -- Optional link to another table (e.g., request_id)
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id) WHERE is_read = false;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- users can read their own notifications
DROP POLICY IF EXISTS "notifications_public_read" ON public.notifications;
CREATE POLICY "notifications_public_read" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);

-- users can insert their own notifications (e.g. they triggered an achievement)
DROP POLICY IF EXISTS "notifications_auth_insert" ON public.notifications;
CREATE POLICY "notifications_auth_insert" ON public.notifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- users can update their own notifications (e.g. marking as read)
DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;
CREATE POLICY "notifications_owner_update" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

-- users can delete their own notifications (e.g. clearing the inbox)
DROP POLICY IF EXISTS "notifications_owner_delete" ON public.notifications;
CREATE POLICY "notifications_owner_delete" ON public.notifications 
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Enable Realtime triggers for this table
-- This allows the React app to listen for new notifications instantly
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;
-- Note: If you already have realtime enabled, ensure 'notifications' is checked in the Dashboard -> Database -> Replication.
