import { useEffect, useCallback } from 'react';
import { useGameState } from './useGameState';
import { useTurnTimer } from './useTurnTimer';
import { useAIWorker } from './useAIWorker';
import { useAIOrchestrator } from './useAIOrchestrator';

// Módulo 5: Capa de Integración / Game Flow
// Implementado en Modo Contingencia por Ingeniero IA

/**
 * Hub centralizado para unificar FSM, Timer, IA Exec y Orchestrator.
 * Expone un manejador agnístico listo para ser consumido por la UI.
 */
export function useSpacelyGame(engine, config) {
    const {
        gameId,
        gameType,
        players,
        aiLevel = 'hard', // Default pro mode
        timerConfig = { softLimit: 5000, hardLimit: 15000, tickInterval: 100, autoStart: false }
    } = config;

    // 1. Iniciar FSM StateManager
    const { status, context, transitionTo, updateContext } = useGameState({
        gameId,
        players,
        currentTurn: players[0], // Objeto {id, isAI}
        scores: {},
        metadata: {
            engineState: engine.initialState,
        }
    });

    // 2. Iniciar TimerManager
    const { state: timerState, start: startTimer, pause: pauseTimer, resume: resumeTimer, reset: resetTimer } = useTurnTimer(timerConfig);

    // Auto-pausar timer según FSM
    useEffect(() => {
        const handlePauseReq = () => pauseTimer();
        window.addEventListener('dan:state-manager-requires-timer-pause', handlePauseReq);
        return () => window.removeEventListener('dan:state-manager-requires-timer-pause', handlePauseReq);
    }, [pauseTimer]);

    // 3. Obtener currentPlayer del contexto
    const activePlayer = context.players.find(p => p.id === context.currentTurn.id) || context.players[0];

    // 4. Integrar AI Worker
    const { calculateMove: rawCalculateMove } = useAIWorker(gameType, context.metadata.engineState);

    // Wrap calculateMove to inject aiLevel -> isFastMode
    const calculateMove = useCallback((params) => {
        return rawCalculateMove({ ...params, isFastMode: aiLevel === 'easy' });
    }, [rawCalculateMove, aiLevel]);

    // 5. Función proxy purificada para efectuar movimientos
    const makeMove = useCallback((moveParam) => {
        if (status !== 'PLAYING') return;

        const engineState = context.metadata.engineState;
        const rawMove = moveParam?.hasOwnProperty('move') ? moveParam.move : moveParam; // Adaptador payload worker

        if (engine.validateMove(engineState, rawMove)) {
            const newState = engine.applyMove(engineState, rawMove);
            const result = engine.checkStatus(newState);

            if (result.isFinished) {
                updateContext({
                    metadata: { engineState: newState },
                    winner: result.winner
                });
                transitionTo('FINISHED');
                pauseTimer(); // Detener reloj inmediatamente
            } else {
                // Turno del siguiente
                const currentIdx = context.players.findIndex(p => p.id === context.currentTurn.id);
                const nextPlayer = context.players[(currentIdx + 1) % context.players.length];

                updateContext({
                    currentTurn: nextPlayer,
                    metadata: { engineState: newState }
                });

                // Reiniciar y arrancar reloj para el otro
                resetTimer();
                startTimer();
            }
        }
    }, [engine, context, status, updateContext, transitionTo, pauseTimer, resetTimer, startTimer]);

    // 6. Integrar AI Orchestrator (Inyecta automáticamente los ticks al engine)
    useAIOrchestrator({
        status,
        currentPlayer: activePlayer,
        calculateMove,
        makeMove
    });

    // Helpers de control HUD exportados para los componentes UI
    const startGame = useCallback(() => {
        transitionTo('PLAYING');
        startTimer();
    }, [transitionTo, startTimer]);

    const togglePause = useCallback(() => {
        if (status === 'PLAYING') {
            transitionTo('PAUSED');
        } else if (status === 'PAUSED') {
            transitionTo('PLAYING');
            resumeTimer();
        }
    }, [status, transitionTo, resumeTimer]);

    const resetGame = useCallback((newPlayersConfig) => {
        const targetPlayers = newPlayersConfig || context.players;
        updateContext({
            currentTurn: targetPlayers[0],
            players: targetPlayers,
            metadata: { engineState: engine.reset() },
            winner: null
        });

        resetTimer();
        transitionTo('PLAYING');
        startTimer();
    }, [engine, updateContext, context.players, resetTimer, transitionTo, startTimer]);

    // Arreglar bug: El juego debe pasar de IDLE a PLAYING al montar
    useEffect(() => {
        if (status === 'IDLE') {
            startGame();
        }
    }, [status, startGame]);

    return {
        status,
        context,
        engineState: context.metadata.engineState,
        timerState,
        activePlayer,
        makeMove,
        startGame,
        togglePause,
        resetGame
    };
}
