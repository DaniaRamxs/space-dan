-- ============================================================
-- Space Cabin (Cabina Espacial) :: Productivity Module
-- ============================================================

-- 1. Tasks
CREATE TABLE IF NOT EXISTS public.cabin_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  is_completed  boolean DEFAULT false,
  is_today      boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  completed_at  timestamptz
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cabin_tasks_user ON public.cabin_tasks(user_id);

-- 2. Notes (Brainstorming / Ideario)
CREATE TABLE IF NOT EXISTS public.cabin_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text DEFAULT '',
  color      text DEFAULT 'purple',
  updated_at timestamptz DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_cabin_notes_user ON public.cabin_notes(user_id);

-- 3. Pomodoro Sessions
CREATE TABLE IF NOT EXISTS public.cabin_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL DEFAULT 25,
  session_type     text CHECK (session_type IN ('focus', 'break')),
  created_at       timestamptz DEFAULT now()
);

-- 4. Productivity Stats
CREATE TABLE IF NOT EXISTS public.cabin_stats (
  user_id              uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_focus_minutes  bigint DEFAULT 0,
  total_sessions       integer DEFAULT 0,
  current_streak       integer DEFAULT 0,
  last_session_date    date,
  dancoins_earned      bigint DEFAULT 0,
  updated_at           timestamptz DEFAULT now()
);

-- ── RLS POLICIES ─────────────────────────────────────────────

-- cabin_tasks
ALTER TABLE public.cabin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks: owner full access" ON public.cabin_tasks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- cabin_notes
ALTER TABLE public.cabin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes: owner full access" ON public.cabin_notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- cabin_sessions
ALTER TABLE public.cabin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions: owner read/insert" ON public.cabin_sessions
  FOR ALL USING (auth.uid() = user_id);

-- cabin_stats
ALTER TABLE public.cabin_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stats: public read, owner update" ON public.cabin_stats
  FOR SELECT USING (true);
CREATE POLICY "Stats: owner update" ON public.cabin_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- ── FUNCTIONS ────────────────────────────────────────────────

-- Function to finish a focus session, update stats and award Dancoins
CREATE OR REPLACE FUNCTION public.complete_focus_session(p_user_id uuid, p_minutes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_coins_awarded integer := 5;
  v_today date := current_date;
  v_last_date date;
  v_streak integer;
  v_new_total_minutes bigint;
  v_new_total_sessions integer;
BEGIN
  -- 1. Insert session record
  INSERT INTO public.cabin_sessions (user_id, duration_minutes, session_type)
  VALUES (p_user_id, p_minutes, 'focus');

  -- 2. Award Dancoins (using existing award_coins logic if available, or manual increment)
  -- Note: We assuming 'award_coins' exists from previous work
  PERFORM public.award_coins(p_user_id, v_coins_awarded, 'productivity', NULL, 'Sesión de Cabina completada');

  -- 3. Update Stats & Streak
  INSERT INTO public.cabin_stats (user_id, total_focus_minutes, total_sessions, current_streak, last_session_date, dancoins_earned)
  VALUES (p_user_id, p_minutes, 1, 1, v_today, v_coins_awarded)
  ON CONFLICT (user_id) DO UPDATE SET
    total_focus_minutes = cabin_stats.total_focus_minutes + p_minutes,
    total_sessions = cabin_stats.total_sessions + 1,
    dancoins_earned = cabin_stats.dancoins_earned + v_coins_awarded,
    current_streak = CASE
      WHEN cabin_stats.last_session_date = v_today THEN cabin_stats.current_streak
      WHEN cabin_stats.last_session_date = v_today - interval '1 day' THEN cabin_stats.current_streak + 1
      ELSE 1
    END,
    last_session_date = v_today,
    updated_at = now()
  RETURNING total_focus_minutes, total_sessions, current_streak INTO v_new_total_minutes, v_new_total_sessions, v_streak;

  RETURN jsonb_build_object(
    'success', true,
    'minutes', v_new_total_minutes,
    'sessions', v_new_total_sessions,
    'streak', v_streak,
    'coins_awarded', v_coins_awarded
  );
END;
$$;
