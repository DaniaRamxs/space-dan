import { useEffect, useRef, useCallback } from 'react';

// Módulo 3: AI Orchestrator (Versión 2)
// Implementado en Modo Contingencia por Ingeniero IA

/**
 * Hook `useAIOrchestrator`
 * 
 * Responsabilidad: Invocar la lógica de IA cuando es su turno, respetando timeouts (Soft/Hard) y cambios de estado (FSM).
 * Usa AbortController para cancelar cualquier proceso asíncrono subyacente.
 * 
 * @param {string} status - Estado devuelto por useGameState (IDLE, PLAYING, etc.)
 * @param {object} currentPlayer - Objeto representando al jugador activo { id, isAI }
 * @param {function} calculateMove - Función asíncrona de IA. Recibe { signal, isFastMode }.
 * @param {function} makeMove - Función del GameEngine para efectuar un movimiento validado.
 */
export function useAIOrchestrator({
    status,
    currentPlayer,
    calculateMove,
    makeMove
}) {
    const abortControllerRef = useRef(null);
    const isCalculatingRef = useRef(false);
    const statusRef = useRef(status);

    // Mantener referencia fresca del estado para comprobaciones dentro de callbacks asíncronos
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Limpieza de cálculos activos
    const cancelActiveCalculation = useCallback((reason = 'cancelled') => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(reason);
            abortControllerRef.current = null;
        }
        isCalculatingRef.current = false;
    }, []);

    // Efecto principal: Orquestación del cálculo de la IA al cambiar turno o estado
    useEffect(() => {
        // 1. Cancelar si no estamos en PLAYING o si el jugador no es IA
        if (status !== 'PLAYING' || !currentPlayer?.isAI) {
            cancelActiveCalculation('status_changed_or_not_ai');
            return;
        }

        // 2. Proteger contra doble ejecución
        if (isCalculatingRef.current) return;

        // 3. Iniciar el cálculo y configurar la cancelación
        isCalculatingRef.current = true;
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const executeAI = async () => {
            try {
                // Ejecuta el cálculo. isFastMode es false inicialmente.
                const move = await calculateMove({
                    signal: controller.signal,
                    isFastMode: false
                });

                // Confirmar que seguimos en PLAYING antes de efectuar el movimiento
                if (!controller.signal.aborted && statusRef.current === 'PLAYING') {
                    makeMove(move);
                }
            } catch (error) {
                if (error.name === 'AbortError' || controller.signal.aborted) {
                    // Cancelaciones esperadas por cambio de estado, timeout, etc.
                    console.log(`[AI Orchestrator] Cálculo cancelado: ${controller.signal.reason}`);
                } else {
                    console.error('[AI Orchestrator] Error crítico de IA:', error);
                    // Si ocurre un error fatal imprevisto, delegamos a autoResolve
                    window.dispatchEvent(new CustomEvent('dan:ai-orchestrator-fatal-error', {
                        detail: { error, player: currentPlayer }
                    }));
                }
            } finally {
                if (!controller.signal.aborted) {
                    isCalculatingRef.current = false;
                }
            }
        };

        executeAI();

        // Cleanup al desmontar o si cambian las dependencias (ej. status pasa a PAUSED)
        return () => {
            cancelActiveCalculation('effect_cleanup');
        };
    }, [status, currentPlayer, calculateMove, makeMove, cancelActiveCalculation]);

    // Efecto para escuchar eventos de Timeout emitidos por el TimerManager
    useEffect(() => {
        const handleSoftTimeout = () => {
            // Si la IA está calculando y entra en soft timeout, podemos abortar el cálculo normal
            // o notificar a la IA. Aquí implementamos el requerimiento:
            // "Activar modo decisión rápida. Usar mejor movimiento disponible."
            // Para ello abortamos el normal indicando soft_timeout, pero el Orquestador por sí 
            // solo no tiene lógica de juego. Debemos pedirle a la IA un cálculo rápido.
            if (statusRef.current === 'PLAYING' && isCalculatingRef.current && abortControllerRef.current) {
                console.log('[AI Orchestrator] Soft Timeout alcanzado. Solicitando decisión rápida.');

                // Cancelar el cálculo pesado en curso
                cancelActiveCalculation('soft_timeout_triggered');

                // Iniciar un nuevo cálculo forzando el modo rápido
                isCalculatingRef.current = true;
                const fastController = new AbortController();
                abortControllerRef.current = fastController;

                const executeFastAI = async () => {
                    try {
                        const move = await calculateMove({
                            signal: fastController.signal,
                            isFastMode: true
                        });
                        if (!fastController.signal.aborted && statusRef.current === 'PLAYING') {
                            makeMove(move);
                        }
                    } catch (e) {
                        // Silenciar abortos
                    } finally {
                        if (!fastController.signal.aborted) isCalculatingRef.current = false;
                    }
                };

                executeFastAI();
            }
        };

        const handleHardTimeout = () => {
            // Requerimiento: "Hard Timeout -> Cancelar cálculo, delegar a useAutoResolve, ignorar tardíos"
            if (statusRef.current === 'PLAYING' && isCalculatingRef.current) {
                console.log('[AI Orchestrator] Hard Timeout alcanzado. Cancelando IA y delegando.');
                cancelActiveCalculation('hard_timeout_reached');

                // Nota: El StateManager pasará a TIMEOUT por este mismo evento, pero como seguridad, 
                // emitimos el fatal-error o event específico si se necesita, aunque el useAutoResolve
                // deberá reaccionar a la transición a TIMEOUT por su cuenta.
            }
        };

        window.addEventListener('dan:timer-soft-timeout', handleSoftTimeout);
        window.addEventListener('dan:timer-hard-timeout', handleHardTimeout);

        return () => {
            window.removeEventListener('dan:timer-soft-timeout', handleSoftTimeout);
            window.removeEventListener('dan:timer-hard-timeout', handleHardTimeout);
        };
    }, [calculateMove, makeMove, cancelActiveCalculation]);

    return {
        isCalculating: isCalculatingRef.current
    };
}
