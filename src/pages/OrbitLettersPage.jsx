import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { socialService } from '../services/social';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

export default function OrbitLettersPage() {
    useAuthContext();
    const [conversations, setConversations] = useState([]);
    const [activeConv, setActiveConv] = useState(null);
    const [letters, setLetters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [showGiphy, setShowGiphy] = useState(false);
    const [gifSearchTerm, setGifSearchTerm] = useState('');
    const [searchParams] = useSearchParams();
    const toUserId = searchParams.get('to');
    const scrollRef = useRef(null);

    // Mobile: 'list' shows conversations sidebar, 'chat' shows the active conversation
    const [mobileView, setMobileView] = useState(toUserId ? 'chat' : 'list');

    useEffect(() => {
        loadConversations();

        const channel = supabase
            .channel('letters_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'letters' }, payload => {
                if (activeConv && payload.new.conversation_id === activeConv.conv_id) {
                    loadLetters(activeConv.conv_id);
                }
                loadConversations();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [activeConv]);

    async function loadConversations() {
        try {
            const data = await socialService.getConversations();
            setConversations(data);

            if (toUserId && !activeConv) {
                const existing = data.find(c => c.other_user_id === toUserId);
                if (existing) {
                    setActiveConv(existing);
                    loadLetters(existing.conv_id);
                    setMobileView('chat');
                } else {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id, username, avatar_url')
                        .eq('id', toUserId)
                        .single();
                    if (profile) {
                        setActiveConv({
                            conv_id: null,
                            other_user_id: profile.id,
                            other_username: profile.username,
                            other_avatar: profile.avatar_url,
                            unread_count: 0,
                            last_snippet: null
                        });
                        setMobileView('chat');
                    }
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
        setMobileView('chat');
    };

    const handleSend = async (e, forceContent = null) => {
        if (e) e.preventDefault();
        const contentToSend = forceContent !== null ? forceContent : newContent;
        if (!contentToSend.trim() || !activeConv || sending) return;

        setSending(true);
        try {
            await socialService.sendLetter(activeConv.other_user_id, contentToSend);
            if (forceContent === null) setNewContent('');
            setShowGiphy(false);

            if (activeConv.conv_id) {
                loadLetters(activeConv.conv_id);
            } else {
                const data = await socialService.getConversations();
                setConversations(data);
                const newConv = data.find(c => c.other_user_id === activeConv.other_user_id);
                if (newConv) {
                    setActiveConv(newConv);
                    loadLetters(newConv.conv_id);
                }
            }
        } catch (err) {
            alert(err.message || 'Error al enviar');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="p-8 text-center opacity-50">Sintonizando frecuencias...</div>;

    return (
        <div className="lettersLayout">

            {/* ── SIDEBAR: Conversations ─────────────────────────────
                Hidden on mobile when mobileView === 'chat'          */}
            <div
                className={`glassCard lettersPanel${mobileView === 'chat' ? ' lettersPanel--hidden' : ''}`}
                style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
            >
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: '17px', flex: 1 }}>✉️ Cartas en Órbita</h2>
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
                                padding: '14px 20px',
                                borderBottom: '1px solid var(--glass-border)',
                                cursor: 'pointer',
                                background: activeConv?.conv_id === conv.conv_id ? 'var(--accent-dim)' : 'transparent',
                                borderLeft: activeConv?.conv_id === conv.conv_id ? '3px solid var(--accent)' : '3px solid transparent',
                            }}
                        >
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <img
                                    src={conv.other_avatar || '/default-avatar.png'}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{conv.other_username}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {conv.last_snippet || 'Empieza la conversación...'}
                                    </div>
                                </div>
                                {conv.unread_count > 0 && (
                                    <div style={{
                                        background: 'var(--accent)', color: '#fff', fontSize: '10px',
                                        padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold',
                                        boxShadow: '0 0 10px var(--accent-glow)', flexShrink: 0
                                    }}>
                                        {conv.unread_count}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* ── CHAT AREA ──────────────────────────────────────────
                Hidden on mobile when mobileView === 'list'          */}
            <div
                className={`glassCard lettersPanel${mobileView === 'list' ? ' lettersPanel--hidden' : ''}`}
                style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
            >
                {!activeConv ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.4 }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✉️</div>
                        <p>Selecciona una señal para leer tus cartas</p>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div style={{ flexShrink: 0, padding: '13px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            {/* Back button — only visible on mobile */}
                            <button
                                type="button"
                                onClick={() => setMobileView('list')}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--accent)',
                                    cursor: 'pointer', fontSize: '18px', padding: '0 4px',
                                    display: 'none', /* shown via CSS on mobile */
                                }}
                                className="lettersBackBtn"
                                aria-label="Volver a conversaciones"
                            >
                                ←
                            </button>
                            <img
                                src={activeConv.other_avatar || '/default-avatar.png'}
                                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)' }}
                                alt="avatar"
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{activeConv.other_username}</div>
                                <div style={{ fontSize: '10px', opacity: 0.45, textTransform: 'uppercase', letterSpacing: '1px' }}>Enlace Establecido</div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                        >
                            <AnimatePresence initial={false}>
                                {letters.map((l) => (
                                    <motion.div
                                        key={l.id}
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        style={{ maxWidth: '80%', alignSelf: l.is_mine ? 'flex-end' : 'flex-start' }}
                                    >
                                        <div style={{
                                            background: l.is_mine ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
                                            padding: l.content.includes('giphy.com/media') ? '6px' : '11px 16px',
                                            borderRadius: l.is_mine ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                            border: '1px solid var(--glass-border)',
                                            fontSize: '14px', lineHeight: '1.5',
                                            boxShadow: l.is_mine ? '0 4px 15px rgba(255,110,180,0.05)' : 'none',
                                            overflow: 'hidden'
                                        }}>
                                            {l.content.includes('giphy.com/media') ? (
                                                <img src={l.content} alt="GIF" style={{ maxWidth: '100%', borderRadius: '12px', display: 'block' }} />
                                            ) : (
                                                l.content
                                            )}
                                            <div style={{ fontSize: '10px', opacity: 0.4, marginTop: '6px', textAlign: l.is_mine ? 'right' : 'left' }}>
                                                {new Date(l.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Input */}
                        <form onSubmit={(e) => handleSend(e)} style={{ flexShrink: 0, padding: '14px 16px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 20px))', borderTop: '1px solid var(--glass-border)', background: 'rgba(5,5,10,0.95)', backdropFilter: 'blur(12px)', position: 'relative', zIndex: 50 }}>
                            {showGiphy && (
                                <div style={{ position: 'absolute', bottom: '100%', left: '0', width: '100%', height: '340px', background: '#111', zIndex: 60, padding: '10px', overflowY: 'auto', borderTop: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div style={{ fontWeight: 'bold' }}>Elige un GIF ✨</div>
                                        <button type="button" onClick={() => setShowGiphy(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar GIFs..."
                                        value={gifSearchTerm}
                                        onChange={(e) => setGifSearchTerm(e.target.value)}
                                        style={{ width: '100%', padding: '8px 12px', marginBottom: '10px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
                                    />
                                    <Grid
                                        key={gifSearchTerm}
                                        width={300}
                                        columns={3}
                                        fetchGifs={(offset) => gifSearchTerm.trim() ? gf.search(gifSearchTerm, { offset, limit: 10 }) : gf.trending({ offset, limit: 10 })}
                                        onGifClick={(gif, e) => {
                                            e.preventDefault();
                                            handleSend(null, gif.images.fixed_height.url);
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <motion.button
                                    type="button"
                                    onClick={() => setShowGiphy(!showGiphy)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '0 12px', fontSize: '18px', cursor: 'pointer' }}
                                    title="Enviar GIF"
                                >
                                    👾
                                </motion.button>
                                <input
                                    type="text"
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    placeholder="Escribe una carta..."
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '24px',
                                        padding: '11px 18px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontSize: '14px',
                                    }}
                                />
                                <motion.button
                                    type="submit"
                                    onClick={handleSend}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    disabled={sending || !newContent.trim()}
                                    className="btn-accent"
                                    style={{ borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                                >
                                    {sending ? '...' : '🚀'}
                                </motion.button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
