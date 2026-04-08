import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WelcomeExperience() {
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(0); // 0 = start, 1 = text1, 2 = text2, 3 = galaxy

    useEffect(() => {
        const hasSeen = localStorage.getItem('has_seen_welcome_experience_v1');
        if (!hasSeen) {
            setIsVisible(true);

            // Sequence
            setTimeout(() => setStep(1), 500); // Iniciando navegacion
            setTimeout(() => setStep(2), 2500); // Señales detectadas
            setTimeout(() => setStep(3), 5000); // Galaxy view
        }
    }, []);

    if (!isVisible) return null;

    const handleExplore = () => {
        localStorage.setItem('has_seen_welcome_experience_v1', 'true');
        // Small zoom out effect
        setStep(4);
        setTimeout(() => {
            setIsVisible(false);
        }, 1000);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                        opacity: step === 4 ? 0 : 1,
                        scale: step === 4 ? 1.5 : 1 // Zoom in effect before disappearing
                    }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100000] bg-black text-white flex items-center justify-center overflow-hidden"
                    style={{ willChange: 'opacity' }}
                >
                    {/* Background Galaxy (fade in on step 3) */}
                    <AnimatePresence>
                        {step >= 3 && step < 4 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 2 }}
                                className="absolute inset-0"
                            >
                                {/* Dark base */}
                                <div className="absolute inset-0 bg-[#080d1a]" />
                                {/* Nebulosa cyan/teal en la parte inferior */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[55%] bg-[radial-gradient(ellipse_at_bottom,rgba(20,150,160,0.45)_0%,rgba(10,80,120,0.25)_40%,transparent_70%)]" />
                                {/* Brillo sutil en el centro-bajo */}
                                <div className="absolute bottom-[15%] left-[30%] w-64 h-64 bg-teal-500/10 rounded-full blur-[80px]" />
                                <div className="absolute bottom-[10%] right-[20%] w-48 h-48 bg-cyan-600/10 rounded-full blur-[60px]" />
                                {/* Estrellas sutiles */}
                                <div className="absolute inset-0 opacity-30"
                                    style={{
                                        backgroundImage: 'radial-gradient(1px 1px at 10% 15%, white, transparent), radial-gradient(1px 1px at 25% 40%, white, transparent), radial-gradient(1px 1px at 50% 10%, white, transparent), radial-gradient(1px 1px at 70% 30%, white, transparent), radial-gradient(1px 1px at 85% 60%, white, transparent), radial-gradient(1px 1px at 40% 70%, white, transparent), radial-gradient(1px 1px at 60% 85%, white, transparent), radial-gradient(1px 1px at 15% 75%, white, transparent), radial-gradient(1px 1px at 90% 20%, white, transparent)',
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step 1 & 2: Text Sequence */}
                    <div className="relative z-10 w-full flex flex-col items-center justify-center px-6">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.p
                                    key="text1"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 1 }}
                                    className="text-white/60 font-black uppercase tracking-[0.3em] text-sm md:text-base"
                                >
                                    Iniciando navegación...
                                </motion.p>
                            )}
                            {step === 2 && (
                                <motion.p
                                    key="text2"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 1 }}
                                    className="text-cyan-400 font-black uppercase tracking-[0.2em] text-sm md:text-base animate-pulse"
                                >
                                    Señales detectadas en la galaxia...
                                </motion.p>
                            )}

                            {/* Step 3: Full screen redesign */}
                            {step === 3 && (
                                <motion.div
                                    key="card"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="fixed inset-0 flex flex-col items-center justify-between px-8 py-16"
                                >
                                    {/* Logo top */}
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.3 }}
                                        className="text-center"
                                    >
                                        <p className="text-cyan-400 text-sm font-bold tracking-[0.45em] uppercase">
                                            S P A C E L Y
                                        </p>
                                    </motion.div>

                                    {/* Center content */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="flex flex-col items-start w-full max-w-sm"
                                    >
                                        <h1 className="text-4xl font-black text-white uppercase leading-tight mb-5">
                                            BIENVENIDO,<br />EXPLORADOR
                                        </h1>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            Cada espacio es un universo distinto. Historias, ideas, música y pensamientos orbitando en silencio, esperando a ser descubiertos.
                                        </p>
                                    </motion.div>

                                    {/* Bottom button */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.9 }}
                                        className="w-full max-w-sm"
                                    >
                                        <button
                                            onClick={handleExplore}
                                            className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.15em] text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform duration-150"
                                        >
                                            EXPLORAR LA GALAXIA
                                            <span className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-base">🚀</span>
                                        </button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
