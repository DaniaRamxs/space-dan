import { useState, useEffect, useCallback } from 'react';

const COINS_KEY  = 'space-dan-coins';
const DAILY_KEY  = 'space-dan-daily-bonus';
const PAGES_KEY  = 'space-dan-visited-pages';

function loadCoins() {
  try { return parseInt(localStorage.getItem(COINS_KEY) || '0', 10); }
  catch { return 0; }
}

function saveCoins(n) {
  try { localStorage.setItem(COINS_KEY, String(n)); } catch {}
}

/** Earn coins from anywhere (fires event so all useDancoins instances sync) */
export function awardCoins(amount) {
  // Persist directly
  try {
    const current = parseInt(localStorage.getItem(COINS_KEY) || '0', 10);
    saveCoins(current + amount);
  } catch {}
  window.dispatchEvent(new CustomEvent('dan:coins-changed'));
}

/** Track page visits. Coins are awarded via useEconomy().awardCoins in PageTracker. */
export function trackPageVisit(page) {
  try {
    const visited = JSON.parse(localStorage.getItem(PAGES_KEY) || '[]');
    if (!visited.includes(page)) {
      visited.push(page);
      localStorage.setItem(PAGES_KEY, JSON.stringify(visited));
      return { isNew: true, total: visited.length };
    }
    return { isNew: false, total: visited.length };
  } catch { return { isNew: false, total: 0 }; }
}

export function getVisitedPages() {
  try { return JSON.parse(localStorage.getItem(PAGES_KEY) || '[]'); }
  catch { return []; }
}

export default function useDancoins() {
  const [coins, setCoins] = useState(loadCoins);

  // Sync state when coins change from any source
  useEffect(() => {
    const sync = () => setCoins(loadCoins());
    window.addEventListener('dan:coins-changed', sync);
    return () => window.removeEventListener('dan:coins-changed', sync);
  }, []);

  const earn = useCallback((amount) => {
    setCoins(prev => {
      const next = prev + amount;
      saveCoins(next);
      window.dispatchEvent(new CustomEvent('dan:coins-changed'));
      return next;
    });
  }, []);

  const spend = useCallback((amount) => {
    const current = loadCoins();
    if (current < amount) return false;
    const next = current - amount;
    saveCoins(next);
    setCoins(next);
    window.dispatchEvent(new CustomEvent('dan:coins-changed'));
    return true;
  }, []);

  const claimDailyBonus = useCallback(() => {
    try {
      const last = localStorage.getItem(DAILY_KEY);
      const today = new Date().toDateString();
      if (last !== today) {
        localStorage.setItem(DAILY_KEY, today);
        earn(30);
        return true;
      }
    } catch {}
    return false;
  }, [earn]);

  const canClaimDaily = useCallback(() => {
    try { return localStorage.getItem(DAILY_KEY) !== new Date().toDateString(); }
    catch { return false; }
  }, []);

  return { coins, earn, spend, claimDailyBonus, canClaimDaily };
}
