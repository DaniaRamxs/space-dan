import { memo } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Zap, Flame, Sparkles, ShieldCheck, Crown, Orbit } from 'lucide-react';
import { getNicknameClass, getUserDisplayName } from '../../../utils/user';
import { getFrameStyle } from '../../../utils/styles';
import { parseSpaceEnergies } from '../../../utils/markdownUtils';
import ChatBadge from '../../Social/ChatBadge';
import MiniHoloCard from '../../MiniHoloCard';

const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [...new Set([...defaultSchema.tagNames, 'div', 'span', 'strong', 'em'])],
    attributes: {
        ...defaultSchema.attributes,
        div: [...(defaultSchema.attributes.div || []), 'className', 'class', 'style'],
        span: [...(defaultSchema.attributes.span || []), 'className', 'class', 'style'],
        '*': [...(defaultSchema.attributes['*'] || []), 'className', 'class', 'style']
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

const ChatMessage = memo(({ message, isMe, isOnline, userPresence, onProfileClick, onReply, isGrouped = false }) => {
    const { author, content, is_vip, created_at, reactions, reply } = message;

    // Fallback author for safety
    const safeAuthor = author || { username: 'Viajero', id: message.user_id };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        // Podríamos disparar un mini-toast aquí si fuera necesario
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: isMe ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 group/msg ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start 
                ${isGrouped ? 'mt-[-8px]' : 'mt-2'}`}
        >
            {/* Avatar + Frame — Solo si NO está agrupado */}
            <div className={`relative shrink-0 w-8 sm:w-10 mt-1 transition-opacity duration-300 ${isGrouped ? 'opacity-0 pointer-events-none h-0' : 'opacity-100'}`}>
                {!isGrouped && (
                    <div className="relative group/avatar">
                        <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 ${isOnline ? 'avatar-online-ring p-[1px]' : ''} relative cursor-pointer active:scale-95 transition-transform flex items-center justify-center`}
                            onClick={() => onProfileClick?.(safeAuthor)}
                        >
                            {(() => {
                                const frame = getFrameStyle ? getFrameStyle(safeAuthor?.frame_item_id || safeAuthor?.equipped_frame) : {};
                                return (
                                    <div
                                        className={`w-full h-full rounded-full relative flex items-center justify-center border border-white/5 ${frame.className || ''}`}
                                        style={{ ...frame, width: '100%', height: '100%' }}
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
                        {/* Stellar Level Badge */}
                        <div className="absolute -top-1 -right-1 bg-black/80 border border-cyan-500/30 rounded-full px-1 py-0.5 text-[6px] font-black text-white flex items-center gap-0.5 z-20 shadow-lg">
                            <Zap size={6} className="text-cyan-400 fill-current" />
                            {safeAuthor?.user_level || safeAuthor?.level || 1}
                        </div>

                        {/* Activity Level Badge */}
                        <div className="absolute -bottom-1 -right-1 bg-black/80 border border-violet-500/30 rounded-full px-1 py-0.5 text-[6px] font-black text-white flex items-center gap-0.5 z-20 shadow-lg">
                            <Flame size={6} className="text-violet-400 fill-current" />
                            {safeAuthor?.activity_level || 1}
                        </div>

                        {/* Hover Profile Preview - Desktop Style */}
                        <div className={`hidden md:absolute md:block z-[200] opacity-0 group-hover/avatar:opacity-100 pointer-events-none group-hover/avatar:pointer-events-auto transition-all delay-500 translate-x-2 group-hover/avatar:translate-x-0
                            ${isMe ? 'right-12 top-0 origin-top-right' : 'left-12 top-0 origin-top-left'}`}>
                            <div className="shadow-2xl rounded-3xl overflow-hidden">
                                <MiniHoloCard profile={safeAuthor} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Bubble Area */}
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[calc(100%-48px)] sm:max-w-[90%]`}>
                {!isGrouped && (
                    <div className={`flex items-center gap-2 mb-1 px-1 overflow-hidden max-w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span
                            className={`text-[10px] sm:text-[11px] font-black tracking-wider ${getNicknameClass(safeAuthor)} cursor-pointer hover:underline decoration-white/20 underline-offset-2 transition-all truncate`}
                            style={safeAuthor?.custom_name_color ? { color: safeAuthor.custom_name_color } : {}}
                            onClick={() => onProfileClick?.(safeAuthor)}
                        >
                            {getUserDisplayName(safeAuthor)}
                        </span>

                        {/* Premium Title */}
                        {safeAuthor?.equipped_title && (
                            <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.15em] border border-white/10 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                                {safeAuthor.equipped_title}
                            </span>
                        )}

                        {/* Tier Badges */}
                        {safeAuthor?.sub_tier >= 1 && (
                            <div className="flex-shrink-0 bg-white/5 border border-white/10 px-1 py-0.5 rounded flex items-center gap-1 shadow-lg">
                                {safeAuthor.sub_tier === 3 ? (
                                    <Crown size={10} className="text-amber-400 fill-amber-400/20" />
                                ) : (
                                    <Orbit size={10} className="text-cyan-400" />
                                )}
                                <span className="text-[7px] font-black text-white/60 uppercase tracking-tighter">
                                    {safeAuthor.sub_tier === 3 ? 'LORD' : safeAuthor.sub_tier === 2 ? 'CITIZEN' : 'EXPLORADOR'}
                                </span>
                            </div>
                        )}

                        {/* Stellar Citizen Badge (Legacy support or explicit flag) */}
                        {(safeAuthor?.is_stellar_citizen || safeAuthor?.sub_tier >= 2) && !(safeAuthor?.sub_tier === 3) && (
                            <div className="flex-shrink-0 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 p-[1px] rounded-[4px] shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                <div className="bg-[#050510] px-1.5 py-0.5 rounded-[3px] flex items-center gap-1">
                                    <ShieldCheck size={10} className="text-amber-500" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">CITIZEN</span>
                                </div>
                            </div>
                        )}

                        {(safeAuthor?.badge_color || safeAuthor?.equipped_badge) && (
                            <ChatBadge
                                badge={safeAuthor.equipped_badge}
                                color={safeAuthor.badge_color}
                            />
                        )}
                        <span className="text-[8px] text-white/20 font-mono flex-shrink-0">
                            {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}

                <div className={`flex items-start gap-2 w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`chat-message-bubble relative group/bubble 
                        ${is_vip ? 'chat-message-vip' : ''} 
                        ${safeAuthor?.chat_effect ? `chat-effect-${safeAuthor.chat_effect}` : ''} 
                        ${safeAuthor?.active_aura ? `chat-effect-${safeAuthor.active_aura}` : ''} 
                        ${isGrouped ? 'rounded-2xl' : ''}
                        shadow-xl transition-all duration-300`}>
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

                    {/* Desktop Hover Quick Actions */}
                    <div className={`hidden md:flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-all active:scale-95 flex-shrink-0
                        ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <button
                            onClick={() => onReply?.(message)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            title="Responder"
                        >
                            <span className="text-[11px]">↩️</span>
                        </button>
                        <button
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            title="Reaccionar"
                        >
                            <span className="text-[11px]">⚡</span>
                        </button>
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            title="Copiar"
                        >
                            <span className="text-[11px]">📄</span>
                        </button>
                    </div>

                    {/* Mobile Compact Reply Button */}
                    <button
                        onClick={() => onReply?.(message)}
                        className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 opacity-0 group-hover/msg:opacity-100 transition-all active:scale-90 flex-shrink-0 hover:bg-white/10"
                        title="Responder"
                    >
                        <span className="text-[11px]">↩️</span>
                    </button>
                </div>

                {/* Account for grouping in reactions too */}
                {reactions && reactions.length > 0 && (
                    <div className={`chat-reactions ${isGrouped ? 'mt-1' : ''}`}>
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
        prev.isGrouped === next.isGrouped && // Added isGrouped to memo comparison
        prev.userPresence?.status === next.userPresence?.status &&
        prev.onReply === next.onReply &&
        prev.onProfileClick === next.onProfileClick
    );
});

export default ChatMessage;
