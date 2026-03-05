import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClickRipple() {
    const [ripples, setRipples] = useState([]);

    useEffect(() => {
        const handleClick = (e) => {
            const newRipple = {
                id: Date.now(),
                x: e.clientX,
                y: e.clientY,
            };
            setRipples((prev) => [...prev, newRipple]);
            setTimeout(() => {
                setRipples((prev) => prev.filter(r => r.id !== newRipple.id));
            }, 800);
        };

        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100000]">
            <AnimatePresence>
                {ripples.map(r => (
                    <motion.div
                        key={r.id}
                        initial={{ opacity: 0.5, scale: 0 }}
                        animate={{ opacity: 0, scale: 2.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            left: r.x,
                            top: r.y,
                            width: 60,
                            height: 60,
                            marginLeft: -30,
                            marginTop: -30,
                            borderRadius: '50%',
                            border: '1px solid rgba(0, 229, 255, 0.4)',
                            background: 'radial-gradient(circle, rgba(0, 229, 255, 0.1) 0%, transparent 70%)',
                            pointerEvents: 'none'
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
