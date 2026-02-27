
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

export default function ChatMessage({ message, isMe }) {
    const { author, content, is_vip, created_at, reactions } = message;

    // Parse mentions: @username -> <span class="chat-mention">@username</span>
    const parseMentions = (text) => {
        if (!text) return '';
        return text.replace(/@(\w+)/g, '<span class="chat-mention">@$1</span>');
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: isMe ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar + Frame */}
            <div className="chat-avatar-container">
                <div
                    className="w-9 h-9 rounded-full overflow-hidden relative border border-white/5"
                    style={getFrameStyle ? getFrameStyle(author?.frame_item_id || author?.equipped_frame) : {}}
                >
                    <img
                        src={author?.avatar_url || '/default-avatar.png'}
                        className="chat-avatar"
                        alt={author?.username}
                    />
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-1 -right-1 bg-black/80 border border-white/10 rounded-full px-1 text-[7px] font-black text-cyan-400">
                    {author?.user_level || author?.level || 1}
                </div>
            </div>

            {/* Content Bubble */}
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className={`text-[10px] font-black tracking-wider ${getNicknameClass(author)}`}>
                        {getUserDisplayName(author)}
                    </span>
                    <span className="text-[8px] text-white/20 font-mono">
                        {new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className={`chat-message-bubble ${is_vip ? 'chat-message-vip' : ''}`}>
                    {is_vip && <span className="vip-tag">Destacado</span>}
                    <div className="prose prose-invert prose-xs max-w-none break-words
                        prose-p:my-0 prose-p:leading-relaxed
                        prose-strong:text-cyan-400 prose-em:text-pink-400">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
                        >
                            {parseMentions(parseSpaceEnergies(content))}
                        </ReactMarkdown>
                    </div>
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
