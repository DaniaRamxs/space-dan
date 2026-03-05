import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { newProfileService } from '../../services/newProfileService';
import { supabase } from '../../supabaseClient';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import AvatarUploader from '../AvatarUploader';
import { getFrameStyle } from '../../utils/styles';
import { useAuthContext } from '../../contexts/AuthContext';

const gf = new GiphyFetch('3k4Fdn6D040IQvIq1KquLZzJgutP3dGp');

export const ThemeConfigModal = ({ isOpen, onClose, userId, currentTheme, currentBlocks, currentProfile, onSave }) => {
    const [theme, setTheme] = useState(currentTheme || {});
    const [blocks, setBlocks] = useState(currentBlocks || []);
    const [moodEmoji, setMoodEmoji] = useState(currentProfile?.mood_emoji || '✨');
    const [moodText, setMoodText] = useState(currentProfile?.mood_text || '');
    const [bio, setBio] = useState(currentProfile?.bio || '');
    const [saving, setSaving] = useState(false);
    const [uploadingGallery, setUploadingGallery] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    // Logout and Delete logic
    const { logout, deleteAccount } = useAuthContext();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Giphy State
    const [showGiphy, setShowGiphy] = useState(false);
    const [gifSearchTerm, setGifSearchTerm] = useState('');
    const [activeGifField, setActiveGifField] = useState(null); // { id, type: 'text'|'likes'|'dislikes'|'emoji' }

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            // Log to debug
            console.log('[MoodUpdate] Saving:', { moodText, moodEmoji });

            await Promise.all([
                newProfileService.updateProfileTheme(theme),
                newProfileService.updateProfileBlocks(blocks),
                newProfileService.updateProfile({ bio }),
                supabase.rpc('set_user_mood', {
                    p_text: moodText,
                    p_emoji: moodEmoji,
                    p_duration_hours: null // Permanent for now to avoid confusion
                })
            ]);
            onSave?.();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Error al guardar la configuración: ' + (e.message || 'Error desconocido'));
        } finally {
            setSaving(false);
        }
    };

    const toggleBlock = (type) => {
        const exists = blocks.find(b => b.block_type === type);
        if (exists) {
            setBlocks(blocks.map(b => b.block_type === type ? { ...b, is_active: !b.is_active } : b));
        } else {
            let defaultConfig = {};
            if (type === 'gallery') defaultConfig = { images: [] };
            if (type === 'interests') defaultConfig = { likes: '', dislikes: '' };
            if (type === 'music_odyssey') defaultConfig = { songs: Array(5).fill({ title: '', artist: '', annotation: '', cover: '' }) };
            if (type === 'random_facts') defaultConfig = { facts: Array(4).fill({ text: '' }) };
            if (type === 'time_capsule') defaultConfig = { message: '', reveal_date: '' };

            setBlocks([...blocks, {
                block_type: type,
                is_active: true,
                order_index: blocks.length,
                config: defaultConfig
            }]);
        }
    };

    const handleGalleryUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingGallery(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-gallery-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `gallery/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            setBlocks(blocks.map(b => {
                if (b.block_type === 'gallery') {
                    const currentImages = b.config?.images || [];
                    return { ...b, config: { ...b.config, images: [...currentImages, { url: publicUrl }] } };
                }
                return b;
            }));

        } catch (err) {
            console.error('[GalleryUpload] Error:', err);
            alert('No se pudo subir la imagen.');
        } finally {
            setUploadingGallery(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limite basico de tamaño (ej. 30MB)
        if (file.size > 30 * 1024 * 1024) {
            alert('El archivo es demasiado grande. El máximo es 30MB.');
            return;
        }

        setUploadingBanner(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-banner-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `banners/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            setTheme({ ...theme, background_url: publicUrl });
        } catch (err) {
            console.error('[BannerUpload] Error:', err);
            alert('No se pudo subir el banner.');
        } finally {
            setUploadingBanner(false);
            e.target.value = '';
        }
    };

    const removeGalleryImage = (index) => {
        setBlocks(blocks.map(b => {
            if (b.block_type === 'gallery') {
                const currentImages = b.config?.images || [];
                return { ...b, config: { ...b.config, images: currentImages.filter((_, i) => i !== index) } };
            }
            return b;
        }));
    };

    const insertGif = (gifUrl) => {
        if (!activeGifField) return;
        const { id, type } = activeGifField;
        const gifMd = `\n![GIF](${gifUrl})\n`;

        if (id === 'mood') {
            if (type === 'emoji') {
                setMoodEmoji(gifUrl);
            } else {
                setMoodText(prev => prev + gifMd);
            }
        } else {
            setBlocks(blocks.map(bl => {
                if (bl.block_type === id) {
                    const newConfig = { ...bl.config };
                    if (type === 'text') newConfig.text = (newConfig.text || '') + gifMd;
                    if (type === 'likes') newConfig.likes = (newConfig.likes || '') + gifMd;
                    if (type === 'dislikes') newConfig.dislikes = (newConfig.dislikes || '') + gifMd;
                    return { ...bl, config: newConfig };
                }
                return bl;
            }));
        }
        setShowGiphy(false);
        setActiveGifField(null);
    };

    const emojis = ['✨', '🌌', '🚀', '🔭', '🛸', '🌑', '🔋', '💤', '🔥', '🎮', '💻', '🧪', '🧠', '🎧', '⚡', '🪐', '👾', '📡'];

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] relative"
                onClick={e => e.stopPropagation()}
            >
                {/* GIPHY OVERLAY */}
                <AnimatePresence>
                    {showGiphy && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 z-[100] bg-[#090912] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col border border-white/20"
                        >
                            <div className="p-6 flex items-center justify-between border-b border-white/10">
                                <div>
                                    <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Reactor GIPHY</h3>
                                    <p className="text-[8px] text-cyan-400 uppercase tracking-widest">Inserta visuales a tu realidad</p>
                                </div>
                                <button onClick={() => setShowGiphy(false)} className="p-2 text-white/40 hover:text-white transition-colors">✕</button>
                            </div>
                            <div className="p-4 bg-white/5 border-b border-white/10">
                                <input
                                    type="text"
                                    placeholder="Buscar transmisiones visuales..."
                                    value={gifSearchTerm}
                                    onChange={(e) => setGifSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <Grid
                                    key={gifSearchTerm}
                                    width={window.innerWidth > 600 ? 560 : (window.innerWidth - 80)}
                                    columns={window.innerWidth > 600 ? 3 : 2}
                                    gutter={10}
                                    fetchGifs={(offset) => gifSearchTerm.trim()
                                        ? gf.search(gifSearchTerm, { offset, limit: 12 })
                                        : gf.trending({ offset, limit: 12 })
                                    }
                                    onGifClick={(gif, e) => {
                                        e.preventDefault();
                                        insertGif(gif.images.fixed_height.url);
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#0a0a0f]">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter">Arquitectura de Identidad</h2>
                        <p className="text-[8px] sm:text-micro text-white/20 uppercase tracking-widest">Mood & Módulos Modulares</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-12 custom-scrollbar">

                    {/* Identidad Base */}
                    <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                            Identidad Digital
                        </h3>

                        <div className="flex flex-col md:flex-row gap-8 items-center bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                            <div className="shrink-0 scale-90 w-32 h-32 sm:w-40 sm:h-40 relative">
                                <AvatarUploader
                                    currentAvatar={currentProfile?.avatar_url}
                                    frameStyle={getFrameStyle(currentProfile?.equipped_frame || currentProfile?.frame_item_id)}
                                    onUploadSuccess={() => onSave?.()}
                                />
                                <p className="text-[8px] text-white/20 uppercase tracking-widest text-center mt-4">Toca para cambiar</p>
                            </div>

                            <div className="flex-1 space-y-6 w-full">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-white/20 uppercase ml-1">Firma (@)</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/40 italic font-mono">
                                            @{currentProfile?.username}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Serás redirigido al portal de identidad. ¿Deseas cambiar tu firma?')) {
                                                    window.location.href = '/onboarding';
                                                }
                                            }}
                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-white hover:bg-white/10 transition-all"
                                        >
                                            🚀 Cambiar
                                        </button>
                                    </div>
                                    <p className="text-[7px] text-white/10 uppercase tracking-widest italic ml-1">* El cambio de nombre tiene 30 días de cooldown.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-white/20 uppercase ml-1">Biografía Estelar</label>
                                    <textarea
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        placeholder="Tu historia galáctica..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500 transition-all resize-none h-24 shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Mood Section */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 italic flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                                Estado del Orbitador (Mood)
                            </h3>
                            <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">Mood Preview:</span>
                                {moodEmoji?.startsWith('http') ? (
                                    <img src={moodEmoji} className="w-5 h-5 rounded-md object-cover" alt="GIF" />
                                ) : (
                                    <span className="text-sm">{moodEmoji}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="space-y-3 shrink-0">
                                <div className="grid grid-cols-6 gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                                    {emojis.map(e => (
                                        <button
                                            key={e}
                                            onClick={() => setMoodEmoji(e)}
                                            className={`text-xl hover:scale-125 transition-transform p-1 rounded-lg ${moodEmoji === e ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => { setShowGiphy(true); setActiveGifField({ id: 'mood', type: 'emoji' }); }}
                                    className="w-full py-2 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-cyan-400 hover:from-cyan-500/30 hover:to-violet-500/30 transition-all"
                                >
                                    ✨ Usar GIF como Emote
                                </button>
                            </div>
                            <div className="flex-1 space-y-2 relative">
                                <label className="text-[9px] font-bold text-white/20 uppercase ml-1 block">
                                    Mensaje de Onda (Mood)
                                </label>
                                <textarea
                                    value={moodText}
                                    onChange={e => setMoodText(e.target.value)}
                                    placeholder="¿Qué energía emites al vacío?..."
                                    className="w-full h-full min-h-[100px] bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500 transition-all resize-none shadow-inner"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Page Background */}
                    <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,1)]" />
                            Fondo de la Página
                        </h3>
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-white/20 uppercase">Color de Fondo (RGB Palette)</label>
                            <div className="flex gap-3 items-center">
                                <input type="color" value={theme.primary_color || '#0a0a0f'} onChange={e => setTheme({ ...theme, primary_color: e.target.value })} className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-lg" />
                                <span className="text-[10px] font-mono text-white/40">{theme.primary_color || '#0a0a0f'}</span>
                            </div>
                        </div>
                    </section>

                    {/* Banner Upload */}
                    <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,1)]" />
                            Banner de Cabecera
                        </h3>
                        <div className="space-y-4">
                            {theme.background_url ? (
                                <div className="relative w-full h-32 sm:h-40 rounded-[2rem] overflow-hidden border border-white/10 group shadow-lg">
                                    <img src={theme.background_url} className="w-full h-full object-cover" alt="Banner" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                        <button
                                            onClick={() => setTheme({ ...theme, background_url: null })}
                                            className="px-6 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500/40 hover:text-white transition-colors"
                                        >
                                            ✕ Eliminar Banner
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="w-full h-32 sm:h-40 rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 hover:text-white/60 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer group">
                                    {uploadingBanner ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-violet-400">Subiendo...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-3xl font-black mb-2 group-hover:scale-110 transition-transform group-hover:text-violet-400">+</span>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Subir Imagen o GIF</span>
                                            <span className="text-[7px] text-white/30 uppercase tracking-widest mt-1">Sugerido: 1200x400 (Max 5MB)</span>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/gif, image/webp"
                                        className="hidden"
                                        onChange={handleBannerUpload}
                                        disabled={uploadingBanner}
                                    />
                                </label>
                            )}
                        </div>
                    </section>

                    {/* Blocks Toggle */}
                    <section className="space-y-6 pb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]" />
                            Módulos de Realidad
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { id: 'stats', label: 'Eficacia Estelar', desc: 'Métricas de nivel, starlys y racha.' },
                                { id: 'thought', label: 'Pensamientos rápidos', desc: 'Tu frase inspiradora del día.' },
                                { id: 'about', label: 'Sobre Mí / Bio', desc: 'Tu historia galáctica personalizada.' },
                                { id: 'interests', label: 'Lo que me gusta / No me gusta', desc: 'Tus frecuencias de atracción y repulsión.' },
                                { id: 'favorites', label: 'Mis Favoritos', desc: 'Libros, series y objetos de poder.' },
                                { id: 'gallery', label: 'Galería Estelar', desc: 'Exhibe tus capturas visuales.' },
                                { id: 'spotify', label: 'Frecuencia Spotify', desc: 'Sincronización musical en tiempo real.' },
                                { id: 'music_odyssey', label: 'Odisea Musical', desc: 'Tus 5 himnos semanales con alma.' },
                                { id: 'random_facts', label: 'Gabinete de Curiosidades', desc: 'Datos aleatorios revelados al tacto.' },
                                { id: 'time_capsule', label: 'Cápsula del Tiempo', desc: 'Un mensaje sellado para el futuro.' },
                            ].map(b => {
                                const currentBlock = blocks.find(bl => bl.block_type === b.id);
                                const active = currentBlock?.is_active;
                                return (
                                    <div key={b.id} className="space-y-4 p-2 rounded-[2rem] bg-white/[0.01] border border-white/5 transition-all">
                                        <button
                                            onClick={() => toggleBlock(b.id)}
                                            className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${active ? 'bg-white/5 border-cyan-500/30' : 'bg-black/20 border-white/5 opacity-50'}`}
                                        >
                                            <div className="text-left">
                                                <div className="text-xs font-black uppercase italic text-white leading-tight">{b.label}</div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-widest leading-none mt-1">{b.desc}</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-4 transition-all duration-500 ${active ? 'bg-cyan-500 border-white/20 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-110' : 'border-white/10'}`} />
                                        </button>

                                        {active && (
                                            <motion.div
                                                initial={{ opacity: 0, scaleY: 0.8 }}
                                                animate={{ opacity: 1, scaleY: 1 }}
                                                className="px-4 pb-2 space-y-4"
                                            >
                                                {(b.id === 'thought' || b.id === 'about' || b.id === 'favorites') && (
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[9px] font-black text-white/20 uppercase ml-1">Contenido Transmitido (Markdown active)</span>
                                                            <button
                                                                onClick={() => { setShowGiphy(true); setActiveGifField({ id: b.id, type: 'text' }); }}
                                                                className="bg-white/5 text-white/40 text-[8px] px-2 py-1 rounded-md hover:bg-white/10 hover:text-white transition-all"
                                                            >
                                                                + GIF
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            value={currentBlock?.config?.text || ''}
                                                            onChange={e => {
                                                                const newText = e.target.value;
                                                                setBlocks(blocks.map(bl => bl.block_type === b.id ? { ...bl, config: { ...bl.config, text: newText } } : bl));
                                                            }}
                                                            placeholder={`Escribe aquí el contenido de ${b.label}...`}
                                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] text-white/80 outline-none focus:border-cyan-500 transition-all resize-none min-h-[120px] shadow-inner"
                                                        />
                                                    </div>
                                                )}

                                                {b.id === 'interests' && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black text-white/20 uppercase ml-1">Lo que me gusta</span>
                                                                <button onClick={() => { setShowGiphy(true); setActiveGifField({ id: b.id, type: 'likes' }); }} className="text-[8px] text-pink-400 opacity-40 hover:opacity-100">+ GIF</button>
                                                            </div>
                                                            <textarea
                                                                value={currentBlock?.config?.likes || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setBlocks(blocks.map(bl => bl.block_type === 'interests' ? { ...bl, config: { ...bl.config, likes: val } } : bl));
                                                                }}
                                                                placeholder="Pizza, Videogames..."
                                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-[10px] text-white/80 outline-none focus:border-pink-500 transition-all resize-none h-24"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black text-white/20 uppercase ml-1">Lo que repelo</span>
                                                                <button onClick={() => { setShowGiphy(true); setActiveGifField({ id: b.id, type: 'dislikes' }); }} className="text-[8px] text-orange-400 opacity-40 hover:opacity-100">+ GIF</button>
                                                            </div>
                                                            <textarea
                                                                value={currentBlock?.config?.dislikes || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setBlocks(blocks.map(bl => bl.block_type === 'interests' ? { ...bl, config: { ...bl.config, dislikes: val } } : bl));
                                                                }}
                                                                placeholder="Mentiras, Bugs..."
                                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-[10px] text-white/80 outline-none focus:border-orange-500 transition-all resize-none h-24"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {b.id === 'gallery' && (
                                                    <div className="space-y-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {(currentBlock.config?.images || []).map((img, idx) => (
                                                                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 group/thumb shadow-lg">
                                                                    <img src={img.url} className="w-full h-full object-cover" alt="" />
                                                                    <button
                                                                        onClick={() => removeGalleryImage(idx)}
                                                                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => fileInputRef.current?.click()}
                                                                disabled={uploadingGallery}
                                                                className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/20 hover:text-white/60 hover:border-white/40 hover:bg-white/5 transition-all"
                                                            >
                                                                {uploadingGallery ? (
                                                                    <span className="text-[8px] animate-pulse">...</span>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-lg font-black">+</span>
                                                                        <span className="text-[7px] font-black uppercase">Subir</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={handleGalleryUpload}
                                                        />
                                                    </div>
                                                )}

                                                {b.id === 'music_odyssey' && (
                                                    <div className="space-y-4">
                                                        {(currentBlock.config?.songs || []).map((song, idx) => (
                                                            <div key={idx} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest italic">Himno #{idx + 1}</span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Título"
                                                                        value={song.title || ''}
                                                                        onChange={e => {
                                                                            const newSongs = [...currentBlock.config.songs];
                                                                            newSongs[idx] = { ...song, title: e.target.value };
                                                                            setBlocks(blocks.map(bl => bl.block_type === 'music_odyssey' ? { ...bl, config: { ...bl.config, songs: newSongs } } : bl));
                                                                        }}
                                                                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-cyan-500"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Artista"
                                                                        value={song.artist || ''}
                                                                        onChange={e => {
                                                                            const newSongs = [...currentBlock.config.songs];
                                                                            newSongs[idx] = { ...song, artist: e.target.value };
                                                                            setBlocks(blocks.map(bl => bl.block_type === 'music_odyssey' ? { ...bl, config: { ...bl.config, songs: newSongs } } : bl));
                                                                        }}
                                                                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-cyan-500"
                                                                    />
                                                                </div>
                                                                <textarea
                                                                    placeholder="¿Por qué este himno?"
                                                                    value={song.annotation || ''}
                                                                    onChange={e => {
                                                                        const newSongs = [...currentBlock.config.songs];
                                                                        newSongs[idx] = { ...song, annotation: e.target.value };
                                                                        setBlocks(blocks.map(bl => bl.block_type === 'music_odyssey' ? { ...bl, config: { ...bl.config, songs: newSongs } } : bl));
                                                                    }}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white/60 outline-none focus:border-cyan-500 resize-none h-16"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="URL de la carátula (opcional)"
                                                                    value={song.cover || ''}
                                                                    onChange={e => {
                                                                        const newSongs = [...currentBlock.config.songs];
                                                                        newSongs[idx] = { ...song, cover: e.target.value };
                                                                        setBlocks(blocks.map(bl => bl.block_type === 'music_odyssey' ? { ...bl, config: { ...bl.config, songs: newSongs } } : bl));
                                                                    }}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[8px] text-white/40 outline-none focus:border-cyan-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {b.id === 'random_facts' && (
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {(currentBlock.config?.facts || []).map((fact, idx) => (
                                                            <div key={idx} className="flex gap-2">
                                                                <span className="text-[10px] font-black text-emerald-500/50 mt-3 italic">#{idx + 1}</span>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Escribe un dato curioso..."
                                                                    value={fact.text || ''}
                                                                    onChange={e => {
                                                                        const newFacts = [...currentBlock.config.facts];
                                                                        newFacts[idx] = { ...fact, text: e.target.value };
                                                                        setBlocks(blocks.map(bl => bl.block_type === 'random_facts' ? { ...bl, config: { ...bl.config, facts: newFacts } } : bl));
                                                                    }}
                                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] text-white outline-none focus:border-emerald-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {b.id === 'time_capsule' && (
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-white/20 uppercase ml-1">Fecha de Revelación</label>
                                                            <input
                                                                type="date"
                                                                value={currentBlock.config?.reveal_date || ''}
                                                                onChange={e => {
                                                                    setBlocks(blocks.map(bl => bl.block_type === 'time_capsule' ? { ...bl, config: { ...bl.config, reveal_date: e.target.value } } : bl));
                                                                }}
                                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500 [color-scheme:dark]"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-white/20 uppercase ml-1">Mensaje Sellado</label>
                                                            <textarea
                                                                value={currentBlock.config?.message || ''}
                                                                onChange={e => {
                                                                    setBlocks(blocks.map(bl => bl.block_type === 'time_capsule' ? { ...bl, config: { ...bl.config, message: e.target.value } } : bl));
                                                                }}
                                                                placeholder="¿Qué quieres decirle a tu yo del futuro o a tus visitantes?"
                                                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] text-white outline-none focus:border-amber-500 resize-none min-h-[100px]"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Dangerous Zone / Borrar Cuenta */}
                    <section className="pt-8 border-t border-red-500/10 space-y-6">
                        <div className="p-8 rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60 italic flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                Zona Peligrosa (Sistema Central)
                            </h3>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-white/50">Eliminación Permanente de Datos</p>
                                    <p className="text-[10px] text-white/20 uppercase tracking-widest leading-loose">Se borrarán posts, perfil, economía y autenticación de forma irreversible.</p>
                                </div>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-6 py-3 bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    Eliminar cuenta
                                </button>
                            </div>
                        </div>

                        {/* Confirmation Modal */}
                        <AnimatePresence>
                            {showDeleteConfirm && (
                                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="w-full max-w-sm bg-[#0d0d12] border border-red-500/30 rounded-[2.5rem] p-8 space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.1)]"
                                    >
                                        <div className="text-center space-y-4">
                                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                                                <span className="text-3xl">⚠️</span>
                                            </div>
                                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Acción Crítica</h4>
                                            <p className="text-[11px] text-white/40 leading-relaxed">Esta acción no se puede deshacer. Se purgarán todos tus registros del sistema Spacely de forma definitiva.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[9px] font-black text-red-500/60 uppercase tracking-widest block text-center">
                                                Escribe <span className="text-white">BORRAR</span> para confirmar
                                            </label>
                                            <input
                                                type="text"
                                                value={deleteInput}
                                                onChange={e => setDeleteInput(e.target.value)}
                                                placeholder="Confirmación manual..."
                                                className="w-full bg-red-500/5 border border-red-500/20 rounded-2xl px-6 py-4 text-sm text-white text-center outline-none focus:border-red-500 transition-all"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                                                className="flex-1 py-4 text-[10px] font-black uppercase text-white/20 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                disabled={deleteInput !== 'BORRAR' || isDeleting}
                                                onClick={async () => {
                                                    setIsDeleting(true);
                                                    const res = await deleteAccount();
                                                    if (res.success) {
                                                        onClose();
                                                    } else {
                                                        alert('Fallo en el protocolo de purga: ' + res.error);
                                                        setIsDeleting(false);
                                                    }
                                                }}
                                                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${deleteInput === 'BORRAR' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-white/5 text-white/10'}`}
                                            >
                                                {isDeleting ? 'Purgando...' : 'Confirmar'}
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 sm:p-8 border-t border-white/5 bg-black md:bg-black/40 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                        {saving ? 'Sincronizando...' : 'Actualizar Perfil Estelar'}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
