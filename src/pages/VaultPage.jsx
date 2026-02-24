import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { vaultService } from '../services/vault';
import { useAuthContext } from '../contexts/AuthContext';

export default function VaultPage() {
    const { user } = useAuthContext();
    const [scanning, setScanning] = useState(true);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'items'

    // Nuevos estados para crear notas
    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newLabel, setNewLabel] = useState('personal');

    useEffect(() => {
        // Simulation of "Identity Scan"
        const timer = setTimeout(() => setScanning(false), 2500);
        loadData();
        return () => clearTimeout(timer);
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const data = await vaultService.getNotes();
            setNotes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;
        try {
            const added = await vaultService.addNote(newTitle, newContent, newLabel);
            setNotes(prev => [added, ...prev]);
            setIsAdding(false);
            setNewTitle('');
            setNewContent('');
            setNewLabel('personal');
        } catch (err) {
            console.error(err);
            alert('Error al guardar la nota cifrada');
        }
    };

    const handleDeleteNote = async (id) => {
        if (!window.confirm('¿Destruir esta nota permanentemente?')) return;
        try {
            await vaultService.deleteNote(id);
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error(err);
            alert('Error al destruir la nota');
        }
    };

    if (scanning) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#050510', zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '300px' }}
                    style={{ height: '2px', background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)', marginBottom: '20px' }}
                />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '2px', color: 'var(--accent)' }}>
                    {">"} ESCANEANDO_IDENTIDAD...
                </div>
                <motion.div
                    animate={{ y: [0, 600, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ position: 'absolute', top: '10%', left: 0, right: 0, height: '1px', background: 'rgba(255,110,180,0.3)', boxShadow: '0 0 15px var(--accent-glow)' }}
                />
            </div>
        );
    }

    return (
        <div className="layoutOne" style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Cofre Privado</h1>
                    <p style={{ opacity: 0.5, fontSize: '14px' }}>Área de acceso restringido para {user?.email}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`btn-glass ${activeTab === 'notes' ? 'active' : ''}`}
                        style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                        Notas
                    </button>
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`btn-glass ${activeTab === 'items' ? 'active' : ''}`}
                        style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                        Recuerdos
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-8 text-center opacity-50">Accediendo a datos cifrados...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    <AnimatePresence>
                        {notes.map((note, i) => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                className="glassCard"
                                style={{ position: 'relative', overflow: 'hidden' }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0,
                                    width: '4px', height: '100%',
                                    background: note.label === 'idea' ? 'var(--cyan)' : 'var(--accent)'
                                }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '11px', opacity: 0.4, textTransform: 'uppercase' }}>
                                        {note.label || 'Personal'}
                                    </div>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem', opacity: 0.5 }}
                                        title="Destruir nota"
                                        onMouseOver={e => e.target.style.opacity = 1}
                                        onMouseOut={e => e.target.style.opacity = 0.5}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: 'var(--text)' }}>{note.title}</h3>
                                <p style={{ fontSize: '14px', opacity: 0.8, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{note.content}</p>
                                <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '20px' }}>
                                    Actualizado: {new Date(note.updated_at).toLocaleDateString()}
                                </div>
                            </motion.div>
                        ))}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setIsAdding(true)}
                            className="glassCard"
                            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', cursor: 'pointer', minHeight: '150px' }}
                        >
                            <div style={{ textAlign: 'center', opacity: 0.5 }}>
                                <div style={{ fontSize: '32px' }}>+</div>
                                <div style={{ fontSize: '12px' }}>Nueva Nota Cifrada</div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid var(--glass-border)', textAlign: 'center', opacity: 0.3, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                SISTEMA_DE_ENCRIPTADO_ACTIVO // PROTOCOLO_D-VAULT_V1.0
            </div>

            {/* Modal para agregar nota */}
            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glassCard"
                            style={{ width: '100%', maxWidth: '400px', padding: '30px', background: 'var(--bg)', border: '1px solid var(--border)' }}
                        >
                            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem', color: 'var(--text)' }}>Crear Nota Cifrada</h2>
                            <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Etiqueta</label>
                                    <select
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                    >
                                        <option value="personal">Personal</option>
                                        <option value="idea">Idea</option>
                                        <option value="recordatorio">Recordatorio</option>
                                        <option value="secreto">Secreto</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Título</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="Título de la nota..."
                                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', opacity: 0.6, display: 'block', marginBottom: '5px' }}>Contenido</label>
                                    <textarea
                                        required
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        placeholder="Código o texto cifrado..."
                                        rows={4}
                                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', resize: 'vertical' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setIsAdding(false)} className="btn-glass" style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-accent" style={{ flex: 1 }}>Guardar</button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
