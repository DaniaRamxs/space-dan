import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { parseSpaceEnergies } from '../../utils/markdownUtils';
import ReactionsBar from './ReactionsBar';
import ShareModal from './ShareModal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthContext } from '../../contexts/AuthContext';
import { CATEGORIES } from './PostComposer';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';
import { Eye, Repeat2, MessageSquare, ChevronRight } from 'lucide-react';

// ConfiguraciÃ³n de sanitize para permitir nuestras clases sd-* en la preview
const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [...new Set([...defaultSchema.tagNames, 'div', 'span'])],
    attributes: {
        ...defaultSchema.attributes,
        div: [...(defaultSchema.attributes.div || []), 'className', 'class'],
        span: [...(defaultSchema.attributes.span || []), 'className', 'class'],
        '*': [...(defaultSchema.attributes['*'] || []), 'className', 'class']
    }
};

// Extrae texto plano bÃ¡sico pero MANTIENE las energÃ­as para que el parser pueda actuar
function cleanMarkdownForPreview(md = '') {
    return md
        .replace(/```[\s\S]*?```/g, '[CÃ³digo]')
        .replace(/#+\s/g, '') // Quitar headers para que no ocupen tanto espacio
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Quitar imÃ¡genes
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Solo texto de links
        .trim();
}

function getCategoryMeta(id) {
    return CATEGORIES.find(c => c.id === id) || { icon: 'ðŸŒ', label: 'General' };
}

function formatViews(n = 0) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

function safeTimeAgo(dateValue, withSuffix = true) {
    try {
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return 'en el vacio temporal';
        return formatDistanceToNow(d, { addSuffix: withSuffix, locale: es });
    } catch {
        return 'en el vacio temporal';
    }
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

    const previewRaw = cleanMarkdownForPreview(post.content || '');
    const preview = previewRaw.length > 500
        ? previewRaw.slice(0, 500).trimEnd() + 'â€¦'
        : previewRaw;

    const postUrl = `/transmission/${post.id}`;
    const catMeta = getCategoryMeta(post.category);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="group relative bg-[#070710] border-y border-transparent md:border md:border-white/[0.06] md:rounded-3xl overflow-hidden cursor-pointer
                           hover:bg-[#09090f] transition-all duration-300 shadow-none md:shadow-lg hover:shadow-xl"
                onClick={() => navigate(postUrl)}
                role="article"
                aria-label={post.title || 'Post'}
            >
                {/* LÃ­nea acento top (Reduced 50%) */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent
                                group-hover:via-white/20 transition-all duration-500" />

                <div className="p-5 md:p-6">
                    {/* Repost Header */}
                    {post.type === 'repost' && post.original_post && (
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Repeat2 size={12} className="text-purple-400" />
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Reposteo Estelar</span>
                        </div>
                    )}

                    {/* Fila: Avatar + Meta */}
                    <div className="flex items-start gap-3 mb-3">
                        <Link
                            to={post.author?.username ? `/@${encodeURIComponent(post.author.username)}` : `/profile/${post.author_id}`}
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
                                    to={post.author?.username ? `/@${encodeURIComponent(post.author.username)}` : `/profile/${post.author_id}`}
                                    onClick={e => e.stopPropagation()}
                                    className="text-micro hover:text-white transition-colors"
                                >
                                    <span className={`text-[11px] font-bold uppercase tracking-[0.15em] transition-colors ${getNicknameClass(post.author)}`}>
                                        {getUserDisplayName(post.author)}
                                    </span>
                                </Link>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Vistas */}
                                    {post.views_count > 0 && (
                                        <span className="text-[9px] font-mono text-white/30 flex items-center gap-1">
                                            <Eye size={10} strokeWidth={1.5} /> {formatViews(post.views_count)}
                                        </span>
                                    )}
                                    <span className="text-[9px] font-mono text-white/50">
                                        {safeTimeAgo(post.created_at, true)}
                                    </span>
                                </div>
                            </div>

                            {/* CategorÃ­a y SeÃ±ales de Vida */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] font-mono">
                                    <span className="text-cyan-500/25 group-hover:text-cyan-400/50 transition-colors">
                                        {catMeta.icon} {catMeta.label}
                                    </span>
                                    {post.updated_at > post.created_at && (
                                        <span className="text-white/10">Â· editado</span>
                                    )}
                                </div>

                                {new Date() - new Date(post.created_at) < 60000 && (
                                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[7px] font-semibold text-emerald-500/80 uppercase tracking-[0.2em] font-mono">_SeÃ±al_Nueva</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TÃ­tulo (Using Typography Scale) */}
                    {post.title && (
                        <h2 className="text-xl md:text-2xl font-bold text-white/90 tracking-tight leading-none mb-3 group-hover:text-white transition-colors">
                            {post.title}
                        </h2>
                    )}

                    {/* Preview con soporte de EnergÃ­as */}
                    {preview && (
                        <div className="text-[15px] font-medium leading-relaxed text-white/70 mb-4 line-clamp-4 pointer-events-none select-none prose-preview">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                            >
                                {parseSpaceEnergies(preview)}
                            </ReactMarkdown>
                        </div>
                    )}

                    {/* Original Post Embed (For reposts and quotes) */}
                    {post.original_post && (
                        <div className="mt-2 mb-4 p-4 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-lg overflow-hidden border border-white/10 shrink-0">
                                    <img
                                        src={post.original_post.author?.avatar_url || '/default_user_blank.png'}
                                        className="w-full h-full object-cover"
                                        alt={post.original_post.author?.username}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                    @{post.original_post.author?.username || 'piloto'}
                                </span>
                                <span className="text-[9px] font-mono text-white/20 ml-auto">
                                    {safeTimeAgo(post.original_post?.created_at, false)}
                                </span>
                            </div>

                            {post.original_post.title && (
                                <h4 className="text-xs font-black text-white/80 uppercase mb-1">{post.original_post.title}</h4>
                            )}

                            <p className="text-[13px] text-white/40 leading-relaxed line-clamp-2">
                                {cleanMarkdownForPreview(post.original_post.content || '')}
                            </p>
                        </div>
                    )}

                    {/* Separador */}
                    <div className="w-full h-px bg-white/[0.04] mb-3" />

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <div onClick={e => e.stopPropagation()}>
                            <ReactionsBar post={post} onUpdate={onUpdate} />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-cyan-500/25 group-hover:text-cyan-400/50 uppercase tracking-widest transition-colors mr-1 flex items-center gap-1">
                                Leer <ChevronRight size={10} strokeWidth={2} />
                            </span>
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.88 }}
                                    onClick={e => openShare('repost', e)}
                                    title="Repostear"
                                    className="w-7 h-7 rounded-xl bg-white/[0.03] border border-white/5
                                           flex items-center justify-center text-white/25
                                           hover:text-purple-400 hover:bg-purple-400/10 hover:border-purple-400/20 transition-all"
                                >
                                    <Repeat2 size={14} strokeWidth={1.5} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.88 }}
                                    onClick={e => openShare('quote', e)}
                                    title="Citar"
                                    className="w-7 h-7 rounded-xl bg-white/[0.03] border border-white/5
                                           flex items-center justify-center text-white/25
                                           hover:text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400/20 transition-all font-bold"
                                >
                                    <MessageSquare size={14} strokeWidth={1.5} />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div >

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

