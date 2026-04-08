/**
 * casino.js — Capa de servicio para Casino de Spacely.
 * Maneja: resultados, leaderboard, jackpot progresivo.
 */
import { supabase } from '../supabaseClient';

// ── Resultados ────────────────────────────────────────────────

export async function saveCasinoResult({ userId, username, gameId, gameName, betAmount, resultAmount, profit }) {
  const { error } = await supabase.from('casino_results').insert({
    user_id: userId,
    username,
    game: gameName,
    game_id: gameId,
    bet_amount: betAmount,
    result_amount: resultAmount,
    profit,
  });
  if (error) console.error('[casino] saveCasinoResult:', error.message);
}

// ── Leaderboard ───────────────────────────────────────────────

/** Top 10 ganadores del día (profit > 0, agrupados por username) */
export async function getTopWinners(limit = 10) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('casino_results')
    .select('username, profit')
    .gte('created_at', today.toISOString())
    .gt('profit', 0);
  if (!data) return [];
  const map = {};
  data.forEach(r => {
    if (!map[r.username]) map[r.username] = { username: r.username, total: 0, wins: 0 };
    map[r.username].total += r.profit;
    map[r.username].wins++;
  });
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, limit);
}

/** Top 10 perdedores del día (profit < 0) */
export async function getTopLosers(limit = 10) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('casino_results')
    .select('username, profit')
    .gte('created_at', today.toISOString())
    .lt('profit', 0);
  if (!data) return [];
  const map = {};
  data.forEach(r => {
    if (!map[r.username]) map[r.username] = { username: r.username, total: 0, losses: 0 };
    map[r.username].total += r.profit;
    map[r.username].losses++;
  });
  return Object.values(map).sort((a, b) => a.total - b.total).slice(0, limit);
}

/** Últimas 25 jugadas (feed en vivo) */
export async function getRecentActivity(limit = 25) {
  const { data } = await supabase
    .from('casino_results')
    .select('username, game, profit, bet_amount, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── Jackpot Progresivo ────────────────────────────────────────

/** Obtiene el jackpot actual */
export async function getJackpot() {
  const { data } = await supabase.from('casino_jackpot').select('amount').eq('id', 1).single();
  return data?.amount ?? 50;
}

/** Suma amount al jackpot (1% de cada apuesta) */
export async function contributeJackpot(amount) {
  const { data } = await supabase.rpc('contribute_jackpot', { p_amount: Math.max(1, amount) });
  return data ?? null;
}

/** Reclama el jackpot y lo resetea a 50 */
export async function claimJackpot() {
  const { data } = await supabase.rpc('claim_jackpot');
  return data ?? 50;
}

// ── Racha (localStorage) ──────────────────────────────────────

const STREAK_KEY = 'casino-win-streak';

export function getWinStreak() {
  return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
}
export function incrementStreak() {
  const n = getWinStreak() + 1;
  localStorage.setItem(STREAK_KEY, String(n));
  return n;
}
export function resetStreak() {
  localStorage.setItem(STREAK_KEY, '0');
}
