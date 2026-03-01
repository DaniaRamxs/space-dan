import React from 'react';
import { motion } from 'framer-motion';
import { getFrameStyle } from '../../utils/styles';
import { getUserDisplayName, getNicknameClass } from '../../utils/user';

export const ProfileHeader = ({ profile, theme, isOwn, isFollowing, onFollow, onEdit }) => {
    const bannerStyle = {
        backgroundColor: theme.primary_color,
        backgroundImage: theme.background_url ? `url(${theme.background_url})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    const frame = getFrameStyle(profile.equipped_frame || profile.frame_item_id);
    const isOnline = profile.online_status === 'online';

    return (
        <header className="relative w-full">
            {/* Banner Section */}
            <div
                className="h-56 md:h-80 w-full rounded-b-[2.5rem] md:rounded-b-[5rem] overflow-hidden shadow-2xl transition-all duration-1000 relative group"
                style={bannerStyle}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0a0a0f]" />

                {/* Mood Floating Bubble */}
                {(profile.mood_emoji || profile.mood_text) && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute top-8 right-6 md:top-12 md:right-12 z-20"
                    >
                        <div className="flex items-center gap-4 px-6 py-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl">
                            <span className="text-3xl animate-bounce duration-[4000ms]">{profile.mood_emoji || '🪐'}</span>
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black uppercase tracking-[0.3em] text-cyan-400 italic">Mood Actual</span>
                                <span className="text-xs font-black text-white italic tracking-tight">{profile.mood_text || 'En órbita'}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Main Identity Info */}
            <div className="max-w-6xl mx-auto px-6 -mt-24 md:-mt-32 relative z-30 flex flex-col items-center md:items-end md:flex-row gap-8 md:gap-12 pb-8">

                {/* Avatar with Framework and Status */}
                <div className="relative shrink-0">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: 'spring', damping: 12 }}
                        className="relative z-10"
                    >
                        {/* Glow behind avatar */}
                        <div className={`absolute -inset-4 rounded-[3.5rem] blur-3xl opacity-30 transition-all ${isOnline ? 'bg-cyan-500 animate-pulse' : 'bg-white/10'}`} />

                        {/* Frame / Avatar Container */}
                        <div
                            className={`w-44 h-44 md:w-56 md:h-56 relative flex items-center justify-center p-2.5 transition-transform hover:scale-105 duration-500 ${frame.className || ''}`}
                            style={{ ...frame, borderRadius: frame.borderRadius || '50%' }}
                        >
                            <div className="w-full h-full rounded-full overflow-hidden border-[6px] border-[#0a0a0f] bg-[#0a0a0f] shadow-inner relative">
                                <img
                                    src={profile.avatar_url || '/default_user_blank.png'}
                                    className="w-full h-full object-cover"
                                    alt={profile.username}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 pointer-events-none" />
                            </div>
                        </div>

                        {/* Connection Ring */}
                        <div className={`absolute bottom-4 right-4 w-8 h-8 rounded-full border-[6px] border-[#0a0a0f] shadow-2xl z-20 transition-all ${isOnline ? 'bg-green-500 shadow-green-500/50' : 'bg-zinc-800'}`} />
                    </motion.div>

                    {profile.is_voice_active && (
                        <div className="absolute -top-6 -left-6 bg-cyan-500 border-4 border-[#0a0a0f] px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-tighter text-white animate-bounce shadow-2xl shadow-cyan-500/50 z-20">
                            En cabina 🎙️
                        </div>
                    )}
                </div>

                {/* Textual Identity and Social Actions */}
                <div className="flex-1 text-center md:text-left pt-4 md:pt-16 space-y-6">
                    <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                <h1 className={`text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none drop-shadow-2xl ${getNicknameClass(profile)}`}>
                                    {getUserDisplayName(profile)}
                                </h1>
                                {profile.is_vip && (
                                    <div className="bg-gradient-to-tr from-amber-400 to-yellow-600 p-[1px] rounded-lg shadow-lg">
                                        <div className="bg-black/80 px-3 py-1 rounded-[7px] flex items-center gap-1.5">
                                            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest italic">V.I.P</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Orbital Status (Profile Status Message) */}
                            <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full inline-flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic leading-none">
                                    {profile.profile_status || (isOnline ? 'Transmisión Activa' : 'Fuera de Órbita')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 pb-2">
                            {isOwn ? (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onEdit();
                                    }}
                                    className="group relative px-10 py-4 overflow-hidden rounded-2xl bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:pr-12 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                >
                                    <span className="relative z-10">Configurar Perfil</span>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all">⚙️</span>
                                </button>
                            ) : (
                                <button
                                    onClick={onFollow}
                                    className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105 active:scale-95 ${isFollowing
                                        ? 'bg-white/5 text-white/40 border border-white/10'
                                        : 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white border border-white/20'
                                        }`}
                                >
                                    {isFollowing ? '✓ Siguiendo' : '+ Seguir Estela'}
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="text-white/40 text-sm md:text-xl max-w-2xl font-medium tracking-tight leading-relaxed italic border-l-4 border-cyan-500/20 pl-6 py-1">
                        {profile.bio || "Este orbitador aún no ha transmitido su biografía estelar al cosmos Dan..."}
                    </p>
                </div>
            </div>
        </header>
    );
};
