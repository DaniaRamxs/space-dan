import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { getNicknameClass, getUserDisplayName } from '../../../utils/user';
import { getFrameStyle } from '../../../utils/styles';
import { parseSpaceEnergies } from '../../../utils/markdownUtils';
import { useUniverse } from '../../../contexts/UniverseContext';

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

export const parseMentions = (text) => {
    if (!text) return '';
    return text.replace(/@([\w]+(?:\s[\w]+)?)(?=[.,!?;:]?(\s|$))/g, '<span class="chat-mention">@$1</span>');
};

export const parseLinksToImages = (text) => {
    if (!text) return '';
    // Detecta URLs de imágenes comunes o GIPHY
    const imageExtensions = /\.(jpeg|jpg|gif|png|webp|svg|gifv)$|giphy\.com\/media\/|tenor\.com\/view\//i;

    // Dividir protengiendo lo que ya es una imagen Markdown ![texto](url)
    const parts = text.split(/(!\[.*?\]\(.*?\))/g);

    return parts.map(part => {
        if (part.startsWith('![')) return part;

        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        return part.replace(urlRegex, (url) => {
            if (imageExtensions.test(url)) {
                return `![visual](${url})`;
            }
            return url;
        });
    }).join('');
};

export default function ChatMessage({ message, isMe, onProfileClick, onReply }) {
    const { author, content, is_vip, created_at, reactions, reply } = message;
    const { onlineUsers } = useUniverse();

    const isOnline = author?.id && onlineUsers[author.id];
    const userPresence = onlineUsers[author?.id];

    return (
        <motion.div
            initial={{ opacity: 0, x: isMe ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar + Frame */}
            <div className="chat-avatar-container">
                <div
                    className={`shrink-0 ${isOnline ? 'avatar-online-ring' : ''} relative cursor-pointer active:scale-95 transition-transform`}
                    onClick={() => onProfileClick?.(author)}
                >
                    <div
                        className="w-9 h-9 rounded-full overflow-hidden relative border border-white/5"
                        style={getFrameStyle ? getFrameStyle(author?.frame_item_id || author?.equipped_frame) : {}}
                    >
                        <img
                            src={author?.avatar_url || '/default-avatar.png'}
                            className="w-full h-full object-cover"
                            alt={author?.username}
                        />
                    </div>
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-1 -right-1 bg-black/80 border border-white/10 rounded-full px-1 text-[7px] font-black text-cyan-400 z-20">
                    {author?.user_level || author?.level || 1}
                </div>
            </div>

            {/* Content Bubble */}
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[calc(100%-48px)] sm:max-w-[90%]`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span
                        className={`text-[10px] font-black tracking-wider ${getNicknameClass(author)} cursor-pointer hover:underline decoration-white/20 underline-offset-2 transition-all`}
                        onClick={() => onProfileClick?.(author)}
                    >
                        {getUserDisplayName(author)}
                    </span>
                    {isOnline && (
                        <span className="orbit-status-label">
                            <span className="orbit-status-dot" />
                            <div className="orbit-status-ticker">
                                <span>{userPresence?.status || 'En Órbita ✨'}</span>
                            </div>
                        </span>
                    )}
                    <span className="text-[8px] text-white/20 font-mono">
                        {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="flex items-center gap-2 w-full">
                    <div className={`chat-message-bubble relative group/bubble ${is_vip ? 'chat-message-vip' : ''} flex-1`}>
                        {reply && (
                            <div className="mb-2 p-2 rounded-lg bg-white/5 border-l-2 border-cyan-500/50 text-[10px] opacity-80">
                                <div className="font-black text-[8px] uppercase tracking-widest text-cyan-400 mb-0.5">
                                    {reply.author}
                                </div>
                                <div className="line-clamp-1 italic text-white/60">
                                    {reply.content.replace(/!\[.*?\]\(.*?\)/g, '🖼️ Imagen')}
                                </div>
                            </div>
                        )}
                        {is_vip && (
                            <div className="vip-tag flex items-center justify-between mb-2">
                                <span>★ TRANSMISIÓN VIP ★</span>
                                <span className="opacity-40 text-[7px]">LEVEL {author?.level || 1}</span>
                            </div>
                        )}
                        <div className="prose prose-invert prose-xs max-w-none break-words
                            prose-p:my-0 prose-p:leading-relaxed
                            prose-strong:text-cyan-400 prose-em:text-pink-400">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                            >
                                {parseMentions(parseLinksToImages(parseSpaceEnergies(content)))}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Reply Action Button - Prominent */}
                    <button
                        onClick={() => onReply?.(message)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 transition-all opacity-0 group-hover:opacity-100 active:scale-90"
                        title="Responder a este mensaje"
                    >
                        <span className="text-xs">↩️</span>
                    </button>
                </div>

                {/* Reactions */}
                {reactions && reactions.length > 0 && (
                    <div className="chat-reactions">
                        {reactions.map((r, i) => (
                            <span key={i} className="energy-reaction" title={r.usernames?.join(', ')}>
                                {r.emoji} <small>{r.count}</small>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
