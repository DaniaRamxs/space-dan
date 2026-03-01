import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { newProfileService } from '../../services/newProfileService';
import { supabase } from '../../supabaseClient';

export const ThemeConfigModal = ({ isOpen, onClose, userId, currentTheme, currentBlocks, currentProfile, onSave }) => {
    const [theme, setTheme] = useState(currentTheme || {});
    const [blocks, setBlocks] = useState(currentBlocks || []);
    const [moodEmoji, setMoodEmoji] = useState(currentProfile?.mood_emoji || '✨');
    const [moodText, setMoodText] = useState(currentProfile?.mood_text || '');
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all([
                newProfileService.updateProfileTheme(theme),
                newProfileService.updateProfileBlocks(blocks),
                supabase.rpc('set_user_mood', {
                    p_text: moodText,
                    p_emoji: moodEmoji,
                    p_duration_hours: 24 // Default 24h
                })
            ]);
            onSave?.();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const toggleBlock = (type) => {
        const exists = blocks.find(b => b.block_type === type);
        if (exists) {
            setBlocks(blocks.map(b => b.block_type === type ? { ...b, is_active: !b.is_active } : b));
        } else {
            setBlocks([...blocks, { block_type: type, is_active: true, order_index: blocks.length }]);
        }
    };

    const emojis = ['✨', '🌌', '🚀', '🔭', '🛸', '🌑', '🔋', '💤', '🔥', '🎮', '💻', '🧪', '🧠', '🎧', '⚡', '🪐', '👾', '📡'];

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#0a0a0f]">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter">Personalizar Espacio</h2>
                        <p className="text-[8px] sm:text-micro text-white/20 uppercase tracking-widest">Configuración de Identidad Visual</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-12 custom-scrollbar">

                    {/* Mood Section */}
                    <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                            Estado del Orbitador (Mood)
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-4">
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
                            <div className="flex-1 space-y-2">
                                <label className="text-[9px] font-bold text-white/20 uppercase ml-1">Mensaje de Onda</label>
                                <textarea
                                    value={moodText}
                                    onChange={e => setMoodText(e.target.value)}
                                    placeholder="¿Qué energía emites al vacío?..."
                                    maxLength={60}
                                    className="w-full h-full min-h-[80px] bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-cyan-500 transition-all resize-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Colors */}
                    <section className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-violet-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,1)]" />
                            Paleta de Energía (Temas)
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-white/20 uppercase">Aura Primaria</label>
                                <div className="flex gap-3 items-center">
                                    <input type="color" value={theme.primary_color || '#06b6d4'} onChange={e => setTheme({ ...theme, primary_color: e.target.value })} className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-lg" />
                                    <span className="text-[10px] font-mono text-white/40">{theme.primary_color || '#06b6d4'}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-white/20 uppercase">Aura Secundaria</label>
                                <div className="flex gap-3 items-center">
                                    <input type="color" value={theme.secondary_color || '#8b5cf6'} onChange={e => setTheme({ ...theme, secondary_color: e.target.value })} className="w-12 h-12 bg-transparent border-none cursor-pointer rounded-lg" />
                                    <span className="text-[10px] font-mono text-white/40">{theme.secondary_color || '#8b5cf6'}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Blocks Toggle */}
                    <section className="space-y-6 pb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 italic flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]" />
                            Módulos de Realidad
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { id: 'stats', label: 'Métricas Estelares', desc: 'Muestra tu nivel, dancoins y racha.' },
                                { id: 'thought', label: 'Pensamientos rápidos', desc: 'Edita tu frase inspiradora del día.' },
                                { id: 'spotify', label: 'Sincronización Spotify', desc: 'Muestra tu música en tiempo real.' },
                            ].map(b => {
                                const currentBlock = blocks.find(bl => bl.block_type === b.id);
                                const active = currentBlock?.is_active;
                                return (
                                    <div key={b.id} className="space-y-3">
                                        <button
                                            onClick={() => toggleBlock(b.id)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${active ? 'bg-white/5 border-cyan-500/30 ring-1 ring-cyan-500/20' : 'bg-black/20 border-white/5 opacity-50'}`}
                                        >
                                            <div className="text-left">
                                                <div className="text-xs font-black uppercase italic text-white leading-tight">{b.label}</div>
                                                <div className="text-[9px] text-white/30 uppercase tracking-widest leading-none mt-1">{b.desc}</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-4 ${active ? 'bg-cyan-500 border-white/20 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'border-white/10'}`} />
                                        </button>

                                        {/* Thought Config Field */}
                                        {b.id === 'thought' && active && (
                                            <motion.div
                                                initial={{ opacity: 0, scaleY: 0.8 }}
                                                animate={{ opacity: 1, scaleY: 1 }}
                                                className="px-4 pb-2"
                                            >
                                                <textarea
                                                    value={currentBlock?.config?.text || ''}
                                                    onChange={e => {
                                                        const newText = e.target.value;
                                                        setBlocks(blocks.map(bl => bl.block_type === 'thought' ? { ...bl, config: { ...bl.config, text: newText } } : bl));
                                                    }}
                                                    placeholder="Escribe tu pensamiento estelar aquí..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white outline-none focus:border-cyan-500 transition-all resize-none h-20"
                                                />
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 sm:p-8 border-t border-white/5 bg-black md:bg-black/40 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">Cancelar</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-[2] py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                    >
                        {saving ? 'Sincronizando...' : 'Sincronizar Identidad'}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
