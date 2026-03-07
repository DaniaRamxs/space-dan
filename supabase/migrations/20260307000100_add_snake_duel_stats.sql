-- Add Snake Duel statistics to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS snake_wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS snake_losses INTEGER DEFAULT 0;

-- Optional: Index for potential leaderboard
CREATE INDEX IF NOT EXISTS idx_snake_wins ON public.profiles(snake_wins DESC);
