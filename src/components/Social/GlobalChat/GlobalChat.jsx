
import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useEconomy } from '../../../contexts/EconomyContext';
import { chatService } from '../../../services/chatService';
import { supabase } from '../../../supabaseClient';
import ChatMessage, { parseMentions } from './ChatMessage';
import ChatInput from './ChatInput';
import VoicePartyBar from './VoicePartyBar';
import VoiceRoomUI from '../../VoiceRoom/VoiceRoomUI';
import '../../../styles/GlobalChat.css';

export default function GlobalChat() {
    const { user } = useAuthContext();
    const { balance, awardCoins } = useEconomy();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isVipMode, setIsVipMode] = useState(false);
    const [showVoiceRoom, setShowVoiceRoom] = useState(false);
    const [inVoiceRoom, setInVoiceRoom] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        loadMessages();

        // Realtime Subscription
        const channel = supabase
            .channel('global-chat-room')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'global_chat'
            }, (payload) => {
                handleNewMessage(payload.new.id);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const loadMessages = async () => {
        try {
            const data = await chatService.getRecentMessages();
            setMessages(data);
        } catch (err) {
            console.error('[GlobalChat] Error loading messages:', err);
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    const handleNewMessage = async (id) => {
        // 1. Fetch message basic data
        const { data: msg, error: msgError } = await supabase
            .from('global_chat')
            .select('id, content, created_at, user_id, is_vip')
            .eq('id', id)
            .single();

        if (msgError || !msg) return;

        // 2. Fetch profile separately
        const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', msg.user_id)
            .single();

        const fullMessage = { ...msg, author: prof || { username: 'Viajero' } };

        setMessages(prev => {
            if (prev.find(m => m.id === fullMessage.id)) return prev;
            return [...prev, fullMessage].slice(-100);
        });

        if (fullMessage.user_id !== user?.id) playNotificationSound();
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const handleSendMessage = async (content, isVip) => {
        if (!user) return;
        if (isVip && balance < 50) {
            alert('No tienes suficientes Dancoins para un mensaje VIP (Costo: 50 DNC).');
            return;
        }

        try {
            await chatService.sendMessage(content, isVip);
            if (isVip) {
                awardCoins(-50, 'vip_chat_highlight');
                setIsVipMode(false);
            }
        } catch (err) {
            console.error('[GlobalChat] Error sending message:', err);
            alert('No se pudo enviar el mensaje. Revisa tu conexión.');
        }
    };

    const playNotificationSound = () => {
        // Sci-fi blip sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3');
        audio.volume = 0.15;
        audio.play().catch(() => {
            // Browsers block autoplay often, ignore
        });
    };

    return (
        <div className="chat-window min-h-[500px] flex flex-col relative">
            <div className="chat-messages-container flex-1 min-h-0 relative">

                {/* PROJECT Z STYLE VOICE BAR */}
                <VoicePartyBar
                    isActive={inVoiceRoom}
                    onJoin={() => setShowVoiceRoom(true)}
                    activeParticipants={[]} // En MVP esto podría venir de un hook de presencia de Supabase o LiveKit
                />

                {/* Cinematic Top Fade */}
                <div className="chat-fade-top" style={{ top: '60px' }} />

                {/* Pinned VIP Message (Absolute Overlay for total persistence) */}
                {messages.filter(m => m.is_vip).length > 0 && (
                    <div className="chat-pins-area p-3 px-4 bg-[#080812]/98 border-b border-amber-500/50 shadow-[0_8px_32px_rgba(0,0,0,0.8)]" style={{ top: '64px' }}>
                        <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full border border-amber-500/50 overflow-hidden ring-1 ring-amber-500/30">
                                <img
                                    src={messages.filter(m => m.is_vip).slice(-1)[0].author?.avatar_url || '/default-avatar.png'}
                                    className="w-full h-full object-cover"
                                />
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-1 mb-0.5">
                                    <span className="animate-pulse">★</span> DIFUSIÓN PRIORITARIA
                                </span>
                                <p
                                    className="text-[11px] text-white/95 line-clamp-1 italic font-bold leading-tight"
                                    dangerouslySetInnerHTML={{
                                        __html: messages.filter(m => m.is_vip).slice(-1)[0].content.includes('giphy.com')
                                            ? '👾 GIF Destacado'
                                            : parseMentions(messages.filter(m => m.is_vip).slice(-1)[0].content)
                                    }}
                                ></p>
                            </div>
                            <button
                                onClick={() => {
                                    const vipMsg = messages.filter(m => m.is_vip).slice(-1)[0];
                                    const el = document.getElementById(`msg-${vipMsg.id}`);
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className="bg-amber-500/20 p-2 rounded-lg hover:bg-amber-500/30 active:scale-90 transition-all border border-amber-500/40 text-amber-500 shadow-inner"
                                title="Localizar origen"
                            >
                                <span className="text-xs">📍</span>
                            </button>
                        </div>
                    </div>
                )}

                <div ref={scrollRef} className="chat-messages-scroll no-scrollbar min-h-[400px] h-auto pt-16 pb-12 touch-pan-y">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                                Conectando con el satélite...
                            </span>
                        </div>
                    ) : (
                        <>
                            {messages.length === 0 && (
                                <div className="text-center py-10 opacity-20">
                                    <span className="text-3xl block mb-2">☄️</span>
                                    <p className="text-[10px] uppercase font-black tracking-widest">El canal está en silencio... Di hola.</p>
                                </div>
                            )}
                            {messages.map((m) => (
                                <div key={m.id} id={`msg-${m.id}`} className="mb-4 last:mb-0">
                                    <ChatMessage
                                        message={m}
                                        isMe={m.user_id === user?.id}
                                    />
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            <ChatInput
                onSendMessage={handleSendMessage}
                isVipMode={isVipMode}
                setIsVipMode={setIsVipMode}
                balance={balance}
            />

            {/* VOICE ROOM OVERLAY (Project Z Style) */}
            <AnimatePresence>
                {showVoiceRoom && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#050510]/95 backdrop-blur-md"
                        onClick={() => setShowVoiceRoom(false)}
                    >
                        <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <VoiceRoomUI
                                roomName="Chat Global - Voz"
                                onLeave={() => {
                                    setShowVoiceRoom(false);
                                    setInVoiceRoom(false);
                                }}
                                onConnected={() => setInVoiceRoom(true)} // Añadir esta prop al componente original
                            />

                            <button
                                onClick={() => setShowVoiceRoom(false)}
                                className="w-full mt-4 p-4 rounded-3xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                            >
                                Mantener en Segundo Plano 🌌
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
