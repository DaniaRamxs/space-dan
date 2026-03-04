
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { redemptionService } from '../../services/redemptionService';
import { Skull, Sparkles, X } from 'lucide-react';

export default function RedemptionInvite() {
    const navigate = useNavigate();
    const [show, setShow] = useState(false);
    const [debt, setDebt] = useState(0);

    useEffect(() => {
        const check = async () => {
            // No mostrar si ya se mostró en esta sesión
            if (sessionStorage.getItem('redemption_checked')) return;

            try {
                const eligibility = await redemptionService.checkEligibility();
                if (eligibility && eligibility.eligible) {
                    setDebt(eligibility.debt);
                    // Ocasionalmente ocultar para que no sea predecible (50% de probabilidad)
                    if (Math.random() > 0.5) {
                        setShow(true);
                    }
                }
                sessionStorage.setItem('redemption_checked', 'true');
            } catch (err) {
                console.error('[RedemptionInvite] eligibility check failed');
            }
        };

        // Delay inicial para no interrumpir el arranque
        const timeout = setTimeout(check, 5000);
        return () => clearTimeout(timeout);
    }, []);

    if (!show) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="max-w-md w-full bg-[#070710] border border-rose-500/30 rounded-[2.5rem] p-8 relative overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.2)]"
                >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />

                    <button
                        onClick={() => setShow(false)}
                        className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                            <Skull size={32} />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Oportunidad de Vacio</p>
                            <h2 className="text-2xl font-black text-white leading-tight">
                                TU CONSTELACIÓN FINANCIERA ESTÁ EN CRISIS
                            </h2>
                        </div>

                        <p className="text-sm text-white/40 leading-relaxed italic">
                            Sabemos que el Banco Estelar reclama <strong>◈ {debt.toLocaleString()}</strong>. Pero siempre existe otra forma… ¿Quieres jugar un juego?
                        </p>

                        <div className="flex flex-col w-full gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setShow(false);
                                    navigate('/zona-de-redencion');
                                }}
                                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-95"
                            >
                                Aceptar Desafío
                            </button>
                            <button
                                onClick={() => setShow(false)}
                                className="w-full py-4 text-white/20 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                            >
                                Ignorar por ahora
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
