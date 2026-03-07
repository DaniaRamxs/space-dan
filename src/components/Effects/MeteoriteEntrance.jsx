import React, { useEffect, useRef, useState } from 'react';
import { animate, set } from 'animejs';

/**
 * MeteoriteEntrance: Componente que aplica una animación de entrada tipo "meteorito"
 * usando Anime.js cuando el elemento entra en el viewport.
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
            { threshold: 0.1 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
    }, [hasEntered]);

    const animateEntry = () => {
        if (!elementRef.current) return;

        // Animación de entrada tipo meteorito
        // 1. Inicia fuera de pantalla (arriba y diagonal)
        // 2. Movimiento rápido
        // 3. Desaceleración
        // 4. Rebote final

        set(elementRef.current, {
            opacity: 0,
            translateY: -100,
            translateX: -30,
            rotate: -5,
            scale: 0.95
        });

        animate(elementRef.current, {
            opacity: [0, 1],
            translateY: [-100, 0],
            translateX: [-30, 0],
            rotate: [-5, 0],
            scale: [0.95, 1],
            duration: 1200,
            easing: 'easeOutElastic(1, .8)', // Proporciona el rebote y la desaceleración
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
