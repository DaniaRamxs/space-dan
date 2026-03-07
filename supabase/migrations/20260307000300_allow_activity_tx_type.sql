-- 20260307000300_allow_activity_tx_type.sql
-- Add 'activity' and 'reactor_injection' to the transactions table check constraint

-- Rename the old constraint if it exists to be safe or just drop it
-- In Supabase/PostgreSQL, we can DROP and ADD

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check CHECK (type IN (
  'achievement', 'daily_bonus', 'game_reward', 'page_visit',
  'purchase', 'transfer_in', 'transfer_out', 'transfer_fee',
  'community_donation', 'community_reward',
  'admin_grant', 'admin_deduct', 'migration',
  'work_bonus', 'market_crash', 'boss_reward', 'stellar_impulse',
  'investment_profit', 'investment_loss', 'insurance_claim',
  'blackjack_win', 'blackjack_loss', 'bet_win', 'bet_loss',
  'slots_win', 'slots_loss', 'rob_success', 'rob_penalty',
  'duel_win', 'duel_loss', 'game_loss', 'casino_bet', 'casino_win',
  'activity', 'reactor_injection'
));
