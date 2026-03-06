import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { animate as anime, random, stagger } from 'animejs';
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

        anime('.cosmic-particle', {
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

    const toggleStarRain = useCallback((active) => {
        setStarRainActive(active);
    }, []);

    return (
        <CosmicContext.Provider value={{
            triggerBigBang,
            triggerWarp,
            isWarping,
            starRainActive,
            toggleStarRain
        }}>
            {children}
            {isWarping && <WarpEffect />}
            {starRainActive && <StarRain />}
            <MeteoriteShower />
            <StarsLiker />
        </CosmicContext.Provider>
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

        anime('.warp-line', {
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

            anime(star, {
                translateY: '110vh',
                translateX: random(-50, 50),
                duration: random(2000, 5000),
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

            anime(meteor, {
                translateX: '120vw',
                translateY: '60vh',
                width: ['2px', '150px', '2px'],
                duration: random(800, 1500),
                easing: 'linear',
                onComplete: () => meteor.remove()
            });
        };

        const interval = setInterval(triggerMeteorite, 4000);
        return () => clearInterval(interval);
    }, []);

    return null;
};
