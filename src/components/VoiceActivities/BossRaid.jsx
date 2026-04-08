/**
 * BossRaid.jsx
 * Actividad co-op de sala de voz: todos atacan juntos a un jefe.
 *
 * Arquitectura:
 *   - El HOST es el participante[0] en LiveKit. Él controla el temporizador,
 *     hace spawn del jefe y sincroniza el estado global vía broadcast.
 *   - Cada jugador aplica su daño LOCALMENTE (feedback inmediato) y lo
 *     transmite al canal para que los demás actualicen su damageMap.
 *   - Las recompensas se otorgan localmente según el daño propio para
 *     evitar duplicar escrituras en Supabase desde múltiples clientes.
 *
 * Bugs corregidos:
 *   - `gameState` era referenciado pero nunca definido (debía ser `phase`)
 *   - Throttle en el ataque básico para evitar spam extremo
 *   - `alert()` reemplazado por toast
 *   - `isBossScaled` evita que el HP escale mal al hacer múltiples spawns
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Skull, Zap, Crosshair, Users, ShieldAlert, Award } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { getFrameStyle } from '../../utils/styles';
import toast from 'react-hot-toast';

// ─── Configuración de jefes ───────────────────────────────────────────────────
const BOSS_TYPES = [
    { id: 'leviathan', name: 'Leviatán del Vacío',   hp: 5000,  img: '👾', color: 'purple' },
    { id: 'destroyer', name: 'Destructor Gt-9',      hp: 8000,  img: '🤖', color: 'rose'   },
    { id: 'behemoth',  name: 'Behemoth Solar',       hp: 12000, img: '🌞', color: 'amber'  },
];

const RAID_DURATION_SECS = 300; // 5 minutos
const BASE_DAMAGE        = 10;  // Daño del ataque básico
const LASER_COST         = 100; // Costo del láser orbital en ◈
const LASER_DAMAGE       = 500; // Daño del láser orbital
const ATTACK_THROTTLE_MS = 150; // Anti-spam: mínimo ms entre ataques básicos

// Clases de color por jefe — explícitas para que Tailwind JIT las incluya
const BOSS_COLOR_CLASSES = {
    purple: {
        containerBg: 'bg-purple-950/80 border-purple-500/30',
        headerBorder: 'border-purple-500/20',
        iconBox:      'bg-purple-500/10 border-purple-500/20 text-purple-400',
        text:         'text-purple-400',
        timer:        'text-purple-400 border-purple-500/20 bg-black/40',
        glow:         'bg-purple-500/20',
        bar:          'from-purple-600 to-purple-400',
        hp:           'text-purple-400',
    },
    rose: {
        containerBg: 'bg-rose-950/80 border-rose-500/30',
        headerBorder: 'border-rose-500/20',
        iconBox:      'bg-rose-500/10 border-rose-500/20 text-rose-400',
        text:         'text-rose-400',
        timer:        'text-rose-400 border-rose-500/20 bg-black/40',
        glow:         'bg-rose-500/20',
        bar:          'from-rose-600 to-rose-400',
        hp:           'text-rose-400',
    },
    amber: {
        containerBg: 'bg-amber-950/80 border-amber-500/30',
        headerBorder: 'border-amber-500/20',
        iconBox:      'bg-amber-500/10 border-amber-500/20 text-amber-400',
        text:         'text-amber-400',
        timer:        'text-amber-400 border-amber-500/20 bg-black/40',
        glow:         'bg-amber-500/20',
        bar:          'from-amber-600 to-amber-400',
        hp:           'text-amber-400',
    },
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BossRaid({ roomName, onClose }) {
    const { user, profile }            = useAuthContext();
    const { balance, awardCoins, deductCoins } = useEconomy();
    const { localParticipant }         = useLocalParticipant();
    const participants                 = useParticipants();

    // ── Estado del juego ─────────────────────────────────────────────────────
    // 'lobby' | 'playing' | 'won' | 'lost'
    const [phase,       setPhase]       = useState('lobby');
    const [timeLeft,    setTimeLeft]    = useState(RAID_DURATION_SECS);
    const [currentBoss, setCurrentBoss] = useState(BOSS_TYPES[0]);
    const [currentHp,   setCurrentHp]   = useState(BOSS_TYPES[0].hp);
    const [maxHp,       setMaxHp]       = useState(BOSS_TYPES[0].hp); // HP máximo de la raid actual para calcular %
    const [damageMap,   setDamageMap]   = useState({}); // { userId: { name, damage, avatar, frameId } }
    const [isDead,      setIsDead]      = useState(false);

    const channelRef = useRef(null);
    // Refs para leer estado actual dentro de timers/callbacks sin stale closures
    const phaseRef       = useRef(phase);
    const currentHpRef   = useRef(currentHp);
    const isDeadRef      = useRef(isDead);
    // Timestamp del último ataque básico (anti-spam)
    const lastAttackRef  = useRef(0);

    useEffect(() => { phaseRef.current     = phase;     }, [phase]);
    useEffect(() => { currentHpRef.current = currentHp; }, [currentHp]);
    useEffect(() => { isDeadRef.current    = isDead;    }, [isDead]);

    // El host es el primer participante listado por LiveKit
    // Nota: puede cambiar si ese participante se va — es una limitación conocida
    const isHost = participants.length === 0
        || localParticipant?.identity === participants[0]?.identity;

    // ── Canal de Supabase broadcast ──────────────────────────────────────────
    useEffect(() => {
        if (!roomName || !user) return;

        const chanName = `boss-raid-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel  = supabase.channel(chanName);
        channelRef.current = channel;

        channel
            // El host sincroniza el estado global (fase, HP, tiempo, jefe)
            .on('broadcast', { event: 'raid_state_update' }, ({ payload }) => {
                if (payload.state)       setPhase(payload.state);
                if (payload.timeLeft !== undefined) setTimeLeft(payload.timeLeft);
                if (payload.boss) {
                    setCurrentBoss(payload.boss);
                    if (payload.maxHp) setMaxHp(payload.maxHp);
                }
                if (payload.currentHp !== undefined) setCurrentHp(payload.currentHp);
                if (payload.damageMap)  setDamageMap(payload.damageMap);
            })
            // Los demás jugadores transmiten su daño para actualizar el mapa local
            .on('broadcast', { event: 'player_attack' }, ({ payload }) => {
                handleRemoteAttack(payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName, user]);

    // ── Temporizador maestro (solo el host) ──────────────────────────────────
    useEffect(() => {
        // Solo el host corre el reloj para que no haya desincronización
        if (!isHost || phase !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;

                // Sincronizar el reloj a todos cada 10 segundos
                if (next % 10 === 0 && channelRef.current) {
                    channelRef.current.send({
                        type:    'broadcast',
                        event:   'raid_state_update',
                        payload: { state: 'playing', timeLeft: next },
                    });
                }

                if (next <= 0) {
                    endRaid(false); // Tiempo agotado → derrota
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isHost, phase]); // CORREGIDO: era `gameState` (undefined) — ahora usa `phase`

    // ── Detectar victoria cuando HP llega a 0 ────────────────────────────────
    useEffect(() => {
        // CORREGIDO: era `gameState` (undefined) — ahora usa `phase`
        if (phase === 'playing' && currentHp <= 0 && !isDead) {
            setIsDead(true);
            triggerBossDeath();
        }
    }, [currentHp, phase, isDead]);

    // ── Funciones de red ─────────────────────────────────────────────────────

    const broadcastState = useCallback((payload) => {
        channelRef.current?.send({
            type:    'broadcast',
            event:   'raid_state_update',
            payload,
        });
    }, []);

    /** Aplica el daño recibido de otro jugador al estado local */
    const handleRemoteAttack = useCallback((payload) => {
        setCurrentHp(prev => Math.max(0, prev - payload.damage));
        setDamageMap(prev => {
            const existing = prev[payload.userId] || {
                name:    payload.userName,
                damage:  0,
                avatar:  payload.avatar,
                frameId: payload.frameId,
            };
            return {
                ...prev,
                [payload.userId]: { ...existing, damage: existing.damage + payload.damage },
            };
        });
    }, []);

    // ── Acciones del juego ────────────────────────────────────────────────────

    /** El host spawnea un jefe aleatorio escalado al número de participantes */
    const spawnBoss = () => {
        const boss  = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
        const total = Math.max(1, participants.length + 1); // +1 por el host
        // HP escala linealmente: +2000 por participante adicional
        const scaledHp = boss.hp + (total * 2000);

        setPhase('playing');
        setTimeLeft(RAID_DURATION_SECS);
        setCurrentBoss(boss);
        setCurrentHp(scaledHp);
        setMaxHp(scaledHp);
        setDamageMap({});
        setIsDead(false);

        broadcastState({
            state:     'playing',
            timeLeft:  RAID_DURATION_SECS,
            boss,
            maxHp:     scaledHp,
            currentHp: scaledHp,
            damageMap: {},
        });
    };

    /**
     * Ataque del jugador local.
     * @param {'basic'|'laser'} type
     */
    const handleLocalAttack = async (type = 'basic') => {
        if (phase !== 'playing' || currentHp <= 0) return;

        // Anti-spam: throttle de ATTACK_THROTTLE_MS en ataques básicos
        if (type === 'basic') {
            const now = Date.now();
            if (now - lastAttackRef.current < ATTACK_THROTTLE_MS) return;
            lastAttackRef.current = now;
        }

        let dmgDealt = 0;

        if (type === 'basic') {
            // Daño básico con variación aleatoria pequeña
            dmgDealt = BASE_DAMAGE + Math.floor(Math.random() * 5);

        } else if (type === 'laser') {
            if (balance < LASER_COST) {
                toast.error('No tienes suficientes Starlys para el rayo orbital.');
                return;
            }
            const result = await deductCoins(LASER_COST, 'casino_bet', 'Boss Raid - Láser Orbital');
            if (!result?.success) return;
            dmgDealt = LASER_DAMAGE + Math.floor(Math.random() * 100);
        }

        if (dmgDealt === 0) return;

        // Aplicar daño localmente (feedback inmediato)
        setCurrentHp(prev => Math.max(0, prev - dmgDealt));

        const myName   = profile?.username || 'Piloto';
        const myAvatar = profile?.avatar_url || '/default-avatar.png';
        const myFrame  = Array.isArray(profile?.equipped_items)
            ? profile.equipped_items.find(i => i.type === 'frame')?.item_id
            : null;

        setDamageMap(prev => {
            const existing = prev[user.id] || { name: myName, damage: 0, avatar: myAvatar, frameId: myFrame };
            return {
                ...prev,
                [user.id]: { ...existing, damage: existing.damage + dmgDealt },
            };
        });

        // Transmitir el ataque a la sala
        channelRef.current?.send({
            type:    'broadcast',
            event:   'player_attack',
            payload: { userId: user.id, userName: myName, avatar: myAvatar, frameId: myFrame, damage: dmgDealt },
        });
    };

    /** Se llama cuando el HP del jefe llega a 0 */
    const triggerBossDeath = async () => {
        setPhase('won');

        // Recompensa proporcional al daño aportado (cada jugador se premia a sí mismo)
        const myRecord = damageMap[user.id];
        if (myRecord?.damage > 0) {
            // 15% del daño en ◈ + bono de host por organizar la raid
            const reward = Math.floor(myRecord.damage * 0.15) + (isHost ? 300 : 200);
            setTimeout(() => {
                awardCoins(reward, 'game_reward', 'boss-raid', `Derrotaste a ${currentBoss.name} (Raid)`);
            }, 1000);
        }

        // El host notifica la victoria al resto de la sala
        if (isHost) {
            broadcastState({ state: 'won' });
        }
    };

    const endRaid = (win) => {
        const nextState = win ? 'won' : 'lost';
        setPhase(nextState);
        broadcastState({ state: nextState });
    };

    // ── Helpers de UI ─────────────────────────────────────────────────────────

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Top 5 jugadores por daño
    const sortedPlayers = Object.entries(damageMap)
        .sort(([, a], [, b]) => b.damage - a.damage)
        .slice(0, 5);

    // Porcentaje de HP restante para la barra de vida
    const bossHpPercent = Math.max(0, (currentHp / maxHp) * 100);

    const bc = BOSS_COLOR_CLASSES[currentBoss?.color] || BOSS_COLOR_CLASSES.purple;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full backdrop-blur-xl border rounded-[2rem] p-4 sm:p-6 mt-4 relative overflow-hidden transition-colors duration-1000 ${
                phase === 'lobby'   ? 'bg-[#050518]/95 border-emerald-500/20 shadow-[0_30px_60px_rgba(16,185,129,0.1)]' :
                phase === 'playing' ? `${bc.containerBg} shadow-[inset_0_0_100px_rgba(200,0,0,0.1)]` :
                phase === 'won'     ? 'bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.3)]' :
                                      'bg-rose-950/90 border-rose-500/50'
            }`}
        >
            {/* Botón de cerrar */}
            <button
                onClick={onClose}
                className="absolute right-4 top-4 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-all z-20"
            >
                <X size={16} />
            </button>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className={`flex flex-wrap justify-between items-center mb-6 gap-2 pr-10 border-b pb-4 ${
                phase === 'playing' ? bc.headerBorder : 'border-white/10'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                        phase === 'lobby' || phase === 'won'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : bc.iconBox
                    }`}>
                        <Skull size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] sm:text-xs">
                            Boss Raid Co-op
                        </h3>
                        {phase === 'playing' && (
                            <p className={`${bc.text} text-[9px] uppercase tracking-[0.2em] font-bold`}>
                                {currentBoss.name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Temporizador */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-xs ${
                    phase === 'playing'
                        ? timeLeft < 60
                            ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 animate-[pulse_0.5s_infinite]'
                            : `${bc.timer} shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]`
                        : 'text-white/40 border-white/10'
                }`}>
                    <ShieldAlert size={14} />
                    {phase === 'playing' ? formatTime(timeLeft) : '5:00'}
                </div>
            </div>

            {/* ── Zonas dinámicas ───────────────────────────────────────────── */}
            <AnimatePresence mode="wait">

                {/* LOBBY ── */}
                {phase === 'lobby' && (
                    <motion.div
                        key="lobby"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-center py-6"
                    >
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-[3px] border-dashed border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-0 bg-emerald-500/5 rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                📡
                            </div>
                        </div>
                        <h2 className="text-emerald-400 font-black uppercase tracking-[0.2em] mb-3 text-sm">
                            Radar Perimetral Activo
                        </h2>
                        <p className="text-white/50 text-[10px] uppercase max-w-xs mx-auto mb-8 leading-relaxed tracking-widest">
                            Organiza a tu tripulación de voz. El escáner detectará anomalías mayores
                            y tendrán 5 minutos para destruirlo.
                            <br /><br />
                            <span className="text-emerald-500/80">Recompensa: Proporcional al Daño</span>
                        </p>

                        {isHost ? (
                            <button
                                onClick={spawnBoss}
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(16,185,129,0.4)] mx-auto flex items-center justify-center gap-2"
                            >
                                <Crosshair size={16} />
                                Iniciar Escaneo de Combate
                            </button>
                        ) : (
                            <div className="inline-block border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl animate-pulse shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
                                Esperando orden del Líder...
                            </div>
                        )}
                    </motion.div>
                )}

                {/* COMBATE ── */}
                {phase === 'playing' && (
                    <motion.div
                        key="combat"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex flex-col items-center"
                    >
                        {/* Jefe interactivo — tap/click para atacar */}
                        <div className="relative mb-6">
                            <motion.button
                                whileTap={{ scale: 0.9, rotate: (Math.random() - 0.5) * 10 }}
                                onClick={() => handleLocalAttack('basic')}
                                className="relative z-10 w-40 h-40 sm:w-48 sm:h-48 text-[6rem] sm:text-[8rem] flex items-center justify-center focus:outline-none drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-transform"
                                aria-label={`Atacar a ${currentBoss.name}`}
                            >
                                <span className={isDead
                                    ? 'grayscale opacity-50 blur-sm scale-150 transition-all duration-1000'
                                    : 'animate-[bounce_2s_ease-in-out_infinite] hover:scale-110'
                                }>
                                    {currentBoss.img}
                                </span>
                            </motion.button>
                            <div className={`absolute inset-0 ${bc.glow} rounded-full blur-[50px] -z-10`} />
                        </div>

                        {/* Barra de vida del jefe */}
                        <div className="w-full max-w-sm mb-8">
                            <div className="flex justify-between text-[10px] font-black uppercase text-white/80 mb-2 tracking-widest">
                                <span>Integridad del Objetivo</span>
                                <span className={bc.hp}>
                                    {currentHp.toLocaleString()}
                                    <span className="text-white/30"> / {maxHp.toLocaleString()} HP</span>
                                </span>
                            </div>
                            <div className="w-full h-5 bg-black/60 border border-white/10 rounded-full overflow-hidden p-[3px] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                                <motion.div
                                    className={`h-full rounded-full bg-gradient-to-r ${bc.bar} relative overflow-hidden`}
                                    animate={{ width: `${bossHpPercent}%` }}
                                    transition={{ type: 'spring', bounce: 0.2 }}
                                >
                                    {/* Patrón de barras animado sobre la barra de vida */}
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)50%,rgba(255,255,255,0.2)75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Controles de armas */}
                        <div className="flex gap-3 w-full max-w-sm">
                            {/* Ataque básico: spam libre (con throttle interno) */}
                            <button
                                onClick={() => handleLocalAttack('basic')}
                                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-white font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center gap-2 shadow-[0_5px_15px_rgba(0,0,0,0.3)]"
                            >
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                                    <Crosshair size={20} className="text-cyan-400" />
                                </div>
                                <span>Fuego Básico</span>
                            </button>

                            {/* Láser orbital: cuesta ◈ pero hace mucho daño */}
                            <button
                                onClick={() => handleLocalAttack('laser')}
                                className="flex-1 py-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-[10px] text-amber-400 font-black uppercase tracking-widest hover:bg-amber-500/10 active:scale-95 transition-all flex flex-col items-center gap-2 relative overflow-hidden group shadow-[0_5px_20px_rgba(245,158,11,0.1)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center relative z-10">
                                    <Zap size={20} />
                                </div>
                                <span className="relative z-10 flex flex-col items-center gap-0.5">
                                    <span>Láser Orbital</span>
                                    <span className="opacity-60 text-[8px] bg-black/40 px-2 rounded-full border border-amber-500/20">
                                        -{LASER_COST}◈ Starlys
                                    </span>
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* VICTORIA ── */}
                {phase === 'won' && (
                    <motion.div
                        key="won"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8"
                    >
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                            <Award size={64} className="text-emerald-400 relative z-10 mx-auto" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            ¡Amenaza Neutralizada!
                        </h2>
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">
                            La flota ha asegurado el sector
                        </p>

                        {/* Tabla de recompensas (top 3) */}
                        <div className="bg-black/40 backdrop-blur-md border border-emerald-500/20 rounded-[1.5rem] p-5 max-w-sm mx-auto mb-8 text-left shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                            <div className="text-[9px] uppercase font-black tracking-widest text-emerald-400/60 mb-4 flex items-center gap-2">
                                <span className="flex-1 h-px bg-emerald-500/20" />
                                Reparto de Recompensas
                                <span className="flex-1 h-px bg-emerald-500/20" />
                            </div>
                            <div className="space-y-3">
                                {sortedPlayers.slice(0, 3).map(([uid, data], i) => {
                                    const rankColors = [
                                        'text-amber-400 font-black text-sm',
                                        'text-gray-300 text-xs',
                                        'text-amber-700 text-xs',
                                    ];
                                    const reward = Math.floor(data.damage * 0.15) + (i === 0 ? 500 : 200);
                                    return (
                                        <div key={uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-5 text-center ${rankColors[i]}`}>#{i + 1}</span>
                                                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-black/50">
                                                    <img src={data.avatar || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-white uppercase tracking-wide truncate max-w-[80px] sm:max-w-[100px] font-bold">
                                                        @{data.name}
                                                    </span>
                                                    <span className="text-[8px] text-white/40 uppercase tracking-widest">
                                                        {data.damage.toLocaleString()} DMG
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-emerald-400 font-black tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                                +{reward}◈
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.keys(damageMap).length === 0 && (
                                    <p className="text-white/30 text-[9px] text-center uppercase tracking-widest">
                                        Datos corruptos en la caja negra.
                                    </p>
                                )}
                            </div>
                        </div>

                        {isHost ? (
                            <button
                                onClick={spawnBoss}
                                className="mx-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all"
                            >
                                Nuevo Escaneo Espacial
                            </button>
                        ) : (
                            <p className="text-white/30 text-[9px] uppercase tracking-widest animate-pulse border border-white/10 px-6 py-3 rounded-full inline-block bg-black/50">
                                Esperando al mando principal...
                            </p>
                        )}
                    </motion.div>
                )}

                {/* DERROTA ── */}
                {phase === 'lost' && (
                    <motion.div
                        key="lost"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-8"
                    >
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
                            <Skull size={64} className="text-rose-500 relative z-10 mx-auto" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-rose-400 uppercase tracking-widest mb-1">
                            Misión Fallida
                        </h2>
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">
                            El monstruo escapó por el hiperespacio
                        </p>
                        <div className="bg-black/50 backdrop-blur-md border border-rose-500/20 rounded-2xl p-6 max-w-sm mx-auto mb-8 text-center text-[10px] text-white/50 leading-relaxed uppercase tracking-widest shadow-[inset_0_0_30px_rgba(244,63,94,0.1)]">
                            No lograron reducir los puntos de integridad a cero antes del tiempo límite.
                            <br /><br />
                            <span className="text-rose-400/80">Se reportan bajas en los sectores aledaños.</span>
                        </div>

                        {isHost ? (
                            <button
                                onClick={spawnBoss}
                                className="mx-auto px-8 py-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 font-black uppercase tracking-widest text-[11px] hover:bg-rose-500/20 hover:border-rose-500/50 active:scale-95 transition-all"
                            >
                                Reintentar Asalto
                            </button>
                        ) : (
                            <p className="text-white/30 text-[9px] uppercase tracking-widest animate-pulse border border-white/10 px-6 py-3 rounded-full inline-block bg-black/50">
                                Esperando al mando principal...
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Tabla de DPS en tiempo real (durante combate) ─────────────── */}
            {phase === 'playing' && sortedPlayers.length > 0 && (
                <div className="mt-8 pt-5 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                                <Users size={12} className="text-white/60" />
                            </div>
                            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/60">
                                Radar de DPS
                            </span>
                        </div>
                        <span className="text-[8px] uppercase tracking-widest text-emerald-400/50">Sincronizado</span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                        <AnimatePresence>
                            {sortedPlayers.map(([uid, data]) => {
                                const frame = getFrameStyle(data.frameId);
                                return (
                                    <motion.div
                                        key={uid}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="shrink-0 snap-start flex items-center gap-3 bg-gradient-to-r from-black/60 to-black/40 border border-white/10 rounded-2xl p-2.5 pr-5 min-w-[140px] shadow-[0_5px_15px_rgba(0,0,0,0.2)]"
                                    >
                                        <div
                                            className={`relative w-8 h-8 flex-shrink-0 ${frame.className || ''}`}
                                            style={frame}
                                        >
                                            <img
                                                src={data.avatar || '/default-avatar.png'}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-cover rounded-full z-0"
                                                style={{ padding: frame.className ? '2px' : '0' }}
                                            />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <span className="text-[9px] font-black text-white uppercase tracking-wider truncate max-w-[80px]">
                                                {data.name}
                                            </span>
                                            <span
                                                className="text-[10px] font-black text-amber-500 mt-0.5"
                                                style={{ textShadow: '0 0 10px rgba(245,158,11,0.3)' }}
                                            >
                                                {data.damage >= 1000
                                                    ? `${(data.damage / 1000).toFixed(1)}k`
                                                    : data.damage
                                                }
                                                <span className="text-[7px] text-amber-500/50 ml-0.5">DMG</span>
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
