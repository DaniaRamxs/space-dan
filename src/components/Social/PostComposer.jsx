import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { activityService } from '../../services/activityService';
import { useAuthContext } from '../../contexts/AuthContext';
import { parseSpaceEnergies } from '../../utils/markdownUtils';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import SongSearchModal from './SongSearchModal';
import { Music, X } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

// Configuración de sanitize para permitir nuestras clases sd-*
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

// CATEGORIES moved to src/constants/categories.js

export default function PostComposer({
    onPostCreated,
    onPostUpdated,
    editPost,
    onCancelEdit,
}) {
    const { user, profile } = useAuthContext();
    const isEditing = !!editPost;

    const [content, setContent] = useState(isEditing ? (editPost.content || '') : '');
    const [category, setCategory] = useState(isEditing ? (editPost.category || 'general') : 'general');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [catOpen, setCatOpen] = useState(false);
    const [showGiphy, setShowGiphy] = useState(false);
    const [gifSearchTerm, setGifSearchTerm] = useState('');
    const [gifGridWidth, setGifGridWidth] = useState(320);
    const [isFocused, setIsFocused] = useState(false);
    const [showSongSearch, setShowSongSearch] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState(isEditing ? (editPost.metadata?.spotify_track || null) : null);
    const textareaRef = useRef(null);

    const canSubmit = content.trim().length > 0 && !submitting;
    const selectedCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

    useEffect(() => {
        const recalcGifGridWidth = () => {
            const viewportWidth = window.innerWidth || 360;
            const containerWidth = textareaRef.current?.parentElement?.clientWidth || (viewportWidth - 24);
            const next = Math.max(220, Math.min(containerWidth - 16, viewportWidth - 24, 760));
            setGifGridWidth(Math.floor(next));
        };

        recalcGifGridWidth();
        window.addEventListener('resize', recalcGifGridWidth);
        return () => window.removeEventListener('resize', recalcGifGridWidth);
    }, []);

    // Auto-expand textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!canSubmit || !user) return;
        setSubmitting(true);
        setError(null);

        try {
            if (isEditing) {
                await activityService.updatePost(editPost.id, {
                    title: null,
                    content: content.trim() || null,
                    category,
                });
                if (onPostUpdated) onPostUpdated({
                    ...editPost,
                    title: null,
                    content: content.trim() || null,
                    category,
                    updated_at: new Date().toISOString(),
                });
            } else {
                const tempId = `temp-${Date.now()}`;
                const optimisticPost = {
                    id: tempId,
                    author_id: user.id,
                    title: null,
                    content: content.trim() || null,
                    category,
                    type: 'post',
                    metadata: selectedTrack ? { spotify_track: selectedTrack } : null,
                    created_at: new Date().toISOString(),
                    isOptimistic: true,
                    author: {
                        username: profile?.username || user.user_metadata?.username || 'tú',
                        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '/default_user_blank.png',
                    },
                    reactions_metadata: { total_count: 0, top_reactions: [], user_reaction: null }
                };

                if (onPostCreated) onPostCreated(optimisticPost);

                setContent('');
                setCategory('general');
                setIsFocused(false);

                const newPost = await activityService.createPost({
                    author_id: user.id,
                    title: null,
                    content: optimisticPost.content,
                    category,
                    type: 'post',
                    metadata: selectedTrack ? { spotify_track: selectedTrack } : null
                });

                const enriched = {
                    ...newPost,
                    author: optimisticPost.author,
                    reactions_metadata: optimisticPost.reactions_metadata,
                    metadata: newPost.metadata || (selectedTrack ? { spotify_track: selectedTrack } : null)
                };

                setSelectedTrack(null);
                if (onPostCreated) onPostCreated(enriched, tempId);
            }
        } catch (err) {
            console.error('[PostComposer]', err);
            setError(err.message || 'Error al publicar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setContent(editPost?.content || '');
        setCategory(editPost?.category || 'general');
        setIsFocused(false);
        setError(null);
        if (onCancelEdit) onCancelEdit();
    };

    return (
        <div className="relative bg-[#0a0a14]/60 md:rounded-3xl border border-white/5 p-4 transition-all duration-300 hover:border-white/10 group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

            {isEditing && (
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">:: Editando_Pulso</span>
                    <button onClick={handleCancel} className="text-[9px] font-black text-white/20 hover:text-white/60 uppercase transition-colors">Cancelar</button>
                </div>
            )}

            <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black">
                    <img
                        src={profile?.avatar_url || user?.user_metadata?.avatar_url || '/default_user_blank.png'}
                        className="w-full h-full object-cover" alt="Avatar"
                    />
                </div>

                <div className="flex-1 flex flex-col pt-1">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        placeholder="¿Qué pasa por tu universo?"
                        rows={1}
                        className="w-full bg-transparent border-none text-base text-white/90 placeholder:text-white/20 resize-none outline-none leading-relaxed transition-all"
                    />

                    <AnimatePresence>
                        {selectedTrack && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="mt-3 relative p-2 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 w-fit pr-8"
                            >
                                <img src={selectedTrack.album_cover} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-white line-clamp-1">{selectedTrack.track_name}</span>
                                    <span className="text-[8px] text-white/40 uppercase tracking-widest">{selectedTrack.artist_name}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedTrack(null)}
                                    className="absolute -top-1 -right-1 p-1 bg-rose-500 rounded-full text-white shadow-lg"
                                >
                                    <X size={10} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {(isFocused || content.length > 0) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setCatOpen(v => !v)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white/40 hover:text-white/80 uppercase tracking-widest transition-all"
                                            >
                                                <span>{selectedCat.icon}</span>
                                                <span className="hidden xs:inline">{selectedCat.label}</span>
                                            </button>

                                            {catOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[90]" onClick={() => setCatOpen(false)} />
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                                        className="absolute top-full left-0 mt-2 z-[91] bg-[#0c0c1a] border border-white/10 rounded-2xl p-2 shadow-2xl grid grid-cols-2 gap-1 w-52"
                                                    >
                                                        {CATEGORIES.map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                onClick={() => { setCategory(cat.id); setCatOpen(false); }}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${category === cat.id ? 'bg-white/10 text-white' : 'text-white/30 hover:bg-white/5 hover:text-white/60'}`}
                                                            >
                                                                <span>{cat.icon}</span> {cat.label}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                </>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowGiphy(!showGiphy)}
                                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${showGiphy ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                                        >
                                            🎞️ GIF
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowSongSearch(true)}
                                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${selectedTrack ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}
                                        >
                                            🎵 Música
                                        </button>
                                    </div>

                                    <div className="sm:ml-auto flex items-center justify-end gap-3 w-full sm:w-auto">
                                        {error && <span className="text-[9px] text-rose-400 font-bold tracking-tighter">⚠️ {error}</span>}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!canSubmit}
                                            className="px-6 py-2 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)] min-w-[120px]"
                                        >
                                            {submitting ? '...' : (isEditing ? 'Guardar' : 'Transmitir')}
                                        </button>
                                    </div>
                                </div>

                                {showGiphy && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 h-64 overflow-hidden flex flex-col bg-black/40 rounded-2xl border border-white/5"
                                    >
                                        <div className="px-4 py-3">
                                            <input
                                                type="text"
                                                placeholder="Buscar GIFs..."
                                                value={gifSearchTerm}
                                                onChange={(e) => setGifSearchTerm(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/80 outline-none focus:border-cyan-500/30 transition-all"
                                            />
                                        </div>
                                        <div className="flex-1 overflow-y-auto px-2 no-scrollbar">
                                            <Grid
                                                key={gifSearchTerm}
                                                width={gifGridWidth}
                                                columns={window.innerWidth > 500 ? 3 : 2}
                                                gutter={8}
                                                fetchGifs={(offset) => gifSearchTerm.trim()
                                                    ? gf.search(gifSearchTerm, { offset, limit: 12 })
                                                    : gf.trending({ offset, limit: 12 })
                                                }
                                                onGifClick={(gif, e) => {
                                                    e.preventDefault();
                                                    const gifMarkdown = `\n![GIF](${gif.images.fixed_height.url})\n`;
                                                    setContent(prev => prev + gifMarkdown);
                                                    setShowGiphy(false);
                                                }}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <SongSearchModal
                isOpen={showSongSearch}
                onClose={() => setShowSongSearch(false)}
                onSelect={(track) => setSelectedTrack(track)}
            />
        </div>
    );
}
