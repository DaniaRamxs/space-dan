const ROWS = 6
const COLS = 7

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS
}

function getDropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r
  }
  return -1
}

function findWinningCells(board, player, lastR, lastC) {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diag down-right
    [-1, 1], // diag up-right
  ]

  for (const [dr, dc] of directions) {
    const line = []

    // Backward until it stops
    let r = lastR
    let c = lastC
    while (inBounds(r, c) && board[r][c] === player) {
      r -= dr
      c -= dc
    }
    r += dr
    c += dc

    // Forward collecting consecutive cells
    while (inBounds(r, c) && board[r][c] === player) {
      line.push({ r, c })
      r += dr
      c += dc
    }

    if (line.length < 4) continue

    const idx = line.findIndex((p) => p.r === lastR && p.c === lastC)
    if (idx === -1) continue

    const start = Math.max(0, idx - 3)
    const window = line.slice(start, start + 4)
    if (window.length === 4) return window
  }

  return []
}

function computeDraw(board) {
  return board.every((row) => row.every((cell) => cell !== null))
}

export const connect4Engine = {
  initialState: {
    board: createEmptyBoard(),
    currentPlayer: 'P1',
    lastMove: null, // { r, c, player }
    winningCells: [],
  },

  validateMove(state, col) {
    const c = Number(col)
    if (!Number.isInteger(c) || c < 0 || c >= COLS) return false
    if (!state?.board) return false
    // Column full
    return state.board[0]?.[c] === null
  },

  applyMove(state, col) {
    const c = Number(col)
    if (!this.validateMove(state, c)) return state

    const board = state.board.map((row) => row.slice())
    const r = getDropRow(board, c)
    if (r < 0) return state

    const placedBy = state.currentPlayer
    board[r][c] = placedBy

    const winningCells = findWinningCells(board, placedBy, r, c)
    const nextPlayer = placedBy === 'P1' ? 'P2' : 'P1'

    return {
      ...state,
      board,
      currentPlayer: nextPlayer,
      lastMove: { r, c, player: placedBy },
      winningCells,
    }
  },

  checkStatus(state) {
    const { lastMove, winningCells } = state

    if (winningCells && winningCells.length > 0 && lastMove?.player) {
      return { isFinished: true, winner: lastMove.player, winningCells }
    }

    if (computeDraw(state.board)) {
      return { isFinished: true, winner: 'draw', winningCells: [] }
    }

    return { isFinished: false, winner: null, winningCells: [] }
  },

  reset() {
    return {
      board: createEmptyBoard(),
      currentPlayer: 'P1',
      lastMove: null,
      winningCells: [],
    }
  },
}

