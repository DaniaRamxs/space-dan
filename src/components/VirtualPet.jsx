import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const PET_PHRASES = [
    "¿Ya probaste el Asteroids?",
    "Meow. Digo... beep boop.",
    "Error 404: no hay streams.",
    "Ese récord tuyo da penita...",
    "¡Hazme clic para una sorpresa!",
    "¡Space-Dan dominará la web muejeje!",
    "Descargando más RAM...",
    "Soy 100% libre de virus.exe",
    "¡Tengo hambre de DanCoins!"
];

export default function VirtualPet() {
    const [phrase, setPhrase] = useState(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    const constraintsRef = useRef(null);

    // Ocultar en móviles
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (isMinimized || isMobile) return;

        const scheduleTalk = () => {
            const time = Math.random() * 15000 + 15000;
            return setTimeout(() => {
                const randomPhrase = PET_PHRASES[Math.floor(Math.random() * PET_PHRASES.length)];
                setPhrase(randomPhrase);

                setTimeout(() => setPhrase(null), 5000);
                scheduleTalk();
            }, time);
        };

        const timer = scheduleTalk();
        return () => clearTimeout(timer);
    }, [isMinimized, isMobile]);

    if (isMobile) return null;

    const handleClick = () => {
        if (isDragging) return; // Don't trigger if it was a drag gesture

        window.open(RICKROLL_URL, "_blank");
        setPhrase("¡Nunca te abandonaré!");
        setTimeout(() => setPhrase(null), 4000);
    };

    return createPortal(
        <>
            {/* Invisible boundaries for dragging */}
            <div ref={constraintsRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

            <motion.div
                drag
                dragConstraints={constraintsRef}
                dragMomentum={false}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setTimeout(() => setIsDragging(false), 150)} // Delay to prevent click on drop
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 9005, // Bring back up so drag is smooth over content
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'auto', // Needs auto to be dragged
                    touchAction: 'none' // Prevent scrolling while dragging on mobile
                }}
            >
                {/* Minimize/Restore Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMinimized(!isMinimized);
                        setPhrase(null);
                    }}
                    style={{
                        position: 'absolute',
                        top: isMinimized ? '-10px' : '-25px',
                        background: 'var(--bg-card, #222)',
                        color: 'var(--text, #fff)',
                        border: '1px solid var(--border, #444)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        fontSize: '10px',
                        lineHeight: '1',
                        cursor: 'pointer',
                        zIndex: 2,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                        opacity: isHovered || isMinimized ? 1 : 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: 'auto'
                    }}
                    aria-label={isMinimized ? "Maximizar mascota" : "Minimizar mascota"}
                >
                    {isMinimized ? '+' : '–'}
                </button>

                <AnimatePresence>
                    {!isMinimized && phrase && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            style={{
                                background: 'white',
                                color: 'black',
                                padding: '10px 14px',
                                borderRadius: '16px',
                                border: '2px solid black',
                                marginBottom: '10px',
                                maxWidth: '180px',
                                textAlign: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
                                position: 'relative',
                            }}
                        >
                            {phrase}
                            <div style={{
                                content: '""',
                                position: 'absolute',
                                bottom: '-8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                borderWidth: '8px 8px 0 8px',
                                borderStyle: 'solid',
                                borderColor: 'white transparent transparent transparent',
                            }} />
                            <div style={{
                                content: '""',
                                position: 'absolute',
                                bottom: '-11px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                borderWidth: '10px 10px 0 10px',
                                borderStyle: 'solid',
                                borderColor: 'black transparent transparent transparent',
                                zIndex: -1
                            }} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    whileHover={{ scale: isMinimized ? 1 : 1.1, rotate: isMinimized ? 0 : [0, -5, 5, -5, 0] }}
                    whileTap={{ scale: 0.9 }}
                    onHoverStart={() => setIsHovered(true)}
                    onHoverEnd={() => setIsHovered(false)}
                    onClick={isMinimized ? undefined : handleClick}
                    animate={{
                        scale: isMinimized ? 0.4 : 1,
                        opacity: isMinimized ? 0.6 : 1,
                    }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        filter: isHovered && !isMinimized ? 'drop-shadow(0 0 10px var(--accent-glow))' : 'drop-shadow(0 5px 5px rgba(0,0,0,0.5))',
                    }}
                >
                    <img
                        src="https://autism.crd.co/assets/images/gallery03/45050ba7_original.gif?v=69d6a439"
                        alt="Virtual Pet Autism Cat"
                        draggable={false} // Prevent browser default image drag
                        style={{
                            width: '100px',
                            height: '100px',
                            imageRendering: 'pixelated',
                            pointerEvents: 'none' // Let the parent motion.div handle drag
                        }}
                    />
                </motion.div>
            </motion.div>
        </>,
        document.body
    );
}
