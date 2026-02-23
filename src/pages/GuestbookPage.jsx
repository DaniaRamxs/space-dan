import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

export default function GuestbookPage() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Pre-fill name when user logs in
  useEffect(() => {
    if (user) {
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email || '').split('@')[0] ||
        'Anónimo';
      setName(displayName);
    }
  }, [user]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('guestbook')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching guestbook:', error);
      setMessages([{
        id: 0,
        name: 'System',
        text: 'Temporalmente fuera de servicio. Vuelve pronto para firmar el libro. ✨',
        created_at: new Date().toISOString(),
      }]);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel('public:guestbook')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook' }, payload => {
        setMessages(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim() || sending) return;

    setSending(true);

    const entry = {
      name: isAnon ? 'Anónimo' : name.trim(),
      text: msg.trim(),
      created_at: new Date().toISOString(),
      is_anonymous: isAnon,
    };

    // Solo incluir user_id si está autenticado y NO es anónimo
    // (si es anónimo guardamos user_id de todas formas para moderación,
    //  pero el display_name será "Anónimo" y no se muestra avatar)
    if (user) {
      entry.user_id = user.id;
      if (!isAnon) {
        entry.avatar_url = user.user_metadata?.avatar_url || null;
      }
    }

    const { error } = await supabase.from('guestbook').insert([entry]);

    if (error) {
      alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
      console.error(error);
    } else {
      setMsg('');
      if (!user) setName('');
    }
    setSending(false);
  };

  return (
    <main className="card guestbookPage">
      <div className="pageHeader">
        <h1>Libro de Visitas</h1>
        <marquee className="tinyText" scrollamount="3">Gracias por visitar space-dan. Dejanos un mensaje antes de irte... ☆</marquee>
      </div>

      <form className="guestbookForm" onSubmit={handleSubmit}>
        <div className="formGroup">
          <label>Nombre/Alias:</label>
          <input
            type="text"
            value={isAnon ? 'Anónimo' : name}
            onChange={(e) => setName(e.target.value)}
            placeholder="tu nombre aqui..."
            disabled={isAnon}
            required
          />
        </div>
        <div className="formGroup">
          <label>Mensaje:</label>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="escribe algo bonito..."
            required
          />
        </div>

        {user && (
          <label className="guestbookAnonCheck">
            <input
              type="checkbox"
              checked={isAnon}
              onChange={e => setIsAnon(e.target.checked)}
            />
            publicar anónimamente
          </label>
        )}

        <button type="submit" className="retroBtn" disabled={sending}>
          {sending ? 'enviando...' : 'Firmar Libro ✍️'}
        </button>
      </form>

      <div className="messageList">
        <p className="tinyText">{messages.length} mensajes firmados</p>
        {loading ? (
          <div className="blinkText" style={{ textAlign: 'center', padding: '20px' }}>conectando_con_la_nube...</div>
        ) : (
          <>
            {messages.length === 0 && (
              <p className="tinyText" style={{ textAlign: 'center' }}>No hay mensajes aún. ¡Sé el primero! ✨</p>
            )}
            {messages.map(m => (
              <div key={m.id || m.created_at} className="guestbookEntry">
                <div className="entryHeader">
                  <span className="entryName">
                    {m.is_anonymous ? (
                      <>👤 Anónimo <span className="entryBadgeAnon">anon</span></>
                    ) : m.avatar_url ? (
                      <><img src={m.avatar_url} alt="" className="entryAvatar" /> {m.name}</>
                    ) : (
                      <>👤 {m.name}</>
                    )}
                  </span>
                  <span className="entryDate">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString() : '----'}
                  </span>
                </div>
                <p className="entryText">{m.text}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
