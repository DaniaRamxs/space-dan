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
                                <div style={{ fontSize: '11px', opacity: 0.4, textTransform: 'uppercase', marginBottom: '8px' }}>
                                    {note.label || 'Personal'}
                                </div>
                                <h3 style={{ fontSize: '16px', margin: '0 0 10px 0' }}>{note.title}</h3>
                                <p style={{ fontSize: '14px', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '20px' }}>
                                    Actualizado: {new Date(note.updated_at).toLocaleDateString()}
                                </div>
                            </motion.div>
                        ))}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
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
        </div>
    );
}
