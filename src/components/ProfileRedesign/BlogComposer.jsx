import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { newProfileService } from '../../services/newProfileService';
import { useAuthContext } from '../../contexts/AuthContext';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

export default function BlogComposer({ onPostCreated, onCancel }) {
    const { user } = useAuthContext();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showGiphy, setShowGiphy] = useState(false);
    const [gifSearchTerm, setGifSearchTerm] = useState('');
    const editorRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !content || submitting) return;
        setSubmitting(true);
        try {
            const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.random().toString(36).substring(2, 7);
            await newProfileService.createBlogPost({
                title,
                content,
                cover_url: coverUrl || null,
                slug,
                is_published: true
            });
            onPostCreated?.();
            setTitle('');
            setContent('');
            setCoverUrl('');
        } catch (err) {
            console.error(err);
            alert('Error al crear el blog');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl italic font-black">BLOG</div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Título de la Entrada</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="El inicio de una nueva odisea..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-xl font-black text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">URL de Imagen de Portada (Opcional)</label>
                    <input
                        type="text"
                        value={coverUrl}
                        onChange={e => setCoverUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-[11px] text-white/60 outline-none focus:border-cyan-500 transition-all"
                    />
                </div>

                <div className="space-y-2 relative" ref={editorRef}>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Cuerpo del Blog (Markdown)</label>
                        <button
                            type="button"
                            onClick={() => setShowGiphy(!showGiphy)}
                            className="bg-cyan-500/10 text-cyan-400 text-[9px] px-3 py-1 rounded-lg hover:bg-cyan-500/20 transition-all flex items-center gap-2 font-black uppercase"
                        >
                            <span>🎞️</span> GIPHY
                        </button>
                    </div>

                    <AnimatePresence>
                        {showGiphy && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowGiphy(false)}
                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="relative w-full max-w-xl bg-[#090912] border border-white/20 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] h-[80vh] max-h-[700px]"
                                >
                                    <div className="p-6 border-b border-white/10 bg-white/[0.03] flex items-center justify-between shrink-0">
                                        <div>
                                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Reactor de Bitácora</h4>
                                            <p className="text-[8px] text-cyan-400 uppercase tracking-widest leading-none mt-1">Sincronización Visual GIPHY</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowGiphy(false)}
                                            className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all text-xl"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="p-4 bg-black/40 border-b border-white/5 shrink-0">
                                        <input
                                            type="text"
                                            placeholder="Buscar trasmisiones GIPHY..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-cyan-500/50 transition-all font-medium shadow-inner"
                                            value={gifSearchTerm}
                                            onChange={e => setGifSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        <Grid
                                            width={window.innerWidth > 600 ? 540 : (window.innerWidth - 64)}
                                            columns={window.innerWidth > 600 ? 3 : 2}
                                            gutter={12}
                                            fetchGifs={(offset) => gifSearchTerm.trim()
                                                ? gf.search(gifSearchTerm, { offset, limit: 12 })
                                                : gf.trending({ offset, limit: 12 })
                                            }
                                            onGifClick={(gif, e) => {
                                                e.preventDefault();
                                                setContent(prev => prev + `\n![GIF](${gif.images.fixed_height.url})\n`);
                                                setShowGiphy(false);
                                            }}
                                        />
                                    </div>
                                    <div className="p-4 bg-black/60 text-center border-t border-white/5 shrink-0">
                                        <p className="text-[8px] text-white/20 uppercase tracking-[0.3em]">Pulsa un GIF para insertarlo • Pulsa fuera para cerrar</p>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Describe tu bitácora estelar aquí... Usa Markdown para dar formato."
                        className="w-full min-h-[300px] bg-black/40 border border-white/10 rounded-[2rem] p-8 text-sm text-white/80 outline-none focus:border-cyan-500 transition-all resize-none font-mono leading-relaxed"
                    />
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                    >
                        Descartar
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !title || !content}
                        className="flex-[2] py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                        {submitting ? 'Publicando Entrada...' : 'Publicar en Bitácora'}
                    </button>
                </div>
            </form>
        </div>
    );
}
