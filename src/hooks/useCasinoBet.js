import { useState, useCallback } from 'react';
import { useEconomy } from '../contexts/EconomyContext';
import { useAuthContext } from '../contexts/AuthContext';
import {
  saveCasinoResult,
  contributeJackpot,
  getWinStreak,
  incrementStreak,
  resetStreak,
} from '../services/casino';

const STREAK_BONUS_COINS = 10;
const STREAK_THRESHOLD = 3;

/**
 * Hook compartido para juegos de Casino.
 * Fases: 'betting' | 'playing' | 'result'
 * Incluye: jackpot progresivo, racha de victorias, guardado en casino_results.
 */
export function useCasinoBet(gameId, gameTitle) {
  const { balance, awardCoins, deductCoins } = useEconomy();
  const { user, profile } = useAuthContext();

  const [phase, setPhase] = useState('betting');
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const isVIP = balance >= 500;

  const placeBet = useCallback(async () => {
    if (bet <= 0 || bet > balance || isLoading) return false;
    setIsLoading(true);

    if (user) {
      const res = await deductCoins(bet, 'casino_bet', `Casino: ${gameId}`);
      if (!res?.success) {
        setIsLoading(false);
        return false;
      }
    }

    // Jackpot contribution (1%)
    contributeJackpot(Math.max(1, Math.ceil(bet * 0.01))).catch(() => {});

    setIsLoading(false);
    setPhase('playing');
    return true;
  }, [bet, balance, isLoading, user, deductCoins, gameId]);

  /**
   * Termina el juego.
   * @param {number} multiplier - 0 = pérdida, >0 = ganancia (ej: 2 = doble apuesta)
   * @param {string} [message]
   */
  const finishGame = useCallback(async (multiplier, message = '') => {
    setIsLoading(true);
    const won = multiplier > 0;
    const winAmount = won ? Math.floor(bet * multiplier) : 0;
    const net = winAmount - bet; // negativo si pierde
    let streakBonusAwarded = false;

    if (user && won && winAmount > 0) {
      await awardCoins(winAmount, 'game_reward', gameId, `Casino win: ${gameId}`);
    }

    if (user) {
      if (won) {
        const newStreak = incrementStreak();
        if (newStreak >= STREAK_THRESHOLD) {
          resetStreak();
          awardCoins(STREAK_BONUS_COINS, 'game_reward', gameId, '🔥 Racha de 3 victorias!').catch(() => {});
          streakBonusAwarded = true;
        }
      } else {
        resetStreak();
      }

      saveCasinoResult({
        userId: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'Explorador',
        gameId,
        gameName: gameTitle,
        betAmount: bet,
        resultAmount: winAmount,
        profit: net,
      }).catch(() => {});
    }

    setResult({ won, net, winAmount, message, streakBonusAwarded, currentStreak: getWinStreak() });
    setPhase('result');
    setIsLoading(false);
  }, [bet, gameId, gameTitle, user, profile, awardCoins]);

  const reset = useCallback(() => {
    setPhase('betting');
    setResult(null);
  }, []);

  return { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading, isVIP };
}
