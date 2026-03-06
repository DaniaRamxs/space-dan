import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const chars = "0123456789$#@%&*";

export default function StarlysCounter({ value, className }) {
    const [displayValue, setDisplayValue] = useState(value);
    const [scrambled, setScrambled] = useState("");
    const [showParticles, setShowParticles] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (value > prevValue.current) {
            setShowParticles(true);
            setTimeout(() => setShowParticles(false), 2000);

            // Scramble effect
            let iterations = 0;
            const interval = setInterval(() => {
                const scramble = value.toString().split("")
                    .map((_, i) => chars[Math.floor(Math.random() * chars.length)])
                    .join("");
                setScrambled(scramble);

                iterations++;
                if (iterations > 10) {
                    clearInterval(interval);
                    setScrambled("");
                    setDisplayValue(value);
                }
            }, 50);
        } else {
            setDisplayValue(value);
        }
        prevValue.current = value;
    }, [value]);

    return (
        <div id="starlys-counter" className={`relative inline-flex items-center ${className} font-mono`}>
            <motion.span
                key={value}
                initial={{ opacity: 0.5, y: 5 }}
                animate={{ opacity: 1, y: 0, scale: value > prevValue.current ? [1, 1.2, 1] : 1 }}
                className="tabular-nums flex items-center gap-1"
            >
                <span className="text-cyan-500/50">◈</span>
                <span className={scrambled ? "glitch-text" : ""}>
                    {scrambled || displayValue.toLocaleString()}
                </span>
            </motion.span>

            <AnimatePresence>
                {showParticles && Array.from({ length: 6 }).map((_, i) => (
                    <motion.span
                        key={i}
                        initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                        animate={{
                            opacity: 0,
                            y: -60 - Math.random() * 40,
                            x: (Math.random() - 0.5) * 60,
                            rotate: Math.random() * 360,
                            scale: 1.2
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute text-yellow-400 text-xs pointer-events-none"
                    >
                        ⭐
                    </motion.span>
                ))}
            </AnimatePresence>
        </div>
    );
}
