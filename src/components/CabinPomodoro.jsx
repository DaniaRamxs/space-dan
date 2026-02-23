import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CabinPomodoro({ onFinish }) {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [sessionType, setSessionType] = useState('focus'); // 'focus' | 'break'
    const [showReward, setShowReward] = useState(false);

    const timerRef = useRef(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleComplete();
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft]);

    const handleComplete = () => {
        setIsActive(false);
        if (sessionType === 'focus') {
            setShowReward(true);
            setTimeout(() => setShowReward(false), 4000);
            if (onFinish) onFinish(25);
        }
        // Toggle type
        const nextType = sessionType === 'focus' ? 'break' : 'focus';
        setSessionType(nextType);
        setTimeLeft(nextType === 'focus' ? 25 * 60 : 5 * 60);
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(sessionType === 'focus' ? 25 * 60 : 5 * 60);
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = sessionType === 'focus'
        ? (timeLeft / (25 * 60))
        : (timeLeft / (5 * 60));

    return (
        <div className="flex flex-col items-center justify-center p-8 relative">
            {/* Background Orbital Rings */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-64 h-64 border border-blue-400 rounded-full blur-[2px] animate-[pulse_4s_ease-in-out_infinite]" />
                <div className="absolute w-80 h-80 border border-purple-500 rounded-full blur-[3px] opacity-50" />
            </div>

            {/* Main Orbital Timer */}
            <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Progress Circle SVG */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="128"
                        cy="128"
                        r="120"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="4"
                    />
                    <motion.circle
                        cx="128"
                        cy="128"
                        r="120"
                        fill="none"
                        stroke={sessionType === 'focus' ? 'var(--accent)' : 'var(--cyan)'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        initial={{ pathLength: 1 }}
                        animate={{ pathLength: progress }}
                        transition={{ duration: 1, ease: "linear" }}
                        style={{ filter: `drop-shadow(0 0 8px ${sessionType === 'focus' ? 'var(--accent)' : 'var(--cyan)'})` }}
                    />
                </svg>

                {/* Orbiting Planet */}
                <motion.div
                    className="absolute w-full h-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                        style={{
                            background: sessionType === 'focus' ? 'var(--accent)' : 'var(--cyan)',
                            boxShadow: `0 0 15px ${sessionType === 'focus' ? 'var(--accent)' : 'var(--cyan)'}`
                        }}
                    />
                </motion.div>

                {/* Central Display */}
                <div className="z-10 text-center select-none">
                    <div className="text-xs uppercase tracking-[0.2em] opacity-50 mb-1">
                        {sessionType === 'focus' ? 'Enfoque' : 'Descanso'}
                    </div>
                    <div className="text-5xl font-black text-white tracking-tighter">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                    <div className="mt-4 flex gap-3 justify-center">
                        <button
                            onClick={toggleTimer}
                            className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 hover:border-white/50 transition-colors bg-white/5 backdrop-blur-md"
                        >
                            {isActive ? (
                                <span className="text-lg">⏸</span>
                            ) : (
                                <span className="text-lg translate-x-[1px]">▶</span>
                            )}
                        </button>
                        <button
                            onClick={resetTimer}
                            className="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 hover:border-white/50 transition-colors bg-white/5 backdrop-blur-md"
                        >
                            <span className="text-sm">🔄</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Reward Pop-up */}
            <AnimatePresence>
                {showReward && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute -bottom-12 whitespace-nowrap text-sm font-bold text-accent italic"
                    >
                        ✦ +5 Dancoins añadidos a tu órbita
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
