import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../../services/chatService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { MessageCircle, ArrowRight } from 'lucide-react';

const GlobalChatPreview = memo(() => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadRecent = async () => {
            try {
                const data = await chatService.getRecentMessages(3);
                setMessages(data);
            } catch (err) {
                console.error('[ChatPreview] Error loading messages:', err);
            } finally {
                setLoading(false);
            }
        };

        loadRecent();

        // Suscribirse a nuevos mensajes para mantener el preview vivo
        const channel = supabase.channel('chat-preview-sync')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_chat' }, () => {
                loadRecent();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading && messages.length === 0) return null;
    if (!loading && messages.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-[#0a0a1a]/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl group/preview"
        >
            <div className="flex items-center justify-between px-7 py-5 border-b border-white/[0.03] bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                        <MessageCircle size={14} className="text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Chat Global</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[8px] font-black text-cyan-500/60 uppercase tracking-tighter">Frecuencia Viva</span>
                </div>
            </div>

            <div className="p-7 space-y-4">
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {messages.map((m, idx) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-start gap-4 group/msg"
                            >
                                <img
                                    src={m.author?.avatar_url || '/default-avatar.png'}
                                    alt=""
                                    className="w-7 h-7 rounded-lg object-cover grayscale group-hover/msg:grayscale-0 transition-all border border-white/5"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[10px] font-black text-white/40 truncate hover:text-cyan-400 transition-colors cursor-pointer">
                                            {m.author?.username || 'Viajero'}
                                        </span>
                                        <span className="text-[7px] text-white/10 uppercase font-bold">
                                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/80 leading-relaxed truncate">
                                        {m.content}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => navigate('/chat')}
                    className="w-full mt-4 flex items-center justify-between px-6 py-4 bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 rounded-2xl transition-all group/btn"
                >
                    <span className="text-[9px] font-black text-white/40 group-hover/btn:text-cyan-400 uppercase tracking-widest">Unirse a la conversación</span>
                    <ArrowRight size={14} className="text-white/20 group-hover/btn:text-cyan-400 group-hover/btn:translate-x-1 transition-all" />
                </motion.button>
            </div>
        </motion.div>
    );
});

GlobalChatPreview.displayName = 'GlobalChatPreview';

export default GlobalChatPreview;
