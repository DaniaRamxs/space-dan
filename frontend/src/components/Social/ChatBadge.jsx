import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { memo } from 'react';

/**
 * Componente unificado para mostrar la insignia (Badge/Emblema) del usuario.
 * Reacciona según el emblema equipado y el color de insignia (badge_color).
 */
const ChatBadge = memo(({ badge, color, size = 10, className = '' }) => {
    // Si badge es un objeto (de store_items), sacamos su icono.
    // Si es un string (ID o Icono directo), lo usamos.
    // Si no hay badge, usamos '✨' (Sparkles) por defecto.
    const icon = typeof badge === 'object' ? badge?.icon : (badge || null);
    const displayColor = color || '#7c3aed';

    // Determinar si es un icono de Lucide o un emoji/texto.
    // Por simplicidad, si no hay 'icon' usamos el Lucide Sparkles.
    const isCustom = !!icon;

    return (
        <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`flex-shrink-0 relative group/badge ${className}`}
        >
            {/* Glow Aura */}
            <div
                className="absolute inset-0 blur-[6px] opacity-40 rounded-full"
                style={{ backgroundColor: displayColor }}
            />

            {/* Badge Container */}
            <div
                className="relative p-0.5 rounded-md border border-white/20 bg-black/40 shadow-lg backdrop-blur-[2px] flex items-center justify-center min-w-[18px] min-h-[18px]"
            >
                {isCustom ? (
                    <span className="text-[10px] leading-none select-none filter drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]">
                        {icon}
                    </span>
                ) : (
                    <Sparkles
                        size={size}
                        style={{ color: displayColor }}
                        className="drop-shadow-[0_0_5px_currentColor] brightness-150"
                    />
                )}
            </div>
        </motion.div>
    );
});

ChatBadge.displayName = 'ChatBadge';

export default ChatBadge;
