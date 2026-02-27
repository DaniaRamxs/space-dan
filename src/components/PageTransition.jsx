import { motion } from 'framer-motion';

const pageVariants = {
    initial: { opacity: 0, scale: 0.99 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.01 }
};

const pageTransition = {
    type: 'spring',
    damping: 30,
    stiffness: 200,
    mass: 0.8
};

export default function PageTransition({ children }) {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', minHeight: '100%' }}


        >
            {children}
        </motion.div>
    );
}
