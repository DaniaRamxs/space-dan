import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import ReactionsBar from './ReactionsBar';
import ShareModal from './ShareModal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthContext } from '../../contexts/AuthContext';
import { CATEGORIES } from './PostComposer';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';

// Extrae texto plano desde markdown
function stripMarkdown(md = '') {
    return md
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '')
        .replace(/#+\s/g, '')
        .replace(/\*\*|__|\*|_|~~|>/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[-*+]\s/g, '')
        .replace(/\n+/g, ' ')
        .trim();
}

function getCategoryMeta(id) {
    return CATEGORIES.find(c => c.id === id) || { icon: '🌐', label: 'General' };
}

function formatViews(n = 0) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

const ActivityCard = memo(({ post, onUpdate, onNewPost }) => {
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareMode, setShareMode] = useState('repost');

    const openShare = (mode, e) => {
        e.stopPropagation();
        setShareMode(mode);
        setShowShareModal(true);
    };

    const plainText = stripMarkdown(post.content || '');
    const preview = plainText.length > 400
        ? plainText.slice(0, 400).trimEnd() + '…'
        : plainText;

    const postUrl = `/transmission/${post.id}`;
    const catMeta = getCategoryMeta(post.category);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="group relative bg-[#070710] border border-white/[0.06] rounded-3xl overflow-hidden cursor-pointer
                           hover:border-white/[0.12] hover:bg-[#09090f] transition-all duration-300 shadow-lg hover:shadow-xl"
                onClick={() => navigate(postUrl)}
                role="article"
                aria-label={post.title || 'Post'}
            >
                {/* Línea acento top */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent
                                group-hover:via-cyan-500/50 transition-all duration-500" />

                <div className="p-5 md:p-6">
                    {/* Fila: Avatar + Meta */}
                    <div className="flex items-start gap-3 mb-3">
                        <Link
                            to={post.author?.username ? `/@${post.author.username}` : `/profile/${post.author_id}`}
                            onClick={e => e.stopPropagation()}
                            className="shrink-0"
                        >
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-black
                                           hover:border-cyan-500/40 hover:scale-105 transition-all">
                                <img
                                    src={post.author?.avatar_url || '/default_user_blank.png'}
                                    className="w-full h-full object-cover"
                                    alt={post.author?.username}
                                    loading="lazy"
                                />
                            </div>
                        </Link>

                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                <Link
                                    to={post.author?.username ? `/@${post.author.username}` : `/profile/${post.author_id}`}
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs font-black text-white/70 hover:text-cyan-400 transition-colors uppercase tracking-wider truncate"
                                >
                                    <span className={getNicknameClass(post.author)}>
                                        {getUserDisplayName(post.author)}
                                    </span>
                                </Link>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Vistas */}
                                    {post.views_count > 0 && (
                                        <span className="text-[9px] font-mono text-white/20 flex items-center gap-1">
                                            👁 {formatViews(post.views_count)}
                                        </span>
                                    )}
                                    <span className="text-[9px] font-mono text-white/20">
                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                                    </span>
                                </div>
                            </div>

                            {/* Categoría */}
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.25em]">
                                <span className="text-cyan-500/40 group-hover:text-cyan-400/60 transition-colors">
                                    {catMeta.icon} {catMeta.label}
                                </span>
                                {post.updated_at > post.created_at && (
                                    <span className="text-white/15">· editado</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Título */}
                    {post.title && (
                        <h2 className="text-base md:text-lg font-black text-white leading-snug tracking-tight mb-2.5
                                       group-hover:text-cyan-50 transition-colors uppercase">
                            {post.title}
                        </h2>
                    )}

                    {/* Preview */}
                    {preview && (
                        <p className="text-sm text-white/40 leading-relaxed line-clamp-4 mb-4">
                            {preview}
                        </p>
                    )}

                    {/* Separador */}
                    <div className="w-full h-px bg-white/[0.04] mb-3" />

                    {/* Footer */}
                    <div
                        className="flex items-center justify-between"
                        onClick={e => e.stopPropagation()}
                    >
                        <ReactionsBar post={post} onUpdate={onUpdate} />

                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-cyan-500/25 group-hover:text-cyan-400/50 uppercase tracking-widest transition-colors mr-1">
                                Leer →
                            </span>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.88 }}
                                onClick={e => openShare('repost', e)}
                                title="Repostear"
                                className="w-7 h-7 rounded-xl bg-white/[0.03] border border-white/5
                                           flex items-center justify-center text-white/25
                                           hover:text-purple-400 hover:bg-purple-400/10 hover:border-purple-400/20 transition-all text-xs"
                            >🔁</motion.button>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.88 }}
                                onClick={e => openShare('quote', e)}
                                title="Citar"
                                className="w-7 h-7 rounded-xl bg-white/[0.03] border border-white/5
                                           flex items-center justify-center text-white/25
                                           hover:text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/20 transition-all text-xs"
                            >💬</motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                post={post}
                initialMode={shareMode}
                onSuccess={(newPost) => {
                    if (onNewPost) onNewPost(newPost);
                    setShowShareModal(false);
                }}
            />
        </>
    );
});

export default ActivityCard;
