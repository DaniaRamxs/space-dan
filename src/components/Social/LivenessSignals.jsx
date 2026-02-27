import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Radio, Activity } from 'lucide-react';

export default function LivenessSignals() {
    const { user } = useAuthContext();
    const [onlineCount, setOnlineCount] = useState(0);
    const [visits, setVisits] = useState('------');

    useEffect(() => {
        // Fetch visits counter
        fetch('https://api.counterapi.dev/v1/space-dan.netlify/visits/up')
            .then(r => r.json())
            .then(data => setVisits(String(data.count).padStart(6, '0')))
            .catch(() => setVisits('??????'));

        const channel = supabase.channel('global_liveness', {
            config: {
                presence: {
                    key: user?.id || 'anonymous-' + Math.random().toString(36).substr(2, 9),
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setOnlineCount(Object.keys(state).length);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        username: user?.user_metadata?.username || 'Guest',
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between p-4 rounded-[24px] bg-white/[0.02] border border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <Radio size={18} strokeWidth={1.5} className="text-purple-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#050510] animate-pulse" />
                    </div>

                    <div className="flex flex-col">
                        <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 font-mono">
                            Visitas_Sistema
                        </h4>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white tabular-nums">
                                {visits}
                            </span>
                            <span className="text-[8px] font-semibold text-emerald-500/40 uppercase tracking-[0.15em] font-mono">
                                {onlineCount} online
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 pr-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[8px] font-semibold text-white/10 uppercase tracking-[0.2em] font-mono">
                            _Señal_Global
                        </span>
                        <div className="flex gap-1 items-end h-3">
                            {[...Array(5)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [4, 12, 6, 10, 4] }}
                                    transition={{
                                        duration: 1 + Math.random(),
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: i * 0.1
                                    }}
                                    className="w-0.5 bg-purple-500/30 rounded-full"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-purple-500/20 transition-all cursor-default">
                        <Activity size={14} strokeWidth={1.5} className="text-white/20 group-hover:text-purple-400 transition-colors" />
                        <span className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.2em] font-mono group-hover:text-white/40 transition-colors">ESTADO_ESTABLE</span>
                    </div>
                </div>
            </div>

            {/* Línea de vida sutil que recorre la parte superior del feed */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mt-4 relative overflow-hidden">
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"
                />
            </div>
        </div>
    );
}
