import { motion } from 'framer-motion';

export default function AmbientOrbs() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none">
            {/* Orb 1: Pink/Accent */}
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -100, 50, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[120px]"
            />

            {/* Orb 2: Purple/Purple */}
            <motion.div
                animate={{
                    x: [0, -100, 50, 0],
                    y: [0, 150, -100, 0],
                    scale: [1, 1.1, 1.2, 1],
                }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-500/5 blur-[150px]"
            />

            {/* Orb 3: Cyan/Cyan */}
            <motion.div
                animate={{
                    x: [0, 80, -120, 0],
                    y: [0, 60, 40, 0],
                }}
                transition={{
                    duration: 40,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5
                }}
                className="absolute top-[30%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-cyan-400/5 blur-[100px]"
            />
        </div>
    );
}
