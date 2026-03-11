/* eslint-disable no-restricted-globals */

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
            const signalSimulada = { aborted: false };

            // Usamos imports dinámicos para que Vite los gestione como chunks y 
            // podamos capturar errores de carga en producción (Vercel).
            if (gameType === 'connect4') {
                const { calculateConnect4Move } = await import('../engine/connect4Minimax.js');
                move = await calculateConnect4Move(engineState, isFastMode, signalSimulada);
            } else if (gameType === 'tictactoe') {
                const { calculateTicTacToeMove } = await import('../engine/tictactoeMinimax.js');
                move = await calculateTicTacToeMove(engineState, isFastMode, signalSimulada);
            } else {
                throw new Error(`Juego '${gameType}' no soportado por IA`);
            }

            self.postMessage({
                type: 'CALCULATE_MOVE_SUCCESS',
                messageId,
                move
            });
        }
    } catch (error) {
        console.error('[Worker Thread] Error en cálculo:', error);
        self.postMessage({
            type: 'CALCULATE_MOVE_ERROR',
            messageId,
            error: error.message || 'Error crítico en algoritmo IA'
        });
    }
};
