/**
 * VinculosPage — Gestión de vínculos, notas estelares, galería y stats.
 * Ruta: /vinculos
 */
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { universeService } from '../services/universe';
import { PrivateUniverse } from '../components/PrivateUniverse';

// ── Milestones definition ──
const MILESTONES = [
    { id: 'first_visit', icon: '🌟', title: 'Primera Visita', desc: 'Visitaron su universo por primera vez', check: (s) => s.visit_count >= 1 },
    { id: 'ten_visits', icon: '🔭', title: '10 Exploraciones', desc: '10 visitas al universo compartido', check: (s) => s.visit_count >= 10 },
    { id: 'fifty_visits', icon: '☄️', title: 'Viajeros Frecuentes', desc: '50 visitas al universo', check: (s) => s.visit_count >= 50 },
    { id: 'hundred_visits', icon: '🪐', title: 'Órbita Estable', desc: '100 visitas al universo', check: (s) => s.visit_count >= 100 },
    { id: 'five_hundred', icon: '🌌', title: 'Cosmos Infinito', desc: '500 visitas al universo', check: (s) => s.visit_count >= 500 },
    { id: 'first_sync', icon: '✨', title: 'Sincronía', desc: 'Estuvieron online al mismo tiempo', check: (s) => s.sync_hits >= 1 },
    { id: 'ten_syncs', icon: '💫', title: 'Frecuencia Cuántica', desc: '10 sincronías juntos', check: (s) => s.sync_hits >= 10 },
    { id: 'week', icon: '🌙', title: '7 Días', desc: 'Una semana vinculados', check: (s, d) => d >= 7 },
    { id: 'month', icon: '🌓', title: '30 Días', desc: 'Un mes vinculados', check: (s, d) => d >= 30 },
    { id: 'quarter', icon: '🌕', title: '90 Días', desc: 'Tres meses vinculados', check: (s, d) => d >= 90 },
    { id: 'half_year', icon: '⭐', title: '180 Días', desc: 'Medio año juntos', check: (s, d) => d >= 180 },
    { id: 'year', icon: '💎', title: '365 Días', desc: 'Un año conectados en el cosmos', check: (s, d) => d >= 365 },
];

export default function VinculosPage() {
    const { user } = useAuthContext();
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [partnership, setPartnership] = useState(null);
    const [stats, setStats] = useState(null);
    const [notes, setNotes] = useState([]);
    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [activeTab, setActiveTab] = useState('stats');

    // Notes
    const [newNote, setNewNote] = useState('');
    const [noteLoading, setNoteLoading] = useState(false);

    // Gallery
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [caption, setCaption] = useState('');
    const [lightbox, setLightbox] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        loadAll();
    }, [user?.id]);

    async function loadAll() {
        setLoading(true);
        try {
            const [inRes, outRes, pData] = await Promise.all([
                supabase
                    .from('partnership_requests')
                    .select('*, sender:profiles!sender_id(id, username, avatar_url)')
                    .eq('receiver_id', user.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('partnership_requests')
                    .select('*, receiver:profiles!receiver_id(id, username, avatar_url)')
                    .eq('sender_id', user.id)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false }),
                universeService.getMyPartnership().catch(() => null),
            ]);

            setIncoming(inRes.data || []);
            setOutgoing(outRes.data || []);
            setPartnership(pData);

            // Load extras if partnership exists
            if (pData?.id) {
                const [sData, nData, gData] = await Promise.all([
                    universeService.getStats(pData.id).catch(() => null),
                    universeService.getNotes(pData.id).catch(() => []),
                    universeService.getGallery(pData.id).catch(() => []),
                ]);
                setStats(sData);
                setNotes(nData);
                setGallery(gData);
            }
        } catch (err) {
            console.error('[VinculosPage] load error:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleAccept = async (requestId) => {
        setActionLoading(requestId);
        try {
            await universeService.acceptRequest(requestId);
            alert('✨ ¡Vínculo aceptado! Su universo privado ha sido creado.');
            loadAll();
        } catch (err) {
            console.error('[VinculosPage] accept error:', err);
            alert('❌ Error al aceptar: ' + (err?.message || 'Error desconocido'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (requestId) => {
        if (!window.confirm('¿Rechazar esta solicitud de vínculo?')) return;
        setActionLoading(requestId);
        try {
            await universeService.rejectRequest(requestId);
            setIncoming(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            alert('❌ Error al rechazar la solicitud.');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Notes handlers ──
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim() || !partnership) return;
        setNoteLoading(true);
        try {
            const note = await universeService.addNote(partnership.id, newNote.trim());
            setNotes(prev => [note, ...prev]);
            setNewNote('');
        } catch (err) {
            alert('Error al enviar nota: ' + (err?.message || ''));
        } finally {
            setNoteLoading(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await universeService.deleteNote(noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (err) {
            alert('Error al eliminar nota.');
        }
    };

    // ── Gallery handlers ──
    const handleUploadImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !partnership) return;
        if (file.size > 5 * 1024 * 1024) return alert('Máximo 5MB por imagen.');
        setGalleryLoading(true);
        try {
            const img = await universeService.uploadGalleryImage(partnership.id, file, caption);
            setGallery(prev => [img, ...prev]);
            setCaption('');
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            alert('Error al subir imagen: ' + (err?.message || ''));
        } finally {
            setGalleryLoading(false);
        }
    };

    const handleDeleteImage = async (img) => {
        if (!window.confirm('¿Eliminar esta imagen?')) return;
        try {
            await universeService.deleteGalleryImage(img.id, img.image_url);
            setGallery(prev => prev.filter(g => g.id !== img.id));
        } catch (err) {
            alert('Error al eliminar imagen.');
        }
    };

    // ── Computed values ──
    const daysTogether = partnership?.linked_at
        ? Math.max(0, Math.floor((Date.now() - new Date(partnership.linked_at).getTime()) / 86400000))
        : 0;

    const unlockedMilestones = MILESTONES.filter(m =>
        m.check(stats || { visit_count: 0, sync_hits: 0 }, daysTogether)
    );

    if (!user) {
        return (
            <main className="card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: 'var(--text)', opacity: 0.7 }}>Debes iniciar sesión para ver tus vínculos.</p>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="card" style={{ padding: 40, textAlign: 'center' }}>
                <span className="blinkText" style={{ color: 'var(--accent)' }}>cargando_vínculos...</span>
            </main>
        );
    }

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px', paddingBottom: 80, minHeight: '100vh' }}>

            {/* Header */}
            <div style={{
                textAlign: 'center', marginBottom: 28, padding: '28px 16px 20px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(0,229,255,0.05) 100%)',
                borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✨</div>
                <h1 style={{
                    margin: 0, fontSize: '1.4rem', fontWeight: 900,
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                    background: 'linear-gradient(to right, #fff, #a0a0b0)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    Vínculos Estelares
                </h1>
                <p style={{ color: '#888', fontSize: '0.8rem', marginTop: 6, letterSpacing: '0.1em' }}>
                    Gestiona tus conexiones cósmicas
                </p>
            </div>

            {/* ── Active Partnership ── */}
            {partnership && (
                <>
                    {/* Universe opener + Day counter */}
                    <section style={{ marginBottom: 20 }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(0,229,255,0.08) 100%)',
                            border: '1px solid rgba(139,92,246,0.25)', borderRadius: 16,
                            padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem', boxShadow: '0 0 20px rgba(139,92,246,0.4)'
                            }}>💫</div>
                            <PrivateUniverse partnership={partnership} onUpdate={loadAll} />

                            {/* Day counter */}
                            <div style={{
                                marginTop: 12, textAlign: 'center',
                                background: 'rgba(0,0,0,0.3)', borderRadius: 12,
                                padding: '12px 20px', border: '1px solid rgba(255,255,255,0.05)',
                            }}>
                                <div style={{
                                    fontSize: '2rem', fontWeight: 900,
                                    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    lineHeight: 1,
                                }}>
                                    {daysTogether}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.25em', marginTop: 4 }}>
                                    días conectados en el cosmos
                                </div>
                                <div style={{ color: '#555', fontSize: '0.55rem', marginTop: 4 }}>
                                    desde {new Date(partnership.linked_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Tabs for partnership content */}
                    <div className="vinculos-mobile-glass" style={{
                        display: 'flex', borderRadius: 12,
                        padding: 4, marginBottom: 20,
                        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                    }}>
                        {['stats', 'notes', 'gallery', 'milestones'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
                                background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                                color: activeTab === tab ? '#fff' : '#666',
                                fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                transition: 'all 0.2s', whiteSpace: 'nowrap',
                                borderBottom: activeTab === tab ? '2px solid #06b6d4' : '2px solid transparent',
                            }}>
                                {{ stats: '📊 Stats', notes: '💌 Notas', gallery: '📸 Galería', milestones: '🏆 Hitos' }[tab]}
                            </button>
                        ))}
                    </div>

                    {/* TAB: Stats */}
                    {activeTab === 'stats' && (
                        <section style={{ marginBottom: 28 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                <StatBox icon="🚀" label="Visitas Totales" value={stats?.visit_count || 0} color="#06b6d4" />
                                <StatBox icon="✨" label="Sincronías" value={stats?.sync_hits || 0} color="#8b5cf6" />
                                <StatBox icon="🔥" label="Racha Actual" value={`${stats?.streak_days || 0}d`} color="#f59e0b" />
                                <StatBox icon="⚡" label="Mejor Racha" value={`${stats?.best_streak || 0}d`} color="#ef4444" />
                                <StatBox icon="🌌" label="Nivel Evolución" value={stats?.evolution_level || 1} color="#10b981" />
                                <StatBox icon="📅" label="Días Juntos" value={daysTogether} color="#ec4899" />
                            </div>
                        </section>
                    )}

                    {/* TAB: Stellar Notes */}
                    {activeTab === 'notes' && (
                        <section style={{ marginBottom: 28 }}>
                            {/* Add note form */}
                            <form onSubmit={handleAddNote} className="vinculos-mobile-glass" style={{
                                borderRadius: 14,
                                padding: 16, marginBottom: 16,
                            }}>
                                <textarea
                                    value={newNote} onChange={e => setNewNote(e.target.value)}
                                    placeholder="Escribe una nota estelar para tu pareja..."
                                    maxLength={200}
                                    style={{
                                        width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 10, padding: 12, color: '#fff', fontSize: '0.85rem',
                                        resize: 'none', minHeight: 70, outline: 'none', fontFamily: 'inherit',
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                    <span style={{ color: '#555', fontSize: '0.65rem' }}>{newNote.length}/200</span>
                                    <button type="submit" className="vinculos-action-btn" disabled={noteLoading || !newNote.trim()} style={{
                                        background: newNote.trim() ? 'linear-gradient(135deg, #06b6d4, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                                        border: 'none', borderRadius: 8, padding: '6px 18px',
                                        color: newNote.trim() ? '#fff' : '#555', fontSize: '0.75rem',
                                        fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'default',
                                        transition: 'all 0.2s',
                                    }}>
                                        {noteLoading ? '...' : '✨ Enviar'}
                                    </button>
                                </div>
                            </form>

                            {/* Notes list */}
                            {notes.length === 0 ? (
                                <EmptyState text="Aún no hay notas estelares. ¡Sé el primero en dejar una! 💫" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {notes.map(note => (
                                        <div key={note.id} style={{
                                            background: note.author_id === user.id
                                                ? 'rgba(6,182,212,0.06)' : 'rgba(139,92,246,0.06)',
                                            border: `1px solid ${note.author_id === user.id ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.15)'}`,
                                            borderRadius: 12, padding: '12px 16px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <img src={note.author?.avatar_url || '/default_user_blank.png'} alt=""
                                                    style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                                                />
                                                <span style={{ color: note.author_id === user.id ? '#06b6d4' : '#a78bfa', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {note.author?.username || 'Anónimo'}
                                                </span>
                                                <span style={{ color: '#444', fontSize: '0.6rem', marginLeft: 'auto' }}>
                                                    {new Date(note.created_at).toLocaleDateString()}
                                                </span>
                                                {note.author_id === user.id && (
                                                    <button onClick={() => handleDeleteNote(note.id)} style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#555', fontSize: '0.7rem', padding: '2px 4px',
                                                    }}>✕</button>
                                                )}
                                            </div>
                                            <p style={{ color: '#ddd', fontSize: '0.85rem', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                                                {note.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB: Gallery */}
                    {activeTab === 'gallery' && (
                        <section style={{ marginBottom: 28 }}>
                            {/* Upload */}
                            <div className="vinculos-mobile-glass" style={{
                                borderRadius: 14,
                                padding: 16, marginBottom: 16,
                                display: 'flex', flexDirection: 'column', gap: 10,
                            }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="file" accept="image/*" ref={fileRef} onChange={handleUploadImage}
                                        style={{ display: 'none' }}
                                    />
                                    <button className="vinculos-action-btn" onClick={() => fileRef.current?.click()} disabled={galleryLoading} style={{
                                        background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                                        border: 'none', borderRadius: 8, padding: '8px 18px',
                                        color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                        opacity: galleryLoading ? 0.5 : 1, transition: 'transform 0.2s'
                                    }}>
                                        {galleryLoading ? 'Subiendo...' : '📸 Subir Imagen'}
                                    </button>
                                    <span style={{ color: '#555', fontSize: '0.6rem' }}>Max 5MB • JPG, PNG, GIF</span>
                                </div>
                            </div>

                            {/* Gallery grid */}
                            {gallery.length === 0 ? (
                                <EmptyState text="La galería está vacía. ¡Suban recuerdos juntos! 📸" />
                            ) : (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                                }}>
                                    {gallery.map(img => (
                                        <div key={img.id} style={{
                                            position: 'relative', paddingBottom: '100%', borderRadius: 12,
                                            overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)',
                                            cursor: 'pointer', background: '#0a0a0f',
                                        }} onClick={() => setLightbox(img)}>
                                            <img src={img.image_url} alt={img.caption || ''} style={{
                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                objectFit: 'cover', transition: 'transform 0.3s',
                                            }} />
                                            {img.uploaded_by === user.id && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                                                    style={{
                                                        position: 'absolute', top: 4, right: 4,
                                                        background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                                                        width: 22, height: 22, color: '#f87171', fontSize: '0.65rem',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Lightbox */}
                            {lightbox && (
                                <div onClick={() => setLightbox(null)} style={{
                                    position: 'fixed', inset: 0, zIndex: 99999,
                                    background: 'rgba(0,0,0,0.9)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}>
                                    <img src={lightbox.image_url} alt="" style={{
                                        maxWidth: '90%', maxHeight: '85vh', borderRadius: 12,
                                        boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                                    }} />
                                    {lightbox.caption && (
                                        <div style={{
                                            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
                                            background: 'rgba(0,0,0,0.7)', padding: '8px 20px', borderRadius: 20,
                                            color: '#ddd', fontSize: '0.8rem',
                                        }}>
                                            {lightbox.caption}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* TAB: Milestones */}
                    {activeTab === 'milestones' && (
                        <section style={{ marginBottom: 28 }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginBottom: 12, paddingLeft: 4,
                            }}>
                                <span style={{ color: '#888', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                                    Hitos desbloqueados
                                </span>
                                <span style={{
                                    background: 'rgba(6,182,212,0.15)', color: '#06b6d4',
                                    fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                                    border: '1px solid rgba(6,182,212,0.25)',
                                }}>
                                    {unlockedMilestones.length}/{MILESTONES.length}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                {MILESTONES.map(m => {
                                    const unlocked = unlockedMilestones.find(u => u.id === m.id);
                                    return (
                                        <div key={m.id} style={{
                                            background: unlocked ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.01)',
                                            border: `1px solid ${unlocked ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)'}`,
                                            borderRadius: 12, padding: '14px 12px',
                                            opacity: unlocked ? 1 : 0.35, transition: 'all 0.3s',
                                            position: 'relative', overflow: 'hidden',
                                        }}>
                                            {unlocked && (
                                                <div style={{
                                                    position: 'absolute', top: -8, right: -8,
                                                    width: 40, height: 40, borderRadius: '50%',
                                                    background: 'rgba(139,92,246,0.15)', filter: 'blur(15px)',
                                                }} />
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                                                {unlocked && <span style={{ color: '#4ade80', fontSize: '0.6rem' }}>✓</span>}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: unlocked ? '#fff' : '#555' }}>{m.title}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#666', marginTop: 2 }}>{m.desc}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* ── Requests Section (always visible) ── */}

            {/* Incoming Requests */}
            <section style={{ marginBottom: 28 }}>
                <SectionTitle icon="📩" text="Solicitudes Recibidas" count={incoming.length} />
                {incoming.length === 0 ? (
                    <EmptyState text="No tienes solicitudes pendientes." />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {incoming.map(req => (
                            <RequestCard key={req.id} req={req} type="incoming"
                                actionLoading={actionLoading}
                                onAccept={() => handleAccept(req.id)}
                                onReject={() => handleReject(req.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Outgoing Requests */}
            <section style={{ marginBottom: 28 }}>
                <SectionTitle icon="📤" text="Solicitudes Enviadas" count={outgoing.length} />
                {outgoing.length === 0 ? (
                    <EmptyState text="No has enviado solicitudes." />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {outgoing.map(req => (
                            <RequestCard key={req.id} req={req} type="outgoing" />
                        ))}
                    </div>
                )}
            </section>

            {/* Tip */}
            <div style={{
                textAlign: 'center', padding: '16px 20px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 12, marginBottom: 32,
            }}>
                <p style={{ color: '#555', fontSize: '0.7rem', margin: 0, letterSpacing: '0.05em', lineHeight: 1.6 }}>
                    💡 Para enviar una solicitud de vínculo, visita el perfil de otro usuario
                    y haz clic en <strong style={{ color: '#06b6d4' }}>"✨ Solicitar Vínculo"</strong>.
                </p>
            </div>
        </div>
    );
}

// ══════════════════════════════════
// ── Subcomponents ──
// ══════════════════════════════════

function StatBox({ icon, label, value, color }) {
    return (
        <div className="vinculos-mobile-glass" style={{
            borderRadius: 14,
            padding: '16px 14px',
            textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', top: -10, right: -10,
                fontSize: '2.5rem', opacity: 0.05, transform: 'rotate(15deg)',
            }}>{icon}</div>
            <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.55rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 6, fontWeight: 700 }}>{label}</div>
        </div>
    );
}

function RequestCard({ req, type, actionLoading, onAccept, onReject }) {
    const person = type === 'incoming' ? req.sender : req.receiver;
    const color = type === 'incoming' ? '#06b6d4' : '#a78bfa';
    const bg = type === 'incoming' ? 'rgba(0,229,255,0.04)' : 'rgba(139,92,246,0.04)';
    const borderColor = type === 'incoming' ? 'rgba(0,229,255,0.12)' : 'rgba(139,92,246,0.12)';

    return (
        <div style={{
            background: bg, border: `1px solid ${borderColor}`,
            borderRadius: 14, padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
        }}>
            <Link to={person?.username ? `/@${person?.username}` : `/profile/${person?.id}`}>
                <img src={person?.avatar_url || '/default_user_blank.png'} alt="Avatar"
                    style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${borderColor}`, objectFit: 'cover' }}
                />
            </Link>
            <div style={{ flex: 1 }}>
                <Link to={person?.username ? `/@${person?.username}` : `/profile/${person?.id}`} style={{ color, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                    {person?.username || 'Usuario'}
                </Link>
                <div style={{ color: '#666', fontSize: '0.7rem', marginTop: 3 }}>
                    {type === 'incoming' ? 'quiere vincular sus universos contigo' : 'Esperando respuesta...'}
                </div>
                <div style={{ color: '#555', fontSize: '0.65rem', marginTop: 2 }}>
                    {new Date(req.created_at).toLocaleDateString()}
                </div>
            </div>
            {type === 'incoming' ? (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button disabled={actionLoading === req.id} onClick={onAccept} style={{
                        background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', border: 'none',
                        borderRadius: 8, padding: '7px 16px', color: '#fff', fontSize: '0.75rem',
                        fontWeight: 700, cursor: actionLoading === req.id ? 'wait' : 'pointer',
                        opacity: actionLoading === req.id ? 0.5 : 1,
                    }}>
                        {actionLoading === req.id ? '...' : '✓ Aceptar'}
                    </button>
                    <button disabled={actionLoading === req.id} onClick={onReject} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, padding: '7px 14px', color: '#999', fontSize: '0.75rem',
                        fontWeight: 600, cursor: 'pointer',
                    }}>✕</button>
                </div>
            ) : (
                <div style={{
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 20, padding: '4px 12px', fontSize: '0.65rem',
                    fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.15em',
                }}>Pendiente</div>
            )}
        </div>
    );
}

function SectionTitle({ icon, text, count }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingLeft: 4 }}>
            <span style={{ fontSize: '0.85rem' }}>{icon}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{text}</span>
            {typeof count === 'number' && count > 0 && (
                <span style={{
                    background: 'rgba(6,182,212,0.15)', color: '#06b6d4', fontSize: '0.6rem',
                    fontWeight: 800, padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.25)',
                }}>{count}</span>
            )}
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="vinculos-mobile-glass" style={{
            textAlign: 'center', padding: '24px 16px',
            borderRadius: 14, color: '#bbb', fontSize: '0.8rem', fontStyle: 'italic',
        }}>{text}</div>
    );
}
