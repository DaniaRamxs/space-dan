// Web Worker para decisiones IA (stub).
// Implementa un cálculo determinista "primer movimiento legal" para
// permitir compilación y ejecución inicial.

/* eslint-disable no-restricted-globals */

function firstLegalTicTacToeMove(engineState) {
  const board = engineState?.board
  if (!Array.isArray(board)) return null
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) return i
  }
  return null
}

function firstLegalConnect4Move(engineState) {
  const board = engineState?.board
  if (!Array.isArray(board) || board.length === 0) return null

  const rows = board.length
  const cols = Array.isArray(board[0]) ? board[0].length : 0
  if (cols <= 0) return null

  // Validación mínima: la columna no debe estar llena
  for (let c = 0; c < cols; c++) {
    if (board[0]?.[c] === null) return c
  }
  // Si todo está lleno, no hay movimiento
  if (rows > 0 && cols > 0) return 0
  return null
}

self.onmessage = (event) => {
  try {
    const data = event?.data || {}
    if (data.type !== 'CALCULATE_MOVE') return

    const { gameType, engineState } = data.payload || {}

    let move = null
    if (gameType === 'tictactoe') {
      move = firstLegalTicTacToeMove(engineState)
    } else if (gameType === 'connect4') {
      move = firstLegalConnect4Move(engineState)
    }

    if (move === null || move === undefined) {
      self.postMessage({
        type: 'CALCULATE_MOVE_ERROR',
        error: 'NO_LEGAL_MOVE'
      })
      return
    }

    self.postMessage({
      type: 'CALCULATE_MOVE_SUCCESS',
      move
    })
  } catch (err) {
    self.postMessage({
      type: 'CALCULATE_MOVE_ERROR',
      error: err?.message ? String(err.message) : 'AI_WORKER_ERROR'
    })
  }
}

