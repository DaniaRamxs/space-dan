import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Trash2 } from 'lucide-react';
import { supabase } from "../../supabaseClient";
import toast from 'react-hot-toast';

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

// EmojiPicker siempre muestra su contenido cuando se renderiza.
// TextChannel controla la visibilidad con su propio estado.
export default function EmojiPicker({ communityId, onSelect, isOwner, userId, onClose }) {
  const [customEmojis, setCustomEmojis] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (communityId) loadCustomEmojis();
  }, [communityId]);

  const loadCustomEmojis = async () => {
    try {
      const { data, error } = await supabase
        .from('community_emojis')
        .select('*')
        .eq('community_id', communityId);

      if (error) throw error;
      // Filtrar en JS: excluir solo los explícitamente desactivados
      setCustomEmojis((data || []).filter(e => e.is_active !== false));
    } catch (err) {
      console.error('[EmojiPicker] Load error:', err);
    }
  };

  const uploadEmoji = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 256KB)
    if (file.size > 256 * 1024) {
      toast.error('El emoji debe pesar menos de 256KB');
      return;
    }

    // Nombre del emoji: nombre del archivo sin extensión, solo alfanumérico
    const rawName = file.name.replace(/\.[^.]+$/, '');
    const emojiName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32) || `emoji${Date.now()}`;

    // Verificar si el nombre ya existe en la comunidad
    const existing = customEmojis.find(e => e.name === emojiName);
    if (existing) {
      toast.error(`Este nombre de emoji ya existe en la comunidad: :${emojiName}:`);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${communityId}/emoji-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('emojis')
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('emojis')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('community_emojis')
        .insert({
          community_id: communityId,
          name: emojiName,
          image_url: publicUrl,
          created_by: userId,
          is_active: true
        });

      if (insertError) throw insertError;

      toast.success(`Emoji :${emojiName}: agregado`);
      await loadCustomEmojis();
      // Reset input
      e.target.value = '';
    } catch (err) {
      console.error('[EmojiPicker] Upload error:', err);
      toast.error(err.message || 'Error al subir emoji');
    } finally {
      setUploading(false);
    }
  };

  const deleteEmoji = async (emojiId) => {
    try {
      const { error } = await supabase
        .from('community_emojis')
        .update({ is_active: false })
        .eq('id', emojiId);

      if (error) throw error;
      setCustomEmojis(prev => prev.filter(e => e.id !== emojiId));
      toast.success('Emoji eliminado');
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a1a24] border border-white/10 rounded-xl p-3 shadow-2xl w-72"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">Emojis</h4>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Emojis por defecto */}
      <div className="grid grid-cols-8 gap-0.5 mb-2">
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect?.(emoji)}
            className="p-1.5 hover:bg-white/5 rounded text-xl transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Emojis custom */}
      {customEmojis.length > 0 && (
        <>
          <div className="border-t border-white/5 my-2" />
          <p className="text-xs text-gray-500 mb-1">Custom ({customEmojis.length})</p>
          <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto">
            {customEmojis.map((emoji) => (
              <div key={emoji.id} className="relative group">
                <button
                  onClick={() => onSelect?.(`:${emoji.name}:`)}
                  className="p-1.5 hover:bg-white/5 rounded transition-colors w-full"
                  title={`:${emoji.name}:`}
                >
                  <img
                    src={emoji.image_url}
                    alt={emoji.name}
                    className="w-7 h-7 object-contain mx-auto"
                    onError={(e) => { e.target.style.opacity = '0.3'; }}
                  />
                </button>
                {isOwner && (
                  <button
                    onClick={() => deleteEmoji(emoji.id)}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={8} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upload — solo owners */}
      {isOwner && (
        <>
          <div className="border-t border-white/5 my-2" />
          <label className={`flex items-center justify-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}>
            <Plus size={14} className="text-cyan-400" />
            <span className="text-xs text-cyan-400">
              {uploading ? 'Subiendo...' : 'Agregar emoji (máx 256KB)'}
            </span>
            <input
              type="file"
              accept="image/png,image/gif,image/webp,image/jpeg"
              onChange={uploadEmoji}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </>
      )}
    </motion.div>
  );
}
