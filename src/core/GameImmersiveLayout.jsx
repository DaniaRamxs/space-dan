import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

// Módulo 9: Modo Inmersivo Híbrido
// Implementado en Modo Contingencia por Ingeniero IA

const styles = {
    layout: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw',
        height: '100dvh', // Real móvil height (iOS friendly)
        zIndex: 99999, // Cubre toda la UI heredada de Spacely
        backgroundColor: '#050508', // Solid fallback for mobile
        background: 'radial-gradient(circle at 50% -20%, #1a1a2e 0%, #050508 80%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center', // Added for vertical centering in PC
        overflow: 'hidden',
        overscrollBehavior: 'none', // Prevent mobile bounce revealing background
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
    },
    pcContainer: {
        width: '100%',
        maxWidth: 1400, // 1200-1400px range desktop
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Center Shell
        justifyContent: 'center',
    },
    stars: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(1.5px 1.5px at 20px 30px, #ffffff33, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #ffffff22, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 40px, #ffffff11, rgba(0,0,0,0))',
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        opacity: 0.6,
        pointerEvents: 'none'
    }
};

export function GameImmersiveLayout({ children }) {
    useEffect(() => {
        // Bloquear scroll global al montar el layout inmersivo
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            // Restaurar scroll al salir
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.4 }}
            style={styles.layout}
        >
            {/* Atmósfera estelar súper tenue sin invadir el contraste */}
            <div style={styles.stars} />
            <div style={styles.pcContainer}>
                {children}
            </div>
        </motion.div>
    );
}
