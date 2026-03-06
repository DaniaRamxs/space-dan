import React, { useEffect, useMemo, useRef } from 'react';
import { animate } from 'animejs';

const OrbitingInterests = ({ avatarSize = 176, interests = [] }) => {
    const containerRef = useRef(null);
    const orbitOffsetRef = useRef(0);
    const inertiaAnimationRef = useRef(null);
    const snapAnimationRef = useRef(null);
    const dragStateRef = useRef({
        pointerId: null,
        isDragging: false,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
    });

    const displayInterests = useMemo(() => interests.slice(0, 8), [interests]);
    const normalizeAngle = (angle) => {
        let next = angle % (Math.PI * 2);
        if (next > Math.PI) next -= Math.PI * 2;
        if (next < -Math.PI) next += Math.PI * 2;
        return next;
    };

    useEffect(() => {
        if (!displayInterests.length) return;

        const items = displayInterests.map((_, i) => document.querySelector(`.interest-orbit-${i}`));

        const animations = items.map((el, i) => {
            if (!el) return null;

            const isMobile = window.innerWidth < 768;
            const baseRadiusX = isMobile ? avatarSize * 0.72 : avatarSize * 0.86;
            const baseRadiusY = isMobile ? avatarSize * 0.34 : avatarSize * 0.42;
            const laneOffset = (i % 2 === 0 ? 1 : -1) * (isMobile ? 8 : 12);
            const orbitRadiusX = baseRadiusX + laneOffset;
            const orbitRadiusY = baseRadiusY + laneOffset * 0.35;

            const duration = 19000;
            const startAngle = i * ((2 * Math.PI) / displayInterests.length);

            return animate(el, {
                duration,
                loop: true,
                easing: 'linear',
                onRender: (anim) => {
                    const progress = anim.progress / 100;
                    const angle = (progress * 2 * Math.PI) + startAngle + orbitOffsetRef.current;

                    const tilt = 0.22;
                    const x = Math.cos(angle) * orbitRadiusX;
                    const y = Math.sin(angle) * orbitRadiusY + (x * tilt);

                    const z = Math.sin(angle);
                    const scale = 0.88 + ((z + 1) * 0.16);
                    const opacity = 0.72 + ((z + 1) * 0.14);
                    const blur = Math.max(0, (1 - z) * 0.4);

                    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                    el.style.opacity = String(opacity);
                    el.style.filter = `blur(${blur}px)`;
                    el.style.zIndex = String(z > 0 ? 60 : 20);
                }
            });
        });

        const container = containerRef.current;
        if (!container) {
            return () => animations.forEach(a => a?.pause());
        }

        const stopMotion = () => {
            inertiaAnimationRef.current?.pause?.();
            inertiaAnimationRef.current = null;
            snapAnimationRef.current?.pause?.();
            snapAnimationRef.current = null;
        };

        const snapToNearest = () => {
            if (!displayInterests.length) return;

            const current = orbitOffsetRef.current;
            const step = (2 * Math.PI) / displayInterests.length;
            const frontAngle = Math.PI / 2;
            let bestDelta = Infinity;
            let bestOffset = current;

            for (let idx = 0; idx < displayInterests.length; idx += 1) {
                const baseOffset = frontAngle - (idx * step);
                const delta = normalizeAngle(baseOffset - current);
                if (Math.abs(delta) < Math.abs(bestDelta)) {
                    bestDelta = delta;
                    bestOffset = current + delta;
                }
            }

            const snapState = { angle: orbitOffsetRef.current };
            snapAnimationRef.current = animate(snapState, {
                angle: bestOffset,
                duration: 420,
                easing: 'outCubic',
                onRender: () => {
                    orbitOffsetRef.current = snapState.angle;
                },
                onComplete: () => {
                    snapAnimationRef.current = null;
                }
            });
        };

        const onPointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof Element) || !target.closest('.interest-orbit-item')) return;

            stopMotion();
            dragStateRef.current.pointerId = event.pointerId;
            dragStateRef.current.isDragging = true;
            dragStateRef.current.lastX = event.clientX;
            dragStateRef.current.lastTime = performance.now();
            dragStateRef.current.velocity = 0;

            container.setPointerCapture(event.pointerId);
            container.style.cursor = 'grabbing';
        };

        const onPointerMove = (event) => {
            if (!dragStateRef.current.isDragging || dragStateRef.current.pointerId !== event.pointerId) return;

            const now = performance.now();
            const dx = event.clientX - dragStateRef.current.lastX;
            const dt = Math.max(1, now - dragStateRef.current.lastTime);
            const deltaAngle = dx / 140;

            orbitOffsetRef.current += deltaAngle;
            dragStateRef.current.velocity = deltaAngle / dt;
            dragStateRef.current.lastX = event.clientX;
            dragStateRef.current.lastTime = now;
        };

        const onPointerUp = (event) => {
            if (dragStateRef.current.pointerId !== event.pointerId) return;

            dragStateRef.current.isDragging = false;
            dragStateRef.current.pointerId = null;
            container.style.cursor = 'grab';

            const inertia = { angle: orbitOffsetRef.current };
            const extra = dragStateRef.current.velocity * 2400;
            const inertiaTarget = orbitOffsetRef.current + extra;
            const shouldSkipInertia = Math.abs(extra) < 0.12;

            if (shouldSkipInertia) {
                snapToNearest();
                return;
            }

            inertiaAnimationRef.current = animate(inertia, {
                angle: inertiaTarget,
                duration: 620,
                easing: 'outQuad',
                onRender: () => {
                    orbitOffsetRef.current = inertia.angle;
                },
                onComplete: () => {
                    inertiaAnimationRef.current = null;
                    snapToNearest();
                }
            });
        };

        container.style.cursor = 'grab';
        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);

        return () => {
            stopMotion();
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerup', onPointerUp);
            container.removeEventListener('pointercancel', onPointerUp);
            container.style.cursor = '';
            animations.forEach(a => a?.pause());
        };
    }, [displayInterests, avatarSize]);

    if (!displayInterests.length) return null;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 flex items-center justify-center overflow-visible perspective-1000 pointer-events-auto touch-none select-none"
        >
            {displayInterests.map((interest, i) => (
                <div
                    key={i}
                    className={`interest-orbit-${i} interest-orbit-item absolute flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing group`}
                    title={interest.label || 'Interes'}
                    style={{ willChange: 'transform, opacity' }}
                >
                    <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:border-cyan-500/50 transition-colors">
                        {interest.icon && interest.icon.startsWith('http') ? (
                            <img
                                src={interest.icon}
                                className="w-7 h-7 md:w-8 md:h-8 object-contain rounded-lg group-hover:scale-110 transition-transform"
                                alt=""
                            />
                        ) : (
                            <span className="text-lg md:text-xl group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                {interest.icon || '✨'}
                            </span>
                        )}

                        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default OrbitingInterests;
