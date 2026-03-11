/**
 * EnergyReactor.jsx
 * Widget cooperativo de sala de voz — la tripulación inyecta ◈ para
 * cargar el reactor. Al llegar al objetivo se activa el Mega-Bonus (2× XP 30 min).
 *
 * Arquitectura:
 *   - Estado persistido en `voice_room_reactors` (Supabase)
 *   - Actualizaciones atómicas via RPC `inject_reactor_energy` para evitar race conditions
 *   - Suscripción realtime a `postgres_changes` para sincronizar entre participantes
 *   - El countdown del bonus se calcula LOCALMENTE desde `bonus_expires_at`
 *     (sin queries por segundo — solo un setInterval local)
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, ShieldAlert, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useEconomy } from '../../contexts/EconomyContext';

// ─── Constantes ───────────────────────────────────────────────────────────────
const INJECT_AMOUNT = 100; // ◈ que se inyectan por clic

export default function EnergyReactor({ roomName }) {
    const { balance, deductCoins } = useEconomy();

    const [energy,      setEnergy]      = useState(0);
    const [level,       setLevel]       = useState(1);
    const [target,      setTarget]      = useState(1000);
    const [bonusEnd,    setBonusEnd]    = useState(null); // Date | null — cuando expira el bonus
    const [timeLeft,    setTimeLeft]    = useState(null); // minutos restantes del bonus
    const [isUpdating,  setIsUpdating]  = useState(false);

    // Ref para el intervalo local del countdown (evita queries a Supabase cada segundo)
    const countdownRef = useRef(null);

    // ── Inicialización: cargar estado y suscribir a realtime ─────────────────
    useEffect(() => {
        if (!roomName) return;

        // Normalizar el nombre de sala para usar como clave en la BD
        const roomKey = roomName.toLowerCase().trim();

        const fetchState = async () => {
            try {
                const { data } = await supabase
                    .from('voice_room_reactors')
                    .select('*')
                    .eq('room_name', roomKey)
                    .maybeSingle();

                if (data) {
                    applyServerState(data);
                } else {
                    // Primera vez que se usa esta sala: crear registro inicial
                    const { data: newData } = await supabase
                        .from('voice_room_reactors')
                        .upsert(
                            { room_name: roomKey, energy: 0, level: 1, target: 1000, updated_at: new Date().toISOString() },
                            { onConflict: 'room_name' }
                        )
                        .select()
                        .single();

                    if (newData) applyServerState(newData);
                }
            } catch (err) {
                console.warn('[Reactor] Error al cargar estado inicial:', err?.message);
            }
        };

        fetchState();

        // Suscribirse a cambios de la fila de esta sala en tiempo real
        // Nota: el filtro de Supabase realtime usa sintaxis `column=eq.value` (sin comillas)
        const channel = supabase
            .channel(`reactor:${roomKey}`)
            .on(
                'postgres_changes',
                {
                    event:  'UPDATE',
                    schema: 'public',
                    table:  'voice_room_reactors',
                    filter: `room_name=eq.${roomKey}`,
                },
                (payload) => {
                    applyServerState(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            // Limpiar countdown local al desmontar
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [roomName]);

    // ── Countdown local del bonus ─────────────────────────────────────────────
    // En lugar de hacer queries a Supabase cada N segundos, calculamos el tiempo
    // restante desde el `bonus_expires_at` que ya tenemos en estado local.
    useEffect(() => {
        // Limpiar intervalo anterior
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        if (!bonusEnd) {
            setTimeLeft(null);
            return;
        }

        // Actualizar cada 30 segundos — suficiente para mostrar minutos
        const updateCountdown = () => {
            const remaining = bonusEnd - Date.now();
            if (remaining <= 0) {
                setTimeLeft(null);
                setBonusEnd(null);
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            } else {
                setTimeLeft(Math.ceil(remaining / 60_000));
            }
        };

        updateCountdown(); // Ejecutar inmediatamente
        countdownRef.current = setInterval(updateCountdown, 30_000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [bonusEnd]);

    /**
     * Aplica el estado recibido del servidor (fetch inicial o realtime update).
     * @param {object} data — fila de voice_room_reactors
     */
    const applyServerState = (data) => {
        if (!data) return;
        setEnergy(data.energy ?? 0);
        setLevel(data.level  ?? 1);
        setTarget(data.target ?? 1000);

        if (data.bonus_expires_at) {
            const expiresAt = new Date(data.bonus_expires_at);
            if (expiresAt > new Date()) {
                setBonusEnd(expiresAt.getTime()); // Guardar como timestamp ms
            } else {
                setBonusEnd(null); // Bonus ya expiró
            }
        } else {
            setBonusEnd(null);
        }
    };

    /**
     * Inyecta `INJECT_AMOUNT` de energía al reactor.
     * Usa RPC atómica para evitar race conditions entre múltiples clientes.
     */
    const injectEnergy = async () => {
        if (balance < INJECT_AMOUNT || isUpdating) return;

        const roomKey = roomName.toLowerCase().trim();
        setIsUpdating(true);

        try {
            // 1. Cobrar los ◈ al jugador
            const result = await deductCoins(
                INJECT_AMOUNT,
                'activity',
                `Inyección de energía: ${roomName}`
            );
            if (!result?.success) return;

            // 2. Suma atómica en el servidor + level-up automático
            const { data: newState, error } = await supabase.rpc('inject_reactor_energy', {
                p_room_name: roomKey,
                p_amount:    INJECT_AMOUNT,
            });

            if (error) throw error;

            // El realtime update debería llegar y actualizar el estado,
            // pero aplicamos inmediatamente para feedback local más rápido
            if (newState) applyServerState(newState);

        } catch (err) {
            console.warn('[Reactor] Error al inyectar energía:', err?.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Porcentaje de progreso hacia el siguiente level-up
    const progress    = Math.min(100, (energy / target) * 100);
    const isBonusActive = bonusEnd !== null && bonusEnd > Date.now();

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="w-full mb-6 relative z-10 px-0 sm:px-2">
            <motion.div
                layout
                className={`relative p-4 rounded-[2rem] border transition-all duration-700 ${
                    isBonusActive
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
            >
                {/* Glow de fondo cuando el bonus está activo */}
                <AnimatePresence>
                    {isBonusActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-[2rem] pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {/* Icono: Zap en modo normal, Sparkles en bonus */}
                        <div className={`p-2 rounded-xl transition-all duration-500 ${
                            isBonusActive
                                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                                : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                            {isBonusActive
                                ? <Sparkles size={16} className="animate-spin-slow" />
                                : <Zap size={16} fill="currentColor" />
                            }
                        </div>

                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                Reactor · {roomName}
                                <span className="text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded-full text-[8px]">
                                    LVL {level}
                                </span>
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                    isBonusActive ? 'bg-amber-500' : 'bg-cyan-400'
                                }`} />
                                <span className={`text-[8px] font-bold uppercase tracking-widest ${
                                    isBonusActive ? 'text-amber-500' : 'text-cyan-400/60'
                                }`}>
                                    {isBonusActive
                                        ? `Mega-Bonus: 2× XP (${timeLeft}m restantes)`
                                        : 'Cargando Núcleo Estelar'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Botón de inyección */}
                    <button
                        onClick={injectEnergy}
                        disabled={isUpdating || balance < INJECT_AMOUNT}
                        className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={balance < INJECT_AMOUNT ? `Necesitas ${INJECT_AMOUNT}◈` : `Inyectar ${INJECT_AMOUNT}◈`}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <TrendingUp
                                size={12}
                                className={isUpdating
                                    ? 'animate-bounce text-cyan-400'
                                    : 'text-white/40 group-hover:text-white transition-colors'
                                }
                            />
                            +{INJECT_AMOUNT}◈
                        </span>
                    </button>
                </div>

                {/* ── Barra de progreso ───────────────────────────────────── */}
                <div className="space-y-2">
                    <div className="relative w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                            className={`absolute top-0 left-0 h-full ${
                                isBonusActive
                                    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-[length:200%_100%] animate-gradient'
                                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                            }`}
                        >
                            <div className="absolute inset-0 bg-white/20 mix-blend-overlay animate-pulse" />
                        </motion.div>
                    </div>

                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-white/20">
                            <Flame size={10} className={isUpdating ? 'animate-bounce text-cyan-400' : ''} />
                            <span>{energy.toLocaleString()} / {target.toLocaleString()}◈</span>
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-tighter text-white/10 italic">
                            Contribución colectiva requerida
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
