import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * 🌌 StellarConstellation: Visualización de vínculos sociales (Mapa de Afinidad).
 * Mapea las "estrellas" (amigos) que orbitan alrededor del usuario.
 */
export default function StellarConstellation({ ownerId, friends = [], ownerAvatar }) {
    // Si no hay amigos con afinidad suficiente, el universo está vacío
    if (!friends || friends.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 grayscale opacity-30 text-center">
                <span className="text-4xl mb-4">🌫️</span>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed">
                    Vacío estelar detectado.<br />
                    Inicia transmisiones para atraer estrellas.
                </p>
            </div>
        );
    }

    // Configuración del layout circular (5 estrellas top)
    const stars = useMemo(() => {
        return friends.map((f, i) => {
            const angle = (i * (360 / friends.length)) * (Math.PI / 180);
            const radius = 95; // Radio del círculo
            return {
                ...f,
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius,
                // Fuerza visual de la línea (basada en strength)
                thickness: Math.min(Math.max(f.strength / 100000, 1), 6),
                glow: Math.min(Math.max(f.strength / 500000, 0.2), 1)
            };
        });
    }, [friends]);

    return (
        <div className="relative w-full max-w-[300px] aspect-square mx-auto flex items-center justify-center pointer-events-auto">
            {/* SVG para los Vínculos (Líneas Estelares) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 300">
                <defs>
                    <linearGradient id="link-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.4" />
                    </linearGradient>
                </defs>

                <AnimatePresence>
                    {stars.map((star, i) => (
                        <motion.line
                            key={`link-${star.friend_id}`}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: star.glow }}
                            transition={{ duration: 1.5, delay: i * 0.1 }}
                            x1="150" y1="150"
                            x2={150 + star.x} y2={150 + star.y}
                            stroke="url(#link-grad)"
                            strokeWidth={star.thickness}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 ${star.thickness * 4}px var(--accent))` }}
                        />
                    ))}
                </AnimatePresence>
            </svg>

            {/* Centro: Usuario dueño del perfil */}
            <div className="relative z-10 w-16 h-16 rounded-full border-2 border-white/20 p-1 bg-black overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <img
                    src={ownerAvatar || '/default-avatar.png'}
                    alt="Nucleo"
                    className="w-full h-full rounded-full object-cover"
                />
            </div>

            {/* Estrellas Amigas Orbitando */}
            {stars.map((star, i) => (
                <motion.div
                    key={star.friend_id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1, x: star.x, y: star.y }}
                    whileHover={{ scale: 1.2, zIndex: 100 }}
                    transition={{ type: "spring", stiffness: 100, delay: i * 0.15 }}
                    className="absolute"
                >
                    <Link
                        to={`/@${star.friend_username}`}
                        className="group relative flex flex-col items-center"
                    >
                        {/* Avatar Estrella */}
                        <div
                            className="w-10 h-10 rounded-full border border-white/40 p-0.5 bg-black overflow-hidden transition-all duration-300"
                            style={{ boxShadow: `0 0 ${star.glow * 20}px ${star.glow > 0.5 ? 'var(--accent)' : 'var(--cyan)'}` }}
                        >
                            <img
                                src={star.friend_avatar || '/default-avatar.png'}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>

                        {/* Label Flotante (solo hover) */}
                        <div className="absolute -bottom-6 bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 scale-75 transition-all text-[8px] font-black uppercase tracking-widest text-white whitespace-nowrap">
                            @{star.friend_username}
                        </div>
                    </Link>
                </motion.div>
            ))}

            {/* Decoración orbital sutil */}
            <div className="absolute inset-4 border border-white/[0.03] rounded-full pointer-events-none animate-spin-slow" />
            <div className="absolute inset-16 border border-white/[0.02] rounded-full pointer-events-none animate-reverse-spin" />
        </div>
    );
}
