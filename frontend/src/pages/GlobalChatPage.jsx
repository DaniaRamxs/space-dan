import { useSearchParams, useNavigate } from 'react-router-dom';
import GlobalChat from '../components/Social/GlobalChat/GlobalChatSystem';
import { Capacitor } from '@capacitor/core';
import { useState, useEffect } from 'react';

const isNative = Capacitor.isNativePlatform();

/**
 * GlobalChatPage - Mobile-First Version
 * 
 * Desktop: Usa el layout original con sidebar y estética completa
 * Mobile: Usa MobileLayout optimizado con FAB y navegación inferior
 */
export default function GlobalChatPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialActivity = searchParams.get('activity');
    
    // Detectar si es vista móvil
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || isNative);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Datos para MobileLayout
    const [activeChannel, setActiveChannel] = useState('general');
    
    const channels = [
        { id: 'general', name: 'general', icon: '💬', description: 'Chat principal de la comunidad' },
        { id: 'comandos', name: 'comandos', icon: '🤖', description: 'Interacción exclusiva con HyperBot' },
        { id: 'avisos', name: 'avisos', icon: '📢', description: 'Noticias y actualizaciones' }
    ];

    // Si es móvil, usar MobileChatLayout
    if (isMobile) {
        return (
            <MobileChatLayout
                channels={channels}
                activeChannel={activeChannel}
                onChannelChange={setActiveChannel}
                onNavigate={(route) => {
                    if (route === 'games') navigate('/games');
                    if (route === 'profile') navigate('/profile');
                }}
            >
                <GlobalChat initialActivity={initialActivity} />
            </MobileChatLayout>
        );
    }

    // Desktop: Layout simplificado - deja que GlobalChat maneje su propio layout interno
    return (
        <main className="w-full h-dvh bg-[#070710] text-white font-sans overflow-hidden">
            <GlobalChat initialActivity={initialActivity} />
        </main>
    );
}

/**
 * MobileChatLayout - Layout específico para móvil en GlobalChat
 */
function MobileChatLayout({ 
    children, 
    channels,
    activeChannel,
    onChannelChange,
    onNavigate
}) {
    const [showChannels, setShowChannels] = useState(false);

    return (
        <div className="h-dvh bg-[#070710] text-white font-sans flex flex-col overflow-hidden">
            
            {/* Selector de Canales Desplegable */}
            {showChannels && (
                <div className="border-b border-white/[0.05] bg-[#0a0a15] p-2 z-[99]">
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
                                <p className="text-[10px] text-white/30 truncate">{channel.description}</p>
                            </div>
                            {activeChannel === channel.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Contenido Principal (GlobalChat) - SIN FAB */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="px-4 py-2 border-t border-white/[0.05] bg-[#070710]/95 backdrop-blur-xl shrink-0 pb-safe">
                <div className="flex items-center justify-around max-w-lg mx-auto">
                    {[
                        { id: 'general', icon: MessageCircleIcon, label: 'Chat' },
                        { id: 'games', icon: GamepadIcon, label: 'Juegos' },
                        { id: 'profile', icon: UserIcon, label: 'Perfil' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate?.(item.id)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                                item.id === 'general'
                                    ? 'text-cyan-400 bg-cyan-500/10' 
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
                            }`}
                        >
                            <item.icon size={20} />
                            <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}

function MessageCircleIcon({ size }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
        </svg>
    );
}

function GamepadIcon({ size }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/>
        </svg>
    );
}

function UserIcon({ size }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
    );
}
