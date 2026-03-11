import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Gamepad2, Music, MessageCircle, X, Radio } from 'lucide-react';

/**
 * FloatingActionButton - Botón flotante con menú radial
 * 
 * Funcionalidades:
 * - Tap para abrir menú radial con actividades
 * - Acceso rápido a Juegos, Música, Chat
 * - Animaciones suaves y feedback táctil
 * - Cierre automático al seleccionar o tocar fuera
 */
export default function FloatingActionButton({
    onOpenGame,
    onOpenMusic,
    onOpenChat,
    currentActivity,
    isVisible = true
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fabRef = useRef(null);
    const longPressTimer = useRef(null);

    const menuItems = [
        { id: 'games', icon: Gamepad2, label: 'Juegos', color: 'from-purple-500 to-pink-500', onClick: onOpenGame },
        { id: 'music', icon: Music, label: 'Música', color: 'from-blue-500 to-cyan-500', onClick: onOpenMusic },
        { id: 'chat', icon: MessageCircle, label: 'Chat', color: 'from-emerald-500 to-teal-500', onClick: onOpenChat },
    ];

    // Detectar long press para mostrar menú
    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            setIsOpen(true);
            setIsDragging(true);
        }, 300);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
        // Si no fue long press, toggle
        if (!isDragging && !isOpen) {
            setIsOpen(!isOpen);
        }
        setIsDragging(false);
    };

    // Cerrar al tocar fuera
    useEffect(() => {
        if (!isOpen) return;
        
        const handleClickOutside = (e) => {
            if (fabRef.current && !fabRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isOpen]);

    // Cerrar automáticamente después de 5 segundos
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => setIsOpen(false), 5000);
        return () => clearTimeout(timer);
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div 
            ref={fabRef}
            className="fixed bottom-20 right-4 z-[12000] flex flex-col items-end"
        >
            {/* Menú Radial */}
            <AnimatePresence>
                {isOpen && (
                    <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2 mb-2">
                        {menuItems.map((item, index) => (
                            <motion.button
                                key={item.id}
                                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                                transition={{ 
                                    delay: index * 0.05,
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 20
                                }}
                                onClick={() => {
                                    item.onClick?.();
                                    setIsOpen(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 bg-gradient-to-r ${item.color} rounded-full shadow-lg text-white border border-white/20 backdrop-blur-sm`}
                                whileTap={{ scale: 0.9 }}
                            >
                                <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                                    {item.label}
                                </span>
                                <item.icon size={18} />
                            </motion.button>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Botón Principal FAB */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-[0_0_30px_rgba(147,51,234,0.5)] border-2 border-purple-400/50 flex items-center justify-center relative overflow-hidden`}
                whileTap={{ scale: 0.9 }}
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
            >
                {/* Efecto de pulso cuando hay actividad */}
                {currentActivity && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-purple-500/30"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
                
                {isOpen ? <X size={24} /> : <Plus size={24} />}
            </motion.button>

            {/* Indicador de actividad actual */}
            {currentActivity && !isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 border-2 border-black flex items-center justify-center"
                >
                    <Radio size={10} className="text-white" />
                </motion.div>
            )}

            {/* Hint tooltip (solo mostrar una vez) */}
            {!isOpen && !localStorage.getItem('fab-hint-shown') && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute bottom-16 right-0 bg-purple-600/90 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap"
                    onClick={() => localStorage.setItem('fab-hint-shown', 'true')}
                >
                    Toca para actividades
                    <div className="absolute -bottom-1 right-6 w-2 h-2 bg-purple-600/90 rotate-45" />
                </motion.div>
            )}
        </div>
    );
}
