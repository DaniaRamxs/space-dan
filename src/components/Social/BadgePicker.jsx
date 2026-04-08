import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, RefreshCcw, Sparkles } from 'lucide-react';
import ChatBadge from './ChatBadge';
import { supabase } from '../../supabaseClient';
import { useAuthContext } from '../../contexts/AuthContext';

const PRESET_COLORS = [
    '#7c3aed', '#06b6d4', '#f59e0b', '#ef4444',
    '#10b981', '#ec4899', '#ffffff', '#3b82f6',
    '#00ffdc', '#ff0055', '#71717a', '#fb7185'
];

export default function BadgePicker({ onClose, onUpdate }) {
    const { user, profile } = useAuthContext();
    const [color, setColor] = useState(profile?.badge_color || '#7c3aed');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleSave = async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('set_badge_color', {
            p_user_id: user.id,
            p_color: color
        });

        if (error || !data?.success) {
            setStatus({ type: 'error', text: 'Error al actualizar.' });
        } else {
            setStatus({ type: 'success', text: 'Badge actualizado ✨' });
            onUpdate?.(color);
            setTimeout(onClose, 1500);
        }
        setLoading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#0a0a15] border border-white/10 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 border-b border-white/5 flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                        <Palette size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tighter">Diseñar Insignia</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Personaliza tu indentidad</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Preview */}
                    <div className="flex flex-col items-center justify-center gap-6">
                        <ChatBadge
                            badge={profile?.equipped_badge}
                            color={color}
                            size={32}
                        />
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/60">
                            {color.toUpperCase()}
                        </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-6 gap-2">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-full aspect-square rounded-lg border-2 transition-all ${color === c ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    {/* Custom Hex */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Color Hexadecimal</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm uppercase outline-none focus:border-purple-500/50"
                                placeholder="#RRGGBB"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                        </div>
                    </div>

                    <AnimatePresence>
                        {status && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`text-center text-[10px] font-black uppercase tracking-widest ${status.type === 'success' ? 'text-green-400' : 'text-rose-400'}`}
                            >
                                {status.text}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 py-3 bg-purple-500 hover:bg-purple-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Aplicar'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
