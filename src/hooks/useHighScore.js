import { useState, useCallback } from 'react';

const KEY = 'space-dan-scores';

/**
 * Loads all scores from localStorage.
 * @returns {Record<string, number>}
 */
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Persists and retrieves a per-game high score from localStorage.
 *
 * @param {string} gameId - Unique key for this game ('flappy' | 'dino' | 'simon')
 * @returns {[number, (score: number) => boolean]} Tuple of [bestScore, saveScore]
 *   saveScore(n) saves if n > current best and returns true when a new record is set.
 */
export default function useHighScore(gameId) {
  const [best, setBest] = useState(() => load()[gameId] ?? 0);

  const saveScore = useCallback(
    (score) => {
      const n = Math.floor(Number(score));
      const all = load();
      if (n > (all[gameId] ?? 0)) {
        all[gameId] = n;
        try {
          localStorage.setItem(KEY, JSON.stringify(all));
        } catch {
          // localStorage unavailable — silently ignore
        }
        setBest(n);
        return true;
      }
      return false;
    },
    [gameId]
  );

  return [best, saveScore];
}

/**
 * Returns all stored high scores keyed by gameId.
 * @returns {Record<string, number>}
 */
export function getAllScores() {
  return load();
}
