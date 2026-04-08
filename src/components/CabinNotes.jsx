import { useState, useEffect, useRef } from 'react';
import { saveNotes, getNotes } from '../services/productivity';

export default function CabinNotes({ userId }) {
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeout = useRef(null);

    useEffect(() => {
        if (userId) {
            getNotes(userId).then(setContent);
        }
    }, [userId]);

    const handleChange = (e) => {
        const val = e.target.value;
        setContent(val);

        // Auto-save debounce
        setIsSaving(true);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            try {
                await saveNotes(userId, val);
                setIsSaving(false);
            } catch (err) {
                console.error(err);
            }
        }, 1500);
    };

    return (
        <div className="w-full h-full flex flex-col p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest opacity-50 font-bold">Bitácora</h3>
                <span className={`text-[10px] transition-opacity ${isSaving ? 'opacity-100 text-accent blink' : 'opacity-0'}`}>
                    Sincronizando...
                </span>
            </div>

            <textarea
                value={content}
                onChange={handleChange}
                placeholder="Escribe tus pensamientos en el vacío..."
                className="flex-1 w-full bg-transparent border-none resize-none focus:ring-0 text-sm leading-relaxed opacity-80 placeholder:opacity-20 scrollbar-hide"
            />

            {!isSaving && content && (
                <div className="mt-2 text-[10px] opacity-20 text-right italic">
                    Guardado automáticamente
                </div>
            )}
        </div>
    );
}
