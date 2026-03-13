import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, MessageCircle, User, Radio, ChevronDown, Hash } from 'lucide-react';
import FloatingActionButton from './FloatingActionButton';
import useTouchGestures from '../../hooks/useTouchGestures';
import NotificationBell from '../Notifications/NotificationBell';

/**
 * MobileLayout - Layout estilo Global Chat para móvil
 * 
 * Diseño basado en GlobalChatPage:
 * - Header "Frecuencia Activa" con indicador verde
 * - Canales: General, Comandos, Avisos
 * - Versión "v2.5 Global Sync"
 * - Fondo oscuro #070710
 * - FAB flotante para actividades
 */
export default function MobileLayout({ 
    children, 
    currentRoute = 'general',
    onNavigate,
    onOpenActivity,
    currentActivity,
    channels = [
        { id: 'general', name: 'general', icon: '💬' },
        { id: 'comandos', name: 'comandos', icon: '🤖' },
        { id: 'avisos', name: 'avisos', icon: '📢' }
    ],
    activeChannel = 'general',
    onChannelChange,
    onlineCount = 1
}) {
    const [showChannels, setShowChannels] = useState(false);

    // Gestos para cambiar canales (swipe lateral)
    const { bind: swipeBind } = useTouchGestures({
        onSwipeLeft: () => {
            const currentIndex = channels.findIndex(c => c.id === activeChannel);
            if (currentIndex < channels.length - 1) {
                onChannelChange?.(channels[currentIndex + 1].id);
            }
        },
        onSwipeRight: () => {
            const currentIndex = channels.findIndex(c => c.id === activeChannel);
            if (currentIndex > 0) {
                onChannelChange?.(channels[currentIndex - 1].id);
            }
        },
        swipeThreshold: 50,
    });

    return (
        <div className="min-h-screen bg-[#070710] text-white font-sans overflow-hidden flex flex-col">
            
            {/* Header estilo Global Chat - Frecuencia Activa */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-[#070710]/95 backdrop-blur-xl shrink-0 z-[1000]">
                {/* Izquierda: Frecuencia Activa */}
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Frecuencia Activa
                    </span>
                </div>

                {/* Centro: Selector de Canal */}
                <button 
                    onClick={() => setShowChannels(!showChannels)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
                >
                    <Hash size={14} className="text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        {channels.find(c => c.id === activeChannel)?.name}
                    </span>
                    <ChevronDown size={14} className={`text-white/40 transition-transform ${showChannels ? 'rotate-180' : ''}`} />
                </button>

                {/* Derecha: Versión, Notificaciones y Online */}
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/60">
                        v2.5 Global Sync
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03]">
                        <Radio size={12} className="text-green-400" />
                        <span className="text-[10px] font-bold text-white/60">{onlineCount}</span>
                    </div>
                </div>
            </header>

            {/* Selector de Canales Desplegable */}
            <AnimatePresence>
                {showChannels && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-white/[0.05] bg-[#0a0a15] overflow-hidden z-[999]"
                    >
                        <div className="p-2 space-y-1">
                            {channels.map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => {
                                        onChannelChange?.(channel.id);
                                        setShowChannels(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        activeChannel === channel.id
                                            ? 'bg-cyan-500/10 border border-cyan-500/20'
                                            : 'hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <span className="text-lg">{channel.icon}</span>
                                    <div className="flex-1 text-left">
                                        <span className={`text-sm font-bold uppercase tracking-wider ${
                                            activeChannel === channel.id ? 'text-cyan-400' : 'text-white/60'
                                        }`}>
                                            {channel.name}
                                        </span>
                                    </div>
                                    {activeChannel === channel.id && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Contenido Principal */}
            <main 
                ref={(el) => swipeBind(el)}
                className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
            >
                {/* Indicadores de swipe para cambiar canal */}
                <div className="absolute top-1/2 left-2 -translate-y-1/2 pointer-events-none z-10">
                    {channels.findIndex(c => c.id === activeChannel) > 0 && (
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <ChevronDown size={16} className="text-white/20 rotate-90" />
                        </div>
                    )}
                </div>
                <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-none z-10">
                    {channels.findIndex(c => c.id === activeChannel) < channels.length - 1 && (
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <ChevronDown size={16} className="text-white/20 -rotate-90" />
                        </div>
                    )}
                </div>

                {/* Área de contenido */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </main>

            {/* Floating Action Button */}
            <FloatingActionButton
                onOpenGame={() => onOpenActivity?.('games')}
                onOpenMusic={() => onOpenActivity?.('dj')}
                onOpenChat={() => onOpenActivity?.('chat')}
                currentActivity={currentActivity}
            />

            {/* Bottom Navigation Bar estilo Global Chat */}
            <nav className="px-4 py-2 border-t border-white/[0.05] bg-[#070710]/95 backdrop-blur-xl shrink-0">
                <div className="flex items-center justify-around max-w-lg mx-auto">
                    {[
                        { id: 'general', icon: MessageCircle, label: 'Chat' },
                        { id: 'games', icon: Gamepad2, label: 'Juegos' },
                        { id: 'profile', icon: User, label: 'Perfil' },
                    ].map((item) => (
                        <motion.button
                            key={item.id}
                            onClick={() => onNavigate?.(item.id)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                                currentRoute === item.id 
                                    ? 'text-cyan-400 bg-cyan-500/10' 
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                            }`}
                            whileTap={{ scale: 0.9 }}
                        >
                            <item.icon size={20} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                        </motion.button>
                    ))}
                </div>
                
                {/* Safe area para iOS */}
                <div className="h-safe-area-inset-bottom" />
            </nav>

            {/* Efectos decorativos */}
            <div className="fixed -top-10 -right-10 w-40 h-40 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="fixed -bottom-10 -left-10 w-40 h-40 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
        </div>
    );
}
