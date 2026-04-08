
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { tycoonService } from '../../services/tycoonService';
import { useAuthContext } from '../../contexts/AuthContext';
import { Crown, Sparkles, X, TrendingUp } from 'lucide-react';

export default function TycoonInvite() {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile } = useAuthContext();
    const [show, setShow] = useState(false);
    const THRESHOLD = 50000000; // 50M

    useEffect(() => {
        const check = async () => {
            // No mostrar en perfiles para no matar inmersión
            if (location.pathname.startsWith('/@')) return;

            if (!profile || profile.balance < THRESHOLD) return;

            // Si ya se mostró o si ya es magnate, no hacer nada
            if (sessionStorage.getItem('tycoon_checked')) return;

            const existing = await tycoonService.getTycoonStatus();
            if (!existing) {
                setShow(true);
            }
            sessionStorage.setItem('tycoon_checked', 'true');
        };

        const timeout = setTimeout(check, 3000);
        return () => clearTimeout(timeout);
    }, [profile]);

    if (!show) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="max-w-md w-full bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-amber-500/30 rounded-[2.5rem] p-10 relative overflow-hidden shadow-[0_0_80px_rgba(245,158,11,0.15)]"
                >
                    {/* Gold Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-500/5 to-transparent pointer-events-none" />

                    <button
                        onClick={() => setShow(false)}
                        className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                            <Crown size={40} className="animate-bounce" />
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em]">Reconocimiento Bancario</p>
                            <h2 className="text-3xl font-black text-white leading-tight tracking-tighter">
                                TU FORTUNA HA CAPTADO LA ATENCIÓN
                            </h2>
                        </div>

                        <p className="text-sm text-white/50 leading-relaxed font-medium">
                            El Banco Estelar ha observado tu creciente capital. Las <span className="text-amber-400">Grandes Casas</span> de la galaxia desean hablar contigo. ¿Aceptarás tu lugar entre los magnates?
                        </p>

                        <div className="flex flex-col w-full gap-3 pt-6">
                            <button
                                onClick={async () => {
                                    await tycoonService.joinHouses();
                                    setShow(false);
                                    navigate('/grandes-casas');
                                }}
                                className="w-full py-4 bg-amber-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-all shadow-xl active:scale-95"
                            >
                                Unirse a las Casas
                            </button>
                            <button
                                onClick={() => setShow(false)}
                                className="w-full py-4 text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                Seguir como viajero solitario
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
