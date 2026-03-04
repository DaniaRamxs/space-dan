import { useState, useCallback } from 'react';
import { useEconomy } from '../contexts/EconomyContext';

/**
 * Hook compartido para lógica de apuestas en juegos de Casino.
 * Maneja fases: 'betting' | 'playing' | 'result'
 */
export function useCasinoBet(gameId, gameTitle) {
  const { balance, awardCoins, deductCoins } = useEconomy();
  const [phase, setPhase] = useState('betting');
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const placeBet = useCallback(async () => {
    if (bet <= 0 || bet > balance || isLoading) return false;
    setIsLoading(true);
    try {
      const res = await deductCoins(bet, 'casino_bet', `Casino: ${gameTitle}`);
      if (res?.success === false) return false;
      setPhase('playing');
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [bet, balance, isLoading, deductCoins, gameTitle]);

  /**
   * Termina el juego.
   * @param {number} multiplier - 0 = pérdida, >0 = ganancia (ej: 2 = doble apuesta)
   * @param {string} [message] - Mensaje descriptivo del resultado
   */
  const finishGame = useCallback(async (multiplier, message = '') => {
    let net = -bet;
    if (multiplier > 0) {
      const winAmount = Math.floor(bet * multiplier);
      await awardCoins(winAmount, 'game_reward', gameId, `Casino win: ${gameTitle}`);
      net = winAmount - bet;
      setResult({ won: true, net, winAmount, message });
    } else {
      setResult({ won: false, net, winAmount: 0, message });
    }
    setPhase('result');
  }, [bet, awardCoins, gameId, gameTitle]);

  const reset = useCallback(() => {
    setPhase('betting');
    setResult(null);
  }, []);

  return { phase, bet, setBet, balance, placeBet, finishGame, reset, result, isLoading };
}
