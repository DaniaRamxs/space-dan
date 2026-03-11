import { applyMove, getPossibleMoves, checkWinner } from './connect4Engine.js';

/**
 * Inteligencia Artificial para Connect 4
 * Implementa Minimax con Poda Alfa-Beta y Heurística de Posicionamiento.
 */

const ROWS = 6;
const COLS = 7;

const SCORE_WIN = 1000000;
const SCORE_LOSE = -1000000;

/**
 * Función principal para invocar a la IA externa/Worker.
 * @param {object} state - Estado puro de connect4Engine
 * @param {boolean} isFastMode - Rápido (Soft Timeout) = Profundidad reducida
 * @param {AbortSignal} signal - Señal de AbortController inyectada
 * @returns {number} La columna elegida
 */
export async function calculateConnect4Move(state, isFastMode, signal) {
    // Ajuste de profundidad para móviles: rápida (2 niveles), normal (5 niveles)
    const maxDepth = isFastMode ? 2 : 5;
    const aiPlayer = state.turn;
    const humanPlayer = aiPlayer === 'P1' ? 'P2' : 'P1';

    let bestMove = -1;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const possibleMoves = getPossibleMoves(state);

    if (possibleMoves.length === 0) return null;
    if (possibleMoves.length === 1) return possibleMoves[0];

    // Optimización Alfa-Beta: Analizar primero el centro para maximizar la poda
    const centerCol = Math.floor(COLS / 2);
    possibleMoves.sort((a, b) => Math.abs(a - centerCol) - Math.abs(b - centerCol));

    for (const move of possibleMoves) {
        // 1. Corte inmediato si Orchestrator lo demanda
        if (signal && signal.aborted) {
            throw new DOMException('Aborted by Orchestrator/Worker', 'AbortError');
        }

        // Generar el nodo hijo y evaluar
        const nextState = applyMove(state, move);
        const score = minimax(nextState, maxDepth - 1, alpha, beta, false, aiPlayer, humanPlayer, signal);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
    }

    // Fallback de seguridad, preferir el centro o el primer movimiento legal
    return bestMove !== -1 ? bestMove : possibleMoves[0];
}

/**
 * Algoritmo recursivo Minimax con Alfa-Beta Pruning.
 * Sincrónico internamente, pero lanza excepciones en caso de que detectemos 'abort'.
 */
function minimax(state, depth, alpha, beta, isMaximizing, aiPlayer, humanPlayer, signal) {
    // Checks de interrupción
    if (signal && signal.aborted) {
        throw new DOMException('Aborted by Orchestrator', 'AbortError');
    }

    const winnerResult = checkWinner(state);
    const winner = winnerResult.winner;

    // Recompensar victorias rápidas, penalizar derrotas rápidas
    if (winner === aiPlayer) return SCORE_WIN + depth;
    if (winner === humanPlayer) return SCORE_LOSE - depth;
    if (winner === 'draw') return 0;

    if (depth === 0) {
        return evaluateBoard(state, aiPlayer, humanPlayer);
    }

    const possibleMoves = getPossibleMoves(state);
    if (possibleMoves.length === 0) return 0; // Empate teórico

    const centerCol = Math.floor(COLS / 2);
    possibleMoves.sort((a, b) => Math.abs(a - centerCol) - Math.abs(b - centerCol));

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of possibleMoves) {
            const nextState = applyMove(state, move);
            const evalScore = minimax(nextState, depth - 1, alpha, beta, false, aiPlayer, humanPlayer, signal);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break; // Poda Alfa
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of possibleMoves) {
            const nextState = applyMove(state, move);
            const evalScore = minimax(nextState, depth - 1, alpha, beta, true, aiPlayer, humanPlayer, signal);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break; // Poda Beta
        }
        return minEval;
    }
}

/**
 * Evaluación Heurística: Puntúa tableros no terminales.
 * Favorece ocupación central y penaliza fuertemente amenazas de 3 fichas.
 */
function evaluateBoard(state, aiPlayer, humanPlayer) {
    let score = 0;
    const board = state.board;
    const centerCol = Math.floor(COLS / 2);

    // 1. Sobrantes: Favorecer control del centro
    let centerCount = 0;
    for (let r = 0; r < ROWS; r++) {
        if (board[r][centerCol] === aiPlayer) centerCount++;
    }
    score += centerCount * 4; // Peso moderado por dominar la columna 3

    // 2. Extraer ventanas para barrido (Horizontal, Vertical, Diagonales)
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const window = [board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]];
            score += evaluateWindow(window, aiPlayer, humanPlayer);
        }
    }

    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
            const window = [board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]];
            score += evaluateWindow(window, aiPlayer, humanPlayer);
        }
    }

    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const window = [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]];
            score += evaluateWindow(window, aiPlayer, humanPlayer);
        }
    }

    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 3; c < COLS; c++) {
            const window = [board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]];
            score += evaluateWindow(window, aiPlayer, humanPlayer);
        }
    }

    return score;
}

/**
 * Mide el potencial de una ventana de 4 espacios (Horizontal, Vertical o Diagonal)
 */
function evaluateWindow(window, aiPlayer, humanPlayer) {
    let score = 0;
    let aiCount = 0;
    let humanCount = 0;
    let emptyCount = 0;

    for (const cell of window) {
        if (cell === aiPlayer) aiCount++;
        else if (cell === humanPlayer) humanCount++;
        else emptyCount++;
    }

    // Recompensas al construir oportunidades
    if (aiCount === 4) {
        score += 100;
    } else if (aiCount === 3 && emptyCount === 1) {
        score += 5; // A un paso de ganar
    } else if (aiCount === 2 && emptyCount === 2) {
        score += 2; // Construyendo
    }

    // Penalizaciones: Castigo severo por amenazas inminentes del adversario
    if (humanCount === 3 && emptyCount === 1) {
        score -= 80; // Amenaza grave, se debe bloquear
    }

    return score;
}
