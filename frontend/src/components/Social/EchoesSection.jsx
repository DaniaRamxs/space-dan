import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { echoesService } from '../../services/echoesService';
import { useAuthContext } from '../../contexts/AuthContext';
import { useEconomy } from '../../contexts/EconomyContext';
import { Link } from 'react-router-dom';

export default function EchoesSection({ profileId, isOwnProfile, autoOpenStar = false, onStarModalClose }) {
    const { user } = useAuthContext();
    const { awardCoins } = useEconomy();
    const [echoes, setEchoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('star'); // star, thought, song, image
    const [echoContent, setEchoContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [metadata, setMetadata] = useState({});
    const [isFleeting, setIsFleeting] = useState(false);

    // Abrir modal en modo estrella desde el botón del header
    useEffect(() => {
        if (autoOpenStar) {
            setModalType('star');
            setShowModal(true);
        }
    }, [autoOpenStar]);

    useEffect(() => {
        if (profileId) fetchEchoes();
    }, [profileId]);

    const fetchEchoes = async () => {
        try {
            setLoading(true);
            const data = await echoesService.getProfileEchoes(profileId);
            setEchoes(data || []);
        } catch (err) {
            console.error('Error fetching echoes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEcho = async () => {
        if (!user) return alert('Debes iniciar sesión para dejar un eco.');
        if (modalType === 'thought' && !echoContent.trim()) return;

        setSubmitting(true);
        try {
            const data = await echoesService.createEcho(profileId, modalType, echoContent, metadata, isFleeting);
            setEchoes(prev => [data, ...prev]);
            setShowModal(false);
            setEchoContent('');
            setMetadata({});
            setIsFleeting(false);
            onStarModalClose?.(); // Notificar al padre que el modal cerró

            const reward = 10;
            const message = 'Dejaste un eco';

            if (!isOwnProfile && awardCoins) {
                // Give some starlys to the sender as incentive too
                awardCoins(reward, 'leave_echo', message);
            }

            // Animación de estrella (efecto global opcional)
        } catch (err) {
            console.error(err);
            alert('Error al dejar tu eco: ' + (err.message || err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleStar = async (echoId, isStarred) => {
        if (!user) return alert('Debes iniciar sesión.');
        try {
            // Optimistic upate
            setEchoes(prev => prev.map(e => {
                if (e.id === echoId) {
                    const newStarsCount = isStarred ? e.stars_count - 1 : e.stars_count + 1;
                    const newStarsList = isStarred
                        ? e.stars.filter(s => s.user_id !== user.id)
                        : [...(e.stars || []), { user_id: user.id }];

                    return { ...e, stars_count: newStarsCount, stars: newStarsList };
                }
                return e;
            }));
            await echoesService.toggleStar(echoId, isStarred);
        } catch (err) {
            console.error(err);
            fetchEchoes(); // rollback
        }
    };

    const handleTogglePin = async (echoId, isPinned) => {
        if (!isOwnProfile) return;
        try {
            setEchoes(prev => prev.map(e => e.id === echoId ? { ...e, is_pinned: !isPinned } : e));
            await echoesService.togglePinEcho(echoId, isPinned);
            fetchEchoes(); // refetch to re-sort
        } catch (err) {
            console.error(err);
            fetchEchoes();
        }
    };

    const handleDelete = async (echoId) => {
        try {
            setEchoes(prev => prev.filter(e => e.id !== echoId));
            await echoesService.deleteEcho(echoId);
        } catch (err) {
            console.error(err);
        }
    };

    const pinnedEchoes = echoes.filter(e => e.is_pinned);
    const regularEchoes = echoes.filter(e => !e.is_pinned);

    return (
        <div className="space-y-12">
            {/* Encabezado */}
            <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase flex items-center justify-center gap-3">
                    <span className="text-3xl">🌠</span> Ecos de este espacio
                </h2>
                <p className="text-sm text-white/50 tracking-widest uppercase">
                    "Las huellas que dejan quienes pasan por aquí."
                </p>
                <div className="text-xs font-mono text-white/30 tracking-widest uppercase pt-2">
                    ⭐ Este espacio ha recibido {echoes.length} ecos
                </div>
            </div>

            {user && user.id !== profileId && (
                <div className="flex justify-center mb-12">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-white/20 hover:border-white/50 hover:bg-white/10 text-white font-black uppercase tracking-widest transition-all drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 z-10"
                    >
                        ⭐ Dejar un eco
                    </button>
                </div>
            )}

            {/* Modal para Crear Eco */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-[#0a0a14] rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                <h3 className="text-sm font-black text-white/80 uppercase tracking-widest">Crear Eco</h3>
                                <button onClick={() => { setShowModal(false); onStarModalClose?.(); }} className="text-white/40 hover:text-white">✕</button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setModalType('star')} className={`p-4 rounded-2xl border text-center transition-all ${modalType === 'star' ? 'bg-purple-500/10 border-purple-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                        <div className="text-2xl mb-1">⭐</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Estrella</div>
                                    </button>
                                    <button onClick={() => setModalType('thought')} className={`p-4 rounded-2xl border text-center transition-all ${modalType === 'thought' ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                        <div className="text-2xl mb-1">💭</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Pensamiento</div>
                                    </button>
                                    <button onClick={() => setModalType('song')} className={`p-4 rounded-2xl border text-center transition-all ${modalType === 'song' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                        <div className="text-2xl mb-1">🎵</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Canción</div>
                                    </button>
                                    <button onClick={() => setModalType('image')} className={`p-4 rounded-2xl border text-center transition-all ${modalType === 'image' ? 'bg-rose-500/10 border-rose-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                        <div className="text-2xl mb-1">🖼</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/70">Imagen</div>
                                    </button>
                                </div>

                                {modalType === 'star' && (
                                    <p className="text-sm text-white/50 text-center italic">"Dejarás una simple señal brillante en este espacio."</p>
                                )}

                                {modalType === 'thought' && (
                                    <div className="space-y-2">
                                        <textarea
                                            value={echoContent}
                                            onChange={e => setEchoContent(e.target.value)}
                                            maxLength={200}
                                            placeholder="Escribe tu pensamiento (máx 200 caract.)"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-cyan-500/50 resize-none h-24"
                                        />
                                        <div className="text-right text-[10px] text-white/30">{echoContent.length}/200</div>
                                    </div>
                                )}

                                {modalType === 'song' && (
                                    <div className="space-y-2">
                                        <input
                                            value={echoContent}
                                            onChange={e => setEchoContent(e.target.value)}
                                            placeholder="Nombre de la canción (Ej: Space Song - Beach House)"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                )}

                                {modalType === 'image' && (
                                    <div className="space-y-2">
                                        <input
                                            value={echoContent}
                                            onChange={e => setEchoContent(e.target.value)}
                                            placeholder="URL de la imagen o GIF"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-rose-500/50"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 w-1 bg-rose-500/50" />
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/60 flex-1 ml-2">☄️ Hacer Eco Fugaz (24h)</div>
                                    <button
                                        onClick={() => setIsFleeting(!isFleeting)}
                                        className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${isFleeting ? 'bg-rose-500/50' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isFleeting ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <button
                                    onClick={handleCreateEcho}
                                    disabled={submitting}
                                    className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
                                >
                                    {submitting ? 'Dejando Huella...' : 'Emitir Eco ✨'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Renderizado de Ecos */}
            {loading ? (
                <div className="py-20 text-center text-white/20 text-[10px] uppercase tracking-widest">Sintonizando Ecos...</div>
            ) : (
                <div className="space-y-10">
                    {/* Ecos Destacados */}
                    {pinnedEchoes.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                <div className="text-xl">✨</div>
                                <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Ecos que se quedaron</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {pinnedEchoes.map(e => <EchoCard key={e.id} echo={e} isOwnProfile={isOwnProfile} currentUserId={user?.id} onToggleStar={handleToggleStar} onTogglePin={handleTogglePin} onDelete={handleDelete} />)}
                            </div>
                        </div>
                    )}

                    {/* Ecos Recientes */}
                    <div className="space-y-6">
                        {regularEchoes.length === 0 && pinnedEchoes.length === 0 ? (
                            <div className="py-20 text-center text-white/20 text-[10px] uppercase tracking-widest bg-white/[0.01] rounded-3xl border border-white/5">Sin huellas detectadas en este sector</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {regularEchoes.map(e => <EchoCard key={e.id} echo={e} isOwnProfile={isOwnProfile} currentUserId={user?.id} onToggleStar={handleToggleStar} onTogglePin={handleTogglePin} onDelete={handleDelete} />)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function EchoCard({ echo, isOwnProfile, currentUserId, onToggleStar, onTogglePin, onDelete }) {
    const isAuthor = currentUserId === echo.author_id;
    const hasStarred = echo.stars?.some(s => s.user_id === currentUserId);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group transition-all duration-500
        ${echo.is_fleeting ? 'bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/20' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10'}
        ${echo.is_pinned ? 'bg-gradient-to-br from-yellow-500/5 to-amber-500/5 border-yellow-500/10' : ''}`}
        >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Tipo de Eco */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                {echo.is_fleeting && <span className="text-[10px] text-rose-500/50 uppercase tracking-widest font-black pr-2 border-r border-rose-500/20">Fugaz</span>}
                <span className="text-xl opacity-40 group-hover:opacity-100 transition-opacity">
                    {echo.echo_type === 'star' && '⭐'}
                    {echo.echo_type === 'thought' && '💭'}
                    {echo.echo_type === 'song' && '🎵'}
                    {echo.echo_type === 'image' && '🖼'}
                </span>
            </div>

            <div className="flex gap-4 relative z-10">
                <Link to={`/@${echo.author?.username}`}>
                    <img src={echo.author?.avatar_url || '/default_user_blank.png'} className="w-12 h-12 rounded-2xl object-cover hover:scale-110 shadow-lg border border-white/10 transition-transform" />
                </Link>

                <div className="flex-1 space-y-2 pt-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Link to={`/@${echo.author?.username}`} className="text-sm font-black text-white/80 hover:text-white uppercase tracking-widest truncate">
                            {echo.author?.username}
                        </Link>
                        <span className="text-[9px] text-white/30 uppercase tracking-widest whitespace-nowrap">
                            • {new Date(echo.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="text-white/70 leading-relaxed font-medium">
                        {echo.echo_type === 'star' && <span className="text-purple-400 italic">"Dejó una estrella en este espacio"</span>}
                        {echo.echo_type === 'thought' && echo.content}
                        {echo.echo_type === 'song' && (
                            <div className="inline-flex flex-col gap-1 p-3 mt-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit">
                                <span className="text-[9px] text-emerald-400/80 uppercase tracking-widest font-black">Recomendación Musical</span>
                                <span className="text-emerald-100 font-bold">{echo.content}</span>
                            </div>
                        )}
                        {echo.echo_type === 'image' && (
                            <img src={echo.content} alt="Echo" className="mt-2 max-h-48 rounded-xl object-contain border border-white/10" />
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-4 pt-4 mt-2 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                        <button onClick={() => onToggleStar(echo.id, hasStarred)} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${hasStarred ? 'text-yellow-400' : 'text-white hover:text-yellow-400'}`}>
                            {hasStarred ? '🌟' : '⭐'} {echo.stars_count}
                        </button>

                        {/* Acciones del Dueño / Autor */}
                        <div className="flex-1" />
                        {(isOwnProfile || isAuthor) && (
                            <button onClick={() => onDelete(echo.id)} className="text-[9px] text-white/30 hover:text-rose-500 font-black uppercase tracking-widest transition-colors px-2 py-1">Borrar</button>
                        )}
                        {isOwnProfile && (
                            <button onClick={() => onTogglePin(echo.id, echo.is_pinned)} className={`text-[9px] font-black uppercase tracking-widest transition-colors px-2 py-1 ${echo.is_pinned ? 'text-amber-500' : 'text-white/30 hover:text-amber-500'}`}>
                                {echo.is_pinned ? 'Desfijar' : 'Fijar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
