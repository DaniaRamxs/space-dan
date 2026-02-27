import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { socialService } from '../services/social';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { formatUsername, getNicknameClass } from '../utils/user';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

export default function OrbitLettersPage() {
    const { user } = useAuthContext();

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

    // User search states
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);

    useEffect(() => {
        if (!searchUserQuery.trim()) {
            setUserResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, nickname_style, nick_style_item:equipped_nickname_style(id)')
                    .ilike('username', `%${searchUserQuery}%`)
                    .limit(10);

                if (error) throw error;
                setUserResults(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setSearchingUsers(false);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [searchUserQuery]);

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
                        .select('id, username, avatar_url, nick_style_item:equipped_nickname_style(id)')
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
        if (!convId) return;
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

    const handleStartChat = (profile) => {
        const existing = conversations.find(c => c.other_user_id === profile.id);
        if (existing) {
            handleSelectConv(existing);
        } else {
            setActiveConv({
                conv_id: null,
                other_user_id: profile.id,
                other_username: profile.username,
                other_avatar: profile.avatar_url,
                other_nickname_style: profile.nickname_style,
                nick_style_item: profile.equipped_nickname_style,
                unread_count: 0,
                last_snippet: null
            });
            setLetters([]);
        }
        setShowUserSearch(false);
        setSearchUserQuery('');
        setMobileView('chat');
    };

    if (loading) return <div className="p-8 text-center opacity-50">Sintonizando frecuencias...</div>;

    return (
        <div className="lettersLayout">

            {/* ── SIDEBAR: Conversations ─────────────────────────────
                Hidden on mobile when mobileView === 'chat'          */}
            <div
                className={`glassCard lettersPanel${mobileView === 'chat' ? ' lettersPanel--hidden' : ''}`}
                style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
                <div style={{ flexShrink: 0, padding: '18px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: '17px', flex: 1 }}>✉️ Mensajería</h2>
                    <button
                        onClick={() => setShowUserSearch(!showUserSearch)}
                        style={{
                            background: showUserSearch ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        title="Nuevo Mensaje"
                    >
                        {showUserSearch ? '✕' : '＋'}
                    </button>
                </div>

                {showUserSearch && (
                    <div style={{ padding: '15px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                        <input
                            type="text"
                            placeholder="Buscar usuario por nombre..."
                            value={searchUserQuery}
                            onChange={(e) => setSearchUserQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '13px',
                                marginBottom: userResults.length > 0 || searchingUsers ? '10px' : 0
                            }}
                            autoFocus
                        />
                        {searchingUsers && <div style={{ fontSize: '11px', opacity: 0.5, padding: '5px' }}>Buscando...</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {userResults.map(profile => (
                                <div
                                    key={profile.id}
                                    onClick={() => handleStartChat(profile)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        border: '1px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    className="search-result-item"
                                >
                                    <img src={profile.avatar_url || '/default-avatar.png'} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                    <span style={{ fontSize: '13px' }}>{profile.username}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain' }}>
                    {conversations.length === 0 && !showUserSearch && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
                            No hay mensajes orbitando todavía.
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
                                    <div className={getNicknameClass({ nicknameStyle: conv.other_nickname_style, nick_style_item: conv.nick_style_item })} style={{ fontWeight: '600', fontSize: '14px' }}>{formatUsername(conv.other_username)}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {conv.last_snippet?.includes('giphy.com/media') ? '👾 GIF' : (conv.last_snippet || 'Empieza la conversación...')}
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
                style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
                {!activeConv ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.4 }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>✉️</div>
                        <p>Selecciona una señal para leer tus mensajes</p>
                    </div>
                ) : (
                    <>
                        {/* Chat header */}
                        <div style={{ flexShrink: 0, padding: '12px 18px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(10px)', sticky: 'top', zIndex: 100 }}>
                            <button
                                type="button"
                                onClick={() => setMobileView('list')}
                                className="lettersBackBtn"
                                style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                                    color: '#fff', cursor: 'pointer', fontSize: '18px',
                                    width: '36px', height: '36px', borderRadius: '12px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                ←
                            </button>
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={activeConv.other_avatar || '/default-avatar.png'}
                                    style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--accent)' }}
                                    alt="avatar"
                                />
                                <div className="online-indicator" style={{ position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, background: '#10b981', borderRadius: '50%', border: '2px solid #000' }}></div>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className={getNicknameClass({ nicknameStyle: activeConv.other_nickname_style, nick_style_item: activeConv.nick_style_item })} style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '-0.3px' }}>{formatUsername(activeConv.other_username)}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', animate: 'pulse 2s infinite' }}></div>
                                    <div style={{ fontSize: '10px', opacity: 0.4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>ENLACE_ESTABLECIDO</div>
                                </div>
                            </div>
                        </div>


                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
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
                                <div style={{ position: 'absolute', bottom: '100%', left: '0', width: '100%', height: '340px', background: 'rgba(5,5,10,0.98)', backdropFilter: 'blur(30px)', zIndex: 60, padding: '10px', overflowY: 'auto', borderTop: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '11px', color: 'var(--accent)' }}>SINTONIZANDO GIFS ✨</div>
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
                                    placeholder="Escribe un mensaje..."
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
