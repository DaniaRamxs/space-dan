const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

function resetState() {
  return {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    lastMove: null,
    winningCells: [],
  }
}

function computeWinner(board) {
  for (const [a, b, c] of LINES) {
    const v = board[a]
    if (v !== null && v === board[b] && v === board[c]) {
      return { winner: v, winningCells: [a, b, c] }
    }
  }
  return { winner: null, winningCells: [] }
}

export const tictactoeEngine = {
  initialState: resetState(),

  validateMove(state, move) {
    const idx = Number(move)
    if (!Number.isInteger(idx) || idx < 0 || idx >= 9) return false
    if (!state?.board) return false
    return state.board[idx] === null
  },

  applyMove(state, move) {
    const idx = Number(move)
    if (!this.validateMove(state, idx)) return state

    const board = state.board.slice()
    const placed = state.currentPlayer
    board[idx] = placed

    const nextPlayer = placed === 'X' ? 'O' : 'X'
    const { winningCells } = computeWinner(board)

    return {
      ...state,
      board,
      currentPlayer: nextPlayer,
      lastMove: { idx, player: placed },
      winningCells,
    }
  },

  checkStatus(state) {
    const { winner } = computeWinner(state.board)
    if (winner) {
      return { isFinished: true, winner, winningCells: state.winningCells ?? [] }
    }

    const isDraw = state.board.every((c) => c !== null)
    if (isDraw) return { isFinished: true, winner: 'draw', winningCells: [] }

    return { isFinished: false, winner: null, winningCells: [] }
  },

  reset() {
    return resetState()
  },
}

