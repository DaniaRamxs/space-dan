import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function GuestbookPage() {
    const [messages, setMessages] = useState([]);
    const [name, setName] = useState('');
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Cargar mensajes desde Supabase
    const fetchMessages = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('guestbook')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching guestbook:", error);
            // Fallback en caso de error (credenciales no seteadas aún)
            setMessages([{ id: 0, name: 'System', text: 'Error al conectar con la base de datos global. Revisa tus credenciales o el estado de tu tabla en Supabase.', created_at: new Date().toISOString() }]);
        } else {
            setMessages(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();

        // Suscripción en tiempo real opcional
        const subscription = supabase
            .channel('public:guestbook')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guestbook' }, payload => {
                setMessages(prev => [payload.new, ...prev]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !msg.trim() || sending) return;

        setSending(true);
        const { error } = await supabase
            .from('guestbook')
            .insert([
                {
                    name: name.trim(),
                    text: msg.trim(),
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            alert("No se pudo enviar el mensaje. Inténtalo de nuevo.");
            console.error(error);
        } else {
            setName('');
            setMsg('');
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="tu nombre aqui..."
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
                <button type="submit" className="retroBtn">Firmar Libro ✍️</button>
            </form>

            <div className="messageList">
                <p className="tinyText">{messages.length} mensajes firmados</p>
                {loading ? (
                    <div className="blinkText" style={{ textAlign: 'center', padding: '20px' }}>conectando_con_la_nube...</div>
                ) : (
                    <>
                        {messages.length === 0 && <p className="tinyText" style={{ textAlign: 'center' }}>No hay mensajes aún. ¡Sé el primero! ✨</p>}
                        {messages.map(m => (
                            <div key={m.id || m.created_at} className="guestbookEntry">
                                <div className="entryHeader">
                                    <span className="entryName">👤 {m.name}</span>
                                    <span className="entryDate">{m.created_at ? new Date(m.created_at).toLocaleDateString() : '----'}</span>
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
