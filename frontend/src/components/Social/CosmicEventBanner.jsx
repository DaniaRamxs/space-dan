import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cosmicEventsService } from '../../services/cosmicEventsService';
import { Zap, Timer, Info } from 'lucide-react';
import { useCosmic } from '../Effects/CosmicProvider';

export default function CosmicEventBanner() {
    const location = useLocation();
    const [event, setEvent] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const { toggleStarRain } = useCosmic();

    useEffect(() => {
        // No mostrar en perfiles individuales para mantener inmersión total
        if (location.pathname.startsWith('/@')) {
            setEvent(null);
            return;
        }

        const checkEvent = async () => {
            const active = await cosmicEventsService.getActiveEvent();
            setEvent(active);

            // Disparar discretamente el scheduler si es necesario
            cosmicEventsService.checkAutoEvent();
        };

        checkEvent();
        const interval = setInterval(checkEvent, 30000); // Check every 30s
        return () => {
            clearInterval(interval);
            toggleStarRain(false);
        };
    }, [location.pathname, toggleStarRain]);

    useEffect(() => {
        if (event) {
            toggleStarRain(true);
        } else {
            toggleStarRain(false);
        }
    }, [event, toggleStarRain]);

    useEffect(() => {
        if (!event || !event.expires_at) return;

        const updateTimer = () => {
            const now = new Date();
            const end = new Date(event.expires_at);
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('Finalizado');
                setEvent(null);
                return;
            }

            const m = Math.floor(diff / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            const sf = s < 10 ? `0${s}` : s;

            setTimeLeft(`${m}:${sf}`);
        };

        updateTimer();
        const timerInterval = setInterval(updateTimer, 1000);
        return () => clearInterval(timerInterval);
    }, [event]);

    if (!event) return null;

    const getIcon = (name) => {
        const n = name.toLowerCase();
        if (n.includes('meteor')) return '☄️';
        if (n.includes('supernova')) return '💥';
        if (n.includes('colisión')) return '🌌';
        if (n.includes('nebula') || n.includes('nebulosa')) return '☁️';
        if (n.includes('casino')) return '🎰';
        if (n.includes('mercado')) return '🛍️';
        if (n.includes('viento')) return '🌠';
        if (n.includes('equilibrio')) return '🌍';
        return '🌠';
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center p-4"
            >
                <div
                    onClick={() => alert(`🌌 EVENTO: ${event.name}\n\n${event.description}\n\nMultiplicador: x${event.multiplier}\nDuración: ${event.duration} min`)}
                    className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5 pointer-events-auto cursor-pointer group hover:border-cyan-500/30 transition-all duration-500"
                >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        {getIcon(event.name)}
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse">
                                Evento Cósmico Activo
                            </span>
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-white uppercase tracking-tight">
                                {event.name || 'Evento Desconocido'}
                            </span>
                            <div className="h-3 w-[1px] bg-white/10" />
                            <div className="flex items-center gap-1.5 bg-white/5 py-1 px-2.5 rounded-lg border border-white/5">
                                <Zap size={10} className="text-amber-400 fill-amber-400" />
                                <span className="text-[10px] font-black text-amber-400">x{event.multiplier || 1}</span>
                            </div>
                        </div>
                    </div>

                    <div className="ml-2 flex items-center gap-2 bg-black/40 py-1.5 px-3 rounded-xl border border-white/5 shadow-inner">
                        <Timer size={12} className="text-white/30" />
                        <span className="text-[10px] font-mono font-bold text-white/60 min-w-[35px]">
                            {timeLeft}
                        </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <Info size={14} className="text-white/20" />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
