import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export default function ClickRipple() {
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (!containerRef.current) return;

            const ripple = document.createElement('div');
            const size = 60;

            ripple.style.position = 'absolute';
            ripple.style.left = `${e.clientX - size / 2}px`;
            ripple.style.top = `${e.clientY - size / 2}px`;
            ripple.style.width = `${size}px`;
            ripple.style.height = `${size}px`;
            ripple.style.borderRadius = '50%';
            ripple.style.border = '1px solid rgba(0, 229, 255, 0.4)';
            ripple.style.background = 'radial-gradient(circle, rgba(0, 229, 255, 0.1) 0%, transparent 70%)';
            ripple.style.pointerEvents = 'none';
            ripple.style.opacity = '0.5';
            ripple.style.zIndex = '999999';
            ripple.style.willChange = 'transform, opacity';

            containerRef.current.appendChild(ripple);

            animate(ripple, {
                scale: [0, 3],
                opacity: [0.6, 0],
                duration: 800,
                easing: 'easeOutQuart',
                complete: () => {
                    if (ripple.parentNode) {
                        ripple.parentNode.removeChild(ripple);
                    }
                }
            });
        };

        window.addEventListener('mousedown', handleClick, { passive: true });
        return () => window.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 pointer-events-none z-[100000]"
            style={{ contain: 'strict' }}
        />
    );
}
