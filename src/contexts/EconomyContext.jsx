/**
 * EconomyContext.jsx
 * Reemplaza useDancoins.js (localStorage).
 * Fuente de verdad: Supabase. El balance siempre viene del servidor.
 *
 * Uso:
 *   const { balance, awardCoins, claimDaily, canClaimDaily } = useEconomy();
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from './AuthContext';
import * as economyService from '../services/economy';

const EconomyContext = createContext(null);

export function EconomyProvider({ children }) {
  const { user } = useAuthContext();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastDailyAt, setLastDailyAt] = useState(null);

  const refreshEconomy = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch balance and last_daily_at (convenience field)
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, last_daily_at')
        .eq('id', user.id)
        .single();

      if (profile) {
        let actualLastDaily = profile.last_daily_at;

        // Fallback to transactions ledger if profile field is out of sync
        if (!actualLastDaily) {
          const { data: tx } = await supabase
            .from('transactions')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('type', 'daily_bonus')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (tx) actualLastDaily = tx.created_at;
        }

        setBalance(profile.balance ?? 0);
        setLastDailyAt(actualLastDaily ?? null);
      }
    } catch (err) {
      console.error('[EconomyContext] refresh error:', err);
    }
  }, [user]);

  // ── Cargar balance y migrar coins viejos al iniciar sesión ──
  useEffect(() => {
    if (!user) { setBalance(0); setLastDailyAt(null); return; }

    async function init() {
      setLoading(true);
      await economyService.migrateLegacyCoins(user.id).catch(() => { });
      await refreshEconomy();
      setLoading(false);
    }

    init();
  }, [user?.id, refreshEconomy]);

  // ── Suscripción realtime a cambios de balance en profiles ──
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`economy_profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.balance !== undefined) {
            setBalance(payload.new.balance);
          }
          if (payload.new?.last_daily_at !== undefined) {
            setLastDailyAt(payload.new.last_daily_at);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── API pública ─────────────────────────────────────────────

  /**
   * Premia coins al usuario actual.
   * type: 'achievement' | 'game_reward' | 'page_visit'
   */
  const awardCoins = useCallback(async (amount, type = 'game_reward', reference = null, description = null) => {
    if (!user) return null;
    try {
      const result = await economyService.awardCoins(user.id, amount, type, reference, description);
      if (result?.success) setBalance(result.balance);
      return result;
    } catch (err) {
      console.error('[EconomyContext] awardCoins:', err.message);
      return null;
    }
  }, [user]);

  /** Reclama bonus diario. Lanza error si ya fue reclamado hoy. */
  const claimDaily = useCallback(async () => {
    if (!user) throw new Error('No autenticado');
    try {
      const result = await economyService.claimDailyBonus(user.id);
      if (result?.success) {
        setBalance(result.balance);
        setLastDailyAt(new Date().toISOString());
      }
      return result;
    } catch (err) {
      // Si falla por cooldown, forzamos un refresh para sincronizar el estado
      if (err.message?.includes('reclamaste')) {
        refreshEconomy();
      }
      console.error('[EconomyContext] claimDaily error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      throw err;
    }
  }, [user, refreshEconomy]);

  /** true si el bonus diario está disponible (cooldown 20h) */
  const canClaimDaily = useCallback(() => {
    if (!lastDailyAt) return true;
    return (Date.now() - new Date(lastDailyAt).getTime()) > 20 * 60 * 60 * 1000;
  }, [lastDailyAt]);

  /** Transfiere coins a otro usuario */
  const transfer = useCallback(async (toUserId, amount, message) => {
    if (!user) throw new Error('No autenticado');
    const result = await economyService.transferCoins(user.id, toUserId, amount, message);
    if (result?.success) setBalance(result.from_balance);
    return result;
  }, [user]);

  const value = {
    balance,
    loading,
    awardCoins,
    claimDaily,
    canClaimDaily,
    transfer,
    // Alias para compatibilidad con código existente que usa useDancoins
    coins: balance,
  };

  return (
    <EconomyContext.Provider value={value}>
      {children}
    </EconomyContext.Provider>
  );
}

export function useEconomy() {
  const ctx = useContext(EconomyContext);
  if (!ctx) throw new Error('useEconomy debe usarse dentro de EconomyProvider');
  return ctx;
}
