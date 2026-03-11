import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_CONFIG = {
    softLimit: 30000,
    hardLimit: 35000,
    tickInterval: 100, // Ms entre actualizaciones del estado de React
    autoStart: false,
    autoPauseOnHide: true,
};

/**
 * Timer Manager Modular - Módulo 1
 * Gestiona presupuestos de tiempo, emite eventos y detecta timeouts.
 * No contiene lógica específica de ningún juego.
 */
export function useTurnTimer(initialConfig = {}) {
    const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...initialConfig });

    const [state, setState] = useState({
        remainingSoft: config.softLimit,
        remainingHard: config.hardLimit,
        isRunning: config.autoStart,
        status: config.autoStart ? 'RUNNING' : 'IDLE', // IDLE, RUNNING, PAUSED, SOFT_LIMIT_REACHED, HARD_LIMIT_REACHED
        lastTick: Date.now(),
    });

    // Referencias mutables para cálculo de alta frecuencia sin depender del estado de React
    const stateRef = useRef(state);
    stateRef.current = state;
    const configRef = useRef(config);
    configRef.current = config;

    const reqRef = useRef(null);
    const lastTimeRef = useRef(null); // Timestamp del requestAnimationFrame
    const elapsedRef = useRef(0);
    const lastRenderElapsedRef = useRef(0);

    // Helper para emitir eventos estandarizados
    const emitEvent = useCallback((eventName, detail = {}) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }, []);

    // Motor principal del timer utilizando requestAnimationFrame para evitar derivas (drift)
    const tick = useCallback((timestamp) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        const { isRunning, status } = stateRef.current;
        const cnf = configRef.current;

        if (isRunning && status !== 'PAUSED' && status !== 'HARD_LIMIT_REACHED') {
            elapsedRef.current += delta;
            const elapsed = elapsedRef.current;

            const remainingS = Math.max(0, cnf.softLimit - elapsed);
            const remainingH = Math.max(0, cnf.hardLimit - elapsed);

            let newStatus = status;
            let statusChanged = false;

            // Evaluar transiciones de estado por límites de tiempo
            if (remainingH <= 0 && status !== 'HARD_LIMIT_REACHED') {
                newStatus = 'HARD_LIMIT_REACHED';
                statusChanged = true;
                emitEvent('dan:timer-hard-timeout', { remainingHard: 0 });
            } else if (remainingS <= 0 && remainingH > 0 && status !== 'SOFT_LIMIT_REACHED') {
                newStatus = 'SOFT_LIMIT_REACHED';
                statusChanged = true;
                emitEvent('dan:timer-soft-timeout', { remainingSoft: 0, remainingHard: remainingH });
            }

            // Optimización de re-renders: solo actualizar si superó el tickInterval o cambió de estado crítico
            const timeSinceLastRender = elapsed - lastRenderElapsedRef.current;
            if (statusChanged || timeSinceLastRender >= cnf.tickInterval || remainingH <= 0) {
                lastRenderElapsedRef.current = elapsed;

                const newState = {
                    remainingSoft: Math.ceil(remainingS),
                    remainingHard: Math.ceil(remainingH),
                    isRunning: newStatus !== 'HARD_LIMIT_REACHED', // Se detiene automáticamente al alcanzar hard limit
                    status: newStatus,
                    lastTick: Date.now(),
                };

                setState(newState);
                emitEvent('dan:timer-tick', newState);
            }
        }

        reqRef.current = requestAnimationFrame(tick);
    }, [emitEvent]);

    // Manejo del ciclo de vida del frame request
    useEffect(() => {
        reqRef.current = requestAnimationFrame(tick);
        return () => {
            if (reqRef.current) {
                cancelAnimationFrame(reqRef.current);
            }
        };
    }, [tick]);

    // Acciones de control expuestas
    const start = useCallback(() => {
        lastTimeRef.current = null; // Reiniciar para que tome el timestamp correcto en el siguiente tick
        setState(prev => {
            if (prev.status === 'HARD_LIMIT_REACHED') return prev; // Prevenir inicio si ya expiró
            return {
                ...prev,
                isRunning: true,
                status: elapsedRef.current > 0 && prev.status !== 'PAUSED' ? prev.status : 'RUNNING',
                lastTick: Date.now()
            };
        });
    }, []);

    const pause = useCallback(() => {
        setState(prev => {
            if (!prev.isRunning || prev.status === 'HARD_LIMIT_REACHED') return prev;
            return { ...prev, isRunning: false, status: 'PAUSED', lastTick: Date.now() };
        });
    }, []);

    const resume = useCallback(() => {
        setState(prev => {
            if (prev.status !== 'PAUSED') return prev;
            lastTimeRef.current = null; // Prevenir un salto de tiempo acumulado durante la pausa

            const elapsed = elapsedRef.current;
            const cnf = configRef.current;
            let newStatus = 'RUNNING';
            if (elapsed >= cnf.hardLimit) newStatus = 'HARD_LIMIT_REACHED';
            else if (elapsed >= cnf.softLimit) newStatus = 'SOFT_LIMIT_REACHED';

            return { ...prev, isRunning: true, status: newStatus, lastTick: Date.now() };
        });
    }, []);

    const reset = useCallback((newPartialConfig) => {
        if (newPartialConfig) {
            setConfig(prev => ({ ...prev, ...newPartialConfig }));
        }
        const activeConfig = newPartialConfig ? { ...configRef.current, ...newPartialConfig } : configRef.current;

        elapsedRef.current = 0;
        lastRenderElapsedRef.current = 0;
        lastTimeRef.current = null;

        setState({
            remainingSoft: activeConfig.softLimit,
            remainingHard: activeConfig.hardLimit,
            isRunning: activeConfig.autoStart,
            status: activeConfig.autoStart ? 'RUNNING' : 'IDLE',
            lastTick: Date.now()
        });
    }, []);

    // Auto-pausa opcional por visibilidad del entorno
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!configRef.current.autoPauseOnHide) return;
            if (document.hidden) {
                pause();
            } else {
                resume();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [pause, resume]);

    return { state, start, pause, resume, reset };
}
