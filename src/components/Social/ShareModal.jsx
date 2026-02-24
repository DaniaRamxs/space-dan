import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { activityService } from '../../services/activityService';
import { useAuthContext } from '../../contexts/AuthContext';

/**
 * ShareModal — permite Repostear (un clic) o Citar (con texto) un post de activity.
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   post: objeto del post original
 *   onSuccess: (newPost) => void — callback cuando se crea el repost/quote
 */
const ShareModal = memo(({ isOpen, onClose, post, onSuccess, initialMode = 'repost' }) => {
    const { user } = useAuthContext();
    const [mode, setMode] = useState(initialMode); // 'repost' | 'quote'

    // Sync mode when modal opens with a different initialMode
    useEffect(() => {
        if (isOpen) setMode(initialMode);
    }, [isOpen, initialMode]);
    const [quoteText, setQuoteText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !post) return null;

    const handleClose = () => {
        setMode('repost');
        setQuoteText('');
        setError(null);
        onClose();
    };

    const handleSubmit = async () => {
        if (!user || submitting) return;
        if (mode === 'quote' && !quoteText.trim()) return;

        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                author_id: user.id,
                type: mode,
                original_post_id: post.id,
                content: mode === 'quote' ? quoteText.trim() : null,
            };

            const newPost = await activityService.createPost(payload);

            // Enriquecer el post para que ActivityCard pueda renderizarlo inmediatamente
            const enrichedPost = {
                ...newPost,
                reactions_metadata: { total_count: 0, top_reactions: [], user_reaction: null },
                original_post: mode !== 'post' ? {
                    id: post.id,
                    content: post.content,
                    created_at: post.created_at,
                    type: post.type,
                    author: post.author,
                } : null,
            };

            if (onSuccess) onSuccess(enrichedPost);
            handleClose();
        } catch (err) {
            console.error('[ShareModal] Error:', err);
            setError(err.message || 'Error al publicar');
        } finally {
            setSubmitting(false);
        }
    };

    const authorName = post.author?.username || 'usuario';
    const postPreview = post.content
        ? post.content.slice(0, 120) + (post.content.length > 120 ? '…' : '')
        : '(sin contenido)';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                {/* Panel */}
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    className="relative w-full max-w-md bg-[#080810] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/70">
                            Compartir transmisión
                        </h3>
                        <button
                            onClick={handleClose}
                            className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-rose-400 transition-all text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex m-4 gap-2 bg-white/[0.03] p-1 rounded-2xl border border-white/5">
                        {[
                            { key: 'repost', icon: '🔁', label: 'Repostear' },
                            { key: 'quote', icon: '💬', label: 'Citar' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setMode(tab.key)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === tab.key
                                    ? tab.key === 'repost'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'text-white/30 hover:text-white/60'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Body */}
                    <div className="flex flex-col gap-4 px-4 pb-4">
                        {/* Cita editor */}
                        {mode === 'quote' && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black mt-0.5">
                                    <img
                                        src={user?.user_metadata?.avatar_url || '/default_user_blank.png'}
                                        className="w-full h-full object-cover"
                                        alt="Tú"
                                    />
                                </div>
                                <textarea
                                    autoFocus
                                    value={quoteText}
                                    onChange={e => setQuoteText(e.target.value)}
                                    placeholder="Agrega tu comentario a esta transmisión..."
                                    maxLength={240}
                                    className="w-full bg-transparent border-none text-sm text-white placeholder:text-white/20 resize-none outline-none min-h-[64px] pt-1"
                                />
                            </div>
                        )}

                        {/* Vista previa del post original embebida */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                    <img
                                        src={post.author?.avatar_url || '/default_user_blank.png'}
                                        className="w-full h-full object-cover"
                                        alt={authorName}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-white/50 lowercase tracking-tight">
                                    @{authorName}
                                </span>
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                {postPreview}
                            </p>
                        </div>

                        {/* Mensaje modo repost */}
                        {mode === 'repost' && (
                            <p className="text-[10px] text-white/30 text-center uppercase tracking-widest">
                                Esta transmisión aparecerá en tu perfil y en el feed global
                            </p>
                        )}

                        {/* Error */}
                        {error && (
                            <p className="text-[10px] text-rose-400 text-center font-bold uppercase tracking-wider">
                                ⚠️ {error}
                            </p>
                        )}

                        {/* Acción */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || (mode === 'quote' && !quoteText.trim())}
                            className={`w-full py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'repost'
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30'
                                }`}
                        >
                            {submitting
                                ? 'Publicando...'
                                : mode === 'repost'
                                    ? '🔁 Repostear ahora'
                                    : '💬 Publicar cita'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
});

export default ShareModal;
