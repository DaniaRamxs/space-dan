import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Archive, MoreVertical } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function ThreadPanel({ threadId, onClose, userId }) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (threadId) {
      loadThread();
      subscribeToMessages();
    }
  }, [threadId]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const { data: threadData, error: threadError } = await supabase
        .from('channel_threads')
        .select('*, author:author_id(*)')
        .eq('id', threadId)
        .single();

      if (threadError) throw threadError;
      setThread(threadData);

      const { data: messagesData, error: messagesError } = await supabase
        .from('thread_messages')
        .select('*, author:user_id(*)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (err) {
      console.error('[ThreadPanel] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'thread_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('thread_messages')
        .insert({
          thread_id: threadId,
          user_id: userId,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      toast.error('Error al enviar mensaje');
    }
  };

  const archiveThread = async () => {
    try {
      const { error } = await supabase
        .from('channel_threads')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', threadId);

      if (error) throw error;
      toast.success('Thread archivado');
      onClose();
    } catch (err) {
      toast.error('Error al archivar');
    }
  };

  if (loading) {
    return (
      <div className="w-80 border-l border-white/5 bg-[#0f0f13] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-white/5 bg-[#0f0f13] flex flex-col">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-cyan-400" />
          <div>
            <h3 className="font-semibold text-white text-sm truncate">{thread?.title}</h3>
            <p className="text-xs text-gray-500">{messages.length} mensajes</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={archiveThread}
            className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-white/5 rounded-lg"
            title="Archivar thread"
          >
            <Archive size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No hay mensajes en este thread
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <img
                src={msg.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username}`}
                alt={msg.author?.username}
                className="w-6 h-6 rounded-full bg-white/5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-white">{msg.author?.username}</span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Responder en thread..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-lg text-cyan-950"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

// Botón para crear thread desde un mensaje
export function CreateThreadButton({ messageId, channelId, userId, onThreadCreated }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const createThread = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('channel_threads')
        .insert({
          channel_id: channelId,
          author_id: userId,
          title: title.trim(),
          message_id: messageId
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Thread creado');
      setShowModal(false);
      onThreadCreated?.(data.id);
    } catch (err) {
      toast.error('Error al crear thread');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/5 rounded"
        title="Crear thread"
      >
        <MessageSquare size={14} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1a1a24] border border-white/10 rounded-xl p-6"
          >
            <h3 className="font-bold text-white mb-4">Crear Thread</h3>
            <form onSubmit={createThread}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del thread..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-white/5 text-gray-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || creating}
                  className="flex-1 py-2 bg-cyan-500 text-cyan-950 rounded-lg font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
