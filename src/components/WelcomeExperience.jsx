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
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black" />
                                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[100px]" />
                                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 animate-pulse" />
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

                            {/* Step 3: Card */}
                            {step === 3 && (
                                <motion.div
                                    key="card"
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                    className="relative max-w-md w-full bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_0_50px_rgba(255,255,255,0.05)] text-center overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white-[0.05] to-transparent pointer-events-none" />

                                    <div className="relative z-10">
                                        <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-8">
                                            🌌 Bienvenido, explorador
                                        </h2>

                                        <p className="text-sm md:text-base text-white/70 leading-relaxed mb-6">
                                            Cada espacio es un universo distinto.
                                        </p>
                                        <p className="text-sm md:text-base text-white/70 leading-relaxed italic mb-8">
                                            Historias, ideas, música y pensamientos orbitando en silencio,
                                            <br className="hidden md:block" /> esperando a ser descubiertos.
                                        </p>

                                        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-10">
                                            <p className="text-cyan-300 text-xs md:text-sm font-bold uppercase tracking-widest">
                                                Deja una ⭐ donde algo te haga sentir.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleExplore}
                                            className="w-full bg-white text-black py-4 rounded-xl text-xs md:text-sm font-black uppercase tracking-[0.2em] hover:bg-cyan-300 hover:shadow-[0_0_30px_rgba(103,232,249,0.3)] transition-all duration-300 transform hover:scale-105 active:scale-95"
                                        >
                                            🔭 Explorar la galaxia
                                        </button>

                                        <p className="mt-6 text-[10px] text-white/30 uppercase tracking-widest font-black">
                                            La galaxia siempre está creciendo.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
