import { useState, useEffect } from 'react';

const LS_KEY = 'space-dan-guestbook';

export default function GuestbookPage() {
    const [messages, setMessages] = useState([]);
    const [name, setName] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
            try {
                setMessages(JSON.parse(stored));
            } catch (e) {
                console.error("Error loading guestbook", e);
            }
        } else {
            // Default messages
            setMessages([
                { id: 1, name: 'Admin', text: '¡Bienvenido a mi libro de visitas! Deja un mensaje :3', date: '2026-02-21' },
                { id: 2, name: 'CyberExplorer', text: 'Me encanta la estetica de este blog, muy nostálgica.', date: '2026-02-21' }
            ]);
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !msg.trim()) return;

        const newMessage = {
            id: Date.now(),
            name: name.trim(),
            text: msg.trim(),
            date: new Date().toISOString().split('T')[0]
        };

        const updated = [newMessage, ...messages];
        setMessages(updated);
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
        setName('');
        setMsg('');
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
                {messages.map(m => (
                    <div key={m.id} className="guestbookEntry">
                        <div className="entryHeader">
                            <span className="entryName">👤 {m.name}</span>
                            <span className="entryDate">{m.date}</span>
                        </div>
                        <p className="entryText">{m.text}</p>
                    </div>
                ))}
            </div>
        </main>
    );
}
