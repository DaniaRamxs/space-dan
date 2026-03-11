import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { blogService } from '../services/blogService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function CreatePostPage() {
    const { id } = useParams(); // if edit mode
    const { user } = useAuthContext();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [isPreview, setIsPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!id);

    useEffect(() => {
        if (id) {
            blogService.getPostBySlug(id) // actually by id for now, we'll fix edit later to use IDs or just fetch user posts
                .then(post => {
                    // We need a specific getPostById or we can just fetch all user posts and find it
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSave = async (status) => {
        if (!title.trim()) return alert('El título es requerido.');
        setSaving(true);
        try {
            const payload = { title, subtitle, content_markdown: content, status };
            if (id) {
                await blogService.updatePost(id, payload);
            } else {
                await blogService.createPost(user.id, payload);
            }
            navigate('/profile'); // To see the post in the profile
        } catch (err) {
            alert('Error guardando el post: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col pt-6 md:pt-10 px-4">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white transition-colors">
                    ← Volver
                </button>
                <div className="flex gap-2">
                    <button onClick={() => setIsPreview(!isPreview)} className="px-4 py-2 border border-white/10 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition">
                        {isPreview ? '✏️ Editar' : '👁️ Vista Previa'}
                    </button>
                    <button onClick={() => handleSave('draft')} disabled={saving} className="px-4 py-2 border border-white/10 rounded-lg text-sm bg-[#13131c] hover:bg-[#1a1a26] transition disabled:opacity-50">
                        Guardar Borrador
                    </button>
                    <button onClick={() => handleSave('published')} disabled={saving} className="btn-accent px-6 py-2 rounded-lg text-sm font-bold tracking-wider disabled:opacity-50">
                        Publicar
                    </button>
                </div>
            </div>

            {isPreview ? (
                <div className="bg-[#0a0a0f] border border-white/5 p-6 md:p-10 rounded-2xl shadow-xl min-h-[60vh] animate-fade-in-up">
                    <h1 className="text-3xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{title || 'Sin Título'}</h1>
                    {subtitle && <h2 className="text-xl text-gray-400 mb-8">{subtitle}</h2>}
                    <div className="postBigText markdownContent mt-8">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content || '*Sin contenido*'}
                        </ReactMarkdown>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-4 animate-fade-in-up">
                    <input
                        type="text"
                        placeholder="Título del Post"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full bg-transparent border-b border-white/10 text-3xl md:text-5xl font-black py-4 outline-none focus:border-cyan-500 transition-colors placeholder:text-white/20"
                    />
                    <input
                        type="text"
                        placeholder="Subtítulo (opcional)"
                        value={subtitle}
                        onChange={e => setSubtitle(e.target.value)}
                        className="w-full bg-transparent border-b border-white/5 text-xl py-3 outline-none focus:border-cyan-500/50 transition-colors text-gray-300 placeholder:text-gray-600"
                    />
                    <div className="relative mt-4 flex-1 flex flex-col h-[50vh]">
                        <textarea
                            placeholder="Escribe tu contenido usando Markdown...&#10;&#10;# Título&#10;**Negrita**&#10;* Lista"
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 text-base text-gray-300 resize-none flex-1 outline-none focus:border-cyan-500/50 transition-colors"
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 text-right mt-2 uppercase tracking-widest font-bold">
                        Soporta Markdown Estándar
                    </p>
                </div>
            )}
        </main>
    );
}
