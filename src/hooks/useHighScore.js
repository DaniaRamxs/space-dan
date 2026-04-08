import { useState, useCallback, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserGameRanks } from '../services/supabaseScores';

/**
 * Persists and retrieves a per-game high score.
 * Following the "NADA de guardado local" rule, this now relies exclusively on 
 * in-memory state and optionally syncs with Supabase if the user is authenticated.
 *
 * @param {string} gameId - Unique key for this game
 * @returns {[number, (score: number) => boolean]} Tuple of [bestScore, saveScore]
 */
export default function useHighScore(gameId) {
  const { user } = useAuthContext();
  const [best, setBest] = useState(0);

  // Fetch best score from server if user is logged in
  useEffect(() => {
    if (!user) return;

    let active = true;
    getUserGameRanks(user.id).then(ranks => {
      if (!active) return;
      const myRank = ranks.find(r => r.game_id === gameId);
      if (myRank) setBest(myRank.max_score);
    });

    return () => { active = false; };
  }, [user, gameId]);

  const saveScore = useCallback(
    (score) => {
      const n = Math.floor(Number(score));

      // Update local 'best' in-memory
      if (n > best) {
        setBest(n);
        window.dispatchEvent(new CustomEvent('dan:game-score', {
          detail: { gameId, score: n, isHighScore: true },
        }));
        return true;
      }

      // Fire for non-high-score completions too (for coin rewards)
      if (n > 0) {
        window.dispatchEvent(new CustomEvent('dan:game-score', {
          detail: { gameId, score: n, isHighScore: false },
        }));
      }
      return false;
    },
    [gameId, best]
  );

  return [best, saveScore];
}

/**
 * Returns empty object as local storage is now disabled for scores.
 */
export function getAllScores() {
  return {};
}
