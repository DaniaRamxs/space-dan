/* eslint-disable no-plusplus */

// Módulo 4: Game Engine (Connect 4 v2)
// Implementado en Modo Contingencia por Ingeniero IA

/**
 * Motor puro para Connect 4.
 * Agnístico a React, UI, temporizadores o flujos asíncronos.
 * Cumple con inmutabilidad estricta.
 */

const ROWS = 6;
const COLS = 7;

function createEmptyBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

const initialState = {
    board: createEmptyBoard(),
    turn: 'P1', // 'P1' (Jugador) o 'P2' (IA/Jugador 2)
    moveCount: 0
};

export function reset() {
    return {
        board: createEmptyBoard(),
        turn: 'P1',
        moveCount: 0
    };
}

/**
 * Valida si se puede soltar una ficha en la columna solicitada.
 * @param {object} state - Estado puro
 * @param {number} column - Columna (0-6)
 * @returns {boolean}
 */
export function validateMove(state, column) {
    if (column < 0 || column >= COLS) return false;
    // Solo es válido si la celda más alta (fila 0) en esa columna está vacía
    return state.board[0][column] === null;
}

/**
 * Devuelve un array con las columnas válidas donde se puede jugar.
 * @param {object} state 
 * @returns {number[]}
 */
export function getPossibleMoves(state) {
    const moves = [];
    for (let c = 0; c < COLS; c++) {
        if (validateMove(state, c)) {
            moves.push(c);
        }
    }
    return moves;
}

/**
 * Aplica un movimiento de forma inmutable devolviendo un nuevo estado.
 * Simula la gravedad cayendo hasta el espacio libre más bajo.
 * @param {object} state 
 * @param {number} column 
 * @returns {object} Nuevo state
 */
export function applyMove(state, column) {
    if (!validateMove(state, column)) {
        throw new Error(`[Connect4 Engine] Movimiento inválido en la columna ${column}`);
    }

    // Clonación profunda de la matriz del tablero para inmutabilidad estricta
    const newBoard = state.board.map(row => [...row]);

    let dropRow = -1;
    // Aplicamos gravedad revisando desde abajo hacia arriba
    for (let r = ROWS - 1; r >= 0; r--) {
        if (newBoard[r][column] === null) {
            newBoard[r][column] = state.turn;
            dropRow = r;
            break;
        }
    }

    return {
        board: newBoard,
        turn: state.turn === 'P1' ? 'P2' : 'P1',
        moveCount: state.moveCount + 1,
        lastMove: { row: dropRow, col: column, player: state.turn }
    };
}

/**
 * Verifica si hay un ganador o si el tablero está lleno.
 * @param {object} state 
 * @returns {'P1' | 'P2' | 'draw' | null}
 */
export function checkWinner(state) {
    const board = state.board;

    // Verificación horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const p = board[r][c];
            if (p && p === board[r][c + 1] && p === board[r][c + 2] && p === board[r][c + 3]) {
                return p;
            }
        }
    }

    // Verificación vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
            const p = board[r][c];
            if (p && p === board[r + 1][c] && p === board[r + 2][c] && p === board[r + 3][c]) {
                return p;
            }
        }
    }

    // Verificación diagonal (\)
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const p = board[r][c];
            if (p && p === board[r + 1][c + 1] && p === board[r + 2][c + 2] && p === board[r + 3][c + 3]) {
                return p;
            }
        }
    }

    // Verificación diagonal (/)
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 3; c < COLS; c++) {
            const p = board[r][c];
            if (p && p === board[r + 1][c - 1] && p === board[r + 2][c - 2] && p === board[r + 3][c - 3]) {
                return p;
            }
        }
    }

    // Empate garantizado si hemos jugado 42 turnos
    if (state.moveCount >= ROWS * COLS) {
        return 'draw';
    }

    return null;
}

// Interfaz canónica para Spacely Framework GameEngine
export const connect4Engine = {
    initialState,
    reset,
    validateMove,
    getPossibleMoves,
    applyMove,
    checkWinner,
    // Wrapper para cumplir con interface especificada por Arquitecto (`IGameEngine`)
    checkStatus: (state) => {
        const winner = checkWinner(state);
        return {
            isFinished: winner !== null,
            winner: winner
        };
    }
};
