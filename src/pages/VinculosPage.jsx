import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { universeService } from '../services/universe';
import { PrivateUniverse } from '../components/PrivateUniverse';
import { motion, AnimatePresence } from 'framer-motion';

// --- Milestones definition ---
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
    const { user, profile: myProfile } = useAuthContext();
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

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim() || !partnership) return;
        setNoteLoading(true);
        try {
            const note = await universeService.addNote(partnership.id, newNote.trim());
            setNotes(prev => [note, ...prev]);
            setNewNote('');
        } catch (err) {
            alert('Error al enviar nota');
        } finally {
            setNoteLoading(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            await universeService.deleteNote(noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (err) {
            alert('Error al eliminar nota');
        }
    };

    const handleUploadImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !partnership) return;
        if (file.size > 5 * 1024 * 1024) return alert('Máximo 5MB.');
        setGalleryLoading(true);
        try {
            const img = await universeService.uploadGalleryImage(partnership.id, file, caption);
            setGallery(prev => [img, ...prev]);
            setCaption('');
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            alert('Error al subir imagen');
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
            alert('Error al eliminar imagen');
        }
    };

    const daysTogether = partnership?.linked_at
        ? Math.max(0, Math.floor((Date.now() - new Date(partnership.linked_at).getTime()) / 86400000))
        : 0;

    const unlockedMilestones = MILESTONES.filter(m =>
        m.check(stats || { visit_count: 0, sync_hits: 0 }, daysTogether)
    );

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <p className="text-white/40 font-black uppercase tracking-[0.3em] text-xs">Acceso Denegado</p>
                <p className="text-white/20 mt-4 text-sm">Debes iniciar sesión para explorar tus vínculos estelares.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-2 border-white/5 border-t-white/40 rounded-full animate-spin"></div>
                <p className="mt-8 text-white/20 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Sincronizando Órbitas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 pb-32 pt-12">

            {/* Header Moderno */}
            <header className="relative mb-16 py-12 px-8 rounded-[2.5rem] bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 border border-white/5 overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid-pattern.png')] opacity-[0.03] pointer-events-none"></div>
                <div className="relative z-10">
                    <span className="text-4xl mb-4 block">✨</span>
                    <h1 className="text-display font-black uppercase tracking-[0.2em] bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Vínculos Estelares</h1>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em] mt-4">Gestión de conexiones en el cosmos</p>
                </div>
            </header>

            {partnership && (
                <div className="space-y-16">
                    {/* Tarjeta de Vínculo Activo */}
                    <section className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 overflow-hidden">

                            <div className="flex flex-col items-center text-center space-y-8">
                                <div className="p-1 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_30px_rgba(139,92,246,0.3)] animate-pulse">
                                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-2xl">💫</div>
                                </div>

                                <PrivateUniverse partnership={partnership} onUpdate={loadAll} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-8">
                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col items-center">
                                        <span className="text-display font-bold font-mono text-cyan-400 tracking-tighter tabular-nums">{daysTogether}</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mt-2 text-center">Días de Conexión Estelar</span>
                                    </div>
                                    <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col items-center">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-2 mb-4 w-full text-center">Iniciado el</span>
                                        <span className="text-xs font-mono text-white/60">
                                            {new Date(partnership.linked_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Navegación Interna */}
                    <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                        {['stats', 'notes', 'gallery', 'milestones'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeTab === tab
                                    ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)]'
                                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white/60'
                                    }`}
                            >
                                {{ stats: 'Métricas', notes: 'Bitácora', gallery: 'Recuerdos', milestones: 'Hitos' }[tab]}
                            </button>
                        ))}
                    </nav>

                    {/* Contenido de Pestañas */}
                    <div className="min-h-[400px]">
                        {activeTab === 'stats' && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                                <StatCardV icon="🚀" label="Visitas" value={stats?.visit_count || 0} color="text-cyan-400" />
                                <StatCardV icon="✨" label="Sincronías" value={stats?.sync_hits || 0} color="text-purple-400" />
                                <StatCardV icon="🔥" label="Racha" value={`${stats?.streak_days || 0}d`} color="text-orange-400" />
                                <StatCardV icon="🌌" label="Nivel" value={stats?.evolution_level || 1} color="text-green-400" />
                                <StatCardV icon="📅" label="Unión" value={daysTogether} color="text-pink-400" />
                                <StatCardV icon="⚡" label="Récord" value={`${stats?.best_streak || 0}d`} color="text-blue-400" />
                            </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="space-y-8 animate-fade-in">
                                <form onSubmit={handleAddNote} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 space-y-6">
                                    <textarea
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        placeholder="Escribe algo estelar..."
                                        className="w-full bg-transparent border-none text-sm text-white/80 placeholder:text-white/10 outline-none h-24 resize-none"
                                    />
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <span className="text-[9px] font-black font-mono text-white/10">{newNote.length}/200</span>
                                        <button
                                            type="submit"
                                            disabled={noteLoading || !newNote.trim()}
                                            className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${newNote.trim() ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white/5 text-white/10 cursor-not-allowed'
                                                }`}
                                        >
                                            {noteLoading ? 'PROCESANDO...' : 'ENVIAR MENSAJE'}
                                        </button>
                                    </div>
                                </form>

                                <div className="space-y-4">
                                    {notes.length === 0 ? (
                                        <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.4em] text-white/10">No hay transmisiones registradas</div>
                                    ) : (
                                        notes.map(note => (
                                            <div key={note.id} className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 group hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <img src={note.author?.avatar_url || '/default_user_blank.png'} className="w-8 h-8 rounded-full border border-white/10 object-cover opacity-60" />
                                                    <div className="flex-1">
                                                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/40">@{note.author?.username}</span>
                                                        <span className="text-[8px] font-mono text-white/10 block mt-0.5">{new Date(note.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    {note.author_id === user.id && (
                                                        <button onClick={() => handleDeleteNote(note.id)} className="text-rose-500/20 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2">✕</button>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white/60 leading-relaxed pl-12">{note.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 flex flex-col items-center">
                                    <input type="file" accept="image/*" ref={fileRef} onChange={handleUploadImage} className="hidden" />
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        disabled={galleryLoading}
                                        className="px-10 py-4 bg-white text-black font-black text-[11px] uppercase tracking-widest rounded-2xl hover:scale-[1.05] transition-transform active:scale-95 disabled:bg-white/20"
                                    >
                                        {galleryLoading ? 'SUBIENDO...' : 'SUBIR RECUERDO FOTOGRÁFICO'}
                                    </button>
                                    <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.4em] mt-6">Acepta JPG, PNG y GIF hasta 5MB</p>
                                </div>

                                {gallery.length === 0 ? (
                                    <div className="py-32 text-center text-[10px] font-black uppercase tracking-[0.4em] text-white/10 italic">La bóveda de recuerdos está vacía</div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {gallery.map(img => (
                                            <div
                                                key={img.id}
                                                onClick={() => setLightbox(img)}
                                                className="aspect-square rounded-3xl overflow-hidden border border-white/5 bg-black/40 group cursor-pointer relative"
                                            >
                                                <img src={img.image_url} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-110" />
                                                {img.uploaded_by === user.id && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                                                        className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 hover:bg-rose-500 hover:text-white"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'milestones' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center px-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Hitos de la Constelación</span>
                                    <span className="text-[10px] font-black font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                                        {unlockedMilestones.length} / {MILESTONES.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {MILESTONES.map(m => {
                                        const unlocked = unlockedMilestones.some(u => u.id === m.id);
                                        return (
                                            <div
                                                key={m.id}
                                                className={`p-6 rounded-[2rem] border transition-all ${unlocked
                                                    ? 'bg-purple-500/5 border-purple-500/20'
                                                    : 'bg-white/[0.01] border-white/5 opacity-40 grayscale'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4 mb-3">
                                                    <span className="text-3xl">{m.icon}</span>
                                                    <div>
                                                        <h3 className="text-xs font-black uppercase tracking-widest text-white/80">{m.title}</h3>
                                                        <p className="text-[10px] text-white/30">{m.desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Secciones de Solicitudes */}
            <div className="mt-24 space-y-12">

                {/* Solicitudes Recibidas */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <span className="w-8 h-px bg-white/5"></span>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Solicitudes Recibidas ({incoming.length})</h2>
                    </div>
                    {incoming.length === 0 ? (
                        <div className="py-12 text-center text-[10px] font-black text-white/10 uppercase tracking-[0.4em] border border-white/5 border-dashed rounded-[2rem]">Bandeja vacía</div>
                    ) : (
                        <div className="space-y-4">
                            {incoming.map(req => (
                                <RequestRow key={req.id} req={req} type="incoming" actionLoading={actionLoading} onAccept={() => handleAccept(req.id)} onReject={() => handleReject(req.id)} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Solicitudes Enviadas */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <span className="w-8 h-px bg-white/5"></span>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Solicitudes Enviadas ({outgoing.length})</h2>
                    </div>
                    {outgoing.length === 0 ? (
                        <div className="py-12 text-center text-[10px] font-black text-white/10 uppercase tracking-[0.4em] border border-white/5 border-dashed rounded-[2rem]">No hay expediciones en curso</div>
                    ) : (
                        <div className="space-y-4">
                            {outgoing.map(req => (
                                <RequestRow key={req.id} req={req} type="outgoing" />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Lightbox para Galería */}
            <AnimatePresence>
                {lightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightbox(null)}
                        className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 cursor-pointer"
                    >
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            src={lightbox.image_url}
                            className="max-h-[80vh] max-w-full rounded-3xl shadow-2xl border border-white/10"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Subcomponentes Estilizados ──

function StatCardV({ icon, label, value, color }) {
    return (
        <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 text-3xl opacity-5 group-hover:scale-125 transition-transform">{icon}</div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 block mb-3">{label}</span>
            <span className={`text-2xl font-bold font-mono tracking-tighter ${color}`}>{value}</span>
        </div>
    );
}

function RequestRow({ req, type, actionLoading, onAccept, onReject }) {
    const person = type === 'incoming' ? req.sender : req.receiver;
    return (
        <div className="flex items-center gap-4 p-6 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <Link to={`/@${encodeURIComponent(person?.username || '')}`}>
                <img src={person?.avatar_url || '/default_user_blank.png'} className="w-12 h-12 rounded-2xl object-cover opacity-60 hover:opacity-100 transition-opacity" />
            </Link>
            <div className="flex-1">
                <Link to={`/@${encodeURIComponent(person?.username || '')}`} className="text-sm font-black text-white/80 hover:text-white transition-colors uppercase tracking-widest">@{person?.username}</Link>
                <p className="text-[10px] text-white/20 uppercase mt-1">
                    {type === 'incoming' ? 'Solicita conexión estelar' : 'Esperando respuesta...'}
                </p>
            </div>
            {type === 'incoming' ? (
                <div className="flex gap-2">
                    <button
                        disabled={actionLoading === req.id}
                        onClick={onAccept}
                        className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase rounded-xl hover:scale-105 transition-transform active:scale-95"
                    >
                        ✓ Aceptar
                    </button>
                    <button
                        disabled={actionLoading === req.id}
                        onClick={onReject}
                        className="px-4 py-2 bg-white/5 text-white/40 text-[10px] font-black uppercase rounded-xl hover:bg-rose-500/20 hover:text-rose-500 transition-all"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <span className="text-[9px] font-black text-white/10 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">Pendiente</span>
            )}
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
            <Link to={person?.username ? `/@${encodeURIComponent(person.username)}` : `/profile/${person?.id}`}>
                <img src={person?.avatar_url || '/default_user_blank.png'} alt="Avatar"
                    style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${borderColor}`, objectFit: 'cover' }}
                />
            </Link>
            <div style={{ flex: 1 }}>
                <Link to={person?.username ? `/@${encodeURIComponent(person.username)}` : `/profile/${person?.id}`} style={{ color, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
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
