import { useState, useCallback, useEffect, useRef } from 'react';

// Módulo 2: State Manager (FSM Core)
// Implementado en Modo Contingencia por Ingeniero IA

const VALID_TRANSITIONS = {
    IDLE: ['PLAYING'],
    PLAYING: ['PAUSED', 'FINISHED', 'TIMEOUT', 'DISCONNECTED'],
    PAUSED: ['PLAYING', 'FINISHED'],
    TIMEOUT: ['PLAYING', 'FINISHED'],
    FINISHED: ['IDLE', 'PLAYING'], // Allow direct rematch
    DISCONNECTED: ['PLAYING', 'FINISHED']
};

export function useGameState(initialContext = {}) {
    const [status, setStatus] = useState('IDLE');

    const [context, setContext] = useState({
        gameId: null,
        players: [],
        currentTurn: null,
        scores: {},
        metadata: {},
        ...initialContext
    });

    const statusRef = useRef(status);
    statusRef.current = status;

    const emitEvent = useCallback((eventName, detail = {}) => {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }, []);

    const transitionTo = useCallback((nextStatus, payload = {}) => {
        const currentStatus = statusRef.current;
        if (currentStatus === nextStatus) return true;

        // Guardian de transiciones: Validación estricta
        const allowed = VALID_TRANSITIONS[currentStatus];
        if (!allowed || !allowed.includes(nextStatus)) {
            console.warn(`[StateManager] Transición ilegal bloqueada: ${currentStatus} -> ${nextStatus}`);
            return false;
        }

        setStatus(nextStatus);
        emitEvent('dan:game-status-changed', { oldStatus: currentStatus, newStatus: nextStatus, payload });

        // Efecto secundario solicitado por Arquitectura:
        // "Al entrar en PAUSED o FINISHED, el Ingeniero debe asegurar que los timers se detengan"
        // Ya que el TimerManager está desacoplado, emitimos la intención para que el orquestador (uso integrado) lo atrape,
        // o bien disparamos los eventos globales si fueran necesarios.
        if (nextStatus === 'PAUSED' || nextStatus === 'FINISHED') {
            emitEvent('dan:state-manager-requires-timer-pause');
        }

        return true;
    }, [emitEvent]);

    const updateContext = useCallback((updateFnOrObject) => {
        setContext(prev => {
            // Inmutabilidad estricta (estilo Redux)
            const updates = typeof updateFnOrObject === 'function' ? updateFnOrObject(prev) : updateFnOrObject;
            return { ...prev, ...updates };
        });
    }, []);

    // Escucha del bus de eventos para hard-timeouts
    useEffect(() => {
        const handleHardTimeout = () => {
            if (statusRef.current === 'PLAYING') {
                transitionTo('TIMEOUT', { reason: 'hard-limit-reached' });
            }
        };

        window.addEventListener('dan:timer-hard-timeout', handleHardTimeout);
        return () => window.removeEventListener('dan:timer-hard-timeout', handleHardTimeout);
    }, [transitionTo]);

    return { status, context, transitionTo, updateContext };
}
