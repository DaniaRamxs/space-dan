import { applyMove, getPossibleMoves, checkWinner } from './tictactoeEngine.js';

/**
 * Inteligencia Artificial para TicTacToe
 * Implementa Minimax agnóstico con Poda Alfa-Beta para resolver el tablero 3x3.
 */

const SCORE_WIN = 10;
const SCORE_LOSE = -10;

export async function calculateTicTacToeMove(state, isFastMode, signal) {
    // En TicTacToe (profundidad máx 9), el cálculo toma fracciones de milisegundo incluso
    // sin limitar profundidad, pero respetaremos la estructura.
    const aiPlayer = state.turn;
    const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';

    let bestMove = -1;
    let bestScore = -Infinity;

    const possibleMoves = getPossibleMoves(state);

    if (possibleMoves.length === 0) return null;
    if (possibleMoves.length === 1) return possibleMoves[0];

    // Shuffle moves to make AI less predictable on same scores
    for (let i = possibleMoves.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possibleMoves[i], possibleMoves[j]] = [possibleMoves[j], possibleMoves[i]];
    }

    // Random randomness in easy mode
    if (isFastMode && Math.random() > 0.6) {
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    for (const move of possibleMoves) {
        if (signal && signal.aborted) {
            throw new DOMException('Aborted by Orchestrator/Worker', 'AbortError');
        }

        const nextState = applyMove(state, move);
        const score = minimax(nextState, 0, false, aiPlayer, humanPlayer, signal);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    // Fallback security
    return bestMove !== -1 ? bestMove : possibleMoves[0];
}

function minimax(state, depth, isMaximizing, aiPlayer, humanPlayer, signal) {
    if (signal && signal.aborted) {
        throw new DOMException('Aborted by Orchestrator', 'AbortError');
    }

    const winner = checkWinner(state);
    if (winner === aiPlayer) return SCORE_WIN - depth;
    if (winner === humanPlayer) return SCORE_LOSE + depth;
    if (winner === 'draw') return 0;

    const possibleMoves = getPossibleMoves(state);

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of possibleMoves) {
            const nextState = applyMove(state, move);
            const evalScore = minimax(nextState, depth + 1, false, aiPlayer, humanPlayer, signal);
            maxEval = Math.max(maxEval, evalScore);
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of possibleMoves) {
            const nextState = applyMove(state, move);
            const evalScore = minimax(nextState, depth + 1, true, aiPlayer, humanPlayer, signal);
            minEval = Math.min(minEval, evalScore);
        }
        return minEval;
    }
}
