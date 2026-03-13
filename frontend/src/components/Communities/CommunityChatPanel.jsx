/**
 * Community Chat Panel
 * Chat exclusivo de la comunidad con mensajes en tiempo real
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { chatService } from '../../services/chatService';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function CommunityChatPanel({ communityId, communityName, isMember }) {
    const { user } = useAuthContext();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const channelId = `community-${communityId}`;

    // Cargar mensajes iniciales
    useEffect(() => {
        loadMessages();
        
        // Suscripción en tiempo real
        const subscription = supabase
            .channel(`community-chat-${communityId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'global_chat',
                filter: `channel_id=eq.${channelId}`
            }, handleNewMessage)
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [communityId]);

    // Auto-scroll al final
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const msgs = await chatService.getRecentMessages(100, channelId);
            setMessages(msgs);
        } catch (error) {
            console.error('[CommunityChatPanel] Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewMessage = async (payload) => {
        const newMsg = payload.new;
        
        // Enriquecer con perfil del autor
        const { data: authorProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, equipped_nickname_style, user_level:level')
            .eq('id', newMsg.user_id)
            .single();

        const enrichedMsg = {
            ...newMsg,
            author: authorProfile || { username: 'Anónimo', id: newMsg.user_id }
        };

        setMessages(prev => [...prev, enrichedMsg]);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await chatService.sendMessage(newMessage, false, null, channelId);
            setNewMessage('');
            await chatService.incrementChatStats();
        } catch (error) {
            console.error('[CommunityChatPanel] Send error:', error);
            toast.error('Error al enviar mensaje');
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.06]">
                <h2 className="text-lg font-bold text-white/90">
                    💬 Chat de {communityName}
                </h2>
                <p className="text-xs text-white/40 mt-1">
                    {messages.length} mensajes
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                <AnimatePresence initial={false}>
                    {messages.map((msg, index) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex gap-3"
                        >
                            {/* Avatar */}
                            <img
                                src={msg.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username}`}
                                alt={msg.author?.username}
                                className="w-10 h-10 rounded-full flex-shrink-0"
                            />

                            {/* Message Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-semibold text-white/90 text-sm">
                                        {msg.author?.username || 'Anónimo'}
                                    </span>
                                    <span className="text-[10px] text-white/30">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-white/70 break-words">
                                    {msg.content}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="shrink-0 p-4 border-t border-white/[0.06] bg-[#0f0f13]">
                {!isMember ? (
                    <div className="text-center py-3 px-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <p className="text-sm text-white/40">
                            Únete a la comunidad para participar en el chat
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Mensaje en ${communityName}...`}
                            disabled={sending}
                            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
