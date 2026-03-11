-- Add Tetris Duel statistics to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tetris_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tetris_losses INTEGER DEFAULT 0;

-- Optional: Index for potential leaderboard
CREATE INDEX IF NOT EXISTS idx_tetris_wins ON public.profiles(tetris_wins DESC);
