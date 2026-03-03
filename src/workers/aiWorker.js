/* eslint-disable no-restricted-globals */
import { calculateConnect4Move } from '../engine/connect4Minimax.js';
import { calculateTicTacToeMove } from '../engine/tictactoeMinimax.js';

// Módulo: AI Execution Layer (Web Worker Despachador)
// Implementado en Modo Contingencia por Ingeniero IA

/**
 * AI Worker Centralizado
 * Responsabilidad: Analizar peticiones asíncronas de IAs y llamar a los 
 * analizadores Minimax de los distintos GameEngines.
 */

self.onmessage = async function (e) {
    const { type, payload, messageId } = e.data;

    try {
        if (type === 'CALCULATE_MOVE') {
            const {
                gameType,
                engineState,
                isFastMode
            } = payload;

            let move = null;

            // Creamos un AbortSignal ficticio para pasarle a la función
            // dado que el worker se matará en caso de cancelarse (vía worker.terminate).
            // Aún así proveemos interfaz standard. Este booleano simula una señal.
            const signalSimulada = { aborted: false };

            if (gameType === 'connect4') {
                move = await calculateConnect4Move(engineState, isFastMode, signalSimulada);
            } else if (gameType === 'tictactoe') {
                move = await calculateTicTacToeMove(engineState, isFastMode, signalSimulada);
            } else {
                throw new Error('Juego no soportado por IA');
            }

            self.postMessage({
                type: 'CALCULATE_MOVE_SUCCESS',
                messageId,
                move
            });
        }
    } catch (error) {
        self.postMessage({
            type: 'CALCULATE_MOVE_ERROR',
            messageId,
            error: error.message || 'Error crítico en algoritmo IA'
        });
    }
};
