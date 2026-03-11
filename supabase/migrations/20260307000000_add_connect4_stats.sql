-- Add Connect 4 statistics to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS connect4_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS connect4_losses INTEGER DEFAULT 0;

-- Optional: Index for potential leaderboard
CREATE INDEX IF NOT EXISTS idx_connect4_wins ON public.profiles(connect4_wins DESC);

-- Function to increment profile stats safely
CREATE OR REPLACE FUNCTION public.increment_profile_stat(
  profile_id UUID,
  stat_col TEXT,
  inc_val INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('UPDATE public.profiles SET %I = %I + $1 WHERE id = $2', stat_col, stat_col)
  USING inc_val, profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
