import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Skull, Zap, Crosshair, Users, ShieldAlert, Award } from 'lucide-react';
import { useLocalParticipant, useParticipants } from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { getFrameStyle } from '../../utils/styles';

const BOSS_TYPES = [
    { id: 'leviathan', name: 'Leviatán del Vacío', hp: 5000, img: '👾', color: 'purple' },
    { id: 'destroyer', name: 'Destructor Gt-9', hp: 8000, img: '🤖', color: 'rose' },
    { id: 'behemoth', name: 'Behemoth Solar', hp: 12000, img: '🌞', color: 'amber' },
];

// Mapa estático de colores para que Tailwind JIT los incluya en el build
const BOSS_COLOR_CLASSES = {
    purple: {
        containerBg: 'bg-purple-950/80 border-purple-500/30',
        headerBorder: 'border-purple-500/20',
        iconBox: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        text: 'text-purple-400',
        timer: 'text-purple-400 border-purple-500/20 bg-black/40',
        glow: 'bg-purple-500/20',
        bar: 'from-purple-600 to-purple-400',
        hp: 'text-purple-400',
    },
    rose: {
        containerBg: 'bg-rose-950/80 border-rose-500/30',
        headerBorder: 'border-rose-500/20',
        iconBox: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        text: 'text-rose-400',
        timer: 'text-rose-400 border-rose-500/20 bg-black/40',
        glow: 'bg-rose-500/20',
        bar: 'from-rose-600 to-rose-400',
        hp: 'text-rose-400',
    },
    amber: {
        containerBg: 'bg-amber-950/80 border-amber-500/30',
        headerBorder: 'border-amber-500/20',
        iconBox: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        text: 'text-amber-400',
        timer: 'text-amber-400 border-amber-500/20 bg-black/40',
        glow: 'bg-amber-500/20',
        bar: 'from-amber-600 to-amber-400',
        hp: 'text-amber-400',
    },
};

export default function BossRaid({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    const { balance, awardCoins, deductCoins } = useEconomy();
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    // Rango de daños según tipo de equipo (Visual / Simulado)
    const baseDamage = 10;
    const laserCost = 100;
    const laserDamage = 500;

    // Core Game State
    const [phase, setPhase] = useState('lobby'); // lobby, playing, won, lost
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutos = 300s
    const [currentBoss, setCurrentBoss] = useState(BOSS_TYPES[0]);
    const [currentHp, setCurrentHp] = useState(BOSS_TYPES[0].hp);
    const [damageMap, setDamageMap] = useState({}); // { userId: { name, damage } }
    const [isDead, setIsDead] = useState(false);

    const channelRef = useRef(null);

    // isHost determina quién controla el spawn inicial y el cronómetro principal
    const isHost = participants.length === 0 || localParticipant?.identity === participants[0]?.identity;

    // --- 1. Sincronización Realtime (Supabase Channels) ---
    useEffect(() => {
        if (!roomName || !user) return;

        const channelName = `boss-raid-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'raid_state_update' }, ({ payload }) => {
                setPhase(payload.state);
                if (payload.timeLeft !== undefined) setTimeLeft(payload.timeLeft);
                if (payload.boss) setCurrentBoss(payload.boss);
                if (payload.currentHp !== undefined) setCurrentHp(payload.currentHp);
                if (payload.damageMap) setDamageMap(payload.damageMap);
            })
            .on('broadcast', { event: 'player_attack' }, ({ payload }) => {
                handleRemoteAttack(payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName, user]);

    // --- 2. Cronómetro Maestro (Solo el Host) ---
    useEffect(() => {
        if (!isHost || phase !== 'playing' || timeLeft <= 0 || currentHp <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newTime = prev - 1;
                // Sincronizar el reloj cada 10 segundos
                if (newTime % 10 === 0) {
                    broadcastState({ state: 'playing', timeLeft: newTime });
                }

                if (newTime <= 0) {
                    endRaid(false); // Fracaso por tiempo
                    return 0;
                }
                return newTime;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState, timeLeft, currentHp, isHost]);

    // Verificar Victoria (Cualquiera comprueba la vida localmente, pero idealmente el líder cierra)
    useEffect(() => {
        if (phase === 'playing' && currentHp <= 0 && !isDead) {
            setIsDead(true);
            triggerBossDeath();
        }
    }, [currentHp, gameState, isDead]);


    // --- Funciones de Lógica ---
    const broadcastState = (payload) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'raid_state_update',
            payload
        });
    };

    const spawnBoss = () => {
        const randBoss = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
        // Escala la vida según la cantidad de tripulantes (x 1000 por participante)
        const totalParticipants = Math.max(1, participants.length + 1); // +1 por mi
        const scaledHp = randBoss.hp + (totalParticipants * 2000);

        setPhase('playing');
        setTimeLeft(300); // 5 min
        setCurrentBoss(randBoss);
        setCurrentHp(scaledHp);
        setDamageMap({});
        setIsDead(false);

        broadcastState({
            state: 'playing',
            timeLeft: 300,
            boss: randBoss,
            currentHp: scaledHp,
            damageMap: {}
        });
    };

    const handleRemoteAttack = (payload) => {
        setCurrentHp(prev => Math.max(0, prev - payload.damage));
        setDamageMap(prev => {
            const current = prev[payload.userId] || { name: payload.userName, damage: 0, avatar: payload.avatar, frameId: payload.frameId };
            return {
                ...prev,
                [payload.userId]: { ...current, damage: current.damage + payload.damage }
            };
        });
    };

    const handleLocalAttack = async (type = 'basic') => {
        if (phase !== 'playing' || currentHp <= 0) return;

        // Throttling o coste
        let dmgDealt = 0;

        if (type === 'basic') {
            // Un clic simple (hacer spam)
            dmgDealt = baseDamage + Math.floor(Math.random() * 5);
        } else if (type === 'laser') {
            // Coste premium
            if (balance < laserCost) return alert('No tienes suficientes Starlys para el rayo orbital.');

            const result = await deductCoins(laserCost, 'casino_bet', 'Punto Cero / Boss Raid Laser');
            if (!result?.success) return;

            dmgDealt = laserDamage + Math.floor(Math.random() * 100);
            // Mostrar efecto superlaser (vibrar o sonido heavy)
        }

        // Aplico mi daño localmente para feedback inmediato
        setCurrentHp(prev => Math.max(0, prev - dmgDealt));

        const myName = profile?.username || 'Piloto';
        const myAvatar = profile?.avatar_url || '/default-avatar.png';
        const myFrame = Array.isArray(profile?.equipped_items) ? profile.equipped_items.find(i => i.type === 'frame')?.item_id : null;

        setDamageMap(prev => {
            const current = prev[user.id] || { name: myName, damage: 0, avatar: myAvatar, frameId: myFrame };
            return {
                ...prev,
                [user.id]: { ...current, damage: current.damage + dmgDealt }
            };
        });

        // Lo transmito a la red
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'player_attack',
                payload: { userId: user.id, userName: myName, avatar: myAvatar, frameId: myFrame, damage: dmgDealt }
            });
        }
    };

    const triggerBossDeath = async () => {
        setPhase('won');

        // Reparto de botín! Cada uno cobra según su daño y solo su propio daño local para no duplicar SQL
        const myDamageRecord = damageMap[user.id];
        if (myDamageRecord && myDamageRecord.damage > 0) {
            // Recompensa base = Daño / 10 (Ej: 1000 de daño = 100 starlys) + Bono por matarlo
            const reward = Math.floor(myDamageRecord.damage * 0.15) + (isHost ? 300 : 200);
            setTimeout(() => {
                awardCoins(reward, 'game_reward', 'boss-raid', `Derrotaste a ${currentBoss.name} (Raid)`);
            }, 1000);
        }

        if (isHost) {
            broadcastState({ state: 'won' });
        }
    };

    const endRaid = (win) => {
        const nextState = win ? 'won' : 'lost';
        setPhase(nextState);
        broadcastState({ state: nextState });
    };

    // --- UI Helpers ---
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Sort players by damage
    const sortedPlayers = Object.entries(damageMap)
        .sort(([, a], [, b]) => b.damage - a.damage)
        .slice(0, 5); // top 5

    const getBossHealthPercentage = () => {
        return Math.max(0, (currentHp / currentBoss.hp) * 100);
    };

    const bc = BOSS_COLOR_CLASSES[currentBoss?.color] || BOSS_COLOR_CLASSES.purple;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full backdrop-blur-xl border rounded-[2rem] p-4 sm:p-6 mt-4 relative overflow-hidden transition-colors duration-1000 ${phase === 'lobby' ? 'bg-[#050518]/95 border-emerald-500/20 shadow-[0_30px_60px_rgba(16,185,129,0.1)]' :
                phase === 'playing' ? `${bc.containerBg} shadow-[inset_0_0_100px_rgba(200,0,0,0.1)]` :
                    phase === 'won' ? 'bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_80px_rgba(16,185,129,0.3)]' :
                        'bg-rose-950/90 border-rose-500/50'
                }`}
        >
            <button onClick={onClose} className="absolute right-4 top-4 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-all z-20">
                <X size={16} />
            </button>

            {/* Cabecera Táctica */}
            <div className={`flex flex-wrap justify-between items-center mb-6 gap-2 pr-10 border-b pb-4 ${phase === 'playing' ? bc.headerBorder : 'border-white/10'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${phase === 'lobby' || phase === 'won' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : bc.iconBox}`}>
                        <Skull size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-black uppercase tracking-widest text-[10px] sm:text-xs">Boss Raid Co-op</h3>
                        {phase === 'playing' && <p className={`${bc.text} text-[9px] uppercase tracking-[0.2em] font-bold`}>{currentBoss.name}</p>}
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-xs ${phase === 'playing' ? (timeLeft < 60 ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 animate-[pulse_0.5s_infinite]' : `${bc.timer} shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]`)
                    : 'text-white/40 border-white/10'
                    }`}>
                    <ShieldAlert size={14} />
                    {phase === 'playing' ? formatTime(timeLeft) : '0:00'}
                </div>
            </div>

            {/* Zonas Dinámicas: Lobby, Combate, Derrota, Victoria */}
            <AnimatePresence mode="wait">
                {phase === 'lobby' && (
                    <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 border-[3px] border-dashed border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                            <div className="absolute inset-0 bg-emerald-500/5 rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">📡</div>
                        </div>
                        <h2 className="text-emerald-400 font-black uppercase tracking-[0.2em] mb-3 text-sm">Radar Perimetral Activo</h2>
                        <p className="text-white/50 text-[10px] uppercase max-w-xs mx-auto mb-8 leading-relaxed tracking-widest">
                            Organiza a tu tripulación de voz. El escáner detectará anomalías mayores
                            y tendrán 5 minutos para destruirlo. <br /><br />
                            <span className="text-emerald-500/80">Recompensa: Proporcional al Daño</span>
                        </p>

                        {isHost ? (
                            <button onClick={spawnBoss} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(16,185,129,0.4)] mx-auto flex items-center justify-center gap-2">
                                <Crosshair size={16} /> Iniciar Escaneo de Combate
                            </button>
                        ) : (
                            <div className="inline-block border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl animate-pulse shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
                                Esperando orden del Líder...
                            </div>
                        )}
                    </motion.div>
                )}

                {phase === 'playing' && (
                    <motion.div key="combat" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center">
                        {/* Monstruo Interactivo */}
                        <div className="relative mb-6">
                            <motion.button
                                whileTap={{ scale: 0.9, rotate: (Math.random() - 0.5) * 10 }}
                                onClick={() => handleLocalAttack('basic')}
                                className="relative z-10 w-40 h-40 sm:w-48 sm:h-48 text-[6rem] sm:text-[8rem] flex items-center justify-center focus:outline-none drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-transform"
                            >
                                <span className={isDead ? 'grayscale opacity-50 blur-sm scale-150 transition-all duration-1000' : 'animate-[bounce_2s_ease-in-out_infinite] hover:scale-110'}>{currentBoss.img}</span>
                            </motion.button>
                            <div className={`absolute inset-0 ${bc.glow} rounded-full blur-[50px] -z-10`} />
                        </div>

                        {/* Barra de Vida Global */}
                        <div className="w-full max-w-sm mb-8">
                            <div className="flex justify-between text-[10px] font-black uppercase text-white/80 mb-2 tracking-widest">
                                <span>Integridad del Objetivo</span>
                                <span className={bc.hp}>{currentHp.toLocaleString()} <span className="text-white/30">/ {currentBoss.hp.toLocaleString()} HP</span></span>
                            </div>
                            <div className="w-full h-5 bg-black/60 border border-white/10 rounded-full overflow-hidden p-[3px] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                                <motion.div
                                    className={`h-full rounded-full bg-gradient-to-r ${bc.bar} w-full relative overflow-hidden`}
                                    animate={{ width: `${getBossHealthPercentage()}%` }}
                                    transition={{ type: "spring", bounce: 0.2 }}
                                >
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)50%,rgba(255,255,255,0.2)75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[slide_1s_linear_infinite]" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Controles de Armas */}
                        <div className="flex gap-3 w-full max-w-sm">
                            <button onClick={() => handleLocalAttack('basic')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] text-white font-black uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex flex-col items-center gap-2 shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                                    <Crosshair size={20} className="text-cyan-400" />
                                </div>
                                <span>Fuego Básico</span>
                            </button>

                            <button
                                onClick={() => handleLocalAttack('laser')}
                                className="flex-1 py-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-[10px] text-amber-400 font-black uppercase tracking-widest hover:bg-amber-500/10 active:scale-95 transition-all flex flex-col items-center gap-2 relative overflow-hidden group shadow-[0_5px_20px_rgba(245,158,11,0.1)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center relative z-10 group-active:text-white">
                                    <Zap size={20} className="" />
                                </div>
                                <span className="relative z-10 flex flex-col items-center gap-0.5">
                                    <span>Láser Orbital</span>
                                    <span className="opacity-60 text-[8px] bg-black/40 px-2 rounded-full border border-amber-500/20">-100◈ Starlys</span>
                                </span>
                            </button>
                        </div>
                    </motion.div>
                )}

                {phase === 'won' && (
                    <motion.div key="won" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                            <Award size={64} className="text-emerald-400 relative z-10 mx-auto" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">¡Amenaza Neutralizada!</h2>
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">La flota ha asegurado el sector</p>

                        <div className="bg-black/40 backdrop-blur-md border border-emerald-500/20 rounded-[1.5rem] p-5 max-w-sm mx-auto mb-8 text-left shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                            <div className="text-[9px] uppercase font-black tracking-widest text-emerald-400/60 mb-4 flex items-center gap-2">
                                <span className="flex-1 h-px bg-emerald-500/20" />
                                Reparto de Recompensas
                                <span className="flex-1 h-px bg-emerald-500/20" />
                            </div>
                            <div className="space-y-3">
                                {sortedPlayers.slice(0, 3).map(([uid, data], i) => {
                                    const rankColors = ['text-amber-400 font-black text-sm', 'text-gray-300 text-xs', 'text-amber-700 text-xs'];
                                    const payout = Math.floor(data.damage * 0.15) + (uid === Object.keys(damageMap).find(k => damageMap[k].damage === Math.max(...Object.values(damageMap).map(d => d.damage))) ? 500 : 200);
                                    return (
                                        <div key={uid} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-5 text-center ${rankColors[i]}`}>#{i + 1}</span>
                                                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-black/50">
                                                    <img src={data.avatar || '/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-white uppercase tracking-wide truncate max-w-[80px] sm:max-w-[100px] font-bold">@{data.name}</span>
                                                    <span className="text-[8px] text-white/40 uppercase tracking-widest">{data.damage.toLocaleString()} DMG</span>
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-emerald-400 font-black tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">+{payout}◈</div>
                                        </div>
                                    )
                                })}
                                {Object.keys(damageMap).length === 0 && <p className="text-white/30 text-[9px] text-center uppercase tracking-widest">Datos corruptos en la caja negra.</p>}
                            </div>
                        </div>

                        {isHost ? (
                            <button onClick={spawnBoss} className="mx-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] font-black uppercase tracking-widest text-[11px] hover:scale-105 active:scale-95 transition-all">
                                Nuevo Escaneo Espacial
                            </button>
                        ) : (
                            <p className="text-white/30 text-[9px] uppercase tracking-widest animate-pulse border border-white/10 px-6 py-3 rounded-full inline-block bg-black/50">Esperando al mando principal...</p>
                        )}
                    </motion.div>
                )}

                {phase === 'lost' && (
                    <motion.div key="lost" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse" />
                            <Skull size={64} className="text-rose-500 relative z-10 mx-auto" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-rose-400 uppercase tracking-widest mb-1">Misión Fallida</h2>
                        <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.3em] mb-8">El monstruo escapó por el hiperespacio</p>

                        <div className="bg-black/50 backdrop-blur-md border border-rose-500/20 rounded-2xl p-6 max-w-sm mx-auto mb-8 text-center text-[10px] text-white/50 leading-relaxed uppercase tracking-widest shadow-[inset_0_0_30px_rgba(244,63,94,0.1)]">
                            No lograron reducir los puntos de integridad a cero antes de que se acabara el tiempo límite. <br /><br /><span className="text-rose-400/80">Se reportan bajas en los sectores aledaños.</span>
                        </div>

                        {isHost ? (
                            <button onClick={spawnBoss} className="mx-auto px-8 py-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 font-black uppercase tracking-widest text-[11px] hover:bg-rose-500/20 hover:border-rose-500/50 active:scale-95 transition-all">
                                Reintentar Asalto
                            </button>
                        ) : (
                            <p className="text-white/30 text-[9px] uppercase tracking-widest animate-pulse border border-white/10 px-6 py-3 rounded-full inline-block bg-black/50">Esperando al mando principal...</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabla de Daño Flotante (DPS Meter) */}
            {phase === 'playing' && sortedPlayers.length > 0 && (
                <div className="mt-8 pt-5 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
                                <Users size={12} className="text-white/60" />
                            </div>
                            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/60">Radar de DPS</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-widest text-emerald-400/50">Sincronizado</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                        <AnimatePresence>
                            {Object.entries(damageMap).length === 0 ? (
                                <div className="text-[9px] uppercase tracking-widest text-white/20 py-2 w-full text-center border border-white/5 rounded-xl border-dashed">Sin impactos registrados</div>
                            ) : sortedPlayers.map(([uid, data]) => {
                                const frame = getFrameStyle(data.frameId);
                                return (
                                    <motion.div
                                        key={uid}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="shrink-0 snap-start flex items-center gap-3 bg-gradient-to-r from-black/60 to-black/40 border border-white/10 rounded-2xl p-2.5 pr-5 min-w-[140px] shadow-[0_5px_15px_rgba(0,0,0,0.2)]"
                                    >
                                        <div className={`relative w-8 h-8 flex-shrink-0 ${frame.className || ''}`} style={frame}>
                                            <img src={data.avatar || '/default-avatar.png'} alt="" className="absolute inset-0 w-full h-full object-cover rounded-full z-0" style={{ padding: frame.className ? '2px' : '0' }} />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <span className="text-[9px] font-black text-white uppercase tracking-wider truncate max-w-[80px]">{data.name}</span>
                                            <span className="text-[10px] font-black text-amber-500 mt-0.5" style={{ textShadow: '0 0 10px rgba(245,158,11,0.3)' }}>
                                                {data.damage >= 1000 ? `${(data.damage / 1000).toFixed(1)}k` : data.damage} <span className="text-[7px] text-amber-500/50 ml-0.5">DMG</span>
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
