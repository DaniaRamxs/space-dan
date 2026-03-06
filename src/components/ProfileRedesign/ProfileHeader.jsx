import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Star, MessageSquare, Compass, Settings, LogOut, UserPlus, UserCheck } from 'lucide-react';
import { getFrameStyle } from '../../utils/styles';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';
import { useAuthContext } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import OrbitingInterests from '../Effects/OrbitingInterests';

// --- Partículas estelares para la entrada ---
const StarParticles = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                initial={{
                    opacity: 0,
                    x: Math.random() * 400 - 200,
                    y: Math.random() * 400 - 200,
                    scale: 0
                }}
                animate={{
                    opacity: [0, 1, 0],
                    x: Math.random() * 600 - 300,
                    y: Math.random() * 600 - 300,
                    scale: [0, 1, 0]
                }}
                transition={{
                    duration: 1.5 + Math.random(),
                    delay: Math.random() * 0.5,
                    repeat: 0
                }}
                className="absolute left-1/2 top-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
            />
        ))}
    </div>
);

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const ProfileHeader = ({ profile, theme, isOwn, isFollowing, onFollow, onEdit, stats, onStar, onEcho }) => {
    const { logout } = useAuthContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const bannerStyle = {
        backgroundColor: theme?.primary_color || '#0c0c16',
        backgroundImage: theme?.background_url ? `url(${theme.background_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    const frame = getFrameStyle(profile.equipped_frame || profile.frame_item_id);
    const isOnline = profile.last_seen_at
        ? (new Date() - new Date(profile.last_seen_at)) < 6 * 60 * 1000
        : false;

    return (
        <header className="relative w-full overflow-hidden bg-[#04040a]">
            {/* Banner Section */}
            <motion.div
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-[260px] md:h-[320px] w-full relative overflow-hidden"
                style={bannerStyle}
            >
                {/* Overlay Oscurecedor */}
                <div
                    className="absolute inset-0 z-10"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.55), #04040a)'
                    }}
                />

                {/* Mood bubble (Esquina superior) */}
                {(profile.mood_emoji || profile.mood_text) && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="absolute top-6 right-6 z-20"
                    >
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                {profile.mood_emoji?.startsWith('http') ? (
                                    <img
                                        src={profile.mood_emoji}
                                        className="w-full h-full object-contain rounded"
                                        alt="Mood"
                                    />
                                ) : (
                                    <span className="text-lg">{profile.mood_emoji || '🪐'}</span>
                                )}
                            </div>
                            <p className="text-[11px] font-black uppercase text-white tracking-widest leading-none">
                                {profile.mood_text || 'En órbita'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Hub Central de Identidad */}
            <div className="relative z-20 -mt-24 md:-mt-32 px-4 flex flex-col items-center">

                {/* Avatar Planetario */}
                <div className="relative mb-6">
                    <StarParticles />

                    {/* Intereses Orbitando */}
                    <OrbitingInterests
                        avatarSize={isMobile() ? 144 : 176}
                        interests={profile.interests || [
                            { icon: '🎮', label: 'Gaming' },
                            { icon: '🎵', label: 'Música' },
                            { icon: '🚀', label: 'Espacio' },
                            { icon: '🌌', label: 'Exploración' }
                        ]}
                    />

                    {/* Halo Luminoso */}
                    <motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.3, 0.15] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -inset-6 rounded-full blur-3xl"
                        style={{ backgroundColor: theme?.primary_color || '#22d3ee' }}
                    />

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: 'spring',
                            damping: 12,
                            stiffness: 100,
                            delay: 0.2
                        }}
                        className="relative w-36 h-36 md:w-44 md:h-44 flex items-center justify-center cursor-pointer group"
                    >
                        <div
                            className={`w-full h-full flex items-center justify-center p-1.5 md:p-2 shadow-2xl ${frame.className || ''}`}
                            style={{ ...frame, borderRadius: frame.borderRadius || '50%' }}
                        >
                            <div className="w-full h-full rounded-full overflow-hidden border-[6px] border-[#04040a] bg-[#04040a]">
                                <img
                                    src={profile.avatar_url || '/default_user_blank.png'}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    alt={profile.username}
                                />
                            </div>
                        </div>

                        {/* Online Pulse */}
                        {isOnline && (
                            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full border-[3px] border-[#04040a] bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] z-30" />
                        )}
                    </motion.div>
                </div>

                {/* Información del Universo */}
                <div className="text-center space-y-4 max-w-2xl">
                    <div className="space-y-1">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className={`text-3xl md:text-5xl font-black tracking-tighter uppercase italic drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] ${getNicknameClass(profile)}`}
                        >
                            {getUserDisplayName(profile)}
                        </motion.h1>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center justify-center gap-3"
                        >
                            {profile.is_stellar_citizen && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-black text-amber-500 tracking-tighter uppercase">
                                    <ShieldCheck size={10} /> CITIZEN
                                </div>
                            )}
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                {isOnline ? '🟢 Espectro Activo' : '⚪ En Hibernación'}
                            </span>
                        </motion.div>
                    </div>

                    {/* Métricas del Universo */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-wrap items-center justify-center gap-6 md:gap-12 pt-2 pb-6"
                    >
                        <div className="text-center">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Estrellas</p>
                            <div className="flex items-center gap-1.5 text-amber-400">
                                <Star size={14} className="fill-current" />
                                <span className="text-lg font-black italic">{(stats?.stars || 0).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Ecos</p>
                            <div className="flex items-center gap-1.5 text-cyan-400">
                                <MessageSquare size={14} className="fill-current" />
                                <span className="text-lg font-black italic">{stats?.echoes || 0}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Edad Universo</p>
                            <div className="flex items-center gap-1.5 text-violet-400">
                                <Compass size={14} />
                                <span className="text-lg font-black italic">{stats?.age || 0}D</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Botones de Acción (Estilo Glass) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-wrap items-center justify-center gap-3 md:gap-4"
                    >
                        {isOwn ? (
                            <>
                                <button
                                    onClick={onEdit}
                                    className="px-8 py-3 rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                >
                                    <Settings size={14} /> Configuración
                                </button>
                                <button
                                    onClick={() => { if (window.confirm('¿Desconectar sistemas?')) logout(); }}
                                    className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center gap-2"
                                >
                                    <LogOut size={14} /> Salir
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onStar}
                                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2"
                                >
                                    <Star size={14} className="fill-current" /> Dejar estrella
                                </button>
                                <button
                                    onClick={onEcho}
                                    className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                                >
                                    <MessageSquare size={14} /> Enviar eco
                                </button>
                                <button
                                    onClick={onFollow}
                                    className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-xl ${isFollowing
                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/40'
                                        : 'bg-white text-black hover:bg-cyan-400'
                                        }`}
                                >
                                    {isFollowing ? <><UserCheck size={14} /> Siguiendo</> : <><UserPlus size={14} /> Explorar universo</>}
                                </button>
                            </>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Espaciador final para suavizar transición al contenido */}
            <div className="h-10 md:h-16" />
        </header>
    );
};
