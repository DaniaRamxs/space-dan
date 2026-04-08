import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';

export default function PinnedMessages({ channelId, isOwner }) {
  const [pinned, setPinned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (channelId) {
      loadPinned();
    }
  }, [channelId]);

  const loadPinned = async () => {
    try {
      setLoading(true);
      const { data: pins, error } = await supabase
        .from('pinned_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // message_id no tiene FK real, hacemos join manual
      const enriched = await Promise.all((pins || []).map(async (pin) => {
        const { data: msg } = await supabase
          .from('channel_messages')
          .select('id, content, user_id, author:user_id(username, avatar_url)')
          .eq('id', pin.message_id)
          .single();
        return { ...pin, message: msg };
      }));

      setPinned(enriched);
    } catch (err) {
      console.error('[PinnedMessages] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const unpinMessage = async (pinId) => {
    try {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('id', pinId);

      if (error) throw error;
      toast.success('Mensaje desfijado');
      await loadPinned();
    } catch (err) {
      toast.error('Error al desfijar');
    }
  };

  if (loading || pinned.length === 0) return null;

  const displayPins = showAll ? pinned : pinned.slice(0, 1);

  return (
    <div className="bg-yellow-500/5 border-b border-yellow-500/20">
      <AnimatePresence>
        {displayPins.map((pin, index) => (
          <motion.div
            key={pin.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 px-4 py-2"
          >
            <Pin size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 truncate">
                <span className="text-yellow-400 font-medium">{pin.message?.author?.username || pin.message?.user_id || 'Usuario'}:</span>
                {' '}
                {pin.message?.content || 'Mensaje no disponible'}
              </p>
              {pin.reason && (
                <p className="text-xs text-gray-500 mt-0.5">{pin.reason}</p>
              )}
            </div>
            {isOwner && (
              <button
                onClick={() => unpinMessage(pin.id)}
                className="p-1 text-gray-500 hover:text-red-400"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {pinned.length > 1 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-1 text-xs text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/5 transition-colors"
        >
          {showAll ? 'Mostrar menos' : `Ver ${pinned.length - 1} más`}
        </button>
      )}
    </div>
  );
}

// Componente para fijar mensajes (menú contextual)
export function PinMessageButton({ messageId, channelId, isOwner, onPinned }) {
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    checkIfPinned();
  }, [messageId]);

  const checkIfPinned = async () => {
    const { data } = await supabase
      .from('pinned_messages')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle();
    setIsPinned(!!data);
  };

  const togglePin = async () => {
    if (!isOwner) {
      toast.error('Solo el owner puede fijar mensajes');
      return;
    }

    try {
      if (isPinned) {
        await supabase
          .from('pinned_messages')
          .delete()
          .eq('message_id', messageId);
        toast.success('Mensaje desfijado');
      } else {
        await supabase
          .from('pinned_messages')
          .insert({
            channel_id: channelId,
            message_id: messageId,
            pinned_by: (await supabase.auth.getUser()).data.user?.id,
          });
        toast.success('Mensaje fijado');
      }
      setIsPinned(!isPinned);
      onPinned?.();
    } catch (err) {
      toast.error('Error al fijar/desfijar');
    }
  };

  if (!isOwner) return null;

  return (
    <button
      onClick={togglePin}
      className={`p-1.5 rounded ${isPinned ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400 hover:text-white'}`}
      title={isPinned ? 'Desfijar mensaje' : 'Fijar mensaje'}
    >
      <Pin size={14} />
    </button>
  );
}
