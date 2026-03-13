import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smile, Plus, X, Trash2 } from 'lucide-react';
import { supabase } from "../../supabaseClient";
import toast from 'react-hot-toast';

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

export default function EmojiPicker({ communityId, onSelect, isOwner, userId }) {
  const [emojis, setEmojis] = useState([]);
  const [customEmojis, setCustomEmojis] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (communityId && showPicker) {
      loadCustomEmojis();
    }
  }, [communityId, showPicker]);

  const loadCustomEmojis = async () => {
    try {
      const { data, error } = await supabase
        .from('community_emojis')
        .select('*')
        .eq('community_id', communityId)
        .eq('is_active', true);

      if (error) throw error;
      setCustomEmojis(data || []);
    } catch (err) {
      console.error('[EmojiPicker] Load error:', err);
    }
  };

  const uploadEmoji = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `emoji-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('emojis')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('emojis')
        .getPublicUrl(fileName);

      const emojiName = file.name.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

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

      toast.success('Emoji agregado');
      await loadCustomEmojis();
    } catch (err) {
      toast.error('Error al subir emoji');
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
      toast.success('Emoji eliminado');
      await loadCustomEmojis();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleSelect = (emoji) => {
    onSelect?.(emoji);
    setShowPicker(false);
  };

  if (!showPicker) {
    return (
      <button
        onClick={() => setShowPicker(true)}
        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
      >
        <Smile size={20} />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full mb-2 bg-[#1a1a24] border border-white/10 rounded-xl p-3 shadow-2xl z-50 w-64"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">Emojis</h4>
        <button
          onClick={() => setShowPicker(false)}
          className="p-1 text-gray-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Default Emojis */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        {DEFAULT_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSelect(emoji)}
            className="p-2 hover:bg-white/5 rounded text-2xl transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Custom Emojis */}
      {customEmojis.length > 0 && (
        <>
          <div className="border-t border-white/5 my-2" />
          <p className="text-xs text-gray-500 mb-1">Custom</p>
          <div className="grid grid-cols-4 gap-1">
            {customEmojis.map((emoji) => (
              <div key={emoji.id} className="relative group">
                <button
                  onClick={() => handleSelect(`:${emoji.name}:`)}
                  className="p-2 hover:bg-white/5 rounded transition-colors w-full"
                >
                  <img
                    src={emoji.image_url}
                    alt={emoji.name}
                    className="w-6 h-6 object-contain mx-auto"
                  />
                </button>
                {isOwner && (
                  <button
                    onClick={() => deleteEmoji(emoji.id)}
                    className="absolute -top-1 -right-1 p-1 bg-red-500/20 text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Upload */}
      {isOwner && (
        <>
          <div className="border-t border-white/5 my-2" />
          <label className="flex items-center justify-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors">
            <Plus size={16} className="text-gray-400" />
            <span className="text-xs text-gray-400">
              {uploading ? 'Subiendo...' : 'Agregar emoji'}
            </span>
            <input
              type="file"
              accept="image/*"
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
