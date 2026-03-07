import React, { useEffect, useRef, useState } from 'react';
import { animate, stagger, random } from 'animejs';

/**
 * StellarScrollBg: Fondo estelar dinámico que reconoce el scroll.
 * Implementa parallax, parpadeo y meteoros usando Anime.js.
 */
const StellarScrollBg = () => {
    const containerRef = useRef(null);
    const [stars, setStars] = useState([]);

    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        const count = 30; // Consistent low-impact count for all devices
        const newStars = Array.from({ length: count }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            speed: Math.random() * 0.15 + 0.05,
        }));
        setStars(newStars);
    }, []);

    useEffect(() => {
        if (stars.length === 0) return;

        // 6. Respiración del Universo: Animación continua del fondo y nebulas
        animate('#nebula-scroll-1, #nebula-scroll-2', {
            opacity: [0.04, 0.12, 0.04],
            scale: [1, 1.15, 1],
            duration: 10000,
            easing: 'easeInOutSine',
            loop: true,
            direction: 'alternate'
        });

        // 2. Meteoritos Estelares
        const launchMeteor = () => {
            const meteor = document.createElement('div');
            meteor.className = 'absolute pointer-events-none z-[-1]';
            const size = Math.random() * 2 + 1;
            Object.assign(meteor.style, {
                width: size + 'px',
                height: (size * 50) + 'px',
                background: 'linear-gradient(to bottom, rgba(255,255,255,1), rgba(0,255,255,0))',
                left: Math.random() * 100 + '%',
                top: '-100px',
                boxShadow: '0 0 15px rgba(0,255,255,0.8)',
                borderRadius: '10px',
                opacity: '0'
            });

            if (containerRef.current) {
                containerRef.current.appendChild(meteor);
                animate(meteor, {
                    translateX: [0, 500],
                    translateY: [0, 1000],
                    rotate: 45,
                    opacity: [0, 1, 0],
                    duration: 1200,
                    easing: 'linear',
                    complete: () => meteor.remove()
                });
            }
        };

        const interval = setInterval(() => {
            if (Math.random() > 0.75) launchMeteor();
        }, 6000);

        // 3. Parallax Scroll Handler (Throttled manually)
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const neb1 = document.getElementById('nebula-scroll-1');
                    const neb2 = document.getElementById('nebula-scroll-2');
                    if (neb1) neb1.style.transform = `translate3d(0, ${scrollY * 0.1}px, 0)`;
                    if (neb2) neb2.style.transform = `translate3d(0, ${scrollY * 0.2}px, 0) rotate(15deg)`;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        // Twinkle stars
        const starNodes = containerRef.current.querySelectorAll('.stellar-scroll-star');
        animate(starNodes, {
            opacity: [0.2, 0.8, 0.2],
            scale: [0.9, 1.1, 0.9],
            duration: () => random(3000, 6000),
            delay: stagger(100),
            loop: true,
            easing: 'easeInOutSine'
        });

        return () => {
            clearInterval(interval);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [stars]);

    return (
        <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden" aria-hidden="true">
            {stars.map(star => (
                <div
                    key={star.id}
                    className="stellar-scroll-star absolute rounded-full bg-white will-change-transform"
                    style={{
                        top: star.top + '%',
                        left: star.left + '%',
                        width: star.size + 'px',
                        height: star.size + 'px',
                        opacity: star.opacity,
                        boxShadow: `0 0 ${star.size * 3}px rgba(255, 255, 255, 0.4)`
                    }}
                />
            ))}

            <div
                id="nebula-scroll-1"
                className="absolute w-[1000px] h-[1000px] rounded-full blur-[150px] bg-cyan-600/10 pointer-events-none will-change-transform"
                style={{ top: '-10%', left: '-20%' }}
            />
            <div
                id="nebula-scroll-2"
                className="absolute w-[800px] h-[800px] rounded-full blur-[130px] bg-purple-700/10 pointer-events-none will-change-transform"
                style={{ bottom: '0%', right: '-30%' }}
            />
        </div>
    );
};

export default StellarScrollBg;
