import { memo } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { getNicknameClass, getUserDisplayName } from '../../../utils/user';
import { getFrameStyle } from '../../../utils/styles';
import { parseSpaceEnergies } from '../../../utils/markdownUtils';

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

const ChatMessage = memo(({ message, isMe, isOnline, userPresence, onProfileClick, onReply }) => {
    const { author, content, is_vip, created_at, reactions, reply } = message;

    // Fallback author for safety
    const safeAuthor = author || { username: 'Viajero', id: message.user_id };

    return (
        <motion.div
            initial={{ opacity: 0, x: isMe ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 group/msg ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start`}
        >
            {/* Avatar + Frame */}
            <div className="relative shrink-0 w-8 sm:w-10 mt-1">
                <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 ${isOnline ? 'avatar-online-ring p-[1px]' : ''} relative cursor-pointer active:scale-95 transition-transform flex items-center justify-center`}
                    onClick={() => onProfileClick?.(safeAuthor)}
                >
                    {(() => {
                        const frame = getFrameStyle ? getFrameStyle(safeAuthor?.frame_item_id || safeAuthor?.equipped_frame) : {};
                        return (
                            <div
                                className={`w-full h-full rounded-full relative flex items-center justify-center border border-white/5 ${frame.className || ''}`}
                                style={{ ...frame, width: '100%', height: '100%' }} // Force size inheritance from locked parent
                            >
                                <div className="w-full h-full rounded-full overflow-hidden bg-black/40">
                                    <img
                                        src={safeAuthor?.avatar_url || '/default-avatar.png'}
                                        className="w-full h-full object-cover"
                                        alt={safeAuthor?.username}
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-1 -right-1 bg-black/80 border border-white/20 rounded-full px-1.5 py-0.5 text-[7px] font-black text-cyan-400 z-20 shadow-lg">
                    {safeAuthor?.user_level || safeAuthor?.level || 1}
                </div>
            </div>

            {/* Content Bubble Area */}
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[calc(100%-48px)] sm:max-w-[85%]`}>
                <div className={`flex items-center gap-2 mb-1 px-1 overflow-hidden max-w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span
                        className={`text-[10px] sm:text-[11px] font-black tracking-wider ${getNicknameClass(safeAuthor)} cursor-pointer hover:underline decoration-white/20 underline-offset-2 transition-all truncate`}
                        onClick={() => onProfileClick?.(safeAuthor)}
                    >
                        {getUserDisplayName(safeAuthor)}
                    </span>
                    <span className="text-[8px] text-white/20 font-mono flex-shrink-0">
                        {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className={`flex items-start gap-2 w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`chat-message-bubble relative group/bubble ${is_vip ? 'chat-message-vip' : ''} shadow-xl`}>
                        {reply && (
                            <div className="mb-2 p-2 rounded-xl bg-white/5 border-l-2 border-cyan-500/50 text-[10px] opacity-80 backdrop-blur-sm">
                                <div className="font-black text-[8px] uppercase tracking-widest text-cyan-400 mb-0.5">
                                    {reply.author}
                                </div>
                                <div className="line-clamp-1 italic text-white/40">
                                    {reply.content.replace(/!\[.*?\]\(.*?\)/g, '🖼️ Imagen')}
                                </div>
                            </div>
                        )}
                        {is_vip && (
                            <div className="vip-tag flex items-center justify-between mb-2 border-b border-amber-500/20 pb-1">
                                <span>★ TRANSMISIÓN VIP ★</span>
                            </div>
                        )}
                        <div className="prose prose-invert prose-xs max-w-none break-words
                            prose-p:my-0 prose-p:leading-tight sm:prose-p:leading-relaxed
                            prose-strong:text-cyan-400 prose-em:text-pink-400 text-[14px] sm:text-[15px]">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                            >
                                {parseMentions(parseLinksToImages(parseSpaceEnergies(content)))}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Compact Reply Button */}
                    <button
                        onClick={() => onReply?.(message)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 opacity-0 group-hover/msg:opacity-100 transition-all active:scale-90 flex-shrink-0 hover:bg-white/10"
                        title="Responder"
                    >
                        <span className="text-[11px]">↩️</span>
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
}, (prev, next) => {
    return (
        prev.message.id === next.message.id &&
        prev.isMe === next.isMe &&
        prev.isOnline === next.isOnline &&
        prev.userPresence?.status === next.userPresence?.status &&
        prev.onReply === next.onReply &&
        prev.onProfileClick === next.onProfileClick
    );
});

export default ChatMessage;
