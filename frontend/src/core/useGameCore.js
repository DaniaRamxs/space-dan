import { useEffect, useCallback, useMemo } from 'react';
import { useGameState } from '../hooks/useGameState';
import { useTurnTimer } from '../hooks/useTurnTimer';
import { useAIWorker } from '../hooks/useAIWorker';
import { useAIOrchestrator } from '../hooks/useAIOrchestrator';

// Módulo 6: Game Core Unificado (API Canónica Spacely)
// Implementado en Modo Contingencia por Ingeniero IA

/**
 * Hook centralizado que unifica FSM, Timer, IA Exec y Orchestrator
 * bajo una API limpia y predecible.
 * 
 * @param {object} engine - El motor puro del juego (ej: tictactoeEngine)
 * @param {object} config - Opciones de configuración
 * @param {string} config.gameId - ID único de la partida
 * @param {string} config.gameType - Tipo de juego ('tictactoe', 'connect4')
 * @param {boolean} config.hasAI - Indica si se jugará contra la IA
 * @param {boolean} config.hasTimer - Activa y exige el uso del TimerManager
 * @param {string} config.aiLevel - Dificultad IA ('easy', 'hard') -> 'fastMode'
 * @param {string} config.mode - Modo de juego ('single', 'multiplayer' local)
 */
export function useGameCore(engine, config) {
    const {
        gameId = 'spacely-game',
        gameType,
        hasAI = true,
        hasTimer = true,
        aiLevel = 'hard',
        mode = 'single'
    } = config;

    // 1. Configuración dinámica de Jugadores basada en config
    const players = useMemo(() => {
        return [
            { id: 'P1', isAI: false, name: 'Jugador 1' },
            { id: 'P2', isAI: hasAI && mode === 'single', name: hasAI ? 'Spacely AI' : 'Jugador 2' }
        ];
    }, [hasAI, mode]);

    // 2. StateManager (FSM)
    const { status, context, transitionTo, updateContext } = useGameState({
        gameId,
        players,
        currentTurn: players[0],
        scores: {},
        metadata: {
            engineState: engine.initialState,
        }
    });

    const activePlayer = context.players.find(p => p.id === context.currentTurn.id) || context.players[0];

    // 3. TimerManager (Condicional, aunque inyectado para cumplir reglas de hooks)
    const timerConfig = useMemo(() => ({
        softLimit: aiLevel === 'easy' ? 2000 : 5000,
        hardLimit: 15000,
        tickInterval: 100,
        autoStart: false
    }), [aiLevel]);

    const { state: timerState, start: startTimer, pause: pauseTimer, resume: resumeTimer, reset: resetTimer } = useTurnTimer(timerConfig);

    // Mapear eventos FSM al Timer si aplica
    useEffect(() => {
        if (!hasTimer) return;
        const handlePauseReq = () => pauseTimer();
        window.addEventListener('dan:state-manager-requires-timer-pause', handlePauseReq);
        return () => window.removeEventListener('dan:state-manager-requires-timer-pause', handlePauseReq);
    }, [hasTimer, pauseTimer]);

    // 4. AI Worker (Condicional interno en el Hook)
    const workerAdapter = useAIWorker(gameType, context.metadata.engineState);

    // Wrapper condicional para el calculateMove
    const calculateMove = useCallback(async (params) => {
        if (!hasAI || activePlayer.id === 'P1') return null;

        // Convertir aiLevel a los isFastMode que entiende el engine (ej. min max depth)
        const isFastMode = aiLevel === 'easy';
        return workerAdapter.calculateMove({ ...params, isFastMode });
    }, [hasAI, activePlayer.id, aiLevel, workerAdapter]);

    // 5. Aplicador de movimientos puenteado con el Engine Puro
    const makeMove = useCallback((moveParam) => {
        if (status !== 'PLAYING') return;

        const engineState = context.metadata.engineState;
        const rawMove = moveParam?.hasOwnProperty('move') ? moveParam.move : moveParam;

        if (engine.validateMove(engineState, rawMove)) {
            const newState = engine.applyMove(engineState, rawMove);
            const result = engine.checkStatus(newState); // Devuelve { isFinished, winner }

            if (result.isFinished) {
                // Partida Finalizada
                updateContext({
                    metadata: {
                        engineState: newState,
                        winningCells: result.winningCells
                    },
                    winner: result.winner
                });
                transitionTo('FINISHED');
                if (hasTimer) pauseTimer();
            } else {
                // Rotación de Turno
                const currentIdx = context.players.findIndex(p => p.id === context.currentTurn.id);
                const nextPlayer = context.players[(currentIdx + 1) % context.players.length];

                updateContext({
                    currentTurn: nextPlayer,
                    metadata: { engineState: newState }
                });

                if (hasTimer) {
                    resetTimer();
                    startTimer();
                }
            }
        }
    }, [engine, context, status, updateContext, transitionTo, hasTimer, pauseTimer, resetTimer, startTimer]);

    // 6. AI Orchestrator
    const orchestrator = useAIOrchestrator({
        status,
        currentPlayer: activePlayer,
        calculateMove,
        makeMove,
        // Podría deshabilitarse la auto resolve asíncrona enviando dummies si !hasAI
    });

    // 7. Acciones de HUD
    const resetGame = useCallback((newConfig = {}) => {
        updateContext({
            currentTurn: players[0],
            players: players,
            metadata: { engineState: engine.reset() },
            winner: null
        });

        if (hasTimer) {
            resetTimer();
            startTimer();
        }
        transitionTo('PLAYING');
    }, [engine, updateContext, players, hasTimer, resetTimer, startTimer, transitionTo]);

    const startGame = useCallback(() => {
        transitionTo('PLAYING');
        if (hasTimer) startTimer();
    }, [transitionTo, hasTimer, startTimer]);

    const pauseGame = useCallback(() => {
        if (status === 'PLAYING') {
            transitionTo('PAUSED');
            if (hasTimer) pauseTimer();
        }
    }, [status, transitionTo, hasTimer, pauseTimer]);

    const resumeGame = useCallback(() => {
        if (status === 'PAUSED') {
            transitionTo('PLAYING');
            if (hasTimer) resumeTimer();
        }
    }, [status, transitionTo, hasTimer, resumeTimer]);

    // Inicio automático en montaje inicial
    useEffect(() => {
        if (status === 'IDLE') {
            startGame();
        }
    }, [status, startGame]);

    // 8. API Exportada estrictamente formateada al Request del Usuario
    return {
        state: context.metadata.engineState,            // Estado del tablero/motor
        status: status,                                 // FSM IDLE/PLAYING/FINISHED
        currentPlayer: context.currentTurn.id,          // 'P1' o 'P2' (ó 'X' / 'O' si el engine lo transfiere y envuelve)
        makeMove: makeMove,                             // Dispachador del input usuario
        resetGame: resetGame,                           // Reinicio
        pauseGame: pauseGame,
        resumeGame: resumeGame,
        isThinking: orchestrator.isCalculating || false,// Módulo 3 state
        timeLeft: hasTimer ? timerState.remainingHard : null, // Módulo 1 state
        winner: context.winner || null,                 // FSM metadata
        winningCells: context.metadata.winningCells || null // Spacely Addition
    };
}
