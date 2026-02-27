
import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useEconomy } from '../../../contexts/EconomyContext';
import { chatService } from '../../../services/chatService';
import { supabase } from '../../../supabaseClient';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import '../../../styles/GlobalChat.css';

export default function GlobalChat() {
    const { user } = useAuthContext();
    const { balance, awardCoins } = useEconomy();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isVipMode, setIsVipMode] = useState(false);
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
        <div className="chat-window h-[500px] md:h-[600px] flex flex-col">
            <div className="chat-messages-container flex-1 min-h-0">
                <div ref={scrollRef} className="chat-messages-scroll no-scrollbar h-full">
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
                                <ChatMessage
                                    key={m.id}
                                    message={m}
                                    isMe={m.user_id === user?.id}
                                />
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
        </div>
    );
}
