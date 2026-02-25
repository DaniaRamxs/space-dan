import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserDisplayName, getNicknameClass } from '../utils/user';

export default function GuestbookPage() {
  const { user, profile } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user && profile?.username) setName(profile.username);
    else if (user) setName(user.user_metadata?.name || user.email?.split('@')[0] || '');
  }, [user, profile]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Intentamos con el join para estilos de nickname
      const { data, error } = await supabase
        .from('guestbook')
        .select('*, profiles:user_id(username, equipped_nickname_style)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Error con join en guestbook, reintentando sin join:", error);
        // Fallback: Si el join falla (posible por falta de FK en DB), traemos solo la data base
        const { data: simpleData, error: simpleError } = await supabase
          .from('guestbook')
          .select('*')
          .order('created_at', { ascending: false });

        if (!simpleError) setMessages(simpleData || []);
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Error crítico cargando firmas:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    const sub = supabase
      .channel('public:guestbook')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook' },
        payload => setMessages(prev => [payload.new, ...prev]))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim() || sending) return;
    setSending(true);
    const entry = {
      name: isAnon ? 'Anónimo' : name.trim(),
      text: msg.trim(),
      is_anonymous: isAnon,
    };
    if (user) {
      entry.user_id = user.id;
      if (!isAnon) entry.avatar_url = profile?.avatar_url || user.user_metadata?.avatar_url || null;
    }
    const { error } = await supabase.from('guestbook').insert([entry]);
    if (!error) { setMsg(''); if (!user) setName(''); }
    setSending(false);
  };

  return (
    <main className="w-full max-w-2xl mx-auto min-h-[100dvh] pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4 relative">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/30 tracking-tight mb-1 uppercase">
          Libro de Visitas
        </h1>
        <p className="text-[10px] text-white/25 uppercase tracking-[0.4em] font-black">
          Deja tu huella en el cosmos ✦
        </p>
      </motion.div>

      {/* Formulario */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] p-6 mb-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow ambiental */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none" />

        <h2 className="text-xs font-black text-white/30 uppercase tracking-[0.3em] mb-5">✍️ Firmar</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">
              Nombre / Alias
            </label>
            <input
              type="text"
              value={isAnon ? 'Anónimo' : name}
              onChange={e => setName(e.target.value)}
              placeholder="tu alias estelar..."
              disabled={isAnon}
              required
              maxLength={40}
              className="bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/15 outline-none focus:border-cyan-500/40 focus:bg-white/[0.05] transition-all disabled:opacity-40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">
              Mensaje
            </label>
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="escribe algo bonito para el universo..."
              required
              maxLength={280}
              rows={3}
              className="bg-white/[0.03] border border-white/8 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/15 outline-none focus:border-cyan-500/40 focus:bg-white/[0.05] transition-all resize-none"
            />
            <span className="text-[9px] text-white/15 font-mono text-right">{msg.length}/280</span>
          </div>

          <div className="flex items-center justify-between">
            {user && (
              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setIsAnon(v => !v)}
                  className={`w-9 h-5 rounded-full border transition-all relative ${isAnon ? 'bg-cyan-500/30 border-cyan-500/50' : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isAnon ? 'left-4' : 'left-0.5 opacity-50'
                    }`} />
                </div>
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/50 transition-colors">
                  Anónimo
                </span>
              </label>
            )}
            <button
              type="submit"
              disabled={sending || !msg.trim() || !name.trim()}
              className="ml-auto px-8 py-2.5 bg-cyan-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(6,182,212,0.2)] disabled:opacity-40 disabled:hover:scale-100"
            >
              {sending ? 'Enviando...' : '✦ Firmar'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Lista de mensajes */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
          {messages.length} firmas
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-[#0a0a0f] border border-white/5 rounded-[2rem] p-5 h-24" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 bg-[#0a0a0f] rounded-[3rem] border border-white/5">
          <span className="text-4xl mb-4 block opacity-30">✦</span>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Sin firmas aún — sé el primero</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={m.id || m.created_at}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i < 5 ? i * 0.04 : 0 }}
                className="bg-[#0a0a0f] border border-white/5 rounded-[2rem] px-5 py-4 hover:border-white/10 hover:bg-white/[0.02] transition-all group"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.avatar_url && !m.is_anonymous ? (
                      <img
                        src={m.avatar_url}
                        alt={m.name}
                        className="w-7 h-7 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                        <span className="text-xs opacity-50">{m.is_anonymous ? '👤' : '✦'}</span>
                      </div>
                    )}
                    <span className={`text-sm font-black truncate ${!m.is_anonymous ? getNicknameClass(m.profiles || { username: m.name, equipped_nickname_style: null }) : 'text-white/80'}`}>
                      {(!m.is_anonymous && m.profiles) ? getUserDisplayName(m.profiles) : m.name}
                    </span>
                    {m.is_anonymous && (
                      <span className="text-[8px] font-black text-white/20 border border-white/10 px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                        anon
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-white/20 uppercase tracking-widest shrink-0">
                    {m.created_at
                      ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })
                      : '—'}
                  </span>
                </div>
                <p className="text-sm text-white/55 leading-relaxed pl-[2.375rem]">
                  {m.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
