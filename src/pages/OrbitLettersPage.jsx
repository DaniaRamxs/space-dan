import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { socialService } from '../services/social';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function OrbitLettersPage() {
    const { user } = useAuthContext();
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [searchParams] = useSearchParams();
    const toUserId = searchParams.get('to');
    const scrollRef = useRef(null);

    useEffect(() => {
        loadConversations();

        // Realtime for new letters in the current conversation? 
        // The spec says letters are async, but we can still listen for changes.
        const channel = supabase
            .channel('letters_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'letters' }, payload => {
                if (activeConv && payload.new.conversation_id === activeConv.conv_id) {
                    // Update letters if it belongs to active
                    loadLetters(activeConv.conv_id);
                }
                loadConversations(); // Update list for snippets/unread
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [activeConv]);

    async function loadConversations() {
        try {
            const data = await socialService.getConversations();
            setConversations(data);

            // Handle deep link
            if (toUserId && !activeConv) {
                const existing = data.find(c => c.other_user_id === toUserId);
                if (existing) {
                    setActiveConv(existing);
                    loadLetters(existing.conv_id);
                } else {
                    // Start new conversation placeholder?
                    // For now, let's just create a dummy "active" if it doesn't exist
                    // Or let handleSend handle it.
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function loadLetters(convId) {
        try {
            const data = await socialService.getLetters(convId);
            setLetters(data);
            // Mark all as read
            const unread = data.filter(l => !l.is_mine && !l.is_read);
            for (const l of unread) {
                await socialService.markAsRead(l.id);
            }
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [letters]);

    const handleSelectConv = (conv) => {
        setActiveConv(conv);
        loadLetters(conv.conv_id);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newContent.trim() || !activeConv || sending) return;

        setSending(true);
        try {
            await socialService.sendLetter(activeConv.other_user_id, newContent);
            setNewContent('');
            loadLetters(activeConv.conv_id);
        } catch (err) {
            alert(err.message || 'Error al enviar');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="p-8 text-center opacity-50">Sintonizando frecuencias...</div>;

    return (
        <div className="layoutOne" style={{ maxWidth: '1000px', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 120px)' }}>

            {/* Sidebar: Conversations */}
            <div className="glassCard" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>Cartas en Órbita</h2>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {conversations.length === 0 && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
                            No hay cartas orbitando todavía.
                        </div>
                    )}
                    {conversations.map(conv => (
                        <motion.div
                            key={conv.conv_id}
                            whileHover={{ background: 'rgba(255,255,255,0.03)' }}
                            onClick={() => handleSelectConv(conv)}
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                background: activeConv?.conv_id === conv.conv_id ? 'var(--accent-dim)' : 'transparent',
                                borderLeft: activeConv?.conv_id === conv.conv_id ? '3px solid var(--accent)' : '3px solid transparent',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                    src={conv.other_avatar || '/default-avatar.png'}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border)' }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{conv.other_username}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {conv.last_snippet || 'Empieza la conversación...'}
                                    </div>
                                </div>
                                {conv.unread_count > 0 && (
                                    <div style={{
                                        background: 'var(--accent)',
                                        color: '#fff',
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 0 10px var(--accent-glow)'
                                    }}>
                                        {conv.unread_count}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Main Area: Letters */}
            <div className="glassCard" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {!activeConv ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.4 }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✉️</div>
                        <p>Selecciona una señal para leer tus cartas</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ padding: '15px 25px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontWeight: 'bold' }}>{activeConv.other_username}</div>
                                <span style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Enlace Establecido</span>
                            </div>
                        </div>

                        {/* History */}
                        <div
                            ref={scrollRef}
                            style={{ flex: 1, overflowY: 'auto', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}
                        >
                            <AnimatePresence initial={false}>
                                {letters.map((l, i) => (
                                    <motion.div
                                        key={l.id}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        style={{
                                            maxWidth: '80%',
                                            alignSelf: l.is_mine ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <div style={{
                                            background: l.is_mine ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
                                            padding: '12px 18px',
                                            borderRadius: l.is_mine ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                            border: '1px solid var(--glass-border)',
                                            fontSize: '14px',
                                            lineHeight: '1.5',
                                            position: 'relative',
                                            boxShadow: l.is_mine ? '0 4px 15px rgba(255,110,180,0.05)' : 'none'
                                        }}>
                                            {l.content}
                                            <div style={{ fontSize: '10px', opacity: 0.4, marginTop: '8px', textAlign: l.is_mine ? 'right' : 'left' }}>
                                                {new Date(l.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} style={{ padding: '20px', borderTop: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    placeholder="Escribe una carta..."
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '24px',
                                        padding: '12px 20px',
                                        color: '#fff',
                                        outline: 'none'
                                    }}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={sending || !newContent.trim()}
                                    className="btn-accent"
                                    style={{ borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                >
                                    {sending ? '...' : '🚀'}
                                </motion.button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div >
    );
}
