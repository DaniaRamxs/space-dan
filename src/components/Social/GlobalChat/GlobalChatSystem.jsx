
// v2.6 - LiveKit Project Z Integration
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useEconomy } from '../../../contexts/EconomyContext';
import { chatService } from '../../../services/chatService';
import { supabase } from '../../../supabaseClient';
import ChatMessage, { parseMentions } from './ChatMessage';
import ChatInput from './ChatInput';
import VoicePartyBar from './VoicePartyBar';
import VoiceRoomUI from '../../VoiceRoom/VoiceRoomUI';
import HoloCard from '../../HoloCard';
import '../../../styles/GlobalChat.css';

export default function GlobalChat() {
    const { user } = useAuthContext();
    const { balance, awardCoins } = useEconomy();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isVipMode, setIsVipMode] = useState(false);
    const [showVoiceRoom, setShowVoiceRoom] = useState(false);
    const [inVoiceRoom, setInVoiceRoom] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const scrollRef = useRef(null);
    const messagesEndRef = useRef(null);

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

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const data = await chatService.getRecentMessages();
            setMessages(data);
        } catch (err) {
            console.error('[GlobalChat] Error loading messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewMessage = async (id) => {
        // 1. Fetch message basic data
        const { data: msg, error: msgError } = await supabase
            .from('global_chat')
            .select('id, content, created_at, user_id, is_vip, reply_to_id')
            .eq('id', id)
            .single();

        if (msgError || !msg) return;

        // 2. Fetch profile separately
        const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', msg.user_id)
            .single();

        setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;

            let reply = null;
            if (msg.reply_to_id) {
                const originalMsg = prev.find(om => om.id === msg.reply_to_id);
                if (originalMsg) {
                    reply = {
                        content: originalMsg.content,
                        author: originalMsg.author?.username || 'Anónimo'
                    };
                }
            }

            const fullMessage = { ...msg, author: prof || { username: 'Viajero' }, reply };
            return [...prev, fullMessage].slice(-100);
        });

        if (msg.user_id !== user?.id) playNotificationSound();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 250);
    };

    const handleSendMessage = async (content, isVip, replyToId = null) => {
        if (!user) return;
        if (isVip && balance < 50) {
            alert('No tienes suficientes Dancoins para un mensaje VIP (Costo: 50 DNC).');
            return;
        }

        try {
            await chatService.sendMessage(content, isVip, replyToId);
            if (isVip) {
                awardCoins(-50, 'vip_chat_highlight');
                setIsVipMode(false);
            }
            setReplyingTo(null);
        } catch (err) {
            console.error('[GlobalChat] Error sending message:', err);
            alert('No se pudo enviar el mensaje. Revisa tu conexión.');
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3');
        audio.volume = 0.15;
        audio.play().catch(() => { });
    };

    const vipMessages = messages.filter(m => m.is_vip);
    const lastVip = vipMessages[vipMessages.length - 1];

    return (
        <div className="chat-window min-h-[500px] flex flex-col relative">
            <div className="chat-messages-container flex-1 min-h-0 relative">

                <VoicePartyBar
                    isActive={inVoiceRoom}
                    onJoin={() => setShowVoiceRoom(true)}
                    activeParticipants={[]}
                />

                <div className="chat-fade-top" style={{ top: '60px' }} />

                {lastVip && (
                    <div className="chat-pins-area p-3 px-4 bg-[#080812]/98 border-b border-amber-500/50 shadow-[0_8px_32px_rgba(0,0,0,0.8)]" style={{ top: '64px' }}>
                        <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full border border-amber-500/50 overflow-hidden ring-1 ring-amber-500/30">
                                <img
                                    src={lastVip.author?.avatar_url || '/default-avatar.png'}
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
                                        __html: lastVip.content.includes('giphy.com')
                                            ? '👾 GIF Destacado'
                                            : parseMentions(lastVip.content)
                                    }}
                                ></p>
                            </div>
                            <button
                                onClick={() => {
                                    const el = document.getElementById(`msg-${lastVip.id}`);
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

                <div ref={scrollRef} className="chat-messages-scroll no-scrollbar h-full pt-16 pb-40 touch-pan-y">
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
                                        onProfileClick={(author) => setSelectedProfile(author)}
                                        onReply={(msg) => setReplyingTo(msg)}
                                    />
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </div>

            <ChatInput
                onSendMessage={handleSendMessage}
                isVipMode={isVipMode}
                setIsVipMode={setIsVipMode}
                balance={balance}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
            />

            <AnimatePresence>
                {showVoiceRoom && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="voice-overlay-container"
                        onClick={() => setShowVoiceRoom(false)}
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="voice-overlay-content w-full max-w-md bg-[#050510]/98 backdrop-blur-2xl border-t border-white/10 rounded-t-[2.5rem] shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-6 mt-1 md:hidden" />

                            <VoiceRoomUI
                                roomName="Chat Global - Voz"
                                userAvatar={user?.user_metadata?.avatar_url}
                                onLeave={() => {
                                    setShowVoiceRoom(false);
                                    setInVoiceRoom(false);
                                }}
                                onConnected={() => setInVoiceRoom(true)}
                            />

                            <button
                                onClick={() => setShowVoiceRoom(false)}
                                className="w-full mt-6 p-4 rounded-3xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                            >
                                Mantener en Segundo Plano 🌌
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedProfile && (
                    <HoloCard
                        profile={selectedProfile}
                        onClose={() => setSelectedProfile(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
