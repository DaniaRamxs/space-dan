import { useSpacelyGame } from '../hooks/useSpacelyGame'

/**
 * Hook de "core" para juegos arcade (stub/compatibilidad).
 * Conecta el motor del juego con el flujo general de `useSpacelyGame`.
 */
export function useGameCore(engine, coreConfig = {}) {
  const {
    gameId,
    gameType,
    aiLevel = 'hard',
    hasTimer = true,
  } = coreConfig

  const players = [
    { id: 'P1', isAI: false, name: 'Player' },
    { id: 'P2', isAI: true, name: 'AI' },
  ]

  const timerConfig = {
    softLimit: 5000,
    hardLimit: 15000,
    tickInterval: 100,
    autoStart: !!hasTimer,
  }

  const game = useSpacelyGame(engine, {
    gameId,
    gameType,
    players,
    aiLevel,
    timerConfig,
  })

  return {
    state: game.engineState,
    status: game.status,
    currentPlayer: game.activePlayer?.id,
    winner: game.context.winner,
    winningCells: game.engineState?.winningCells ?? [],
    makeMove: game.makeMove,
    resetGame: game.resetGame,
  }
}

