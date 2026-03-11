// src/engine/tictactoeEngine.js
// Implementación pura del motor de TicTacToe

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const initialState = {
    board: Array(9).fill(null),
    turn: 'X',
    moveCount: 0
};

export function reset() {
    return {
        board: Array(9).fill(null),
        turn: 'X',
        moveCount: 0
    };
}

export function validateMove(state, position) {
    if (position < 0 || position > 8) return false;
    return state.board[position] === null;
}

export function getPossibleMoves(state) {
    return state.board.map((val, idx) => (val === null ? idx : null)).filter(v => v !== null);
}

export function applyMove(state, position) {
    if (!validateMove(state, position)) {
        throw new Error(`Invalid move at position ${position}`);
    }

    const newBoard = [...state.board];
    newBoard[position] = state.turn;

    return {
        board: newBoard,
        turn: state.turn === 'X' ? 'O' : 'X',
        moveCount: state.moveCount + 1,
        lastMove: { position, player: state.turn }
    };
}

export function checkWinner(state) {
    for (const [a, b, c] of WIN_LINES) {
        if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
            return state.board[a];
        }
    }
    if (state.moveCount === 9) return 'draw';
    return null;
}

export const tictactoeEngine = {
    initialState,
    reset,
    validateMove,
    getPossibleMoves,
    applyMove,
    checkWinner,
    checkStatus: (state) => {
        const winner = checkWinner(state);
        return {
            isFinished: winner !== null,
            winner: winner
        };
    }
};
