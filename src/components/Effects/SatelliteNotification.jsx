import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

const SatelliteNotification = ({ active = false }) => {
    const satellitesCount = 3;
    const containerRef = useRef(null);

    useEffect(() => {
        const animations = [];
        for (let i = 0; i < satellitesCount; i++) {
            const el = document.querySelector(`.notif-sat-${i}`);
            if (!el) continue;

            const radius = 18 + (i * 4);
            const duration = 3000 + (i * 1500);

            animations.push(animate(el, {
                duration: duration,
                loop: true,
                easing: 'linear',
                onRender: (anim) => {
                    const angle = (anim.progress / 100) * 2 * Math.PI + (i * (Math.PI / 1.5));
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    el.style.transform = `translate(${x}px, ${y}px)`;
                }
            }));
        }

        return () => animations.forEach(a => a.pause());
    }, []);

    useEffect(() => {
        if (active) {
            animate('.notif-sat-unit', {
                scale: [1, 2.5, 1],
                backgroundColor: ['#fff', '#00e5ff', '#fff'],
                boxShadow: ['0 0 0px #fff', '0 0 15px #00e5ff', '0 0 0px #fff'],
                easing: 'outElastic(1, .6)',
                duration: 1000,
                delay: stagger(100)
            });
        }
    }, [active]);

    return (
        <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center">
            {[...Array(satellitesCount)].map((_, i) => (
                <div
                    key={i}
                    className={`notif-sat-${i} notif-sat-unit absolute w-1 h-1 bg-white/40 rounded-full shadow-[0_0_2px_rgba(255,255,255,0.5)]`}
                    style={{ zIndex: 10 }}
                />
            ))}
        </div>
    );
};

export default SatelliteNotification;
