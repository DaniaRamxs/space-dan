import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { animate } from 'animejs';

const chars = "0123456789$#@%&*";

export default function StarlysCounter({ value, className }) {
    const [displayValue, setDisplayValue] = useState(value);
    const [scrambled, setScrambled] = useState("");
    const prevValue = useRef(value);
    const containerRef = useRef(null);

    const spawnParticles = () => {
        if (!containerRef.current) return;

        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('span');
            particle.innerHTML = ['✨', '◈', '⭐', '💎'][Math.floor(Math.random() * 4)];
            particle.style.position = 'absolute';
            particle.style.pointerEvents = 'none';
            particle.style.fontSize = '12px';
            particle.style.left = '50%';
            particle.style.top = '50%';
            particle.style.zIndex = '50';

            containerRef.current.appendChild(particle);

            animate(particle, {
                translateX: (Math.random() - 0.5) * 120,
                translateY: -80 - Math.random() * 100,
                rotate: Math.random() * 720,
                scale: [0.5, 1.5, 0],
                opacity: [1, 0],
                duration: 1500 + Math.random() * 1000,
                easing: 'easeOutQuart',
                complete: () => particle.remove()
            });
        }
    };

    useEffect(() => {
        if (value > prevValue.current) {
            spawnParticles();

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
        <div id="starlys-counter" ref={containerRef} className={`relative inline-flex items-center ${className} font-mono`}>
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
        </div>
    );
}
