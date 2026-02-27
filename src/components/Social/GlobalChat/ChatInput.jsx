
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

export default function ChatInput({ onSendMessage, isVipMode, setIsVipMode, balance }) {
    const [text, setText] = useState('');
    const textareaRef = useRef(null);
    const [showGiphy, setShowGiphy] = useState(false);
    const [gifSearchTerm, setGifSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!text.trim()) return;
        onSendMessage(text, isVipMode);
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tamaño (máx 2MB para chat)
        if (file.size > 2 * 1024 * 1024) {
            alert('La imagen es demasiado pesada (máx 2MB)');
            return;
        }

        try {
            setIsUploading(true);
            alert('Sincronizando imagen... (Recordatorio: Las imágenes se borrarán en 24h). Usa links externos si deseas que sean permanentes.');
            // Aquí iría la lógica de Supabase Storage
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
        }
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
        <form onSubmit={handleSubmit} className="chat-input-area relative">
            <AnimatePresence>
                {showGiphy && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-full left-0 w-full z-[100] h-[350px] overflow-hidden flex flex-col shadow-2xl giphy-panel border-t border-white/10"
                    >
                        <div className="flex items-center justify-between p-4 bg-white/[0.02]">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Dimensión GIPHY ✨</span>
                            <button type="button" onClick={() => setShowGiphy(false)} className="text-white/40 hover:text-white">✕</button>
                        </div>
                        <div className="px-4 pb-2">
                            <input
                                type="text"
                                placeholder="Buscar GIFs estelares..."
                                value={gifSearchTerm}
                                onChange={(e) => setGifSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto px-2 no-scrollbar">
                            <Grid
                                key={gifSearchTerm}
                                width={window.innerWidth > 640 ? 400 : window.innerWidth - 32}
                                columns={2}
                                gutter={8}
                                fetchGifs={(offset) => gifSearchTerm.trim()
                                    ? gf.search(gifSearchTerm, { offset, limit: 12 })
                                    : gf.trending({ offset, limit: 12 })
                                }
                                onGifClick={(gif, e) => {
                                    e.preventDefault();
                                    const gifMarkdown = `![gif](${gif.images.fixed_height.url})`;
                                    onSendMessage(gifMarkdown, isVipMode);
                                    setShowGiphy(false);
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                    <div className="flex items-center gap-3">
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

                        <div className="flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
                            <label className="cursor-pointer p-1 hover:bg-white/5 rounded-lg transition-colors" title="Subir imagen (borrado automático 24h)">
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                <span className="text-xs">🖼️</span>
                            </label>
                            <button
                                type="button"
                                className={`p-1 hover:bg-white/5 rounded-lg transition-colors ${showGiphy ? 'bg-white/10 opacity-100' : ''}`}
                                title="Insertar GIF"
                                onClick={() => setShowGiphy(!showGiphy)}
                            >
                                <span className="text-xs">🎞️</span>
                            </button>
                        </div>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${text.length > 250 ? 'text-rose-500' : 'text-white/20'}`}>
                        {text.length}/280
                    </span>
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!text.trim() || isUploading}
                className="chat-send-btn disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
            >
                {isUploading ? '⌛' : '🚀'}
            </motion.button>
        </form>
    );
}
