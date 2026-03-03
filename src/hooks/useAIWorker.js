import { useRef, useCallback, useEffect } from 'react';

// Capa de Ejecución IA (Web Worker Wrapper)
// Implementado en Modo Contingencia por Ingeniero IA

/**
 * Hook `useAIWorker`
 * 
 * Responsabilidad: Puente seguro entre Main Thread y el WebWorker de cálculos de IA.
 * Emite los request al worker, escucha el puerto postMessage y maneja la cancelación
 * nativa interceptando la señal de AbortController.
 * 
 * @param {string} engineState - Estado puro del motor del juego actual (agnóstico)
 * @param {string} gameType - Identificador del juego (ej: 'tictactoe', 'snake')
 */
export function useAIWorker(gameType, engineState) {
    const workerRef = useRef(null);
    const pendingRef = useRef(null); // Guarda { resolve, reject } temporalmente

    // Inicializar Worker de manera segura (solo corre en cliente)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Nota: Asumiendo Vite/Webpack, new Worker(new URL(...), { type: 'module' })
            // Se utiliza fallback de script directo para el entorno de este proyecto
            workerRef.current = new window.Worker(new URL('../workers/aiWorker.js', import.meta.url), { type: 'module' });

            workerRef.current.onmessage = (e) => {
                const { type, move, error } = e.data;

                if (pendingRef.current) {
                    if (type === 'CALCULATE_MOVE_SUCCESS') {
                        pendingRef.current.resolve(move);
                    } else if (type === 'CALCULATE_MOVE_ERROR') {
                        pendingRef.current.reject(new Error(error));
                    }
                    pendingRef.current = null;
                }
            };
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate(); // Kill brutal de seguridad al desmontar
                workerRef.current = null;
            }
            if (pendingRef.current) {
                pendingRef.current.reject(new Error('WorkerTerminated'));
                pendingRef.current = null;
            }
        };
    }, []);

    /**
     * Función a ser inyectada en useAIOrchestrator
     */
    const calculateMove = useCallback(async ({ signal, isFastMode }) => {
        if (!workerRef.current) {
            throw new Error('Worker no inicializado');
        }

        return new Promise((resolve, reject) => {
            // 1. Manejo inmediato si ya venía abortado
            if (signal?.aborted) {
                return reject(new DOMException(signal.reason || 'Aborted', 'AbortError'));
            }

            // 2. Escuchar la cancelación enviada por el Orchestrator
            const abortHandler = () => {
                // En un worker nativo, la forma más agresiva y segura de parar computo pesado 
                // bloqueante (un while true infinito en el worker) es terminar el thread
                // y levantar uno nuevo.
                if (workerRef.current) {
                    workerRef.current.terminate();
                    // Revivir el worker para el siguiente uso
                    workerRef.current = new window.Worker(new URL('../workers/aiWorker.js', import.meta.url), { type: 'module' });

                    // Re-enganchar listeners al nuevo thread
                    workerRef.current.onmessage = (e) => {
                        const { type, move: rMove, error } = e.data;
                        if (pendingRef.current) {
                            if (type === 'CALCULATE_MOVE_SUCCESS') pendingRef.current.resolve(rMove);
                            else if (type === 'CALCULATE_MOVE_ERROR') pendingRef.current.reject(new Error(error));
                            pendingRef.current = null;
                        }
                    };
                }
                reject(new DOMException(signal.reason || 'Aborted', 'AbortError'));
                pendingRef.current = null;
            };

            if (signal) {
                signal.addEventListener('abort', abortHandler, { once: true });
            }

            // 3. Wrapper del resolver para remover el listener y evitar memory leaks
            const safeResolve = (val) => {
                if (signal) signal.removeEventListener('abort', abortHandler);
                resolve(val);
            };

            const safeReject = (err) => {
                if (signal) signal.removeEventListener('abort', abortHandler);
                reject(err);
            };

            // Si ya había algo corriendo malamente, lo sobre-escribimos cancelándolo
            if (pendingRef.current) {
                pendingRef.current.reject(new Error('OverwrittenByNewRequest'));
            }

            pendingRef.current = { resolve: safeResolve, reject: safeReject };

            // 4. Despachar tarea al Thread del Worker
            workerRef.current.postMessage({
                type: 'CALCULATE_MOVE',
                messageId: Date.now(),
                payload: {
                    gameType,
                    engineState,
                    isFastMode
                }
            });
        });
    }, [gameType, engineState]);

    return { calculateMove };
}
