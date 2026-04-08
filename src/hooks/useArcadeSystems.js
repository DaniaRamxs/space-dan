import { useState, useCallback, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * useArcadeSystems
 * Shared systems for Spacely Arcade games.
 * Handles: Score animations, Particles, Haptics, and Floating Feedback.
 */
export function useArcadeSystems() {
    const [particles, setParticles] = useState([]);
    const [floatingTexts, setFloatingTexts] = useState([]);
    const scoreControls = useAnimation();

    // 1. Haptic Feedback / Vibration
    const triggerHaptic = useCallback((intensity = 'light') => {
        if (!window.navigator.vibrate) return;

        switch (intensity) {
            case 'light':
                window.navigator.vibrate(10);
                break;
            case 'medium':
                window.navigator.vibrate(25);
                break;
            case 'heavy':
                window.navigator.vibrate([30, 10, 30]);
                break;
            case 'error':
                window.navigator.vibrate([50, 50, 50]);
                break;
            default:
                window.navigator.vibrate(10);
        }
    }, []);

    // 2. Particle System (Neon)
    const spawnParticles = useCallback((x, y, color = '#00e5ff', count = 12) => {
        const newParticles = Array.from({ length: count }).map(() => ({
            id: Math.random(),
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 4 + 2,
            color,
            life: 1.0
        }));

        setParticles(prev => [...prev, ...newParticles].slice(-50)); // Limit to 50 particles for performance

        // Auto-cleanup particles
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.includes(p)));
        }, 1000);
    }, []);

    // 3. Floating Text (+10, New Record!)
    const triggerFloatingText = useCallback((text, x, y, color = '#fff') => {
        const id = Math.random();
        setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);

        setTimeout(() => {
            setFloatingTexts(prev => prev.filter(f => f.id !== id));
        }, 800);
    }, []);

    // 4. Score Animation Trigger
    const animateScore = useCallback(async () => {
        await scoreControls.start({
            scale: [1, 1.3, 1],
            filter: ['blur(0px) brightness(1)', 'blur(2px) brightness(2)', 'blur(0px) brightness(1)'],
            transition: { duration: 0.2 }
        });
    }, [scoreControls]);

    return {
        particles,
        floatingTexts,
        scoreControls,
        triggerHaptic,
        spawnParticles,
        triggerFloatingText,
        animateScore
    };
}
