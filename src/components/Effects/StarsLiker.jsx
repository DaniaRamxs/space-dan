import React, { useCallback } from 'react';
import { animate as anime } from 'animejs';

const StarsLiker = () => {
    const triggerStar = useCallback((sourceRect, targetId = 'starlys-counter', emoji = '⭐') => {
        const star = document.createElement('div');
        star.innerHTML = emoji;
        // Find all possible targets and pick the one that is visible correctly
        const targets = document.querySelectorAll(`[id="${targetId}"], .${targetId}`);
        let targetEl = null;
        let targetRect = { top: 20, left: window.innerWidth - 100 };

        for (const el of targets) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                targetEl = el;
                targetRect = rect;
                break;
            }
        }

        Object.assign(star.style, {
            position: 'fixed',
            top: `${sourceRect.top}px`,
            left: `${sourceRect.left}px`,
            fontSize: '1.5rem',
            zIndex: '10000',
            pointerEvents: 'none',
        });
        document.body.appendChild(star);

        anime(star, {
            translateX: targetRect.left - sourceRect.left,
            translateY: targetRect.top - sourceRect.top,
            scale: [1, 2, 0.5],
            opacity: [1, 1, 0],
            rotate: '2turn',
            duration: 1000,
            easing: 'inBack',
            onComplete: () => {
                star.remove();
                if (targetEl) {
                    anime(targetEl, {
                        scale: [1, 1.3, 1],
                        duration: 300,
                        easing: 'outQuad'
                    });
                }
            }
        });
    }, []);

    window.triggerLikeStar = triggerStar;

    return null;
};

export default StarsLiker;
