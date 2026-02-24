/**
 * economy.js
 * Capa de servicio para todas las operaciones económicas de Dancoins.
 * TODO el acceso al balance pasa por aquí — NUNCA modificar profiles.balance directamente.
 */
import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────
// BALANCE
// ─────────────────────────────────────────────────────────────

/** Obtiene el balance actual del usuario autenticado */
export async function getBalance(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data.balance;
}

// ─────────────────────────────────────────────────────────────
// GANAR MONEDAS (logros, juegos, visitas)
// ─────────────────────────────────────────────────────────────

/**
 * Premia monedas al usuario.
 * @param {string} userId
 * @param {number} amount
 * @param {'achievement'|'game_reward'|'page_visit'|'daily_bonus'} type
 * @param {string} [reference] - ID del logro, juego, etc.
 * @param {string} [description]
 * @returns {Promise<{success: boolean, balance: number, awarded?: number, reason?: string}>}
 */
export async function awardCoins(userId, amount, type, reference = null, description = null) {
  const { data, error } = await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_reference: reference,
    p_description: description,
    p_metadata: {},
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// DAILY BONUS
// ─────────────────────────────────────────────────────────────

/**
 * Reclama el bonus diario. El servidor valida el cooldown de 20h.
 * Si ya fue reclamado hoy, retorna { success: false, reason: 'cooldown', message }
 * en lugar de tirar excepción.
 * @returns {Promise<{success: boolean, bonus?: number, balance?: number, reason?: string, message?: string}>}
 */
export async function claimDailyBonus(userId) {
  const { data, error } = await supabase.rpc('claim_daily_bonus', {
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message || '';
    // El servidor hace RAISE EXCEPTION con "Ya reclamaste el bonus"
    // Esto llega como un 400 — lo convertimos en resultado, no en excepción
    if (msg.toLowerCase().includes('reclamaste') || msg.toLowerCase().includes('cooldown') || msg.toLowerCase().includes('próximo')) {
      return { success: false, reason: 'cooldown', message: msg };
    }
    // Cualquier otro error sí es un problema real
    console.error('[claimDailyBonus] Server error:', error);
    throw error;
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// TRANSFERENCIAS
// ─────────────────────────────────────────────────────────────

/**
 * Transfiere Dancoins a otro usuario.
 * El servidor aplica comisión (5%), rate limiting y validaciones.
 * @param {string} fromUserId
 * @param {string} toUserId
 * @param {number} amount  (mínimo 10, máximo 500)
 * @param {string} [message]
 * @returns {Promise<{success:boolean, transfer_id:string, fee:number, net_received:number, from_balance:number}>}
 */
export async function transferCoins(fromUserId, toUserId, amount, message = null) {
  const { data, error } = await supabase.rpc('transfer_coins', {
    p_from_user_id: fromUserId,
    p_to_user_id: toUserId,
    p_amount: amount,
    p_message: message,
  });
  if (error) throw error;
  return data;
}

/**
 * Historial de transferencias (enviadas y recibidas)
 */
export async function getTransferHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('transfers')
    .select(`
      id, amount, fee, net_amount, message, status, created_at,
      from_user:profiles!from_user_id(id, username, avatar_url),
      to_user:profiles!to_user_id(id, username, avatar_url)
    `)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// HISTORIAL DE TRANSACCIONES
// ─────────────────────────────────────────────────────────────

/**
 * Historial de transacciones del usuario autenticado (paginado)
 */
export async function getTransactionHistory(userId, limit = 30, offset = 0) {
  const { data, error } = await supabase.rpc('get_transaction_history', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// FONDO COMUNITARIO
// ─────────────────────────────────────────────────────────────

/** Obtiene el estado del fondo comunitario activo */
export async function getActiveFund() {
  const { data, error } = await supabase
    .from('community_fund')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Top donadores del fondo activo */
export async function getFundTopDonors(fundId, limit = 10) {
  const { data, error } = await supabase
    .from('fund_contributions')
    .select(`
      amount,
      user:profiles(id, username, avatar_url)
    `)
    .eq('fund_id', fundId)
    .order('amount', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/**
 * Dona al fondo comunitario
 * @returns {Promise<{success:boolean, donated:number, fund_total:number, goal_reached:boolean, new_balance:number}>}
 */
export async function donateToFund(userId, fundId, amount) {
  const { data, error } = await supabase.rpc('donate_to_fund', {
    p_user_id: userId,
    p_fund_id: fundId,
    p_amount: amount,
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// MIGRACIÓN DESDE LOCALSTORAGE (one-time)
// ─────────────────────────────────────────────────────────────

const MIGRATION_KEY = 'space-dan-economy-migrated';

/**
 * Migra el balance de localStorage a Supabase (solo una vez por usuario).
 * Llamar en EconomyContext cuando el usuario inicia sesión.
 */
export async function migrateLegacyCoins(userId) {
  // Si ya migrado en este browser, no repetir
  if (localStorage.getItem(MIGRATION_KEY) === userId) return null;

  const localCoins = parseInt(localStorage.getItem('space-dan-coins') || '0', 10);
  if (localCoins <= 0) {
    localStorage.setItem(MIGRATION_KEY, userId);
    return null;
  }

  const { data, error } = await supabase.rpc('migrate_localstorage_coins', {
    p_user_id: userId,
    p_amount: localCoins,
  });

  if (!error && data?.success) {
    // Limpiar localStorage tras migración exitosa
    localStorage.removeItem('space-dan-coins');
    localStorage.removeItem('space-dan-daily-bonus');
    localStorage.setItem(MIGRATION_KEY, userId);
    return data;
  }

  // Si ya migrado en el servidor (repeated call), también marcamos en browser
  if (error?.message?.includes('Ya realizaste la migración')) {
    localStorage.setItem(MIGRATION_KEY, userId);
  }

  return null;
}
