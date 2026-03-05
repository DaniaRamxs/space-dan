import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { Skull, Radio, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { blackMarketService } from '../../services/blackMarketService';

export default function BlackMarketNotification() {
    const { profile } = useAuthContext();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // No mostrar si estamos en el mercado, si ya se descartó, o si estamos en un perfil (inmersión)
        const isProfile = location.pathname.startsWith('/@');
        if (location.pathname === '/mercado-negro' || dismissed || isProfile) {
            setIsVisible(false);
            return;
        }

        // Verificar elegibilidad cada cierto tiempo o al cambiar de ruta
        const trigger = () => {
            const isEligible = blackMarketService.checkAccessEligibility(profile);
            if (isEligible && !isVisible) {
                setIsVisible(true);
            }
        };

        const interval = setInterval(trigger, 60000); // Cada minuto
        trigger();

        return () => clearInterval(interval);
    }, [location.pathname, profile, dismissed]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 right-6 z-[1000] max-w-sm w-full"
            >
                <div className="bg-[#050510] border border-red-500/30 rounded-3xl p-6 shadow-[0_20px_50px_rgba(239,68,68,0.2)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                        <button onClick={() => { setIsVisible(false); setDismissed(true); }} className="text-white/20 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 animate-pulse">
                            <Radio size={24} />
                        </div>
                        <div className="space-y-1 pr-6">
                            <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em] block">SEÑAL ENCRIPTADA DETECTADA</span>
                            <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Interferencia en el Sector 7-C</h3>
                            <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase">
                                "Alguien está ofreciendo intercambiar Starlys fuera del Banco Estelar... ¿Entrar?"
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <Link
                            to="/mercado-negro"
                            onClick={() => setIsVisible(false)}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-black text-[10px] font-black uppercase tracking-widest text-center rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Skull size={14} />
                            Entrar al Sector
                        </Link>
                        <button
                            onClick={() => { setIsVisible(false); setDismissed(true); }}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                            Ignorar
                        </button>
                    </div>

                    {/* Glitch Line Decoration */}
                    <div className="absolute bottom-0 left-0 h-1 bg-red-500 animate-pulse w-full opacity-20" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
