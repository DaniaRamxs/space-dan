import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotes, addNote, updateNote, deleteNote } from '../services/productivity';

const NOTE_COLORS = {
    purple: 'bg-purple-900/20 border-purple-500/30 text-purple-200',
    blue: 'bg-blue-900/20 border-blue-500/30 text-blue-200',
    amber: 'bg-amber-900/20 border-amber-500/30 text-amber-200',
    emerald: 'bg-emerald-900/20 border-emerald-500/30 text-emerald-200',
};

export default function CabinIdeas({ userId }) {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadNotes();
        }
    }, [userId]);

    const loadNotes = async () => {
        try {
            const data = await getNotes(userId);
            setNotes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (color = 'purple') => {
        try {
            const newNote = await addNote(userId, '', color);
            setNotes(prev => [newNote, ...prev]);
        } catch (err) {
            console.error(err);
            alert('No se pudo añadir la nota. Es posible que necesites actualizar el esquema de la base de datos.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que quieres borrar esta idea?')) return;
        try {
            await deleteNote(id);
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error(err);
            alert('Error al borrar la nota.');
        }
    };

    const handleUpdateLocal = (id, content) => {
        setNotes(notes.map(n => n.id === id ? { ...n, content } : n));
    };

    if (loading) return <div className="p-10 text-center opacity-20 text-xs">Sincronizando ideario...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xs uppercase tracking-widest opacity-50 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    Ideario
                </h3>
                <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-full border border-white/10">
                    <div className="flex gap-1.5 px-2 border-r border-white/10">
                        {Object.keys(NOTE_COLORS).map(color => (
                            <button
                                key={color}
                                onClick={() => handleAdd(color)}
                                className={`w-5 h-5 rounded-full border border-white/20 hover:scale-125 transition-transform ${NOTE_COLORS[color].split(' ')[0]}`}
                                title={`Añadir nota ${color}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={() => handleAdd('purple')}
                        className="pr-3 pl-1 text-[10px] uppercase tracking-widest text-accent hover:text-white transition-colors font-bold flex items-center gap-1"
                    >
                        <span className="text-sm">+</span> Nueva Idea
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                    {notes.map((note) => (
                        <IdeaCard
                            key={note.id}
                            note={note}
                            onDelete={() => handleDelete(note.id)}
                            onUpdate={(content) => handleUpdateLocal(note.id, content)}
                        />
                    ))}
                </AnimatePresence>

                {notes.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-12 border-2 border-dashed border-white/5 rounded-3xl text-center"
                    >
                        <p className="text-sm opacity-20 italic">El vacío espera una idea...</p>
                        <button
                            onClick={() => handleAdd('purple')}
                            className="mt-4 text-[10px] uppercase tracking-widest text-accent hover:underline"
                        >
                            + Iniciar Brainstorming
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function IdeaCard({ note, onDelete, onUpdate }) {
    const [localContent, setLocalContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeout = useRef(null);

    const handleChange = (e) => {
        const val = e.target.value;
        setLocalContent(val);
        onUpdate(val);

        setIsSaving(true);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            try {
                await updateNote(note.id, val);
                setIsSaving(false);
            } catch (err) {
                console.error(err);
            }
        }, 1000);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative p-4 rounded-2xl border backdrop-blur-md transition-shadow hover:shadow-lg ${NOTE_COLORS[note.color] || NOTE_COLORS.purple}`}
        >
            <textarea
                value={localContent}
                onChange={handleChange}
                placeholder="Escribe algo brillante..."
                className="w-full bg-transparent border-none resize-none focus:ring-0 text-sm leading-relaxed placeholder:opacity-20 scrollbar-hide min-h-[80px]"
            />

            <div className="flex justify-between items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className={`text-[9px] uppercase tracking-tighter ${isSaving ? 'animate-pulse text-white' : 'opacity-40'}`}>
                    {isSaving ? 'Guardando...' : 'Sincronizado'}
                </span>
                <button
                    onClick={onDelete}
                    className="text-[9px] uppercase tracking-tighter bg-black/20 hover:bg-red-500/20 px-2 py-1 rounded-md transition-colors"
                >
                    Eliminar
                </button>
            </div>
        </motion.div>
    );
}
