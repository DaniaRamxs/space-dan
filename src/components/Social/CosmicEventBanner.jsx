import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cosmicEventsService } from '../../services/cosmicEventsService';

export default function CosmicEventBanner() {
    const [event, setEvent] = useState(null);

    useEffect(() => {
        const checkEvent = async () => {
            const active = await cosmicEventsService.getActiveEvent();
            setEvent(active);
        };
        checkEvent();
        const interval = setInterval(checkEvent, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    if (!event) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex justify-center p-4"
            >
                <div className="bg-gradient-to-r from-purple-600/90 via-cyan-500/90 to-blue-600/90 backdrop-blur-md border border-white/20 rounded-full px-6 py-2 shadow-[0_0_30px_rgba(0,229,255,0.4)] flex items-center gap-4 pointer-events-auto cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => alert(`🌌 EVENTO ACTIVO: ${event.name}\n\n${event.description}\n\nMultiplicador: x${event.multiplier}`)}
                >
                    <span className="text-xl animate-pulse">
                        {event.event_type === 'star_shower' ? '🌠' :
                            event.event_type === 'black_hole' ? '🕳' :
                                event.event_type === 'galactic_alignment' ? '🌌' : '☄️'}
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                            Evento Cósmico Activo
                        </span>
                        <span className="text-sm font-bold text-white drop-shadow-md">
                            {event.name}
                        </span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
