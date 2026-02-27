import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserDisplayName, getNicknameClass } from '../utils/user';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Trash2, Send, Zap, Loader2 } from 'lucide-react';
import Button from './ui/Button';

export default function Comments({ postId }) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef({});

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url, nick_style_item:equipped_nickname_style(id))')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();

    const channel = supabase.channel(`comments-${postId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`,
      }, fetchComments)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId, username, isTyping } = payload;
        setTypingUsers(prev => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = username;
            // Clear automatically after 3s if no stop signal
            if (typingTimeoutRef.current[userId]) clearTimeout(typingTimeoutRef.current[userId]);
            typingTimeoutRef.current[userId] = setTimeout(() => {
              setTypingUsers(p => {
                const n = { ...p };
                delete n[userId];
                return n;
              });
            }, 3000);
          } else {
            delete next[userId];
          }
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, [postId]);

  const handleTyping = (isTyping) => {
    if (!user) return;
    supabase.channel(`comments-${postId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, username: user.user_metadata?.username || 'Alguien', isTyping },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user || sending) return;
    setSending(true);
    handleTyping(false);

    await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: text.trim(),
    });

    setText('');
    setSending(false);
  };

  const handleDelete = async (id) => {
    await supabase.from('comments').delete().eq('id', id);
  };

  const isRecent = (date) => {
    return (new Date() - new Date(date)) < 30000; // 30 seconds
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto p-2">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} strokeWidth={1.5} className="text-purple-400" />
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 font-mono">
            Canal_Comentarios
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Live_Connect</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 size={24} strokeWidth={1.5} className="text-white/10 animate-spin" />
            <span className="text-[9px] font-semibold text-white/20 uppercase tracking-[0.2em] font-mono">_Sincronizando_Hilos</span>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {comments.map((c, i) => {
                const recent = isRecent(c.created_at);
                return (
                  <motion.div
                    key={c.id}
                    initial={recent ? { opacity: 0, x: -10, scale: 0.98 } : false}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className={`group relative flex flex-col gap-3 p-4 rounded-2xl border transition-all ${recent ? 'bg-white/[0.04] border-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.05)]' : 'bg-white/[0.02] border-white/5'
                      }`}
                  >
                    {recent && (
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-purple-500 text-black text-[7px] font-black uppercase tracking-widest shadow-lg">
                        Justo_Ahora
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.profiles?.avatar_url || '/default_user_blank.png'}
                          alt=""
                          className="w-8 h-8 rounded-full border border-white/10 p-[1px] object-cover"
                        />
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-bold ${getNicknameClass(c.profiles)}`}>
                            {getUserDisplayName(c.profiles)}
                          </span>
                          <span className="text-[8px] text-white/20 font-black uppercase tracking-tighter">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {user?.id === c.user_id && (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>

                    <p className="text-xs md:text-sm text-white/80 leading-relaxed font-medium pl-11">
                      {c.content}
                    </p>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {comments.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[32px]">
                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.2em] font-mono mb-1">
                  _Sin_Frecuencias
                </p>
                <p className="text-[9px] font-semibold text-white/10 uppercase tracking-[0.1em]">
                  Silencio en el sector — Inicia la señal
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4">
        <AnimatePresence>
          {Object.keys(typingUsers).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center gap-3 px-4 py-2"
            >
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-purple-500/50 animate-bounce" />
              </div>
              <span className="text-[9px] font-black text-purple-400/40 uppercase tracking-[0.2em]">
                {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'está' : 'están'} escribiendo...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {user ? (
          <form onSubmit={handleSubmit} className="relative group">
            <textarea
              value={text}
              onChange={e => {
                setText(e.target.value);
                handleTyping(e.target.value.length > 0);
              }}
              onBlur={() => handleTyping(false)}
              placeholder="Deja tu rastro en este hilo..."
              className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-4 pr-16 
                         text-sm text-white placeholder:text-white/10 min-h-[100px]
                         focus:outline-none focus:border-purple-500/30 transition-all 
                         resize-none focus:bg-white/[0.04]"
              maxLength={500}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              <span className="text-[8px] font-black text-white/10 uppercase tabular-nums">
                {text.length}/500
              </span>
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="p-2.5 rounded-xl bg-white text-black hover:scale-110 active:scale-95 disabled:opacity-20 disabled:grayscale transition-all shadow-xl"
              >
                {sending ? <Loader2 size={18} strokeWidth={1.5} className="animate-spin" /> : <Send size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
              Sincroniza tu cuenta para participar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
