import React, { useEffect, useRef } from 'react';
import { animate, random, stagger } from 'animejs';

/**
 * GravityField: Componente que simula atracción de estrellas.
 * Se activa en posts con alta interacción.
 */
const GravityField = ({ intensity = 0, isActive = false }) => {
    const containerRef = useRef(null);
    const starCount = Math.min(12, Math.floor(intensity * 3));


    useEffect(() => {
        if (!isActive || starCount === 0 || !containerRef.current) return;

        const stars = [];
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'gravity-star absolute w-1 h-1 bg-white/40 rounded-full blur-[0.5px] pointer-events-none';

            // Posición inicial aleatoria lejos del centro
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 50;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;

            Object.assign(star.style, {
                left: '50%',
                top: '50%',
                transform: `translate(${x}px, ${y}px)`,
                opacity: '0'
            });

            containerRef.current.appendChild(star);
            stars.push(star);
        }

        // Animación de atracción
        animate(stars, {
            translateX: 0,
            translateY: 0,
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
            duration: 3000,
            delay: stagger(200),
            loop: true,
            easing: 'easeInOutQuad',
        });

        return () => {
            stars.forEach(s => s.remove());
        };
    }, [isActive, starCount]);

    if (!isActive) return null;

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none z-[10] flex items-center justify-center overflow-visible" />
    );
};

export default GravityField;
