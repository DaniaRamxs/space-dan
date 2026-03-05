import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { parseSpaceEnergies } from '../../utils/markdownUtils';
import ReactionsBar from './ReactionsBar';
import ShareModal from './ShareModal';
import SoundCard from './SoundCard';
import SoundIndicator from './SoundIndicator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuthContext } from '../../contexts/AuthContext';
import { CATEGORIES } from '../../constants/categories';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';
import { Eye, Repeat2, MessageSquare, ChevronRight } from 'lucide-react';

// Configuración de sanitize para permitir nuestras clases sd-* en la preview
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

// Extrae texto plano básico pero MANTIENE las energías para que el parser pueda actuar
function cleanMarkdownForPreview(md = '') {
    return md
        .replace(/```[\s\S]*?```/g, '[Código]')
        .replace(/#+\s/g, '') // Quitar headers para que no ocupen tanto espacio
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Quitar imágenes
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // Solo texto de links
        .trim();
}

function getCategoryMeta(id) {
    return CATEGORIES.find(c => c.id === id) || { icon: '🌐', label: 'General' };
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

const ActivityCard = memo(({ post, onUpdate, onNewPost, onHeightChange }) => {
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const [isExpanded, setIsExpanded] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareMode, setShareMode] = useState('repost');

    // Notify parent of height change
    useEffect(() => {
        if (onHeightChange) {
            // Wait for expansion animation/render
            setTimeout(onHeightChange, 50);
        }
    }, [isExpanded, onHeightChange]);

    const openShare = (mode, e) => {
        e.stopPropagation();
        setShareMode(mode);
        setShowShareModal(true);
    };

    const hasLongContent = (post.content || '').split('\n').length > 6 || (post.content || '').length > 400;
    const catMeta = getCategoryMeta(post.category);

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                layout
                className="postCard mb-4 cursor-pointer"
                onClick={() => {
                    if (post.isOptimistic) return;
                    if (!isExpanded && hasLongContent) {
                        setIsExpanded(true);
                    } else {
                        navigate(`/transmission/${post.id}`);
                    }
                }}
                role="article"
            >
                <div className="flex gap-4">
                    {/* AVATAR */}
                    <Link
                        to={post.author?.username ? `/@${encodeURIComponent(post.author.username)}` : `/profile/${post.author_id}`}
                        onClick={e => e.stopPropagation()}
                        className="shrink-0"
                    >
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-black hover:border-cyan-500/40 transition-all">
                            <img
                                src={post.author?.avatar_url || '/default_user_blank.png'}
                                className="w-full h-full object-cover"
                                alt={post.author?.username}
                                loading="lazy"
                            />
                        </div>
                    </Link>

                    {/* CONTENT AREA */}
                    <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <Link
                                to={post.author?.username ? `/@${encodeURIComponent(post.author.username)}` : `/profile/${post.author_id}`}
                                onClick={e => e.stopPropagation()}
                                className="text-[13px] font-black text-white/90 hover:underline flex items-center gap-1.5"
                            >
                                <span className={getNicknameClass(post.author)}>
                                    {getUserDisplayName(post.author)}
                                </span>
                                {post.metadata?.spotify_track && (
                                    <SoundIndicator
                                        trackId={post.metadata.spotify_track.track_id}
                                        previewUrl={post.metadata.spotify_track.preview_url}
                                    />
                                )}
                            </Link>
                            <span className="text-[10px] text-white/20 font-bold">·</span>
                            <span className="text-[10px] text-white/30 font-mono">
                                {safeTimeAgo(post.created_at, false)}
                            </span>
                            <span className="ml-auto text-[9px] font-black text-white/10 uppercase tracking-widest flex items-center gap-1">
                                {catMeta.icon} {catMeta.label}
                            </span>
                        </div>

                        {/* Title (Only if specifically present and significant, usually we'll hide it for a pulse feel) */}
                        {post.title && post.title !== 'null' && (
                            <h3 className="text-sm font-black text-white mb-2 leading-tight tracking-tight">
                                {post.title}
                            </h3>
                        )}

                        {/* Content with Expansion */}
                        <div className="relative">
                            <div className={`text-[14px] leading-relaxed text-white/70 whitespace-pre-wrap break-words transition-all duration-500 overflow-hidden ${!isExpanded && hasLongContent ? 'max-h-[160px]' : 'max-h-[5000px]'}`}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                                >
                                    {parseSpaceEnergies(post.content || '')}
                                </ReactMarkdown>

                                {!isExpanded && hasLongContent && (
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#070710] to-transparent pointer-events-none" />
                                )}
                            </div>

                            {hasLongContent && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                    className="mt-2 text-[10px] font-black text-cyan-400/60 hover:text-cyan-400 uppercase tracking-widest transition-all"
                                >
                                    {isExpanded ? 'Ver menos ↑' : 'Ver más...'}
                                </button>
                            )}
                        </div>

                        {/* Sound Card Integration */}
                        {post.metadata?.spotify_track && (
                            <SoundCard track={post.metadata.spotify_track} />
                        )}

                        {/* Original Post Embed for Reposts */}
                        {post.type === 'repost' && post.original_post && (
                            <div className="mt-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all text-xs text-white/40">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black uppercase text-purple-400/60">Reposteo Estelar</span>
                                    <span className="text-[10px] font-bold">@{post.original_post.author?.username}</span>
                                </div>
                                <p className="line-clamp-2">{cleanMarkdownForPreview(post.original_post.content || '')}</p>
                            </div>
                        )}

                        {/* Interactions Footer */}
                        <div className="flex items-center justify-between mt-4">
                            <div onClick={e => e.stopPropagation()}>
                                <ReactionsBar post={post} onUpdate={onUpdate} />
                            </div>

                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={e => openShare('repost', e)}
                                    className="text-white/20 hover:text-purple-400 transition-colors"
                                >
                                    <Repeat2 size={16} />
                                </button>
                                <button
                                    onClick={e => openShare('quote', e)}
                                    className="text-white/20 hover:text-cyan-400 transition-colors"
                                >
                                    <MessageSquare size={16} />
                                </button>
                            </div>
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
