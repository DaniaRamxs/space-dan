/**
 * leaderboard.js
 * Consultas para todas las pestañas del leaderboard.
 */
import { supabase } from '../supabaseClient';

/** Utility to enrich leaderboard rows with profile info (nick styles, etc) */
async function enrichProfiles(rows) {
  if (!rows || rows.length === 0) return rows;
  try {
    const ids = rows.map(r => r.user_id || r.id).filter(Boolean);
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, user_level, equipped_nickname_style')
      .in('id', ids);

    if (error || !profiles) {
      console.warn('[Leaderboard] Enrich failed:', error);
      return rows;
    }

    return rows.map(r => {
      const p = profiles.find(pr => pr.id === (r.user_id || r.id));
      if (!p) return r;

      const style = p.equipped_nickname_style || r.nickname_style || r.equipped_nickname_style || r.nicknameStyle;

      return {
        ...p,
        ...r, // Keep original rank/score data on top
        nicknameStyle: style,
        nickname_style: style,
        user_level: p.user_level || r.user_level || 1,
        avatar_url: p.avatar_url || r.avatar_url
      };
    });
  } catch (err) {
    console.error('[Leaderboard] Critical enrich error:', err);
    return rows;
  }
}

/** Tab 1: Ranking de puntajes por juego (existente, sin cambios) */
export async function getGameLeaderboard(gameId, limit = 50) {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_game_id: gameId,
    p_limit: limit,
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
  return await enrichProfiles(data);
}

/** Tab 2: Top más ricos (balance actual) */
export async function getWealthLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_wealth_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return await enrichProfiles(data);
}

/** Tab 3: Mayor crecimiento semanal */
export async function getWeeklyGrowthLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_weekly_growth_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return await enrichProfiles(data);
}

/** Tab 4: Más generosos (donaciones al fondo) */
export async function getGenerosityLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_generosity_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return await enrichProfiles(data);
}

/** Tab 5: Más logros desbloqueados */
export async function getAchievementLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_achievement_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return await enrichProfiles(data);
}

/** Tab 6: Más enfocados (Cabina Espacial) */
export async function getFocusLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_focus_leaderboard', {
    p_limit: limit,
  });
  if (error) throw error;
  return await enrichProfiles(data);
}

/** Tab 7: Competitive Season Leaderboard (New) */
export async function getCompetitiveLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_competitive_leaderboard', {
    p_limit: limit
  });

  if (error) throw error;
  const enriched = await enrichProfiles(data || []);
  return enriched.map((d) => ({
    ...d,
    user_id: d.id,
    metric: d.season_balance
  }));
}

/** Tab 8: Streak Leaderboard (Racha Estelar) */
export async function getStreakLeaderboard(limit = 50) {
  const { data, error } = await supabase.rpc('get_streak_leaderboard', {
    p_limit: limit
  });
  if (error) throw error;
  return await enrichProfiles(data || []);
}

/** Tab 9: Miembros (Orden de llegada) */
export async function getMembers(limit = 100) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

