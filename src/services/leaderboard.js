/**
 * leaderboard.js
 * Consultas para todas las pestañas del leaderboard.
 */
import { supabase } from '../supabaseClient';

/** Tab 1: Ranking de puntajes por juego (existente, sin cambios) */
export async function getGameLeaderboard(gameId, limit = 50) {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_game_id: gameId,
    p_limit:   limit,
  });
  if (error) throw error;
  return data;
}

/** Tab 1b: Leaderboard global (suma de mejores puntajes) */
export async function getGlobalGameLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_global_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}

/** Tab 2: Top más ricos (balance actual) */
export async function getWealthLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_wealth_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}

/** Tab 3: Mayor crecimiento semanal */
export async function getWeeklyGrowthLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_weekly_growth_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}

/** Tab 4: Más generosos (donaciones al fondo) */
export async function getGenerosityLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_generosity_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}

/** Tab 5: Más logros desbloqueados */
export async function getAchievementLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_achievement_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}
