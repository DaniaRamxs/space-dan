import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, Volume2, MessageSquare, Plus, Settings, ChevronDown, ChevronRight,
  MoreVertical, Edit2, Trash2, Lock, Unlock
} from 'lucide-react';
import { channelsService } from '../../services/channelsService';
import toast from 'react-hot-toast';

const CHANNEL_ICONS = {
  text: Hash,
  voice: Volume2,
  forum: MessageSquare,
};

const CHANNEL_COLORS = {
  text: 'text-gray-400',
  voice: 'text-emerald-400',
  forum: 'text-amber-400',
};

export default function ChannelSidebar({
  communityId,
  currentChannel,
  onChannelSelect,
  isOwner,
  user,
  isMobileOpen,
  onMobileClose,
  activeVoiceChannelId,
}) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({ text: true, voice: true, forum: true });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const loadChannels = useCallback(async () => {
    if (!communityId) return;
    try {
      setLoading(true);
      const data = await channelsService.getCommunityChannels(communityId);
      setChannels(data);
    } catch (err) {
      console.error('[ChannelSidebar] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const groupedChannels = channels.reduce((acc, channel) => {
    if (!acc[channel.type]) acc[channel.type] = [];
    acc[channel.type].push(channel);
    return acc;
  }, {});

  const handleCreateChannel = async ({ name, type, description }) => {
    try {
      const newChannel = await channelsService.createChannel({
        communityId,
        name,
        type,
        description,
      });
      setChannels(prev => [...prev, newChannel]);
      onChannelSelect(newChannel);
      setShowCreateModal(false);
      toast.success('Canal creado');
    } catch (err) {
      console.error('[ChannelSidebar] Create error:', err);
      toast.error('Error al crear canal');
    }
  };

  const handleUpdateChannel = async (channelId, updates) => {
    try {
      const updated = await channelsService.updateChannel(channelId, updates);
      setChannels(prev => prev.map(c => c.id === channelId ? updated : c));
      setChannelToEdit(null);
      toast.success('Canal actualizado');
    } catch (err) {
      console.error('[ChannelSidebar] Update error:', err);
      toast.error('Error al actualizar canal');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!confirm('¿Eliminar este canal permanentemente?')) return;
    try {
      await channelsService.deleteChannel(channelId);
      setChannels(prev => prev.filter(c => c.id !== channelId));
      if (currentChannel?.id === channelId) {
        const remaining = channels.filter(c => c.id !== channelId);
        onChannelSelect(remaining[0] || null);
      }
      setContextMenu(null);
      toast.success('Canal eliminado');
    } catch (err) {
      console.error('[ChannelSidebar] Delete error:', err);
      toast.error('Error al eliminar canal');
    }
  };

  const toggleCategory = (type) => {
    setExpandedCategories(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const ChannelItem = ({ channel }) => {
    const Icon = CHANNEL_ICONS[channel.type];
    const isActive = currentChannel?.id === channel.id;
    const isPrivate = channel.is_private;
    const isVoiceConnected = channel.type === 'voice' && activeVoiceChannelId === channel.id;

    return (
      <motion.button
        whileHover={{ x: 2 }}
        onClick={() => {
          onChannelSelect(channel);
          onMobileClose?.();
        }}
        onContextMenu={(e) => {
          if (!isOwner) return;
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY, channel });
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all group ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        <Icon size={16} className={isActive ? 'text-white' : CHANNEL_COLORS[channel.type]} />
        <span className="flex-1 text-left truncate">{channel.name}</span>
        {isVoiceConnected && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Conectado" />
        )}
        {isPrivate && <Lock size={12} className="text-gray-500" />}
        {isOwner && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY, channel });
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </motion.button>
    );
  };

  const CategoryHeader = ({ type, label, icon: Icon }) => (
    <button
      onClick={() => toggleCategory(type)}
      className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
    >
      {expandedCategories[type] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      <span className="flex-1 text-left">{label}</span>
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCreateModal({ type });
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-opacity"
        >
          <Plus size={14} />
        </button>
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="w-full h-full bg-[#1a1a24] border-r border-white/5 p-3 space-y-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-24 bg-white/5 rounded" />
          <div className="h-8 w-full bg-white/5 rounded" />
          <div className="h-8 w-full bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full bg-[#1a1a24] border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <h2 className="font-bold text-white/90">Canales</h2>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Text Channels */}
          <div className="space-y-0.5">
            <CategoryHeader type="text" label="Texto" icon={Hash} />
            <AnimatePresence>
              {expandedCategories.text && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-0.5 overflow-hidden"
                >
                  {groupedChannels.text?.map(channel => (
                    <ChannelItem key={channel.id} channel={channel} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Voice Channels */}
          <div className="space-y-0.5">
            <CategoryHeader type="voice" label="Voz" icon={Volume2} />
            <AnimatePresence>
              {expandedCategories.voice && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-0.5 overflow-hidden"
                >
                  {groupedChannels.voice?.map(channel => (
                    <ChannelItem key={channel.id} channel={channel} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Forum Channels */}
          <div className="space-y-0.5">
            <CategoryHeader type="forum" label="Foros" icon={MessageSquare} />
            <AnimatePresence>
              {expandedCategories.forum && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-0.5 overflow-hidden"
                >
                  {groupedChannels.forum?.map(channel => (
                    <ChannelItem key={channel.id} channel={channel} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Create Channel Button (Owner only) */}
        {isOwner && (
          <div className="p-3 border-t border-white/5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-all"
            >
              <Plus size={16} />
              Crear canal
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-[#12121a] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          <button
            onClick={() => setChannelToEdit(contextMenu.channel)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            <Edit2 size={14} />
            Editar
          </button>
          <button
            onClick={() => handleDeleteChannel(contextMenu.channel.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      )}

      {/* Create/Edit Channel Modal */}
      {(showCreateModal || channelToEdit) && (
        <ChannelModal
          isOpen={true}
          onClose={() => {
            setShowCreateModal(false);
            setChannelToEdit(null);
          }}
          onSubmit={channelToEdit 
            ? (updates) => handleUpdateChannel(channelToEdit.id, updates)
            : handleCreateChannel
          }
          initialData={channelToEdit}
          defaultType={showCreateModal?.type}
        />
      )}
    </>
  );
}

function ChannelModal({ isOpen, onClose, onSubmit, initialData, defaultType }) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || defaultType || 'text');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isPrivate, setIsPrivate] = useState(initialData?.is_private || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (initialData) {
      onSubmit({ name: name.trim(), description, is_private: isPrivate });
    } else {
      onSubmit({ name: name.trim(), type, description, is_private: isPrivate });
    }
  };

  const typeOptions = [
    { value: 'text', label: 'Texto', icon: Hash, description: 'Chat de texto normal' },
    { value: 'voice', label: 'Voz', icon: Volume2, description: 'Sala de voz' },
    { value: 'forum', label: 'Foro', icon: MessageSquare, description: 'Discusiones tipo Reddit' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#1a1a24] border border-white/10 rounded-2xl p-6 shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-1">
          {initialData ? 'Editar canal' : 'Crear canal'}
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          {initialData ? 'Modifica la configuración del canal' : 'Agrega un nuevo canal a tu comunidad'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type */}
          {!initialData && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tipo de canal</label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      type === option.value
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <option.icon size={20} />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channel Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Nombre del canal</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'text' ? 'general' : type === 'voice' ? 'Sala General' : 'Preguntas'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Descripción (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿De qué trata este canal?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              {isPrivate ? <Lock size={18} className="text-gray-400" /> : <Unlock size={18} className="text-gray-400" />}
              <div>
                <p className="text-sm font-medium text-gray-300">Canal privado</p>
                <p className="text-xs text-gray-500">Solo ciertos roles pueden acceder</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                isPrivate ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                isPrivate ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 font-medium transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-cyan-950 font-medium transition-all"
            >
              {initialData ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
