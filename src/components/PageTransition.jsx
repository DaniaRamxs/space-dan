import { motion } from 'framer-motion';

const pageVariants = {
    initial: {
        opacity: 0,
        scale: 0.9,
        filter: 'blur(20px) contrast(1.5)',
    },
    in: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px) contrast(1)',
    },
    out: {
        opacity: 0,
        scale: 1.1,
        filter: 'blur(20px) contrast(1.5)',
    }
};

const pageTransition = {
    type: 'tween',
    ease: 'circOut',
    duration: 0.5
};

export default function PageTransition({ children }) {
    return (
        <div className="relative w-full min-h-full overflow-hidden">
            {/* Hyperspace Grid Overlay during transition */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="fixed inset-0 z-[999] pointer-events-none hyperspace-grid"
                style={{
                    background: 'radial-gradient(circle, transparent 20%, rgba(6, 182, 212, 0.05) 100%), repeating-linear-gradient(0deg, transparent 0, transparent 40px, rgba(6, 182, 212, 0.03) 41px), repeating-linear-gradient(90deg, transparent 0, transparent 40px, rgba(6, 182, 212, 0.03) 41px)'
                }}
            />

            <motion.div
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="w-full min-h-full"
            >
                {children}
            </motion.div>
        </div>
    );
}
