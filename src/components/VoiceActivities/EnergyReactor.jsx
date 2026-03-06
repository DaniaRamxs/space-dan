import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, ShieldAlert, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useEconomy } from '../../contexts/EconomyContext';

export default function EnergyReactor({ roomName }) {
    const { balance, deductCoins } = useEconomy();
    const [energy, setEnergy] = useState(0);
    const [level, setLevel] = useState(1);
    const [target, setTarget] = useState(1000);
    const [isBonusActive, setIsBonusActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!roomName) return;

        // Normalizar nombre de sala para el ID de base de datos
        const roomKey = roomName.toLowerCase().trim();

        const fetchState = async () => {
            try {
                const { data, error } = await supabase
                    .from('voice_room_reactors')
                    .select('*')
                    .eq('room_name', roomKey)
                    .maybeSingle();

                if (data) {
                    updateLocalState(data);
                } else {
                    // Si no existe, intentar crear uno inicial (upsert por si alguien más lo creó al mismo tiempo)
                    const { data: newData } = await supabase
                        .from('voice_room_reactors')
                        .upsert({
                            room_name: roomKey,
                            energy: 0,
                            level: 1,
                            target: 1000,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'room_name' })
                        .select()
                        .single();

                    if (newData) updateLocalState(newData);
                }
            } catch (err) {
                console.error('[Reactor] Init error:', err);
            }
        };

        fetchState();

        const channel = supabase.channel(`reactor:${roomKey}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'voice_room_reactors',
                filter: `room_name=eq."${roomKey}"` // Fix for spaces
            }, payload => {
                updateLocalState(payload.new);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomName]);

    // Timer para el bonus (actualización por segundo)
    useEffect(() => {
        if (!isBonusActive) return;

        const interval = setInterval(() => {
            const fetchCurrent = async () => {
                const { data } = await supabase
                    .from('voice_room_reactors')
                    .select('bonus_expires_at')
                    .eq('room_name', roomName.toLowerCase().trim())
                    .single();

                if (data?.bonus_expires_at) {
                    const expires = new Date(data.bonus_expires_at);
                    const now = new Date();
                    if (expires <= now) {
                        setIsBonusActive(false);
                        setTimeLeft(null);
                    } else {
                        setTimeLeft(Math.ceil((expires - now) / 60000));
                    }
                }
            };
            fetchCurrent();
        }, 10000); // Cada 10s para no saturar

        return () => clearInterval(interval);
    }, [isBonusActive, roomName]);

    const updateLocalState = (data) => {
        if (!data) return;
        console.log('[Reactor] Update local state:', data);
        setEnergy(data.energy ?? 0);
        setLevel(data.level ?? 1);
        setTarget(data.target ?? 1000);

        if (data.bonus_expires_at) {
            const expires = new Date(data.bonus_expires_at);
            const now = new Date();
            const isActive = expires > now;
            setIsBonusActive(isActive);
            if (isActive) {
                setTimeLeft(Math.ceil((expires - now) / 60000));
            } else {
                setTimeLeft(null);
            }
        } else {
            setIsBonusActive(false);
            setTimeLeft(null);
        }
    };

    const injectEnergy = async (amount) => {
        if (balance < amount || isUpdating) {
            console.log('[Reactor] Pre-check failed:', { balance, amount, isUpdating });
            return;
        }

        const roomKey = roomName.toLowerCase().trim();
        setIsUpdating(true);
        console.log('[Reactor] Injecting energy:', { roomKey, amount });

        try {
            const result = await deductCoins(amount, 'activity', `Inyección de energía: ${roomName}`);
            console.log('[Reactor] Coin deduction result:', result);

            if (!result?.success) {
                console.error('[Reactor] Coin deduction failed');
                setIsUpdating(false);
                return;
            }

            // Usamos RPC para suma atómica y level up automático
            console.log('[Reactor] Calling RPC inject_reactor_energy...');
            const { data: newState, error } = await supabase.rpc('inject_reactor_energy', {
                p_room_name: roomKey,
                p_amount: amount
            });

            if (error) {
                console.error('[Reactor] RPC Error:', error);
                throw error;
            }

            console.log('[Reactor] RPC Success, new state:', newState);
            if (newState) {
                updateLocalState(newState);
            }

        } catch (err) {
            console.error('[Reactor] Error injecting energy:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    const progress = (energy / target) * 100;

    return (
        <div className="w-full mb-6 relative z-10 px-0 sm:px-2">
            <motion.div
                layout
                className={`relative p-4 rounded-[2rem] border transition-all duration-700 ${isBonusActive
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
            >
                {/* Background Glows */}
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

                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl transition-all duration-500 ${isBonusActive ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-cyan-500/20 text-cyan-400'
                            }`}>
                            {isBonusActive ? <Sparkles size={16} className="animate-spin-slow" /> : <Zap size={16} fill="currentColor" />}
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                Reactor Sala {roomName}
                                <span className="text-white/40 font-bold bg-white/5 px-2 py-0.5 rounded-full text-[8px]">LVL {level}</span>
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isBonusActive ? 'bg-amber-500' : 'bg-cyan-400'}`} />
                                <span className={`text-[8px] font-bold uppercase tracking-widest ${isBonusActive ? 'text-amber-500' : 'text-cyan-400/60'}`}>
                                    {isBonusActive ? `Mega-Bonus Activo: Double XP (${timeLeft}m)` : 'Cargando Núcleo Estelar'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            disabled={isUpdating || balance < 100}
                            onClick={() => injectEnergy(100)}
                            className="group relative px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <TrendingUp size={12} className="text-white/40 group-hover:text-white transition-colors" />
                                +100◈
                            </span>
                        </button>
                    </div>
                </div>

                {/* Progress Tracks */}
                <div className="space-y-2">
                    <div className="relative w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 50, damping: 20 }}
                            className={`absolute top-0 left-0 h-full relative ${isBonusActive
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
                            Contribución Colectiva requerida
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
