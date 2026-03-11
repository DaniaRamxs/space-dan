/**
 * VoiceFXMenu.jsx
 * Menú de efectos de voz en tiempo real para salas LiveKit.
 *
 * Flujo al activar un filtro:
 *   1. Validar saldo y estado del micrófono
 *   2. Cobrar costo inicial de activación
 *   3. Limpiar track procesado anterior (si existe)
 *   4. Capturar stream del micrófono físico
 *   5. Inicializar VoiceProcessor con el nuevo filtro
 *   6. Apagar el micrófono "oficial" de LiveKit
 *   7. Publicar el track procesado como micrófono
 *   8. Cobrar costo por minuto mientras el filtro esté activo
 *
 * Al volver a "Original" (none):
 *   - Despublicar track procesado
 *   - Cerrar VoiceProcessor (libera Web Audio)
 *   - Detener el stream físico capturado
 *   - Reactivar micrófono oficial de LiveKit
 *
 * Prevención de memory leaks:
 *   - VoiceProcessor.close() se llama al cambiar filtro y al desmontar
 *   - El stream físico se detiene explícitamente al volver a "none"
 *   - `isApplying` evita ejecuciones concurrentes del mismo toggle
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Ghost, Radio, User, Mic2, Sparkles, Star, X, Loader2 } from 'lucide-react';
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEconomy } from '../../contexts/EconomyContext';
import { VoiceProcessor } from '../../utils/audioFX';

// ─── Definición de filtros disponibles ──────────────────────────────────────
const FILTERS = [
    { id: 'none',  name: 'Original',   icon: <User  size={14} />, cost: 0,  color: 'bg-white/10' },
    { id: 'robot', name: 'Androide',   icon: <Mic2  size={14} />, cost: 10, color: 'bg-blue-500/20' },
    { id: 'alien', name: 'Alien x-1',  icon: <Ghost size={14} />, cost: 15, color: 'bg-emerald-500/20' },
    { id: 'giant', name: 'Gigante',    icon: <Star  size={14} />, cost: 15, color: 'bg-rose-500/20' },
    { id: 'radio', name: 'Radio NASA', icon: <Radio size={14} />, cost: 5,  color: 'bg-amber-500/20' },
    { id: 'space', name: 'Vortex',     icon: <Sparkles size={14} />, cost: 20, color: 'bg-purple-500/20' },
];

// ─── Componente ─────────────────────────────────────────────────────────────

export default function VoiceFXMenu() {
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
    const { balance, deductCoins } = useEconomy();

    const [isOpen, setIsOpen]       = useState(false);
    const [activeFilter, setActiveFilter] = useState('none');
    // Bloquea el botón mientras se está aplicando un filtro (evita doble-click / race condition)
    const [isApplying, setIsApplying]    = useState(false);

    // Instancia singleton del procesador de audio — persiste entre renders
    const processorRef = useRef(new VoiceProcessor());

    // Referencia al track procesado publicado actualmente en LiveKit
    const processedTrackPubRef = useRef(null);

    // Referencia al MediaStream del micrófono físico capturado para el efecto
    // (necesario para detenerlo al volver a "none" y no dejar el mic abierto)
    const rawStreamRef = useRef(null);

    // ── Limpieza al desmontar ────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            // Cerrar AudioContext y liberar todos los nodos del grafo
            processorRef.current.close();
            // Detener el stream físico capturado si quedó abierto
            _stopRawStream();
        };
    }, []);

    // ── Helper: detener el stream físico del micrófono ──────────────────────
    const _stopRawStream = () => {
        if (rawStreamRef.current) {
            rawStreamRef.current.getTracks().forEach(t => t.stop());
            rawStreamRef.current = null;
        }
    };

    // ── Helper: despublicar el track procesado activo ────────────────────────
    const _unpublishProcessedTrack = async () => {
        const pub = processedTrackPubRef.current;
        if (!pub) return;
        try {
            await localParticipant.unpublishTrack(pub.track);
        } catch (err) {
            console.warn('[VoiceFX] Error al despublicar track procesado:', err?.message);
        }
        processedTrackPubRef.current = null;
    };

    /**
     * Activa o desactiva un filtro de voz.
     * @param {string} filterId — ID del filtro a aplicar ('none' para restaurar)
     */
    const toggleFilter = useCallback(async (filterId) => {
        // Prevenir ejecuciones concurrentes
        if (isApplying) return;
        // No hacer nada si se hace click en el filtro ya activo
        if (filterId === activeFilter) return;

        const filter = FILTERS.find(f => f.id === filterId);
        if (!filter) return;

        // ── Validaciones previas ─────────────────────────────────────────────
        if (filterId !== 'none' && !isMicrophoneEnabled) {
            // No mostrar alert nativo — el aviso está en el UI (banner inferior)
            return;
        }

        if (filterId !== 'none' && balance < filter.cost) {
            // Saldo insuficiente — no proceder
            return;
        }

        setIsApplying(true);

        try {
            // ── Cobro de activación ──────────────────────────────────────────
            if (filterId !== 'none' && filter.cost > 0) {
                const res = await deductCoins(filter.cost, 'activity', `Activación filtro: ${filter.name}`);
                if (!res?.success) {
                    // Fallo en el cobro → cancelar (EconomyContext ya notifica al usuario)
                    return;
                }
            }

            // ── Limpiar estado anterior ──────────────────────────────────────
            await _unpublishProcessedTrack();

            if (filterId === 'none') {
                // Restaurar: cerrar procesador + detener stream físico + reactivar mic oficial
                processorRef.current.close();
                processorRef.current = new VoiceProcessor(); // Nuevo procesador listo para futuros usos
                _stopRawStream();
                await localParticipant.setMicrophoneEnabled(false);
                await localParticipant.setMicrophoneEnabled(true);
                setActiveFilter('none');
                return;
            }

            // ── Aplicar nuevo filtro ─────────────────────────────────────────

            // Capturar stream físico del micrófono (independiente del de LiveKit)
            // para procesarlo con Web Audio API
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation:   true,
                    noiseSuppression:   true,
                    autoGainControl:    true,
                    sampleRate:         48000,
                }
            });
            _stopRawStream(); // Detener cualquier stream físico previo
            rawStreamRef.current = stream;

            // Inicializar y aplicar el filtro en el procesador de audio
            const processedStream = processorRef.current.init(stream);
            processorRef.current.setFilter(filterId);

            const processedTrack = processedStream.getAudioTracks()[0];
            if (!processedTrack) throw new Error('No se pudo obtener track procesado del stream');

            // Apagar micrófono oficial de LiveKit (evitar duplicado de audio)
            await localParticipant.setMicrophoneEnabled(false);

            // Publicar el track procesado como fuente de micrófono
            const pub = await localParticipant.publishTrack(processedTrack, {
                name:   `fx-${filterId}`,
                source: Track.Source.Microphone,
            });

            // Guardar referencia para despublicar en el próximo cambio
            processedTrackPubRef.current = pub;
            setActiveFilter(filterId);

        } catch (err) {
            console.error('[VoiceFX] Error al cambiar filtro:', err?.message);
            // Recuperación: intentar restaurar el micrófono oficial
            try {
                await localParticipant.setMicrophoneEnabled(true);
            } catch (_) { }
            setActiveFilter('none');
        } finally {
            setIsApplying(false);
        }
    }, [isApplying, activeFilter, isMicrophoneEnabled, balance, deductCoins, localParticipant]);

    // ── Cobro por minuto mientras el filtro está activo ──────────────────────
    useEffect(() => {
        // No cobrar si estamos en "none" o si el micro está mudo
        if (activeFilter === 'none' || !isMicrophoneEnabled) return;

        const filter = FILTERS.find(f => f.id === activeFilter);
        if (!filter || filter.cost === 0) return;

        const interval = setInterval(async () => {
            const res = await deductCoins(filter.cost, 'activity', `Filtro de voz por minuto: ${filter.name}`);
            if (!res?.success) {
                // Sin saldo suficiente → desactivar filtro automáticamente
                console.log('[VoiceFX] Saldo insuficiente, desactivando filtro.');
                toggleFilter('none');
            }
        }, 60_000); // Cobrar cada minuto

        return () => clearInterval(interval);
    }, [activeFilter, isMicrophoneEnabled, deductCoins, toggleFilter]);

    // ── Si el micro se apaga externamente mientras hay filtro → restaurar ────
    useEffect(() => {
        if (!isMicrophoneEnabled && activeFilter !== 'none') {
            // El usuario mutó el mic desde fuera del menú de FX.
            // Limpiar el track procesado para no tener un track huérfano.
            _unpublishProcessedTrack().then(() => {
                processorRef.current.close();
                processorRef.current = new VoiceProcessor();
                _stopRawStream();
                setActiveFilter('none');
            });
        }
    }, [isMicrophoneEnabled]); // Solo reaccionar al cambio externo del mic

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="relative">

            {/* Botón de apertura del menú */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    activeFilter !== 'none'
                        ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse'
                        : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                }`}
                title="Efectos de Voz"
            >
                <Wand2 size={24} />
            </button>

            {/* Panel desplegable */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-20 left-0 bg-[#070715]/95 backdrop-blur-2xl border border-white/10 p-4 rounded-[2rem] shadow-2xl w-64 z-[100]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4 px-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                                Modulador de Voz
                            </span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/20 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Grid de filtros */}
                        <div className="grid grid-cols-2 gap-2">
                            {FILTERS.map((f) => {
                                const isActive   = activeFilter === f.id;
                                const isLoading  = isApplying && !isActive;
                                const noFunds    = f.cost > 0 && balance < f.cost;
                                const isDisabled = isApplying || (!isMicrophoneEnabled && f.id !== 'none') || (noFunds && !isActive);

                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleFilter(f.id)}
                                        disabled={isDisabled}
                                        className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                                            isActive
                                                ? 'bg-purple-500/20 border-purple-500 shadow-inner'
                                                : isDisabled
                                                    ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                                                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/8'
                                        }`}
                                    >
                                        {/* Indicador de carga sobre el botón activo */}
                                        {isApplying && isActive && (
                                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                                                <Loader2 size={16} className="text-purple-400 animate-spin" />
                                            </div>
                                        )}

                                        {/* Icono del filtro */}
                                        <div className={`p-2 rounded-lg ${isActive ? 'text-purple-400' : 'text-white/40'}`}>
                                            {f.icon}
                                        </div>

                                        {/* Nombre y costo */}
                                        <div className="flex flex-col items-center">
                                            <span className={`text-[9px] font-black uppercase tracking-tighter ${
                                                isActive ? 'text-white' : 'text-white/40'
                                            }`}>
                                                {f.name}
                                            </span>
                                            {f.cost > 0 && (
                                                <span className={`text-[7px] font-bold ${noFunds ? 'text-rose-500/60' : 'text-amber-500/60'}`}>
                                                    {f.cost}◈/min
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Aviso: micrófono inactivo */}
                        {!isMicrophoneEnabled && (
                            <div className="mt-4 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                                <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">
                                    Activa el micro para usar efectos
                                </p>
                            </div>
                        )}

                        {/* Aviso: saldo bajo (solo cuando hay filtro activo de pago) */}
                        {activeFilter !== 'none' && balance < 20 && (
                            <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                                <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest">
                                    Saldo bajo: {balance}◈
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
