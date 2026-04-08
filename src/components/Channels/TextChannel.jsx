import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Send, Smile, Hash, MoreVertical,
  Reply, Trash2, Pin, X, BarChart2, Plus, Check
} from 'lucide-react';
import PinnedMessages, { PinMessageButton } from './PinnedMessages';
import { useAuthContext } from '../../contexts/AuthContext';
import { chatService } from '../../services/chatService';
import { botCommandService } from '../../services/botCommandService';
import { channelsService } from '../../services/channelsService';
import { supabase } from '../../supabaseClient';
import { addMessagePoints } from '../../services/reputationService';
import ReputationBadge from '../Reputation/ReputationBadge';
import EmojiPicker from './EmojiPicker';
import { MessageRendererWithEmojis, parseMessageContent } from './MessageRenderer';
import BotEmbed from './BotEmbed';
import toast from 'react-hot-toast';

// Bot messages now persist to database

// ─── Poll: Modal de creación ───────────────────────────────────────────────
function PollCreateModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState(['', '']);
  const [saving, setSaving]     = useState(false);

  const addOption = () => options.length < 6 && setOptions(o => [...o, '']);
  const setOption = (i, v) => setOptions(o => o.map((x, j) => j === i ? v : x));
  const removeOption = (i) => options.length > 2 && setOptions(o => o.filter((_, j) => j !== i));

  const handleCreate = async () => {
    const q = question.trim();
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return toast.error('Necesitas una pregunta y al menos 2 opciones');
    setSaving(true);
    try {
      await onCreate({ question: q, options: opts });
      onClose();
    } catch (err) {
      console.error('[PollCreateModal] Error:', err);
      toast.error('Error al crear encuesta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="absolute bottom-full left-0 mb-2 z-50 w-80 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl p-4"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
          <BarChart2 size={14} className="text-indigo-400" />
          Nueva encuesta
        </span>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="¿Qué quieres preguntar?"
        maxLength={200}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 mb-3"
        autoFocus
      />

      <div className="space-y-2 mb-3">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              value={opt}
              onChange={e => setOption(i, e.target.value)}
              placeholder={`Opción ${i + 1}`}
              maxLength={100}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        {options.length < 6 ? (
          <button
            onClick={addOption}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Plus size={12} /> Añadir opción
          </button>
        ) : <span />}
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Creando…' : 'Crear encuesta'}
        </button>
      </div>
    </div>
  );
}

// ─── Poll: Embed en mensajes ───────────────────────────────────────────────
function PollEmbed({ pollId, communityId, userId }) {
  const [poll, setPoll]   = useState(null);
  const [votes, setVotes] = useState([]);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!pollId) return;
    Promise.all([
      channelsService.getPoll(pollId),
      channelsService.getPollVotes(pollId),
    ]).then(([p, v]) => { setPoll(p); setVotes(v); }).catch(console.error);
  }, [pollId]);

  const myVote = votes.find(v => v.user_id === userId)?.option_id;
  const total  = votes.length;

  const handleVote = async (optionId) => {
    if (voting || poll?.is_closed || myVote === optionId) return;
    setVoting(true);
    try {
      await channelsService.votePoll(pollId, userId, optionId);
      const updated = await channelsService.getPollVotes(pollId);
      setVotes(updated);
    } catch (err) {
      toast.error('Error al votar');
    } finally {
      setVoting(false);
    }
  };

  if (!poll) return <div className="h-4 w-32 bg-white/5 rounded animate-pulse mt-1" />;

  const closed = poll.is_closed || (poll.ends_at && new Date(poll.ends_at) < new Date());

  return (
    <div className="mt-2 bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3 max-w-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart2 size={13} className="text-indigo-400" />
        <span className="text-xs font-semibold text-indigo-300">Encuesta</span>
        {closed && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded ml-auto">Cerrada</span>}
      </div>
      <p className="text-sm text-white font-medium mb-3">{poll.question}</p>
      <div className="space-y-2">
        {(poll.options || []).map(opt => {
          const count  = votes.filter(v => v.option_id === opt.id).length;
          const pct    = total > 0 ? Math.round((count / total) * 100) : 0;
          const isMyVote = myVote === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={closed || voting || !userId}
              className={`w-full text-left relative overflow-hidden rounded-lg border transition-colors ${
                isMyVote
                  ? 'border-indigo-500/60 bg-indigo-500/10'
                  : 'border-white/10 hover:border-indigo-500/40 hover:bg-white/5'
              } disabled:cursor-not-allowed`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-indigo-500/10 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2">
                <span className={`text-xs ${isMyVote ? 'text-indigo-300 font-semibold' : 'text-gray-300'}`}>
                  {opt.text}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isMyVote && <Check size={11} className="text-indigo-400" />}
                  <span className="text-[11px] text-gray-400">{pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-600 mt-2">{total} {total === 1 ? 'voto' : 'votos'}</p>
    </div>
  );
}

// Helper component for optimistic messages with pre-rendered emojis
function OptimisticMessageRenderer({ content, emojis, preRenderedParts }) {
  if (preRenderedParts) {
    // Use pre-rendered parts for immediate display
    return (
      <p className="text-gray-200 whitespace-pre-wrap break-words">
        {preRenderedParts.map((part, index) => {
          if (part.type === 'emoji') {
            return (
              <img
                key={`${part.name}-${index}`}
                src={part.imageUrl}
                alt={`:${part.name}:`}
                className="inline-block w-5 h-5 object-contain align-text-bottom mx-0.5"
                title={`:${part.name}:`}
                loading="lazy"
              />
            );
          }
          return <span key={index}>{part.content}</span>;
        })}
      </p>
    );
  }
  
  // Fallback to normal renderer
  return <MessageRendererWithEmojis content={content} emojis={emojis} />;
}

export default function TextChannel({ channel, communityId, isMember, isOwner }) {
  const { user, profile } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmojis, setCustomEmojis] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [pinnedKey, setPinnedKey] = useState(0);
  const [showPollModal, setShowPollModal] = useState(false);
  const [memberSignatures, setMemberSignatures] = useState({}); // userId → signature
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef([]);

  // Keep ref in sync so handleNewMessage always reads current state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  // Load signatures for members visible in messages
  useEffect(() => {
    if (!communityId || messages.length === 0) return;
    const userIds = [...new Set(
      messages.filter(m => !m.is_bot && m.user_id).map(m => m.user_id)
    )];
    if (userIds.length === 0) return;

    supabase
      .from('community_member_passports')
      .select('user_id, signature')
      .eq('community_id', communityId)
      .in('user_id', userIds)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach(r => { if (r.signature) map[r.user_id] = r.signature; });
        setMemberSignatures(prev => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [communityId, messages.length]);  // only re-run when message count changes

  const handleCreatePoll = useCallback(async ({ question, options }) => {
    if (!channel?.id || !communityId || !user?.id) return;
    const poll = await channelsService.createPoll({
      channelId: channel.id,
      communityId,
      creatorId: user.id,
      question,
      options,
    });
    // Insert message with poll_id reference
    await supabase.from('channel_messages').insert({
      channel_id: channel.id,
      user_id: user.id,
      content: `📊 ${question}`,
      poll_id: poll.id,
    });
  }, [channel?.id, communityId, user?.id]);

  // Load custom emojis once for all messages
  useEffect(() => {
    if (!communityId) return;
    
    const loadEmojis = async () => {
      try {
        const { data, error } = await supabase
          .from('community_emojis')
          .select('*')
          .eq('community_id', communityId);
        
        if (error) throw error;
        const active = (data || []).filter(e => e.is_active !== false);
        setCustomEmojis(active);
        console.log('[TextChannel] CUSTOM EMOJIS:', active.map(e => ({ name: e.name, image_url: e.image_url })));
      } catch (err) {
        console.error('[TextChannel] Emoji load error:', err);
      }
    };
    
    loadEmojis();
  }, [communityId]);

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

  const handleNewMessage = useCallback(async (payload) => {
    const newMsg = payload.new;
    const current = messagesRef.current;

    // Skip if already exists (uses ref, never stale)
    if (current.some(m => m.id === newMsg.id)) return;

    // Check if there's a temp message to replace
    const tempMsgIndex = current.findIndex(m =>
      m.user_id === newMsg.user_id &&
      m.content === newMsg.content &&
      String(m.id).startsWith('temp-')
    );

    const { data: author } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', newMsg.user_id)
      .single();

    if (tempMsgIndex !== -1) {
      setMessages(prev => {
        // Re-find temp index in latest state (prev may differ from ref)
        const idx = prev.findIndex(m =>
          m.user_id === newMsg.user_id &&
          m.content === newMsg.content &&
          String(m.id).startsWith('temp-')
        );
        if (idx === -1) {
          // Temp was already replaced; add only if not present
          return prev.some(m => m.id === newMsg.id) ? prev : [...prev, { ...newMsg, author }];
        }
        const updated = [...prev];
        updated[idx] = { ...newMsg, author };
        return updated;
      });
      return;
    }

    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      return [...prev, { ...newMsg, author }];
    });
  }, []);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending || !isMember) return;

    setSending(true);
    const content = newMessage.trim();
    
    // Check if it's a bot command
    if (botCommandService.isBotCommand(content)) {
      try {
        // Execute bot command
        const result = await botCommandService.executeCommand(content, communityId, user?.id, profile);
        
        if (result.isBotCommand) {
          const rawContent = result.result || result.message || 'Bot response';
          const botContent = typeof rawContent === 'object' ? JSON.stringify(rawContent) : rawContent;
          const { botName } = botCommandService.parseCommand(content);
          const BOT_LABELS = {
            welcome: 'WelcomeBot 👋',
            chimu: 'ChimuBot 🕊️',
            poll: 'PollBot 📊',
            announce: 'AnnounceBot 📢',
            rules: 'RulesBot 📜',
          };
          const botLabel = result.botName || BOT_LABELS[botName] || `${botName}Bot 🤖`;
          const botAvatarSeed = { chimu: 'chimu-bird', welcome: 'welcome-space', poll: 'poll-chart', announce: 'announce-megaphone', rules: 'rules-book' }[botName] || 'generic-bot';

          // Save bot response to database so it persists
          try {
            const { data: savedBotMsg, error: botError } = await supabase
              .from('channel_messages')
              .insert({
                channel_id: channel.id,
                user_id: user?.id,
                content: botContent,
                is_bot: true,
                bot_name: botLabel,
              })
              .select()
              .single();
            
            if (botError) throw botError;
            
            // Add to local state with author info
            const botMessage = {
              ...savedBotMsg,
              author: {
                id: user?.id,
                username: botLabel,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${botAvatarSeed}`,
                is_bot: true
              },
            };

            setMessages(prev => [...prev, botMessage]);
          } catch (botSaveErr) {
            console.error('[TextChannel] Error saving bot message:', botSaveErr);
            // Fallback: just show locally without saving
            const botMessage = {
              id: `bot-${Date.now()}`,
              content: botContent,
              is_bot: true,
              bot_name: botLabel,
              user_id: 'bot-chimu',
              author: {
                id: 'bot-chimu',
                username: botLabel,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${botAvatarSeed}`,
                is_bot: true
              },
              created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, botMessage]);
          }
          
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
        username: profile?.username || 'Usuario',
        avatar_url: profile?.avatar_url,
        reputation: profile?.reputation
      },
      created_at: new Date().toISOString(),
      reply_to_id: replyingTo?.id,
      reply_to: replyingTo,
      _preRenderedParts: parseMessageContent(content, customEmojis), // Pre-render emojis for immediate display
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
      // Sumar puntos de reputación en la comunidad (fire-and-forget)
      if (communityId && user?.id) {
        addMessagePoints(user.id, communityId).catch(() => {});
      }
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
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#0f0f13]">
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
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#0f0f13]">
      {/* Channel Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Hash size={20} className="text-gray-500" />
          <div>
            <h3 className="font-semibold text-white">{channel?.name}</h3>
            <p className="text-xs text-gray-500">{channel?.description || 'Chat de texto'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowPinned(v => !v)}
            className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${showPinned ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}
            title="Mensajes fijados"
          >
            <Pin size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowChannelMenu(v => !v)}
              className={`p-2 hover:bg-white/5 rounded-lg transition-colors ${showChannelMenu ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              title="Opciones del canal"
            >
              <MoreVertical size={18} />
            </button>
            {showChannelMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl z-50 py-1">
                <button
                  onClick={() => { setShowPinned(true); setShowChannelMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-colors"
                >
                  <Pin size={14} className="text-yellow-400" />
                  Ver mensajes fijados
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Messages Panel */}
      {showPinned && (
        <div className="relative">
          <button
            onClick={() => setShowPinned(false)}
            className="absolute right-2 top-2 p-1 text-gray-500 hover:text-white z-10"
            title="Cerrar"
          >
            <X size={14} />
          </button>
          <PinnedMessages key={pinnedKey} channelId={channel?.id} isOwner={isOwner} />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 text-channel-mobile-fix" onClick={() => showChannelMenu && setShowChannelMenu(false)}>
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
            const isBot = msg.is_bot === true;
            const prevMsg = messages[index - 1];
            const isGrouped = !isBot && prevMsg && !prevMsg.is_bot &&
              prevMsg.user_id === msg.user_id &&
              new Date(msg.created_at) - new Date(prevMsg.created_at) < 5 * 60 * 1000;
            const showHeader = !isGrouped || isBot;

            return (
              <div
                key={msg.id}
                className={`group relative ${isBot ? 'mt-3' : isGrouped ? 'mt-0.5' : 'mt-4'}`}
              >
                {showHeader && (
                  <div className={`flex items-start gap-3 ${isBot ? 'bg-indigo-950/20 rounded-lg p-2' : ''}`}>
                    <img
                      src={
                        isBot
                          ? (msg.author?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=generic-bot')
                          : (msg.author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author?.username}`)
                      }
                      alt={msg.author?.username}
                      className={`w-10 h-10 rounded-full bg-white/5 mt-0.5 flex-shrink-0 ${isBot ? 'ring-2 ring-cyan-500/50' : ''}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-white hover:underline cursor-pointer">
                          {msg.author?.username || msg.bot_name || 'Bot'}
                        </span>
                        {isBot && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold">BOT</span>
                        )}
                        {!isBot && <ReputationBadge points={msg.author?.reputation?.points || 0} size="sm" />}
                        <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                      </div>
                      {/* Community signature */}
                      {!isBot && memberSignatures[msg.user_id] && (
                        <p className="text-[11px] text-gray-500 italic -mt-0.5 mb-0.5 leading-tight">
                          {memberSignatures[msg.user_id]}
                        </p>
                      )}
                      {isBot
                        ? <BotEmbed content={msg.content} />
                        : <OptimisticMessageRenderer content={msg.content} emojis={customEmojis} preRenderedParts={msg._preRenderedParts} />
                      }
                      {/* Poll embed */}
                      {!isBot && msg.poll_id && (
                        <PollEmbed pollId={msg.poll_id} communityId={communityId} userId={user?.id} />
                      )}
                      {!isBot && msg.reply_to && (
                        <div className="mt-1 text-xs text-gray-500 bg-white/5 rounded px-2 py-1">
                          <span className="text-cyan-400">Respondiendo a {msg.reply_to.author?.username}:</span>
                          <span className="ml-1 truncate">{msg.reply_to.content?.substring(0, 50)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!showHeader && !isBot && (
                  <div className="flex group-hover:bg-white/[0.02] rounded py-0.5 -ml-2 pl-2">
                    <span className="w-10 text-right text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mr-3">
                      {formatTime(msg.created_at)}
                    </span>
                    <div className="flex-1">
                      <OptimisticMessageRenderer content={msg.content} emojis={customEmojis} preRenderedParts={msg._preRenderedParts} />
                    </div>
                  </div>
                )}

                {/* Message Actions */}
                <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[#1a1a24] border border-white/10 rounded-lg shadow-lg -mt-6 mr-2">
                  {!isBot && (
                    <button
                      onClick={() => setReplyingTo(msg)}
                      className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/5 rounded"
                      title="Responder"
                    >
                      <Reply size={16} />
                    </button>
                  )}
                  {isOwner && !isBot && (
                    <PinMessageButton
                      messageId={msg.id}
                      channelId={channel?.id}
                      isOwner={isOwner}
                      onPinned={() => setPinnedKey(k => k + 1)}
                    />
                  )}
                  {isOwn && !isBot && (
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

      {/* Input Area - Fixed for mobile */}
      <div className="shrink-0 p-3 sm:p-4 border-t border-white/5 bg-[#0f0f13] relative z-20 chat-input-fixed">
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
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-gray-400 text-sm sm:text-base">Únete a la comunidad para participar en el chat</p>
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
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}

            {/* Poll Creation Modal */}
            {showPollModal && (
              <PollCreateModal
                onClose={() => setShowPollModal(false)}
                onCreate={handleCreatePoll}
              />
            )}

            <div className="flex items-end gap-1 sm:gap-2 bg-[#1a1a24] border border-white/10 rounded-xl p-2 focus-within:border-cyan-500/50 transition-colors chat-input-container">
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 chat-input-button"
                title="Emojis"
              >
                <Smile size={16} className="sm:w-4 sm:h-4" />
              </button>

              {/* Poll button - Hidden on very small screens */}
              <button
                type="button"
                onClick={() => { setShowPollModal(v => !v); setShowEmojiPicker(false); }}
                className={`hidden sm:flex p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0 chat-input-button ${showPollModal ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                title="Crear encuesta"
              >
                <BarChart2 size={16} className="w-4 h-4" />
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
                className="flex-1 min-w-0 bg-transparent px-2 py-1.5 sm:py-2 text-sm sm:text-base text-white placeholder:text-gray-500 outline-none chat-input-field"
                style={{ minHeight: '40px' }}
              />
              
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-1.5 sm:p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-cyan-950 transition-colors flex-shrink-0 chat-input-button"
              >
                <Send size={16} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
