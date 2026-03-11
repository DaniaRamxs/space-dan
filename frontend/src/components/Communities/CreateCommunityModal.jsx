/**
 * Create Community Modal
 * Modal for creating a new community
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles } from 'lucide-react';
import { communitiesService } from '../../services/communitiesService';
import { useAuthContext } from '../../contexts/AuthContext';

const CATEGORIES = [
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: 'music', label: 'Música', icon: '🎵' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'art', label: 'Arte', icon: '🎨' },
  { id: 'general', label: 'General', icon: '🌌' }
];

export default function CreateCommunityModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'general',
    avatar: '',
    banner: ''
  });

  const handleNameChange = (name) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const community = await communitiesService.createCommunity(formData);
      onSuccess?.(community);
      onClose();
      
      setFormData({
        name: '',
        slug: '',
        description: '',
        category: 'general',
        avatar: '',
        banner: ''
      });
    } catch (err) {
      console.error('[CreateCommunityModal] Error:', err);
      setError(err.message || 'Error al crear la comunidad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Sparkles size={24} className="text-purple-400" />
                  <h2 className="text-2xl font-black uppercase tracking-tight text-white/90">
                    Crear Comunidad
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} className="text-white/40" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                    Nombre de la Comunidad *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej: Gamers de Spacely"
                    required
                    maxLength={50}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-white/30 focus:border-purple-500/30 focus:outline-none transition-all"
                  />
                </div>

                {/* Slug (auto-generated) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                    URL de la Comunidad
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">joinspacely.com/community/</span>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="slug-de-comunidad"
                      required
                      pattern="[a-z0-9-]+"
                      className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder:text-white/30 focus:border-purple-500/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe tu comunidad..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-white/30 focus:border-purple-500/30 focus:outline-none transition-all resize-none"
                  />
                  <p className="text-[10px] text-white/30 mt-1">
                    {formData.description.length}/200 caracteres
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-3">
                    Categoría *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                        className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                          formData.category === cat.id
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60'
                        }`}
                      >
                        <span className="mr-2">{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar URL (optional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                    Avatar URL (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.avatar}
                      onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-xs text-white placeholder:text-white/30 focus:border-purple-500/30 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      className="px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-all"
                      title="Subir imagen"
                    >
                      <Upload size={16} className="text-white/40" />
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl text-sm font-bold text-white/60 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formData.name || !formData.slug}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 hover:from-purple-500/30 hover:to-cyan-500/30 border border-purple-500/30 rounded-xl text-sm font-bold text-purple-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creando...' : 'Crear Comunidad'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
