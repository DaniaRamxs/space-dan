import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const PET_PHRASES = [
    "¡Alimenta al alien!",
    "¿Ya probaste el Asteroids?",
    "Meow. Digo... beep boop.",
    "Error 404: Facha no encontrada.",
    "¿Alguien usa Myspace todavía?",
    "Ese récord tuyo da penita...",
    "¡Hazme clic para una sorpresa!",
    "¿Ya viste mi Hi5?",
    "¡Space-Dan dominará la web!",
    "Descargando más RAM...",
    "Soy 100% libre de virus.exe",
    "¡Tengo hambre de DanCoins!"
];

export default function VirtualPet() {
    const [phrase, setPhrase] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    // Randomly say something every 15-30 seconds
    useEffect(() => {
        const scheduleTalk = () => {
            const time = Math.random() * 15000 + 15000;
            return setTimeout(() => {
                const randomPhrase = PET_PHRASES[Math.floor(Math.random() * PET_PHRASES.length)];
                setPhrase(randomPhrase);

                // Hide phrase after 5 seconds
                setTimeout(() => setPhrase(null), 5000);

                scheduleTalk();
            }, time);
        };

        const timer = scheduleTalk();
        return () => clearTimeout(timer);
    }, []);

    const handleClick = () => {
        // ZAZ, Rickroll!
        window.open(RICKROLL_URL, "_blank");
        setPhrase("¡Nunca te abandonaré!");
        setTimeout(() => setPhrase(null), 4000);
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9000, // Very high but under Modals
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none' // Allow clicking through the container
        }}>
            <AnimatePresence>
                {phrase && (
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
                            pointerEvents: 'auto'
                        }}
                    >
                        {phrase}
                        <div style={{
                            content: '""',
                            position: 'absolute',
                            bottom: '-8px',
                            right: '30px',
                            borderWidth: '8px 8px 0 0',
                            borderStyle: 'solid',
                            borderColor: 'white transparent transparent transparent',
                        }} />
                        <div style={{
                            content: '""',
                            position: 'absolute',
                            bottom: '-11px',
                            right: '29px',
                            borderWidth: '10px 10px 0 0',
                            borderStyle: 'solid',
                            borderColor: 'black transparent transparent transparent',
                            zIndex: -1
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
                whileTap={{ scale: 0.9 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                onClick={handleClick}
                style={{
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    filter: isHovered ? 'drop-shadow(0 0 10px var(--accent-glow))' : 'drop-shadow(0 5px 5px rgba(0,0,0,0.5))',
                    transition: 'filter 0.3s'
                }}
            >
                <img
                    src="https://autism.crd.co/assets/images/gallery03/45050ba7_original.gif?v=69d6a439"
                    alt="Virtual Pet Autism Cat"
                    style={{
                        width: '80px',
                        height: 'auto',
                        imageRendering: 'pixelated'
                    }}
                />
            </motion.div>
        </div>
    );
}
