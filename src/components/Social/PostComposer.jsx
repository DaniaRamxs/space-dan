import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { activityService } from '../../services/activityService';
import { useAuthContext } from '../../contexts/AuthContext';

export const CATEGORIES = [
    { id: 'general', label: 'General', icon: '🌐' },
    { id: 'blog', label: 'Blog', icon: '✍️' },
    { id: 'reflexion', label: 'Reflexión', icon: '🧠' },
    { id: 'musica', label: 'Música', icon: '🎵' },
    { id: 'anime', label: 'Anime / Manga', icon: '🌸' },
    { id: 'tecnologia', label: 'Tecnología', icon: '💻' },
    { id: 'arte', label: 'Arte', icon: '🎨' },
    { id: 'vida', label: 'Vida', icon: '🌱' },
];

export default function PostComposer({
    onPostCreated,
    onPostUpdated,
    editPost,
    onCancelEdit,
}) {
    const { user, profile } = useAuthContext();
    const isEditing = !!editPost;

    const [title, setTitle] = useState(isEditing ? (editPost.title || '') : '');
    const [content, setContent] = useState(isEditing ? (editPost.content || '') : '');
    const [category, setCategory] = useState(isEditing ? (editPost.category || 'general') : 'general');
    const [tab, setTab] = useState('write');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [catOpen, setCatOpen] = useState(false);

    const canSubmit = title.trim().length > 0 && !submitting;
    const selectedCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit || !user) return;
        setSubmitting(true);
        setError(null);

        try {
            if (isEditing) {
                await activityService.updatePost(editPost.id, {
                    title: title.trim(),
                    content: content.trim() || null,
                    category,
                });
                if (onPostUpdated) onPostUpdated({
                    ...editPost,
                    title: title.trim(),
                    content: content.trim() || null,
                    category,
                    updated_at: new Date().toISOString(),
                });
            } else {
                const newPost = await activityService.createPost({
                    author_id: user.id,
                    title: title.trim(),
                    content: content.trim() || null,
                    category,
                    type: 'post',
                });

                const enriched = {
                    ...newPost,
                    category,
                    author: {
                        username: profile?.username || user.user_metadata?.username || 'tú',
                        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '/default_user_blank.png',
                        frame_item_id: profile?.frame_item_id || null,
                    },
                    reactions_metadata: { total_count: 0, top_reactions: [], user_reaction: null },
                    original_post: null,
                    views_count: 0,
                };

                setTitle('');
                setContent('');
                setCategory('general');
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
        setCategory(editPost?.category || 'general');
        setTab('write');
        setError(null);
        if (onCancelEdit) onCancelEdit();
    };

    return (
        <div className={`bg-[#070710] border rounded-3xl shadow-2xl overflow-hidden relative transition-all ${isEditing ? 'border-cyan-500/30' : 'border-white/[0.06]'
            }`}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />

            {isEditing && (
                <div className="flex items-center justify-between px-5 pt-4 pb-0">
                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em]">✏️ Editando</span>
                    <button onClick={handleCancel} className="text-[9px] font-black text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors">
                        Cancelar
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-0 p-5">

                {/* Fila: Avatar + Título */}
                <div className="flex gap-3 items-start mb-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black mt-0.5">
                        <img
                            src={profile?.avatar_url || user?.user_metadata?.avatar_url || '/default_user_blank.png'}
                            className="w-full h-full object-cover" alt="Avatar"
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

                {/* Selector de categoría */}
                <div className="relative ml-12 mb-3">
                    <button
                        type="button"
                        onClick={() => setCatOpen(v => !v)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] 
                       text-[10px] font-black text-white/50 hover:text-white/80 uppercase tracking-widest transition-all"
                    >
                        <span>{selectedCat.icon}</span>
                        <span>{selectedCat.label}</span>
                        <span className="text-white/20">▾</span>
                    </button>

                    <AnimatePresence>
                        {catOpen && (
                            <>
                                <div className="fixed inset-0 z-[90]" onClick={() => setCatOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                    className="absolute top-full left-0 mt-1 z-[91] bg-[#090912] border border-white/10 rounded-2xl p-2 shadow-2xl
                             grid grid-cols-2 gap-1 w-52"
                                >
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => { setCategory(cat.id); setCatOpen(false); }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-left ${category === cat.id
                                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                                : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                                                }`}
                                        >
                                            <span>{cat.icon}</span> {cat.label}
                                        </button>
                                    ))}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Tabs write/preview */}
                <div className="flex gap-1 mb-2 ml-12">
                    {['write', 'preview'].map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/50'
                                }`}
                        >
                            {t === 'write' ? '✍️ Escribir' : '👁 Preview'}
                        </button>
                    ))}
                </div>

                {/* Editor / Preview */}
                <div className="ml-12 min-h-[80px]">
                    <AnimatePresence mode="wait">
                        {tab === 'write' ? (
                            <motion.textarea
                                key="editor"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder={"Contenido en Markdown (opcional)\n\n**negrita**, _itálica_, # Encabezado, - Lista..."}
                                className="w-full bg-transparent border-none text-sm text-white/80 placeholder:text-white/15 resize-none outline-none min-h-[80px] font-mono leading-relaxed"
                                maxLength={5000}
                            />
                        ) : (
                            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {content ? (
                                    <div className="prose prose-invert prose-sm max-w-none
                    prose-p:text-white/75 prose-p:leading-relaxed prose-p:my-1
                    prose-headings:text-white prose-headings:font-black
                    prose-strong:text-white prose-em:text-white/60
                    prose-a:text-cyan-400
                    prose-code:text-cyan-300 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl
                    prose-blockquote:border-l-cyan-500/40 prose-blockquote:text-white/50
                    prose-ul:text-white/75 prose-ol:text-white/75
                    prose-hr:border-white/10 break-words"
                                    >
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="text-[11px] text-white/20 italic">Sin contenido aún...</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/[0.05] pt-3 mt-4">
                    <div />
                    <div className="flex items-center gap-3">
                        {error && <p className="text-[10px] text-rose-400 font-bold">⚠️ {error}</p>}
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="px-6 py-2.5 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest
                         hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all
                         shadow-[0_8px_20px_rgba(6,182,212,0.2)] disabled:opacity-40 disabled:hover:scale-100"
                        >
                            {submitting
                                ? (isEditing ? 'Guardando...' : 'Transmitiendo...')
                                : (isEditing ? '💾 Guardar' : '📡 Transmitir')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
