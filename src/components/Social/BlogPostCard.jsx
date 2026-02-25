import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../services/activityService';
import { useAuthContext } from '../../contexts/AuthContext';

const REACTION_CONFIG = {
    connection: { icon: '💖', label: 'Conexión' },
    impact: { icon: '🔥', label: 'Impacto' },
    represent: { icon: '🌙', label: 'Representa' },
    think: { icon: '🧠', label: 'Interesante' },
    underrated: { icon: '🪐', label: 'Infravalorado' },
};

/**
 * BlogPostCard — muestra un post de bitácora (tabla "posts") dentro
 * del feed de Actividad.  Tiene su propia mini-bar de reacciones
 * (que escriben en activity_reactions si el post tiene un ID espejado
 * en activity_posts), más botones de Repost y Citar que abren un
 * modal embebido.
 */
const BlogPostCard = memo(({ post, authorProfile, onActionComplete }) => {
    const { user } = useAuthContext();
    const [showPicker, setShowPicker] = useState(false);
    const [reactions, setReactions] = useState({
        total_count: 0,
        top_reactions: [],
        user_reaction: null,
    });
    const [processing, setProcessing] = useState(false);

    // ---- Quote / Repost inline state ----
    const [quoteOpen, setQuoteOpen] = useState(false);
    const [quoteText, setQuoteText] = useState('');
    const [reposting, setReposting] = useState(false);

    const handleReact = async (type) => {
        if (!user || processing) return;
        setShowPicker(false);
        setProcessing(true);

        // Optimistic
        const isRemoving = reactions.user_reaction === type;
        const optimistic = { ...reactions };
        if (isRemoving) {
            optimistic.total_count = Math.max(0, optimistic.total_count - 1);
            optimistic.user_reaction = null;
            optimistic.top_reactions = optimistic.top_reactions
                .map(r => r.reaction_type === type ? { ...r, count: r.count - 1 } : r)
                .filter(r => r.count > 0);
        } else {
            optimistic.total_count = optimistic.total_count + 1;
            optimistic.user_reaction = type;
            const exists = optimistic.top_reactions.find(r => r.reaction_type === type);
            if (exists) {
                optimistic.top_reactions = optimistic.top_reactions.map(r =>
                    r.reaction_type === type ? { ...r, count: r.count + 1 } : r
                );
            } else {
                optimistic.top_reactions = [...optimistic.top_reactions, { reaction_type: type, count: 1 }];
            }
            optimistic.top_reactions.sort((a, b) => b.count - a.count);
            optimistic.top_reactions = optimistic.top_reactions.slice(0, 2);
        }
        setReactions(optimistic);

        try {
            // Los blog posts se espejan en activity_posts con el mismo id
            await activityService.toggleReaction(post.id, user.id, type);
        } catch (err) {
            console.error('[BlogPostCard] toggleReaction error:', err);
            setReactions(reactions); // rollback
        } finally {
            setProcessing(false);
        }
    };

    const handleRepost = async () => {
        if (!user || reposting) return;
        setReposting(true);
        try {
            await activityService.createPost({
                author_id: user.id,
                content: null,
                type: 'repost',
                original_post_id: post.id, // usa mismo id espejado
            });
            onActionComplete?.('repost');
        } catch (err) {
            console.error('[BlogPostCard] repost error:', err);
        } finally {
            setReposting(false);
        }
    };

    const handleQuote = async (e) => {
        e.preventDefault();
        if (!user || !quoteText.trim()) return;
        try {
            await activityService.createPost({
                author_id: user.id,
                content: quoteText.trim(),
                type: 'quote',
                original_post_id: post.id,
            });
            setQuoteOpen(false);
            setQuoteText('');
            onActionComplete?.('quote');
        } catch (err) {
            console.error('[BlogPostCard] quote error:', err);
        }
    };

    const avatarSrc = authorProfile?.avatar_url || post.avatar_url || '/default_user_blank.png';
    const username = authorProfile?.username || post.username || 'piloto';

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            layout
            className="group relative bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/[0.02] hover:border-white/10 transition-all shadow-xl overflow-hidden"
        >
            {/* Badge tipo */}
            <div className="absolute top-5 right-6">
                <span className="text-[8px] font-black font-mono px-2.5 py-1 rounded-full border text-cyan-400 bg-cyan-400/10 border-cyan-400/20 uppercase tracking-widest">
                    📖 BLOG
                </span>
            </div>

            <div className="flex gap-4">
                {/* Avatar */}
                <Link to={username ? `/@${username}` : `/profile/${post.author_id}`} className="shrink-0">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black hover:scale-105 transition-transform">
                        <img src={avatarSrc} alt={username} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                </Link>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                        <Link to={username ? `/@${username}` : `/profile/${post.author_id}`} className="text-sm font-black text-white hover:text-cyan-400 transition-colors uppercase tracking-tight">
                            {username}
                        </Link>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                        </span>
                    </div>

                    {/* Link al post real */}
                    <Link to={`/log/${post.slug}`} className="block group/link">
                        <h3 className="text-lg md:text-xl font-black text-white group-hover/link:text-cyan-400 transition-colors uppercase tracking-tight leading-tight mb-1">
                            {post.title}
                        </h3>
                        {post.subtitle && (
                            <p className="text-sm text-white/40 line-clamp-2 font-medium leading-relaxed">
                                {post.subtitle}
                            </p>
                        )}
                    </Link>

                    {/* Stats + Actions */}
                    <div className="flex items-center flex-wrap gap-4 mt-4">
                        {/* Reaction picker */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPicker(v => !v)}
                                aria-label="Reaccionar"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer"
                            >
                                <div className="flex -space-x-1.5">
                                    {reactions.top_reactions.length > 0
                                        ? reactions.top_reactions.map((r, i) => (
                                            <span key={r.reaction_type} className="text-sm" style={{ zIndex: 10 - i }}>
                                                {REACTION_CONFIG[r.reaction_type]?.icon}
                                            </span>
                                        ))
                                        : <span className="text-sm opacity-40 group-hover:opacity-100 transition-opacity">✨</span>
                                    }
                                </div>
                                {reactions.total_count > 0 && (
                                    <motion.span key={reactions.total_count} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                        className="text-[10px] font-black text-white/60 font-mono tracking-tight">
                                        {reactions.total_count}
                                    </motion.span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showPicker && (
                                    <>
                                        <div className="fixed inset-0 z-[100]" onClick={() => setShowPicker(false)} />
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                                            animate={{ scale: 1, opacity: 1, y: 0 }}
                                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                                            className="absolute bottom-full left-0 mb-2 p-2 bg-[#0a0a0f]/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex gap-1 z-[101] shadow-2xl"
                                        >
                                            {Object.entries(REACTION_CONFIG).map(([type, cfg]) => {
                                                const active = reactions.user_reaction === type;
                                                return (
                                                    <motion.button
                                                        key={type}
                                                        whileHover={{ scale: 1.25, y: -4 }}
                                                        whileTap={{ scale: 0.8 }}
                                                        onClick={() => handleReact(type)}
                                                        aria-label={cfg.label}
                                                        className={`p-2.5 rounded-xl transition-all relative group/rb ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                                    >
                                                        <span className={`text-xl ${active ? '' : 'grayscale-[0.5] opacity-60 group-hover/rb:grayscale-0 group-hover/rb:opacity-100 transition-all'}`}>
                                                            {cfg.icon}
                                                        </span>
                                                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white text-black text-[8px] font-black uppercase rounded opacity-0 group-hover/rb:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                                                            {cfg.label}
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Repost */}
                        <button
                            onClick={handleRepost}
                            disabled={reposting || !user}
                            aria-label="Repostear"
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-purple-400 transition-colors active:scale-95 disabled:opacity-40"
                        >
                            <span className="text-base">🔁</span>
                            {reposting ? 'Reposteando...' : 'Repost'}
                        </button>

                        {/* Citar */}
                        <button
                            onClick={() => setQuoteOpen(v => !v)}
                            disabled={!user}
                            aria-label="Citar post"
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-orange-400 transition-colors active:scale-95 disabled:opacity-40"
                        >
                            <span className="text-base">💬</span>
                            Citar
                        </button>

                        {/* Views */}
                        <span className="ml-auto text-[10px] font-black text-white/20 font-mono flex items-center gap-1">
                            👁 {post.views || 0}
                        </span>
                    </div>

                    {/* Quote form */}
                    <AnimatePresence>
                        {quoteOpen && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleQuote}
                                className="overflow-hidden mt-4"
                            >
                                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                                    {/* Preview del post citado */}
                                    <div className="text-xs text-white/30 italic border-l-2 border-cyan-500/40 pl-3">
                                        {post.title}
                                    </div>
                                    <textarea
                                        value={quoteText}
                                        onChange={e => setQuoteText(e.target.value)}
                                        placeholder="Escribe tu comentario sobre esta transmisión..."
                                        maxLength={280}
                                        rows={3}
                                        className="w-full bg-transparent border-none text-sm text-white placeholder:text-white/20 resize-none outline-none"
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-white/20 font-mono">{quoteText.length}/280</span>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setQuoteOpen(false)} className="px-4 py-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors">
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={!quoteText.trim()}
                                                className="px-5 py-1.5 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-400 active:scale-95 transition-all disabled:opacity-40"
                                            >
                                                Citar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
});

export default BlogPostCard;
