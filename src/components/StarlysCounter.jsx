import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StarlysCounter({ value, className }) {
    const [displayValue, setDisplayValue] = useState(value);
    const [showParticles, setShowParticles] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (value > prevValue.current) {
            // Gain starlys!
            setShowParticles(true);
            setTimeout(() => setShowParticles(false), 1500);
        }

        const duration = 1000; // 1 second animation
        const steps = 30;
        const increment = (value - displayValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            if (currentStep >= steps) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(prev => Math.floor(prev + increment));
            }
        }, duration / steps);

        prevValue.current = value;
        return () => clearInterval(timer);
    }, [value]);

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <motion.span
                key={displayValue}
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 1, scale: value > prevValue.current ? [1, 1.2, 1] : 1 }}
                className="font-black tabular-nums"
            >
                {displayValue.toLocaleString()}
            </motion.span>

            {/* Floating Particles on target increase */}
            <AnimatePresence>
                {showParticles && Array.from({ length: 5 }).map((_, i) => (
                    <motion.span
                        key={i}
                        initial={{ opacity: 1, y: 0, x: 0 }}
                        animate={{ opacity: 0, y: -40, x: (Math.random() - 0.5) * 40 }}
                        exit={{ opacity: 0 }}
                        className="absolute text-yellow-400 text-xs pointer-events-none"
                    >
                        ⭐
                    </motion.span>
                ))}
            </AnimatePresence>
        </div>
    );
}
