
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export default function ChatInput({ onSendMessage, isVipMode, setIsVipMode, balance }) {
    const [text, setText] = useState('');
    const textareaRef = useRef(null);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!text.trim()) return;
        onSendMessage(text, isVipMode);
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleChange = (e) => {
        setText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    return (
        <form onSubmit={handleSubmit} className="chat-input-area">
            <div className="flex flex-col flex-1">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje estelar..."
                    className="chat-textarea no-scrollbar"
                    rows={1}
                    maxLength={280}
                />
                <div className="flex items-center justify-between mt-2 px-1">
                    <button
                        type="button"
                        onClick={() => setIsVipMode(!isVipMode)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${isVipMode
                                ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                : 'bg-white/5 border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
                            }`}
                        title="Resaltar mensaje con energía dorada"
                    >
                        ✨ VIP (50 DNC)
                    </button>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${text.length > 250 ? 'text-rose-500' : 'text-white/20'}`}>
                        {text.length}/280
                    </span>
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!text.trim()}
                className="chat-send-btn disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            >
                🚀
            </motion.button>
        </form>
    );
}
