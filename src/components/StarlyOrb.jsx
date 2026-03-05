import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 💎 StarlyOrb: Representación física de la riqueza estelar.
 * Diseño: Gigante gaseoso o estrella pulsante.
 * Escala: Logarítmica para evitar romper el layout con balances masivos (50B+).
 */
export default function StarlyOrb({ balance = 0, className = "" }) {
    const [isReacting, setIsReacting] = useState(false);

    // Calcular tamaño base (Logarítmico)
    // 1k -> ~40px, 1M -> ~70px, 1B -> ~100px, 50B+ -> ~130px (máx)
    const orbSize = useMemo(() => {
        if (balance <= 0) return 30;
        const log = Math.log10(balance);
        const size = 30 + (log * 8); // Crecimiento sutil
        return Math.min(size, 140);  // Mantener dentro de un margen seguro
    }, [balance]);

    // Intensidad del brillo basada en el orden de magnitud
    const intensity = Math.min(Math.floor(Math.log10(balance || 1)) / 10, 1);

    // Color según la riqueza
    const orbColor = useMemo(() => {
        if (balance > 1000000000) return 'var(--accent)'; // Legendario (Gold/Purple)
        if (balance > 1000000) return 'var(--cyan)';     // Millonario (Cyan)
        return 'rgba(255,255,255,0.6)';                 // Polvo estelar
    }, [balance]);

    const handleInteract = () => {
        setIsReacting(true);
        setTimeout(() => setIsReacting(false), 1000);
    };

    return (
        <div
            className={`relative flex items-center justify-center pointer-events-auto cursor-pointer ${className}`}
            style={{ width: 160, height: 160 }} // Margen de seguridad fijo
            onClick={handleInteract}
        >
            {/* Anillos orbitales sutiles */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute border border-white/5 rounded-full"
                style={{ width: orbSize + 40, height: orbSize + 40 }}
            />

            {/* Brillo Exterior (Aura) */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute rounded-full blur-[30px]"
                style={{
                    width: orbSize + 20,
                    height: orbSize + 20,
                    backgroundColor: orbColor,
                    filter: `blur(${20 + intensity * 20}px)`
                }}
            />

            {/* Núcleo de la Esfera */}
            <motion.div
                layout
                whileHover={{ scale: 1.05 }}
                animate={{
                    y: [0, -5, 0],
                    scale: isReacting ? 1.2 : 1
                }}
                transition={{
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    scale: { type: "spring", stiffness: 300 }
                }}
                className="relative rounded-full shadow-2xl overflow-hidden"
                style={{
                    width: orbSize,
                    height: orbSize,
                    background: `radial-gradient(circle at 30% 30%, white, ${orbColor} 40%, rgba(0,0,0,0.8) 100%)`,
                    boxShadow: `0 0 ${20 + intensity * 40}px ${orbColor}`
                }}
            >
                {/* Reflejo de cristal */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />

                {/* Textura de "Energía" */}
                <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2], x: ["-100%", "100%"] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-white/10 blur-sm transform -skew-x-12"
                />
            </motion.div>

            {/* Partículas de reacción */}
            <AnimatePresence>
                {isReacting && Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 1, scale: 0 }}
                        animate={{
                            opacity: 0,
                            scale: 1,
                            x: (Math.random() - 0.5) * 150,
                            y: (Math.random() - 0.5) * 150
                        }}
                        exit={{ opacity: 0 }}
                        className="absolute w-1 h-1 bg-white rounded-full"
                    />
                ))}
            </AnimatePresence>

            {/* Etiqueta de Valor (Opcional, flotante) */}
            <div className="absolute -bottom-4 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-black tracking-widest text-white/60">
                    NÚCLEO_ESTELAR_{Math.floor(balance).toLocaleString()}
                </span>
            </div>
        </div>
    );
}
