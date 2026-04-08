import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Sparkles, MessageSquare, Rocket, Shield, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { useCosmic } from '../Effects/CosmicProvider';

const STEPS = [
    {
        icon: <Rocket className="text-cyan-400" />,
        title: "¡Bienvenido a Spacely!",
        desc: "Has aterrizado en la red social más avanzada de la galaxia. Aquí, cada mensaje y acción cuenta.",
        action: "Continuar"
    },
    {
        icon: <MessageSquare className="text-purple-400" />,
        title: "HyperBot a tu servicio",
        desc: "Usa comandos como /help, /work o /daily en el Chat Global para ganar Starlys y subir de nivel.",
        action: "Siguiente"
    },
    {
        icon: <Shield className="text-amber-400" />,
        title: "Seguridad Bancaria",
        desc: "Protege tu cuenta con el /seguro espacial y visita el Banco Estelar si necesitas financiación.",
        action: "Entendido"
    },
    {
        icon: <Star className="text-yellow-400" />,
        title: "Tu Primera Recompensa",
        desc: "Al completar este tutorial, recibirás 100 Starlys para comenzar tu aventura.",
        action: "Finalizar y Reclamar"
    }
];

export default function StellarOnboarding() {
    const { user, profile } = useAuthContext();
    const location = useLocation();
    const { refreshEconomy } = useEconomy();
    const { triggerBigBang } = useCosmic();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // No interrumpir si estamos en un perfil
        if (location.pathname.startsWith('/@')) return;

        if (profile && !profile.tutorial_completed) {
            setIsVisible(true);
        }
    }, [profile, location.pathname]);

    const handleNext = async () => {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1);
        } else {
            // Completar tutorial
            try {
                const { data } = await supabase.rpc('complete_tutorial', { p_user_id: user.id });
                if (data?.success) {
                    refreshEconomy?.();
                    setIsVisible(false);
                    // Trigger Big Bang Effect
                    triggerBigBang();
                }
            } catch (e) {
                setIsVisible(false);
            }
        }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 40 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-[#05050a] border border-cyan-500/20 w-full max-w-md rounded-[3rem] shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden"
                >
                    <div className="p-10 flex flex-col items-center text-center">
                        <motion.div
                            key={step}
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-8 border border-white/10"
                        >
                            {STEPS[step].icon}
                        </motion.div>

                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">
                            {STEPS[step].title}
                        </h2>
                        <p className="text-sm text-white/50 leading-relaxed font-medium mb-10">
                            {STEPS[step].desc}
                        </p>

                        {/* Progress Dots */}
                        <div className="flex gap-2 mb-10">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 rounded-full transition-all ${i === step ? 'w-8 bg-cyan-400' : 'w-2 bg-white/10'}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="w-full py-4 bg-cyan-500 text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                        >
                            {STEPS[step].action}
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="px-10 py-4 bg-cyan-500/5 border-t border-cyan-500/10 flex justify-between items-center">
                        <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={10} /> Tutorial de Iniciación
                        </span>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                            Paso {step + 1} de {STEPS.length}
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
