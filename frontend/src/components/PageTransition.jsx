import { motion } from 'framer-motion';

// Solo fade-in rápido. Sin animación de salida para que la nueva página
// aparezca de inmediato sin esperar que la anterior termine de irse.
export default function PageTransition({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ willChange: 'opacity' }}
            className="w-full min-h-full"
        >
            {children}
        </motion.div>
    );
}
