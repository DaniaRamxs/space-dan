import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Send, Smile, Hash, MoreVertical,
  Reply, Trash2, Pin
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { chatService } from '../../services/chatService';
import { botCommandService } from '../../services/botCommandService';
import { supabase } from '../../supabaseClient';
import ReputationBadge from '../Reputation/ReputationBadge';
import EmojiPicker from './EmojiPicker';
import MessageRenderer from './MessageRenderer';
import toast from 'react-hot-toast';

export default function TextChannel({ channel, communityId, isMember, isOwner }) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!channel?.id) return;
    setLoading(true);
    try {
      const msgs = await chatService.getChannelMessages(channel.id, 50);
      setMessages(msgs);
    } catch (err) {
      console.error('[TextChannel] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [channel?.id]);

  useEffect(() => {
    loadMessages();
    
    const subscription = supabase
      .channel(`channel-${channel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_messages',
        filter: `channel_id=eq.${channel.id}`
      }, handleNewMessage)
      .subscribe();

    return () => subscription.unsubscribe();
  }, [channel?.id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewMessage = async (payload) => {
    const newMsg = payload.new;
    if (messages.some(m => m.id === newMsg.id)) return;
    
    const { data: author } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newMsg.user_id)
      .single();

    setMessages(prev => [...prev, { ...newMsg, author }]);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending || !isMember) return;

    setSending(true);
    const content = newMessage.trim();
    
    // Check if it's a bot command
    if (botCommandService.isBotCommand(content)) {
      try {
        // Execute bot command
        const result = await botCommandService.executeCommand(content, communityId, user?.id);
        
        if (result.isBotCommand) {
          // Add bot response as a message
          const botMessage = {
            id: `bot-${Date.now()}`,
            content: result.result,
            user_id: 'bot-chimu',
            author: {
              id: 'bot-chimu',
              username: 'ChimuBot 🕊️',
              avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chimu',
              is_bot: true
            },
            created_at: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, botMessage]);
          setNewMessage('');
          setSending(false);
          return;
        }
      } catch (err) {
        console.error('[TextChannel] Bot command error:', err);
        toast.error('Error en comando');
        setSending(false);
        return;
      }
    }

    // Regular message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content,
      user_id: user?.id,
      author: {
        id: user?.id,
        username: user?.username || user?.email?.split('@')[0] || 'Usuario',
        avatar_url: user?.avatar_url,
        reputation: user?.reputation
      },
      created_at: new Date().toISOString(),
      reply_to_id: replyingTo?.id,
      reply_to: replyingTo,
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setReplyingTo(null);

    try {
      await chatService.sendChannelMessage({
        channelId: channel.id,
        content,
        replyToId: replyingTo?.id,
      });
    } catch (err) {
      console.error('[TextChannel] Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await supabase.from('channel_messages').delete().eq('id', messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      toast.error('Error al eliminar mensaje');
    }
  };

  const handleEmojiSelect = (emoji) => {
    const cursorPosition = inputRef.current?.selectionStart || newMessage.length;
    const newText = newMessage.slice(0, cursorPosition) + emoji + newMessage.slice(cursorPosition);
    setNewMessage(newText);
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#0f0f13]">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-48 bg-white/5 rounded" />
            <div className="h-4 w-32 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13]">
      {/* Channel Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Hash size={20} className="text-gray-500" />
          <div>
            <h3 className="font-semibold text-white">{channel?.name}</h3>
            <p className="text-xs text-gray-500">{channel?.description || 'Chat de texto'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Pin size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Hash size={32} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Bienvenido a #{channel?.name}
            </h3>
            <p className="text-gray-500 text-sm max-w-md">
              Este es el inicio del canal. ¡Envía un mensaje para empezar la conversación!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.user_id === user?.id;
            const prevMsg = messages[index - 1];
            const isGrouped = prevMsg && prevMsg.user_id === msg.user_id && 
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;

            return (
              <div key={msg.id} className={`group ${isGrouped ? 'mt-0.5' : 'mt-4'}`}>
                {!isGrouped && (
                  <div className="flex items-start gap-3">
                    <img
                      src={msg.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username}`}
                      alt={msg.author?.username}
                      className="w-10 h-10 rounded-full bg-white/5 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-white hover:underline cursor-pointer">
                          {msg.author?.username || 'Anónimo'}
                        </span>
                        <ReputationBadge points={msg.author?.reputation?.points || 0} size="sm" />
                        <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                      </div>
                      <MessageRenderer content={msg.content} communityId={communityId} />
                      {msg.reply_to && (
                        <div className="mt-1 text-xs text-gray-500 bg-white/5 rounded px-2 py-1">
                          <span className="text-cyan-400">Respondiendo a {msg.reply_to.author?.username}:</span>
                          <span className="ml-1 truncate">{msg.reply_to.content?.substring(0, 50)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {isGrouped && (
                  <div className="flex group-hover:bg-white/[0.02] rounded py-0.5 -ml-2 pl-2">
                    <span className="w-10 text-right text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mr-3">
                      {formatTime(msg.created_at)}
                    </span>
                    <div className="flex-1">
                      <MessageRenderer content={msg.content} communityId={communityId} />
                    </div>
                  </div>
                )}

                {/* Message Actions */}
                <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-lg -mt-6 mr-2">
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/5 rounded"
                    title="Responder"
                  >
                    <Reply size={16} />
                  </button>
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="mb-2 px-3 py-2 bg-white/5 rounded-t-lg border-l-2 border-cyan-500 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-cyan-400">Respondiendo a {replyingTo.author?.username}</span>
              <span className="text-gray-500 ml-2 truncate">{replyingTo.content?.substring(0, 60)}...</span>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {!isMember ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-gray-400">Únete a la comunidad para participar en el chat</p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative">
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <EmojiPicker
                  communityId={communityId}
                  onSelect={handleEmojiSelect}
                  isOwner={isOwner}
                  userId={user?.id}
                />
              </div>
            )}
            
            <div className="flex items-end gap-1 sm:gap-2 bg-[#1a1a24] border border-white/10 rounded-xl p-2 focus-within:border-cyan-500/50 transition-colors">
              {/* Mobile: Compact buttons */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Emojis"
              >
                <Smile size={18} className="sm:w-5 sm:h-5" />
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Mensaje #${channel?.name}`}
                disabled={sending}
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 sm:py-2 text-sm sm:text-base text-white placeholder:text-gray-500 outline-none"
              />
              
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-1.5 sm:p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-cyan-950 transition-colors"
              >
                <Send size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
