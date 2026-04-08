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
    const pendingRef = useRef(null);

    // Función centralizada para inicializar el worker con sus listeners
    const initWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }

        try {
            // Nota para el compilador de Vite: No usar variables para la URL, debe ser un literal 
            // para que detecte el worker como un entry point de bundle.
            workerRef.current = new Worker(
                new URL('../workers/aiWorker.js', import.meta.url),
                { type: 'module' }
            );

            workerRef.current.onmessage = (e) => {
                const { type, move, error: workerError } = e.data;
                if (pendingRef.current) {
                    if (type === 'CALCULATE_MOVE_SUCCESS') {
                        pendingRef.current.resolve(move);
                    } else if (type === 'CALCULATE_MOVE_ERROR') {
                        console.error('[AI Worker] Error en lógica de IA:', workerError);
                        pendingRef.current.reject(new Error(workerError));
                    }
                    pendingRef.current = null;
                }
            };

            workerRef.current.onerror = (err) => {
                console.error('[AI Worker] Error de carga o ejecución (onerror):', err);
                if (pendingRef.current) {
                    pendingRef.current.reject(new Error('WorkerLoadError'));
                    pendingRef.current = null;
                }
            };
        } catch (e) {
            console.error('[AI Worker] Error crítico al instanciar Worker:', e);
        }
    }, []);

    // Inicializar al montar
    useEffect(() => {
        if (typeof window !== 'undefined') {
            initWorker();
        }

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (pendingRef.current) {
                pendingRef.current.reject(new Error('WorkerTerminated'));
                pendingRef.current = null;
            }
        };
    }, [initWorker]);

    /**
     * Función a ser inyectada en useAIOrchestrator
     */
    const calculateMove = useCallback(async ({ signal, isFastMode }) => {
        if (!workerRef.current) {
            initWorker();
            if (!workerRef.current) throw new Error('Worker no disponible');
        }

        return new Promise((resolve, reject) => {
            if (signal?.aborted) {
                return reject(new DOMException(signal.reason || 'Aborted', 'AbortError'));
            }

            const abortHandler = () => {
                initWorker();
                reject(new DOMException(signal.reason || 'Aborted', 'AbortError'));
                pendingRef.current = null;
            };

            if (signal) {
                signal.addEventListener('abort', abortHandler, { once: true });
            }

            const safeResolve = (val) => {
                if (signal) signal.removeEventListener('abort', abortHandler);
                resolve(val);
            };

            const safeReject = (err) => {
                if (signal) signal.removeEventListener('abort', abortHandler);
                reject(err);
            };

            if (pendingRef.current) {
                pendingRef.current = null;
            }

            pendingRef.current = { resolve: safeResolve, reject: safeReject };

            workerRef.current.postMessage({
                type: 'CALCULATE_MOVE',
                messageId: Date.now(),
                payload: {
                    gameType,
                    engineState,
                    isFastMode
                }
            });

            // Timeout de 12 segundos (un poco más que el soft timeout del juego)
            setTimeout(() => {
                if (pendingRef.current?.resolve === safeResolve) {
                    console.warn('[AI Worker] Timeout alcanzado sin respuesta.');
                    safeReject(new Error('WorkerTimeout'));
                    pendingRef.current = null;
                }
            }, 12000);
        });
    }, [gameType, engineState, initWorker]);

    return { calculateMove };
}
