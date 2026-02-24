import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { activityService } from '../../services/activityService';
import { useAuthContext } from '../../contexts/AuthContext';

/**
 * PostComposer — crea o edita un post de tipo 'post' con título obligatorio.
 *
 * Props:
 *   onPostCreated(newPost)  — se llama al crear un post nuevo
 *   onPostUpdated(post)     — se llama al guardar una edición
 *   editPost                — objeto post para editar (si se pasa, entra en modo edición)
 *   onCancelEdit()          — cancela el modo edición
 */
export default function PostComposer({ onPostCreated, onPostUpdated, editPost, onCancelEdit }) {
    const { user, profile } = useAuthContext();

    const isEditing = !!editPost;

    const [title, setTitle] = useState(isEditing ? (editPost.title || '') : '');
    const [content, setContent] = useState(isEditing ? (editPost.content || '') : '');
    const [tab, setTab] = useState('write'); // 'write' | 'preview'
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const canSubmit = title.trim().length > 0 && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || !user) return;

        setSubmitting(true);
        setError(null);

        try {
            if (isEditing) {
                // ── Modo edición ──
                await activityService.updatePost(editPost.id, {
                    title: title.trim(),
                    content: content.trim() || null,
                });
                if (onPostUpdated) onPostUpdated({
                    ...editPost,
                    title: title.trim(),
                    content: content.trim() || null,
                    updated_at: new Date().toISOString(),
                });
            } else {
                // ── Modo creación ──
                const newPost = await activityService.createPost({
                    author_id: user.id,
                    title: title.trim(),
                    content: content.trim() || null,
                    type: 'post',
                });

                const enriched = {
                    ...newPost,
                    author: {
                        username: profile?.username || user.user_metadata?.username || 'tú',
                        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '/default_user_blank.png',
                        frame_item_id: profile?.frame_item_id || null,
                    },
                    reactions_metadata: { total_count: 0, top_reactions: [], user_reaction: null },
                    original_post: null,
                };

                setTitle('');
                setContent('');
                setTab('write');
                if (onPostCreated) onPostCreated(enriched);
            }
        } catch (err) {
            console.error('[PostComposer]', err);
            setError(err.message || 'Error al publicar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setTitle(editPost?.title || '');
        setContent(editPost?.content || '');
        setTab('write');
        setError(null);
        if (onCancelEdit) onCancelEdit();
    };

    return (
        <div className={`bg-[#0a0a0f] border rounded-[2.5rem] shadow-2xl overflow-hidden relative transition-all ${isEditing ? 'border-cyan-500/30' : 'border-white/5'
            }`}>
            {/* Glow ambiental */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

            {/* Header modo edición */}
            {isEditing && (
                <div className="flex items-center justify-between px-6 pt-5 pb-0">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">
                        ✏️ Editando transmisión
                    </span>
                    <button
                        onClick={handleCancel}
                        className="text-[10px] font-black text-white/30 hover:text-white/70 uppercase tracking-widest transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-0 p-6">
                {/* Avatar + Título */}
                <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black mt-1">
                        <img
                            src={profile?.avatar_url || user?.user_metadata?.avatar_url || '/default_user_blank.png'}
                            className="w-full h-full object-cover"
                            alt="Avatar"
                        />
                    </div>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Título de la transmisión..."
                        maxLength={120}
                        required
                        className="w-full bg-transparent border-none text-base md:text-lg font-black text-white placeholder:text-white/15 outline-none pt-1"
                    />
                </div>

                {/* Tabs write/preview */}
                <div className="flex gap-1 mt-4 mb-3 ml-14">
                    {['write', 'preview'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === t
                                ? 'bg-white/10 text-white'
                                : 'text-white/25 hover:text-white/50'
                                }`}
                        >
                            {t === 'write' ? '✍️ Escribir' : '👁 Preview'}
                        </button>
                    ))}
                </div>

                {/* Editor / Preview */}
                <div className="ml-14">
                    <AnimatePresence mode="wait">
                        {tab === 'write' ? (
                            <motion.textarea
                                key="editor"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Contenido en Markdown (opcional)&#10;&#10;**negrita**, _itálica_, # Encabezado, - Lista..."
                                className="w-full bg-transparent border-none text-sm text-white/80 placeholder:text-white/15 resize-none outline-none min-h-[100px] font-mono leading-relaxed"
                                maxLength={5000}
                            />
                        ) : (
                            <motion.div
                                key="preview"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`min-h-[100px] ${content ? '' : 'flex items-center'}`}
                            >
                                {content ? (
                                    <div className="prose prose-invert prose-sm max-w-none
                                        prose-p:text-white/75 prose-p:leading-relaxed prose-p:my-1
                                        prose-headings:text-white prose-headings:font-black
                                        prose-strong:text-white prose-em:text-white/60
                                        prose-a:text-cyan-400
                                        prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:font-mono
                                        prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl
                                        prose-blockquote:border-l-cyan-500/40 prose-blockquote:text-white/50
                                        prose-ul:text-white/75 prose-ol:text-white/75
                                        prose-hr:border-white/10"
                                    >
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-white/20 italic">Sin contenido aún...</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                    <div />

                    {error && (
                        <p className="text-[10px] text-rose-400 font-bold">⚠️ {error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="px-8 py-2.5 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(6,182,212,0.2)] disabled:opacity-40 disabled:hover:scale-100"
                    >
                        {submitting
                            ? (isEditing ? 'Guardando...' : 'Transmitiendo...')
                            : (isEditing ? '💾 Guardar' : '📡 Transmitir')}
                    </button>
                </div>
            </form>
        </div>
    );
}
