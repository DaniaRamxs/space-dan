import React, { useEffect, useRef, useState } from 'react';
import { animate, set } from 'animejs';

const isMobile = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * MeteoriteEntrance: animación de entrada tipo "meteorito" cuando el elemento
 * entra al viewport. En móvil usa una animación más ligera (400ms fade+slide).
 * Respeta prefers-reduced-motion (sólo fade sin translate/rotate).
 */
const MeteoriteEntrance = ({ children }) => {
    const elementRef = useRef(null);
    const [hasEntered, setHasEntered] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasEntered) {
                    setHasEntered(true);
                    animateEntry();
                }
            },
            { threshold: 0.05 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
    }, [hasEntered]);

    const animateEntry = () => {
        if (!elementRef.current) return;

        if (prefersReducedMotion()) {
            // Solo fade, sin movimiento
            set(elementRef.current, { opacity: 0 });
            animate(elementRef.current, {
                opacity: [0, 1],
                duration: 200,
                easing: 'linear',
            });
            return;
        }

        if (isMobile()) {
            // Animación ligera para móvil: sin rotate, menos desplazamiento, 400ms
            set(elementRef.current, { opacity: 0, translateY: -30, scale: 0.97 });
            animate(elementRef.current, {
                opacity: [0, 1],
                translateY: [-30, 0],
                scale: [0.97, 1],
                duration: 400,
                easing: 'easeOutQuad',
            });
            return;
        }

        // Desktop: animación completa original
        set(elementRef.current, {
            opacity: 0,
            translateY: -100,
            translateX: -30,
            rotate: -5,
            scale: 0.95,
        });

        animate(elementRef.current, {
            opacity: [0, 1],
            translateY: [-100, 0],
            translateX: [-30, 0],
            rotate: [-5, 0],
            scale: [0.95, 1],
            duration: 1200,
            easing: 'easeOutElastic(1, .8)',
            delay: 100,
        });
    };

    return (
        <div ref={elementRef} className="will-change-transform">
            {children}
        </div>
    );
};

export default MeteoriteEntrance;
