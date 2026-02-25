import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../services/activityService';
import { useAuthContext } from '../contexts/AuthContext';
import ReactionsBar from '../components/Social/ReactionsBar';
import ShareModal from '../components/Social/ShareModal';
import PostComposer from '../components/Social/PostComposer';
import { CATEGORIES } from '../components/Social/PostComposer';

function getCategoryMeta(id) {
    return CATEGORIES.find(c => c.id === id) || { icon: '🌐', label: 'General' };
}


export default function PostDetailPage() {
    const { postId } = useParams();
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [shareMode, setShareMode] = useState('repost');

    const isOwner = user?.id === post?.author_id;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await activityService.getPost(postId, user?.id);
            setPost(data);
        } catch (err) {
            console.error('[PostDetailPage]', err);
            setError('No se encontró esta transmisión.');
        } finally {
            setLoading(false);
        }
    }, [postId, user?.id]);

    useEffect(() => { load(); }, [load]);

    const handleUpdate = useCallback((updated) => {
        setPost(prev => ({ ...prev, ...updated }));
    }, []);

    const handlePostUpdated = useCallback((updated) => {
        setPost(prev => ({ ...prev, ...updated }));
        setEditing(false);
    }, []);

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar esta transmisión? Esta acción no se puede deshacer.')) return;
        try {
            await activityService.deletePost(postId);
            navigate('/posts', { replace: true });
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    // ── Loading ──
    if (loading) return (
        <main className="w-full max-w-2xl mx-auto min-h-[100dvh] pb-24 text-white px-4 pt-10 flex justify-center items-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Cargando transmisión...</span>
            </div>
        </main>
    );

    // ── Error ──
    if (error || !post) return (
        <main className="w-full max-w-2xl mx-auto min-h-[100dvh] pb-24 text-white px-4 pt-10 flex flex-col items-center justify-center gap-6">
            <span className="text-5xl">🛰️</span>
            <p className="text-sm text-white/40 uppercase tracking-widest font-black">{error || 'Transmisión no encontrada'}</p>
            <Link to="/posts" className="text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:underline">
                ← Volver al feed
            </Link>
        </main>
    );

    return (
        <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4">

            {/* ── Back ── */}
            <Link
                to="/posts"
                className="mb-8 flex items-center gap-2 text-[10px] font-black text-white/25 hover:text-cyan-400 uppercase tracking-[0.3em] transition-colors w-fit group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Feed Global
            </Link>

            {/* ── Modo edición ── */}
            <AnimatePresence>
                {editing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6"
                    >
                        <PostComposer
                            editPost={post}
                            onPostUpdated={handlePostUpdated}
                            onCancelEdit={() => setEditing(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Post completo ── */}
            {!editing && (
                <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-[#070710] border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl"
                >
                    {/* Línea acento top */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

                    <div className="p-6 md:p-10">

                        {/* Header autor + acciones */}
                        <div className="flex items-start justify-between gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <Link to={post.author?.username ? `/@${post.author.username}` : `/profile/${post.author_id}`}>
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden border border-white/10 bg-black hover:scale-105 hover:border-cyan-500/30 transition-all">
                                        <img
                                            src={post.author?.avatar_url || '/default_user_blank.png'}
                                            alt={post.author?.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </Link>
                                <div>
                                    <Link to={post.author?.username ? `/@${post.author.username}` : `/profile/${post.author_id}`} className="text-sm font-black text-white hover:text-cyan-400 transition-colors uppercase tracking-tight">
                                        {post.author?.username}
                                    </Link>
                                    <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.25em] mt-0.5">
                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                                        {post.updated_at > post.created_at && ' · editado'}
                                    </p>
                                </div>
                            </div>

                            {isOwner && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="px-3 py-1.5 text-[9px] font-black text-white/30 hover:text-cyan-400 uppercase tracking-widest border border-white/5 hover:border-cyan-400/30 rounded-xl transition-all"
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-1.5 text-[9px] font-black text-white/30 hover:text-rose-400 uppercase tracking-widest border border-white/5 hover:border-rose-400/30 rounded-xl transition-all"
                                    >
                                        🗑
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Título */}
                        {post.title && (
                            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 leading-tight tracking-tight uppercase mb-4">
                                {post.title}
                            </h1>
                        )}

                        {/* Categoría + vistas */}
                        <div className="flex items-center gap-3 mb-6">
                            {post.category && (() => {
                                const cat = getCategoryMeta(post.category);
                                return (
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-500/60 border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 rounded-full">
                                        {cat.icon} {cat.label}
                                    </span>
                                );
                            })()}
                            {post.views_count > 0 && (
                                <span className="text-[9px] font-mono text-white/20 flex items-center gap-1">
                                    👁 {post.views_count >= 1000 ? `${(post.views_count / 1000).toFixed(1)}k` : post.views_count} vistas
                                </span>
                            )}
                        </div>

                        {/* Separador neon */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-0.5 bg-cyan-500/60 rounded-full" />
                            <div className="w-2 h-2 bg-cyan-500/40 rounded-full" />
                        </div>

                        {/* Contenido markdown */}
                        {post.content ? (
                            <div className="prose prose-invert prose-base max-w-none
                                prose-p:text-white/75 prose-p:leading-[1.85] prose-p:my-4
                                prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight prose-headings:uppercase prose-headings:mt-8 prose-headings:mb-3
                                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                prose-strong:text-white
                                prose-em:text-cyan-300/70 prose-em:not-italic
                                prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline prose-a:font-semibold
                                prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-lg prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                                prose-pre:bg-[#050510] prose-pre:border prose-pre:border-white/8 prose-pre:rounded-2xl prose-pre:text-sm prose-pre:p-5
                                prose-blockquote:border-l-2 prose-blockquote:border-cyan-500/50 prose-blockquote:bg-cyan-500/5 prose-blockquote:rounded-r-xl prose-blockquote:text-white/60 prose-blockquote:not-italic prose-blockquote:pl-5 prose-blockquote:py-2
                                prose-ul:text-white/75 prose-ol:text-white/75
                                prose-li:my-2
                                prose-hr:border-white/5 prose-hr:my-8
                                prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-img:shadow-xl
                                break-words"
                            >
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {post.content}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-white/20 italic text-sm">Sin contenido adicional.</p>
                        )}

                        {/* Separador */}
                        <div className="w-full h-px bg-white/[0.05] mt-10 mb-7" />

                        {/* Footer */}
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <ReactionsBar post={post} onUpdate={handleUpdate} />

                            <div className="flex gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={() => { setShareMode('repost'); setShowShare(true); }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-purple-400 hover:bg-purple-400/10 hover:border-purple-400/20 transition-all text-[9px] font-black uppercase tracking-widest"
                                >
                                    🔁 Repost
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={() => { setShareMode('quote'); setShowShare(true); }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/5 text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/20 transition-all text-[9px] font-black uppercase tracking-widest"
                                >
                                    💬 Citar
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.article>
            )}

            <ShareModal
                isOpen={showShare}
                onClose={() => setShowShare(false)}
                post={post}
                initialMode={shareMode}
                onSuccess={() => setShowShare(false)}
            />
        </main>
    );
}
