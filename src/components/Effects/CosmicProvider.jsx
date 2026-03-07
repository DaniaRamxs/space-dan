import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { animate, random, stagger } from 'animejs';
import StarsLiker from './StarsLiker';

const CosmicContext = createContext(null);

export const useCosmic = () => useContext(CosmicContext);

export const CosmicProvider = ({ children }) => {
    const [isWarping, setIsWarping] = useState(false);
    const [starRainActive, setStarRainActive] = useState(false);

    const triggerBigBang = useCallback(() => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        container.id = 'big-bang-container';
        document.body.appendChild(container);

        const particlesCount = 60;
        const colors = ['#fff', '#00e5ff', '#ff00ff', '#7c3aed'];

        for (let i = 0; i < particlesCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'cosmic-particle';
            const size = Math.random() * 4 + 2;
            Object.assign(particle.style, {
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                borderRadius: '50%',
                boxShadow: `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`,
                transform: 'translate(-50%, -50%)',
            });
            container.appendChild(particle);
        }

        animate('.cosmic-particle', {
            translateX: () => random(-1000, 1000),
            translateY: () => random(-1000, 1000),
            scale: [0, 2, 0],
            opacity: [1, 0],
            easing: 'outExpo',
            duration: 2500,
            onComplete: () => {
                container.remove();
            }
        });
    }, []);

    const triggerWarp = useCallback(() => {
        setIsWarping(true);
        setTimeout(() => setIsWarping(false), 800);
    }, []);

    // 2. Comentarios como señales de radio
    const triggerRadioSignal = useCallback((x, y) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        document.body.appendChild(container);

        let completed = 0;
        const total = 3;

        // Crear ondas
        for (let i = 0; i < total; i++) {
            const wave = document.createElement('div');
            wave.className = 'radio-wave';
            Object.assign(wave.style, {
                position: 'absolute',
                width: '10px',
                height: '10px',
                border: '1px solid rgba(0, 229, 255, 0.5)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
            });
            container.appendChild(wave);

            animate(wave, {
                scale: [1, 35],
                opacity: [0.7, 0],
                duration: 2500,
                delay: i * 400,
                easing: 'easeOutQuart',
                complete: () => {
                    completed++;
                    if (completed === total) container.remove();
                }
            });
        }
    }, []);

    // 4. Supernova de likes
    const triggerSupernova = useCallback((x, y) => {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        document.body.appendChild(container);

        const particlesCount = 30;
        let completed = 0;

        for (let i = 0; i < particlesCount; i++) {
            const p = document.createElement('div');
            const angle = (i / particlesCount) * Math.PI * 2;
            const dist = 120 + Math.random() * 180;
            const size = Math.random() * 3 + 1;

            Object.assign(p.style, {
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: i % 2 === 0 ? '#00e5ff' : '#fff',
                borderRadius: '50%',
                boxShadow: '0 0 10px #00e5ff',
                transform: 'translate(-50%, -50%)',
            });
            container.appendChild(p);

            animate(p, {
                translateX: Math.cos(angle) * dist,
                translateY: Math.sin(angle) * dist,
                opacity: [1, 0],
                scale: [1, 0.5],
                duration: 1000 + Math.random() * 1200,
                easing: 'outExpo',
                complete: () => {
                    completed++;
                    if (completed === particlesCount) container.remove();
                }
            });
        }

        // Pulso central de brillo
        const pulse = document.createElement('div');
        Object.assign(pulse.style, {
            position: 'absolute',
            width: '4px',
            height: '4px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 70px 30px #fff',
            transform: 'translate(-50%, -50%)',
        });
        container.appendChild(pulse);
        animate(pulse, {
            scale: [1, 25, 0],
            opacity: [1, 0],
            duration: 800,
            easing: 'outQuart'
        });
    }, []);

    useEffect(() => {
        window.triggerRadioSignal = triggerRadioSignal;
        window.triggerSupernova = triggerSupernova;
    }, [triggerRadioSignal, triggerSupernova]);

    return (
        <CosmicContext.Provider value={{
            triggerBigBang,
            triggerWarp,
            triggerRadioSignal,
            triggerSupernova,
            isWarping,
            starRainActive,
            toggleStarRain: (active) => setStarRainActive(active)
        }}>
            {children}
            {isWarping && <WarpEffect />}
            {starRainActive && <StarRain />}
            <MeteoriteShower />
            <StarsLiker />
        </CosmicContext.Provider>
    );
};

// Componente para Efecto 5: Aparición con polvo estelar
export const StardustEntrance = ({ children, delay = 0 }) => {
    const containerRef = React.useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const count = 12;
        const particles = [];
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'stardust-particle absolute w-1 h-1 bg-white/50 rounded-full blur-[1px] pointer-events-none';
            p.style.zIndex = '50';
            containerRef.current.appendChild(p);
            particles.push(p);
        }

        animate(particles, {
            translateX: () => random(-120, 120),
            translateY: () => random(-120, 120),
            opacity: [0, 1, 0],
            scale: [0, 2, 1],
            duration: 1800,
            delay: stagger(60, { start: delay }),
            easing: 'easeOutBack',
            complete: () => {
                particles.forEach(p => { if (p.parentNode) p.remove(); });
                setVisible(true);
            }
        });

        // Fail-safe
        const timeout = setTimeout(() => setVisible(true), 2500 + delay);
        return () => clearTimeout(timeout);
    }, [delay]);

    return (
        <div ref={containerRef} className="relative z-[1]">
            <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.98]'}`}>
                {children}
            </div>
        </div>
    );
};

const WarpEffect = () => {
    useEffect(() => {
        const lines = 30;
        const container = document.getElementById('warp-container');
        if (!container) return;

        for (let i = 0; i < lines; i++) {
            const line = document.createElement('div');
            line.className = 'warp-line';
            Object.assign(line.style, {
                position: 'absolute',
                top: `${Math.random() * 100}%`,
                left: '-10%',
                width: '20px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, #00e5ff, #fff)',
                opacity: Math.random(),
            });
            container.appendChild(line);
        }

        animate('.warp-line', {
            translateX: ['0vw', '120vw'],
            width: ['20px', '400px'],
            easing: 'linear',
            duration: 600,
            delay: stagger(10),
        });
    }, []);

    return (
        <div id="warp-container" className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden bg-black/40 backdrop-blur-[2px]" />
    );
};

const StarRain = () => {
    useEffect(() => {
        const createStar = () => {
            const star = document.createElement('div');
            star.className = 'falling-star';
            const size = Math.random() * 2 + 1;
            Object.assign(star.style, {
                position: 'fixed',
                top: '-5vh',
                left: `${Math.random() * 100}vw`,
                width: `${size}px`,
                height: `${size * 4}px`,
                backgroundColor: '#fff',
                borderRadius: '50%',
                boxShadow: '0 0 8px #fff',
                opacity: Math.random() * 0.7 + 0.3,
                zIndex: '500',
                pointerEvents: 'none',
            });
            document.body.appendChild(star);

            animate(star, {
                translateY: '110vh',
                translateX: () => random(-50, 50),
                duration: () => random(2000, 5000),
                easing: 'linear',
                onComplete: () => star.remove()
            });
        };

        const interval = setInterval(createStar, 200);
        return () => clearInterval(interval);
    }, []);

    return null;
};

const MeteoriteShower = () => {
    useEffect(() => {
        const triggerMeteorite = () => {
            if (Math.random() > 0.3) return; // Rare occurence

            const meteor = document.createElement('div');
            meteor.className = 'cosmic-meteor';
            const size = Math.random() * 2 + 1;
            Object.assign(meteor.style, {
                position: 'fixed',
                top: `${Math.random() * 40}vh`,
                left: '-10vw',
                width: `${size}px`,
                height: '1px',
                background: 'linear-gradient(90deg, #fff, transparent)',
                boxShadow: '0 0 10px #fff',
                zIndex: '1000',
                pointerEvents: 'none',
                transform: 'rotate(25deg)'
            });
            document.body.appendChild(meteor);

            animate(meteor, {
                translateX: '120vw',
                translateY: '60vh',
                width: ['2px', '150px', '2px'],
                duration: () => random(800, 1500),
                easing: 'linear',
                onComplete: () => meteor.remove()
            });
        };

        const interval = setInterval(triggerMeteorite, 4000);
        return () => clearInterval(interval);
    }, []);

    return null;
};
